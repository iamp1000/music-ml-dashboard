from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User, ListeningHistory
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
async def get_preferences(spotify_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == spotify_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    prefs = user.preferences or {}
    return {
        "status": "success",
        "data": {
            "ml_enabled": prefs.get("ml_enabled", True),
            "app_sleep": prefs.get("app_sleep", False)
        }
    }

@router.post("/preferences")
async def update_preferences(prefs: PreferencesUpdate, spotify_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == spotify_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_prefs = user.preferences or {}
    if prefs.ml_enabled is not None:
        current_prefs["ml_enabled"] = prefs.ml_enabled
    if prefs.app_sleep is not None:
        current_prefs["app_sleep"] = prefs.app_sleep
        
    user.preferences = current_prefs
    db.commit()
    
    return {"status": "success", "message": "Preferences updated"}

@router.delete("/history")
async def purge_history(spotify_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Delete listening history for this user
    deleted_count = db.query(ListeningHistory).filter(ListeningHistory.tenant_id == spotify_id).delete(synchronize_session=False)
    db.commit()
        
    return {"status": "success", "message": f"Purged {deleted_count} history records"}

@router.post("/disconnect")
async def disconnect_account(spotify_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == spotify_id).first()
    if user:
        # Purge history first
        db.query(ListeningHistory).filter(ListeningHistory.tenant_id == spotify_id).delete(synchronize_session=False)
        # Delete user document
        db.delete(user)
        db.commit()
        
    return {"status": "success", "message": "Account disconnected and data purged"}
