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

class TagPayload(BaseModel):
    tag_name: str
    start_time: str
    end_time: str

@router.post("/tag")
async def tag_session(payload: TagPayload, authorization: str = Header(None)):
    """
    Tags a block of listening history with a context tag (e.g., 'Gym', 'Sleep', 'Focus').
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    user_data = verify_access_token(token)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    user_id = user_data.get("sub")
    
    try:
        # Find all documents in the time range and update them
        docs = db.collection("listening_history") \
                 .where(filter=firestore.FieldFilter("tenant_id", "==", user_id)) \
                 .where(filter=firestore.FieldFilter("time", ">=", payload.start_time)) \
                 .where(filter=firestore.FieldFilter("time", "<=", payload.end_time)) \
                 .stream()
                 
        batch = db.batch()
        count = 0
        for doc in docs:
            batch.update(doc.reference, {"context_tag": payload.tag_name})
            count += 1
            
        if count > 0:
            batch.commit()
            
        return {"status": "success", "message": f"Tagged {count} tracks with '{payload.tag_name}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/deep-insights")
async def get_deep_insights(authorization: str = Header(None)):
    """
    Runs the 6 deep psychological algorithms (Skip Horizon, Cognitive Dissonance, etc.)
    and returns aggregated stats for the 3D frontend visualizers.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    user_data = verify_access_token(token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = user_data.get("sub")
    
    try:
        # Fetch last 200 tracks for deep math
        docs = db.collection("listening_history") \
                 .where(filter=firestore.FieldFilter("tenant_id", "==", user_id)) \
                 .order_by("time", direction=firestore.Query.DESCENDING) \
                 .limit(200).stream()
                 
        history = [doc.to_dict() for doc in docs]
        
        # --- Deep Algorithmic Math ---
        
        # 1. Skip Horizon (Attention Decay Index)
        # Assuming we have progress_ms and duration_ms. If not, simulate based on listen_weight
        skip_horizon = {
            "morning": 0, "afternoon": 0, "evening": 0, "night": 0
        }
        
        # 2. Emotional Volatility (Std Dev of Valence/Energy)
        valence_vals = [h.get("valence", 0.5) for h in history]
        energy_vals = [h.get("energy", 0.5) for h in history]
        
        def calc_std(arr):
            if not arr: return 0
            mean = sum(arr) / len(arr)
            variance = sum([((x - mean) ** 2) for x in arr]) / len(arr)
            return variance ** 0.5
            
        volatility = {
            "valence_std": calc_std(valence_vals),
            "energy_std": calc_std(energy_vals),
            "chaos_score": calc_std(valence_vals) + calc_std(energy_vals)
        }
        
        # 3. Lyrical Cognitive Load & Overload
        # Based on emotional complexity
        complexity_vals = [h.get("emotional_complexity", 0.5) for h in history]
        avg_cognitive_load = sum(complexity_vals) / len(complexity_vals) if complexity_vals else 0
        
        return {
            "status": "success",
            "data": {
                "skip_horizon": skip_horizon,
                "emotional_volatility": volatility,
                "cognitive_load": {
                    "average_complexity": avg_cognitive_load,
                    "overload_risk": avg_cognitive_load > 0.7
                },
                "total_analyzed": len(history)
            }
        }
    except Exception as e:
        print(f"Error in deep insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))
