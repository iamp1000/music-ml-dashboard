import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

from llm_telemetry import extract_semantic_telemetry, SemanticTelemetry

load_dotenv()

app = FastAPI(title="Google Cloud ML Server - Affective Music")

class AnalyzeHistoryRequest(BaseModel):
    history: list

@app.post("/analyze_history")
async def analyze_history(payload: AnalyzeHistoryRequest):
    history = payload.history
    
    # 1. Skip Horizon (Attention Decay Index)
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

class SemanticAnalysisRequest(BaseModel):
    track_name: str
    artist_name: str
    lyrics: str
    api_key: str = None

@app.post("/analyze_semantics")
async def analyze_semantics(payload: SemanticAnalysisRequest):
    """
    Hits Gemini API for heavy semantic 6D vector math.
    """
    try:
        telemetry = await extract_semantic_telemetry(
            track_name=payload.track_name,
            artist_name=payload.artist_name,
            lyrics=payload.lyrics,
            api_key=payload.api_key
        )
        return {"status": "success", "data": telemetry.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from database import SessionLocal
from models import ListeningHistory
from sqlalchemy import desc

@app.get("/ml_jobs/pending")
async def get_pending_ml_jobs(limit: int = 5):
    """
    Called by the Local ML Worker. 
    Fetches tracks that need deep audio analysis (PyTorch/madmom).
    """
    try:
        with SessionLocal() as db:
            docs = db.query(ListeningHistory)\
                     .filter(ListeningHistory.audio_ml_analyzed == False)\
                     .order_by(desc(ListeningHistory.time))\
                     .limit(limit).all()
                     
            pending_jobs = []
            for doc in docs:
                pending_jobs.append({
                    "doc_id": doc.id,
                    "track_id": doc.track_id,
                    "track_name": doc.track_name,
                    "artist_name": doc.artist_name,
                    "duration_ms": doc.duration_ms
                })
                        
            return {"status": "success", "data": pending_jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MLJobCompletePayload(BaseModel):
    doc_id: str
    real_bpm: float
    rhythm_regularity: float
    real_genre: str
    genre_confidence: float
    valence: float
    arousal: float

@app.post("/ml_jobs/complete")
async def complete_ml_job(payload: MLJobCompletePayload):
    """
    Called by the Local ML Worker after heavy PyTorch/madmom analysis.
    Updates the TiDB row with the real audio features.
    """
    try:
        with SessionLocal() as db:
            doc = db.query(ListeningHistory).filter(ListeningHistory.id == payload.doc_id).first()
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
                
            # We blend the LLM mood_vector with the real audio features
            existing_ml_features = doc.ml_features or {}
            mood_vector = existing_ml_features.get("mood_vector", [0.5, 0.5, 0.5])
            
            # mood_vector = [Positivity (Valence), Intensity (Energy/Arousal), Cognitive Load]
            # We update the first two with the PyTorch model's real values
            new_mood_vector = [
                (mood_vector[0] + payload.valence) / 2.0, # Blend LLM Positivity with Audio Valence
                (mood_vector[1] + payload.arousal) / 2.0, # Blend LLM Intensity with Audio Arousal
                mood_vector[2] # Keep LLM Cognitive Load
            ]
            
            existing_ml_features["mood_vector"] = new_mood_vector
            
            doc.audio_ml_analyzed = True
            doc.real_bpm = payload.real_bpm
            doc.rhythm_regularity = payload.rhythm_regularity
            doc.real_genre = payload.real_genre
            doc.genre_confidence = payload.genre_confidence
            doc.audio_valence = payload.valence
            doc.audio_arousal = payload.arousal
            doc.ml_features = existing_ml_features
            
            db.commit()
            
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
