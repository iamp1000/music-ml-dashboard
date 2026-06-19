import httpx
import os
from pydantic import BaseModel, Field
import json

class SemanticTelemetry(BaseModel):
    valence: float = Field(..., ge=0.0, le=1.0)
    energy: float = Field(..., ge=0.0, le=1.0)
    danceability: float = Field(..., ge=0.0, le=1.0)
    mood_category: str = Field(...)

async def extract_semantic_telemetry(track_name: str, artist_name: str, lyrics: str) -> SemanticTelemetry:
    """
    Uses an LLM (e.g., DeepSeek) to infer semantic telemetry from lyrics.
    """
    api_key = os.getenv("LLM_API_KEY")
    base_url = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
    
    if not api_key:
        # Fallback if no LLM configured
        return SemanticTelemetry(valence=0.5, energy=0.5, danceability=0.5, mood_category="Neutral")
        
    prompt = f"""Analyze the semantic meaning and tone of this song.
Track: {track_name} by {artist_name}
Lyrics:
{lyrics[:1000]}

Return exactly ONE valid JSON object with these float fields (0.0 to 1.0) and a string mood:
{{"valence": float, "energy": float, "danceability": float, "mood_category": "string"}}
"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": os.getenv("LLM_MODEL", "deepseek-chat"),
        "messages": [
            {"role": "system", "content": "You are a semantic sentiment extractor. Output JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                
                # Cleanup markdown formatting if LLM includes it
                if content.startswith("```json"):
                    content = content[7:-3]
                    
                result = json.loads(content)
                return SemanticTelemetry(**result)
            else:
                print(f"LLM API Error: {resp.status_code}")
    except Exception as e:
        print(f"LLM Inference Error: {e}")
        
    return SemanticTelemetry(valence=0.5, energy=0.5, danceability=0.5, mood_category="Unknown")
