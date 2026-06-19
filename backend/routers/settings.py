from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from database import db
from security import verify_access_token

router = APIRouter()

class PreferencesUpdate(BaseModel):
    ml_enabled: bool = None
    app_sleep: bool = None

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload.get("sub")

@router.get("/preferences")
async def get_preferences(spotify_id: str = Depends(get_current_user)):
    user_ref = db.collection("users").document(spotify_id)
    doc = user_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    prefs = doc.to_dict().get("preferences", {})
    return {
        "status": "success",
        "data": {
            "ml_enabled": prefs.get("ml_enabled", True),
            "app_sleep": prefs.get("app_sleep", False)
        }
    }

@router.post("/preferences")
async def update_preferences(prefs: PreferencesUpdate, spotify_id: str = Depends(get_current_user)):
    user_ref = db.collection("users").document(spotify_id)
    doc = user_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_prefs = doc.to_dict().get("preferences", {})
    if prefs.ml_enabled is not None:
        current_prefs["ml_enabled"] = prefs.ml_enabled
    if prefs.app_sleep is not None:
        current_prefs["app_sleep"] = prefs.app_sleep
        
    user_ref.update({"preferences": current_prefs})
    
    return {"status": "success", "message": "Preferences updated"}

@router.delete("/history")
async def purge_history(spotify_id: str = Depends(get_current_user)):
    # Batch delete listening history for this user
    docs = db.collection("listening_history").list_documents()
    batch = db.batch()
    count = 0
    for doc in docs:
        if doc.id.startswith(f"{spotify_id}_"):
            batch.delete(doc)
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
    
    if count > 0 and count % 500 != 0:
        batch.commit()
        
    return {"status": "success", "message": f"Purged {count} history records"}

@router.post("/disconnect")
async def disconnect_account(spotify_id: str = Depends(get_current_user)):
    user_ref = db.collection("users").document(spotify_id)
    doc = user_ref.get()
    if doc.exists:
        # Purge history first
        docs = db.collection("listening_history").list_documents()
        batch = db.batch()
        count = 0
        for d in docs:
            if d.id.startswith(f"{spotify_id}_"):
                batch.delete(d)
                count += 1
                if count % 500 == 0:
                    batch.commit()
                    batch = db.batch()
        if count > 0 and count % 500 != 0:
            batch.commit()

        # Delete user document
        user_ref.delete()
        
    return {"status": "success", "message": "Account disconnected and data purged"}
