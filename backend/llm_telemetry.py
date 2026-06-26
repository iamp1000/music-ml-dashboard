import httpx
import os
from pydantic import BaseModel, Field
import json

class SemanticTelemetry(BaseModel):
    valence: float = Field(..., ge=0.0, le=1.0)
    energy: float = Field(..., ge=0.0, le=1.0)
    danceability: float = Field(..., ge=0.0, le=1.0)
    mood_category: str = Field(...)
    lyrics_analysis: str = Field(...)
    energy_weight: float = Field(..., ge=0.0, le=1.0)
    bpm_estimate: int = Field(...)
    song_genre_estimate: str = Field(...)
    acoustic_profile: str = Field(...)
    emotional_complexity: float = Field(..., ge=0.0, le=1.0)
    lyrical_theme: str = Field(...)
    narrative_arc: str = Field(...)
    instrumental_density: str = Field(...)
    vocal_intensity: str = Field(...)
    cultural_context: str = Field(...)
    replay_value: float = Field(..., ge=0.0, le=1.0)
    time_of_day_fit: str = Field(...)
    context_tag: str = Field(default="None")

async def extract_semantic_telemetry(track_name: str, artist_name: str, lyrics: str, api_key: str = None) -> SemanticTelemetry:
    """
    Uses Google Gemini to infer semantic telemetry from lyrics.
    Now takes the API key directly so we can use tenant-specific keys.
    """
    gemini_keys = []
    if api_key: gemini_keys.append(api_key)
    if os.getenv("GEMINI_API_KEY"): gemini_keys.append(os.getenv("GEMINI_API_KEY"))
    if os.getenv("GEMINI_API_KEY_2"): gemini_keys.append(os.getenv("GEMINI_API_KEY_2"))
        
    fallback = SemanticTelemetry(
        valence=0.5, energy=0.5, danceability=0.5, mood_category="Neutral",
        lyrics_analysis="No lyrics analyzed.", energy_weight=0.5, bpm_estimate=120,
        song_genre_estimate="Unknown", acoustic_profile="Unknown", emotional_complexity=0.5,
        lyrical_theme="Unknown", narrative_arc="None", instrumental_density="Medium",
        vocal_intensity="Medium", cultural_context="Unknown", replay_value=0.5, time_of_day_fit="Any",
        context_tag="None"
    )
    
    if not gemini_keys:
        return fallback
        
    prompt = f"""You are a highly advanced musical psychologist and audio engineer AI. 
Analyze the semantic meaning, tone, and profile of this song based solely on its title, artist, and lyrics.
If lyrics are missing or sparse, make your best educated guess based on the artist and track name.

Track: {track_name} by {artist_name}
Lyrics:
{lyrics[:2000]}

Return exactly ONE valid JSON object with the following fields:
- valence (float 0-1): Positivity of the song.
- energy (float 0-1): Intensity and activity.
- danceability (float 0-1): How suitable it is for dancing.
- mood_category (string): e.g., "Euphoric", "Depressive Spiral", "Chill", "Aggressive".
- lyrics_analysis (string): 1-sentence summary of the thematic meaning.
- energy_weight (float 0-1): The "heaviness" or absolute intensity weight of the track.
- bpm_estimate (int): Estimated tempo based on lyrical pacing and genre.
- song_genre_estimate (string): e.g., "Trap", "Indie Folk", "Death Metal".
- acoustic_profile (string): e.g., "Blasting bass", "Calming acoustic notes", "Heavy synth".
- emotional_complexity (float 0-1): How mixed or nuanced the emotions are.
- lyrical_theme (string): e.g., "Heartbreak", "Rebellion", "Existential Dread".
- narrative_arc (string): Is there a story? e.g., "Rising tension", "Static", "Resolution".
- instrumental_density (string): "Sparse", "Medium", "Dense", "Wall of Sound".
- vocal_intensity (string): "Soft whisper", "Melodic", "Screaming", "Fast Rap".
- cultural_context (string): e.g., "90s Grunge", "Modern Club", "Classic Rock".
- replay_value (float 0-1): How likely is this to be looped on repeat.
- time_of_day_fit (string): "Morning", "Afternoon", "Late Night", "Workout".
- context_tag (string): "None"
"""
    from google import genai
    from google.genai import types
    import json
    
    for attempt in range(2):
        current_key = gemini_keys[attempt % len(gemini_keys)]
        try:
            client_ai = genai.Client(api_key=current_key)
            response = await client_ai.aio.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3
                )
            )
            
            result_json = json.loads(response.text)
            return SemanticTelemetry(**result_json)
        except Exception as e:
            print(f"Gemini Inference Error (Attempt {attempt+1}): {e}")
        
    return fallback
        
    prompt = f"""You are a highly advanced musical psychologist and audio engineer AI. 
Analyze the semantic meaning, tone, and profile of this song based solely on its title, artist, and lyrics.
If lyrics are missing or sparse, make your best educated guess based on the artist and track name.

Track: {track_name} by {artist_name}
Lyrics:
{lyrics[:2000]}

Return exactly ONE valid JSON object with the following fields:
- valence (float 0-1): Positivity of the song.
- energy (float 0-1): Intensity and activity.
- danceability (float 0-1): How suitable it is for dancing.
- mood_category (string): e.g., "Euphoric", "Depressive Spiral", "Chill", "Aggressive".
- lyrics_analysis (string): 1-sentence summary of the thematic meaning.
- energy_weight (float 0-1): The "heaviness" or absolute intensity weight of the track.
- bpm_estimate (int): Estimated tempo based on lyrical pacing and genre.
- song_genre_estimate (string): e.g., "Trap", "Indie Folk", "Death Metal".
- acoustic_profile (string): e.g., "Blasting bass", "Calming acoustic notes", "Heavy synth".
- emotional_complexity (float 0-1): How mixed or nuanced the emotions are.
- lyrical_theme (string): e.g., "Heartbreak", "Rebellion", "Existential Dread".
- narrative_arc (string): Is there a story? e.g., "Rising tension", "Static", "Resolution".
- instrumental_density (string): "Sparse", "Medium", "Dense", "Wall of Sound".
- vocal_intensity (string): "Soft whisper", "Melodic", "Screaming", "Fast Rap".
- cultural_context (string): e.g., "90s Grunge", "Modern Club", "Classic Rock".
- replay_value (float 0-1): How likely is this to be looped on repeat.
- time_of_day_fit (string): "Morning", "Afternoon", "Late Night", "Workout".
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
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                
                if content.startswith("```json"):
                    content = content[7:-3]
                elif content.startswith("```"):
                    content = content[3:-3]
                    
                result = json.loads(content.strip())
                return SemanticTelemetry(**result)
            else:
                print(f"LLM API Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"LLM Inference Error: {e}")
        
    return fallback
