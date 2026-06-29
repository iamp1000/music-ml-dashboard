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
                    .filter(ListeningHistory.tenant_id == user_id, ListeningHistory.audio_ml_analyzed == 1)\
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


@router.get("/deep-insights")
async def get_deep_insights(authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    Computes deep psychological metrics from real listening history:
    - cognitive_load: radar data based on energy, valence, danceability proxy
    - skip_horizon: play-ratio heatmap per genre 
    - emotional_volatility: variance in valence over time (0-1 scale)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.split(" ")[1]
    user_data = verify_access_token(token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user_data.get("sub")

    try:
        results = db.query(ListeningHistory)\
                    .filter(ListeningHistory.tenant_id == user_id)\
                    .order_by(desc(ListeningHistory.time))\
                    .limit(500)\
                    .all()

        if not results:
            return {"status": "success", "data": {
                "cognitive_load": [
                    {"axis": "Energy", "value": 0},
                    {"axis": "Valence", "value": 0},
                    {"axis": "Complexity", "value": 0},
                    {"axis": "Tempo", "value": 0},
                    {"axis": "Repetition", "value": 0},
                ],
                "skip_horizon": [],
                "emotional_volatility": 0
            }}

        # --- 1. Cognitive Load Radar ---
        energies = [r.energy for r in results if r.energy is not None]
        valences = [r.valence for r in results if r.valence is not None]
        
        avg_energy = sum(energies) / len(energies) if energies else 0.5
        avg_valence = sum(valences) / len(valences) if valences else 0.5

        # BPM-based tempo metric from real_bpm if available
        bpms = []
        for r in results:
            if r.ml_features and isinstance(r.ml_features, dict):
                bpm = r.ml_features.get("real_bpm")
                if bpm:
                    bpms.append(float(bpm))
        avg_bpm_norm = (sum(bpms) / len(bpms) / 200.0) if bpms else 0.5
        avg_bpm_norm = min(1.0, avg_bpm_norm)

        # Complexity: how spread out valence is (variance as proxy)
        if len(valences) > 1:
            mean_v = avg_valence
            variance = sum((v - mean_v) ** 2 for v in valences) / len(valences)
            complexity = min(1.0, variance * 10)
        else:
            complexity = 0.3

        # Repetition: how often same tracks appear
        track_ids = [r.track_id for r in results if r.track_id]
        unique_ratio = len(set(track_ids)) / len(track_ids) if track_ids else 1
        repetition = 1.0 - unique_ratio  # high repetition = low uniqueness

        cognitive_load = [
            {"axis": "Energy", "value": round(avg_energy, 3)},
            {"axis": "Valence", "value": round(avg_valence, 3)},
            {"axis": "Complexity", "value": round(complexity, 3)},
            {"axis": "Tempo", "value": round(avg_bpm_norm, 3)},
            {"axis": "Repetition", "value": round(repetition, 3)},
        ]

        # --- 2. Skip Horizon: play ratio by genre ---
        genre_stats: dict = {}
        for r in results:
            genre = None
            if r.ml_features and isinstance(r.ml_features, dict):
                genre = r.ml_features.get("real_genre") or r.ml_features.get("genre")
            genre = genre or "Unknown"

            duration = r.duration_ms or 200000
            played = r.played_ms or duration
            ratio = min(1.0, played / duration) if duration > 0 else 1.0

            if genre not in genre_stats:
                genre_stats[genre] = {"total": 0, "ratio_sum": 0}
            genre_stats[genre]["total"] += 1
            genre_stats[genre]["ratio_sum"] += ratio

        skip_horizon = []
        for genre, stats in sorted(genre_stats.items(), key=lambda x: -x[1]["total"])[:10]:
            avg_ratio = stats["ratio_sum"] / stats["total"]
            skip_horizon.append({
                "genre": genre,
                "play_ratio": round(avg_ratio, 3),
                "count": stats["total"]
            })

        # --- 3. Emotional Volatility ---
        # Standard deviation of valence as a measure of emotional volatility
        if len(valences) > 1:
            mean_v = avg_valence
            std_dev = (sum((v - mean_v) ** 2 for v in valences) / len(valences)) ** 0.5
            emotional_volatility = round(min(1.0, std_dev * 3), 3)
        else:
            emotional_volatility = 0.0

        return {
            "status": "success",
            "data": {
                "cognitive_load": cognitive_load,
                "skip_horizon": skip_horizon,
                "emotional_volatility": emotional_volatility
            }
        }

    except Exception as e:
        print(f"Error in deep-insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

