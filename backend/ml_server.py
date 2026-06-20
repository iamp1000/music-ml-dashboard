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
    Hits DeepSeek API for heavy semantic 6D vector math.
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
