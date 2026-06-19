from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from pydantic import BaseModel
import os
from database import db
from security import verify_access_token
from firebase_admin import firestore

router = APIRouter(tags=["Telemetry"])

class HeartRatePayload(BaseModel):
    tenant_id: str
    bpm: float
    motion_context: str
    timestamp: str

@router.post("/heartrate")
async def ingest_heart_rate(payload: HeartRatePayload, background_tasks: BackgroundTasks):
    """
    Ingests heart rate telemetry from the iOS agent.
    """
    def save_to_firestore(data: HeartRatePayload):
        try:
            db.collection("telemetry_heart_rate").add({
                "time": data.timestamp,
                "tenant_id": data.tenant_id,
                "bpm": data.bpm,
                "motion_context": data.motion_context
            })
        except Exception as e:
            print(f"Error saving telemetry: {e}")

    background_tasks.add_task(save_to_firestore, payload)
    return {"status": "accepted"}

@router.get("/history")
async def get_listening_history(authorization: str = Header(None)):
    """
    Returns the user's historical listening data (Valence/Arousal) for the dashboard plots.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    user_data = verify_access_token(token)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    user_id = user_data.get("sub")
    
    try:
        docs = db.collection("listening_history") \
                 .where(filter=firestore.FieldFilter("tenant_id", "==", user_id)) \
                 .order_by("time", direction=firestore.Query.DESCENDING) \
                 .limit(50).stream()
                 
        history = []
        for doc in docs:
            history.append(doc.to_dict())
            
        # Reverse to return chronologically
        history = list(reversed(history))
        
        return {"status": "success", "data": history}
    except Exception as e:
        print(f"Firestore Error in history fetch: {e}")
        return {"status": "error", "message": "Database not initialized. Please create Firestore DB in Firebase Console.", "data": []}


