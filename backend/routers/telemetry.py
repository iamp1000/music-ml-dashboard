from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Depends
from pydantic import BaseModel
import os
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import ListeningHistory, User, UserAggregates
from security import verify_access_token

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
    # Just mock saving for now since we didn't migrate telemetry_heart_rate table yet
    return {"status": "accepted"}

@router.get("/history")
async def get_listening_history(authorization: str = Header(None), limit: int = 50, db: Session = Depends(get_db)):
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
        results = db.query(ListeningHistory)\
                    .filter(ListeningHistory.tenant_id == user_id)\
                    .order_by(desc(ListeningHistory.time))\
                    .limit(limit)\
                    .all()
                 
        history = []
        for r in results:
            history.append({
                "tenant_id": r.tenant_id,
                "time": r.time,
                "track_id": r.track_id,
                "track_name": r.track_name,
                "artist_name": r.artist_name,
                "duration_ms": r.duration_ms,
                "played_ms": r.played_ms,
                "listen_type": r.listen_type,
                "listen_weight": r.listen_weight,
                "valence": r.valence,
                "energy": r.energy,
                "context": r.context,
                "ml_features": r.ml_features,
                "sync_source": r.sync_source
            })
            
        # Reverse to return chronologically
        history = list(reversed(history))
        
        return {"status": "success", "data": history}
    except Exception as e:
        print(f"Database Error in history fetch: {e}")
        return {"status": "error", "message": "Database error", "data": []}

@router.get("/aggregates")
async def get_user_aggregates(authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    Returns pre-calculated metrics for the dashboard to save RUs.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    user_data = verify_access_token(token)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = user_data.get("sub")
    
    agg = db.query(UserAggregates).filter(UserAggregates.tenant_id == user_id).first()
    if not agg:
        return {"status": "success", "data": {
            "total_listening_time_mins": 0,
            "total_tracks_played": 0,
            "artists_discovered": 0,
            "genres_explored": 0,
            "top_genres_json": [],
            "top_artists_json": [],
            "timeline_data_json": []
        }}
        
    return {"status": "success", "data": {
        "total_listening_time_mins": agg.total_listening_time_mins,
        "total_tracks_played": agg.total_tracks_played,
        "artists_discovered": agg.artists_discovered,
        "genres_explored": agg.genres_explored,
        "top_genres_json": agg.top_genres_json or [],
        "top_artists_json": agg.top_artists_json or [],
        "timeline_data_json": agg.timeline_data_json or []
    }}

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
            
        confidences = {mood: 0.1 for mood in MOOD_CLASSES}
        confidences[predicted_mood] = 0.85
            
        return {
            "status": "success",
            "data": {
                "predicted_mood": predicted_mood,
                "confidence_scores": confidences
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
