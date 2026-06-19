from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from pydantic import BaseModel
import os
from database import db
from security import verify_access_token
from firebase_admin import firestore
# Dummy mood classes
MOOD_CLASSES = ["Deep Focus", "Aggressive", "Depressive Spiral", "Euphoric"]

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

class AudioAnalysisRequest(BaseModel):
    file_path: str

@router.post("/analyze_audio")
async def analyze_audio(payload: AudioAnalysisRequest):
    """
    Mock audio analysis to save memory on Render.
    """
    return {"status": "success", "data": {"valence": 0.5, "arousal": 0.5}}

class SandboxRequest(BaseModel):
    time_of_day: float
    energy: float
    valence: float = 0.5 # Optional slider

@router.post("/sandbox_inference")
async def sandbox_inference(payload: SandboxRequest):
    """
    Math-based mock of the CARS model to save memory on Render.
    """
    try:
        # Simple heuristic instead of PyTorch
        if payload.valence > 0.5 and payload.energy > 0.5:
            predicted_mood = "Euphoric"
        elif payload.valence < 0.5 and payload.energy > 0.5:
            predicted_mood = "Aggressive"
        elif payload.valence < 0.5 and payload.energy < 0.5:
            predicted_mood = "Depressive Spiral"
        else:
            predicted_mood = "Deep Focus"
            
        probs_list = [0.25, 0.25, 0.25, 0.25]
        
        return {
            "status": "success", 
            "data": {
                "predicted_mood": predicted_mood,
                "probabilities": probs_list
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

