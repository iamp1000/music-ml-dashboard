from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from pydantic import BaseModel
import os
from database import db
from security import verify_access_token
from firebase_admin import firestore
import torch
from ml_engine.models.context_model import ContextAwareRecommender
from ml_engine.utils.context_encoder import encode_cyclical_time

# Instantiate model
sandbox_model = ContextAwareRecommender()
# We don't train it here, just randomly initialized for the sandbox to show weight shifting
sandbox_model.eval()

# Dummy mood classes
MOOD_CLASSES = ["Deep Focus", "Aggressive", "Depressive Spiral", "Euphoric"]
from inference_service import inference_engine

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
    Process an audio file through the ML inference engine to predict valence and arousal.
    """
    result = inference_engine.analyze_audio_file(payload.file_path)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"status": "success", "data": result}

class SandboxRequest(BaseModel):
    time_of_day: float
    energy: float
    valence: float = 0.5 # Optional slider

@router.post("/sandbox_inference")
async def sandbox_inference(payload: SandboxRequest):
    """
    Runs the CARS PyTorch model for the interactive Neural Mood Predictor sandbox.
    """
    try:
        # 1. Temporal Context (sin, cos)
        sin_time, cos_time = encode_cyclical_time(payload.time_of_day)
        # Dummy days for sandbox
        x_ctx = torch.tensor([[sin_time, cos_time, 0.0, 0.0]], dtype=torch.float32)
        
        # 2. Sequential Momentum (energy, valence)
        # Sequence dim = 4 [valence, energy, danceability, acousticness]
        x_seq = torch.tensor([[payload.valence, payload.energy, 0.5, 0.5]], dtype=torch.float32)
        
        with torch.no_grad():
            probs = sandbox_model(x_seq, x_ctx)
            
        probs_list = probs.squeeze().tolist()
        max_idx = probs.argmax().item()
        predicted_mood = MOOD_CLASSES[max_idx]
        
        return {
            "status": "success", 
            "data": {
                "predicted_mood": predicted_mood,
                "probabilities": probs_list
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

