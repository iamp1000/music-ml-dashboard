import os
import asyncio
import json
import random
from fastapi import FastAPI, WebSocket
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import math
import time
from datetime import datetime, timezone

from database import init_db, db
from routers import auth, telemetry, settings, spotify
import openai
from pydantic import BaseModel

# Load environment variables
load_dotenv()

app = FastAPI(title="Affective Music SaaS - Restored Backend")

@app.on_event("startup")
async def startup_event():
    try:
        # init_db is synchronous for firebase
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Warning: Database initialization failed. Ensure Firebase is configured. Error: {e}")
        
    # Start the background poller
    asyncio.create_task(background_polling_loop())
    asyncio.create_task(sync_recently_played_loop())

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
app.include_router(settings.router, prefix="/settings", tags=["Settings"])
app.include_router(spotify.router, prefix="/api/spotify", tags=["Spotify API"])

# Allow CORS for GitHub Pages / Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ContextUpdate(BaseModel):
    context: str

from typing import List
class SessionContextUpdate(BaseModel):
    document_ids: List[str]
    context: str

@app.put("/api/context")
async def update_context(request: ContextUpdate, token: str):
    user_data = verify_access_token(token)
    user_id = user_data.get("sub")
    db.collection("users").document(user_id).set({"current_context": request.context}, merge=True)
    return {"status": "success"}

@app.put("/api/history/session/context")
async def update_session_context(request: SessionContextUpdate, token: str):
    user_data = verify_access_token(token)
    user_id = user_data.get("sub")
    
    # Process each document ID
    for doc_id in request.document_ids:
        doc_ref = db.collection("listening_history").document(doc_id)
        doc = doc_ref.get()
        if not doc.exists:
            continue
            
        data = doc.to_dict()
        if data.get("tenant_id") != user_id:
            continue # Unauthorized or wrong user
            
        # Re-run DeepSeek AI
        track_name = data.get("track_name", "Unknown")
        artist_name = data.get("artist_name", "Unknown")
        valence = data.get("valence", 0.5)
        energy = data.get("energy", 0.5)
        
        mood, ai_analysis, time_fit = await run_deepseek_analysis(track_name, artist_name, valence, energy, request.context)
        
        # Update the document
        doc_ref.update({
            "context": request.context,
            "ai_mood": mood,
            "ai_analysis": ai_analysis,
            "time_of_day_fit": time_fit
        })
        
    return {"status": "success", "message": f"Updated {len(request.document_ids)} tracks."}

@app.get("/api/history")
async def get_history(token: str, limit: int = 50):
    user_data = verify_access_token(token)
    user_id = user_data.get("sub")
    
    docs = db.collection("listening_history")\
             .where("tenant_id", "==", user_id)\
             .order_by("time", direction="DESCENDING")\
             .limit(limit)\
             .stream()
             
    history = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        history.append(data)
        
    return {"status": "success", "data": history}

from state import global_tokens
from spotify_client import SpotifyClient
from security import verify_access_token, encryptor
from database import db
from lyric_analyzer import get_lyrics_and_sentiment

# Global state for background polling
user_spotify_clients = {}
user_playback_state = {}
user_ml_sessions = {}

def calculate_ml_weight(user_id, track_id, played_ms, duration_ms, valence, energy):
    """
    Calculates the multi-dimensional ML score and normalizes it 0-100.
    Maintains a rolling state machine per user for Rage Quits, Repeats, and Recoveries.
    """
    percentage = played_ms / duration_ms if duration_ms > 0 else 0
    engagement_score = round(percentage, 2)
    skip_penalty = 1.0 - percentage if percentage < 0.2 else 0.0
    
    if user_id not in user_ml_sessions:
        user_ml_sessions[user_id] = {"recent_tracks": [], "rapid_skip_count": 0}
        
    session = user_ml_sessions[user_id]
    rage_quit_penalty = 0.0
    recovery_bonus = 0.0
    
    # Rage Quit & Recovery Logic
    if percentage < 0.1 or played_ms < 15000:
        session["rapid_skip_count"] += 1
    else:
        if session["rapid_skip_count"] >= 3 and percentage >= 0.9:
            recovery_bonus = 0.5
        session["rapid_skip_count"] = 0
        
    if session["rapid_skip_count"] >= 3:
        rage_quit_penalty = 1.0
        
    # Repeat Bonus
    repeat_count = sum(1 for t in session["recent_tracks"] if t["track_id"] == track_id)
    repeat_bonus = 0.2 * repeat_count
        
    # Mood Affinity Bonus (Cosine Similarity Proxy)
    mood_affinity_bonus = 0.0
    if session["recent_tracks"]:
        avg_valence = sum(t["valence"] for t in session["recent_tracks"]) / len(session["recent_tracks"])
        avg_energy = sum(t["energy"] for t in session["recent_tracks"]) / len(session["recent_tracks"])
        dist = ((valence - avg_valence)**2 + (energy - avg_energy)**2)**0.5
        similarity = max(0, 1.0 - dist)
        mood_affinity_bonus = similarity * 0.3
        
    context_bonus = 0.2 if percentage >= 0.2 else 0.0
    mood_transition_bonus = 0.0
    
    raw_score = (
        engagement_score 
        + mood_affinity_bonus 
        + mood_transition_bonus 
        + repeat_bonus 
        + context_bonus 
        + recovery_bonus
        - skip_penalty 
        - rage_quit_penalty
    )
    
    # Normalize approx -1.0 to 2.0 -> 0 to 100
    clamped = max(-1.0, min(2.0, raw_score))
    ml_score = int(((clamped + 1.0) / 3.0) * 100)
    
    session["recent_tracks"].append({
        "track_id": track_id,
        "valence": valence,
        "energy": energy
    })
    if len(session["recent_tracks"]) > 10:
        session["recent_tracks"].pop(0)
        
    listen_type = "complete"
    if percentage < 0.1 or played_ms < 15000:
        listen_type = "quick_skip"
    elif percentage < 0.5:
        listen_type = "partial_skip"
    elif percentage < 0.9:
        listen_type = "long_listen"
        
    return ml_score, listen_type

async def background_polling_loop():
    """
    Runs continuously, checking all users' Spotify playback every 20 seconds.
    If a song is skipped or finishes, it is saved to telemetry_history.
    """
    print("Background polling loop started.")
    while True:
        try:
            users_ref = db.collection("users").stream()
            for user_doc in users_ref:
                user_id = user_doc.id
                row = user_doc.to_dict()
                
                # We need a refresh token to poll
                if not row.get("refresh_token_cipher"):
                    continue
                
                # Instantiate or retrieve client
                if user_id not in user_spotify_clients:
                    try:
                        refresh_token = encryptor.decrypt(row["refresh_token_cipher"], row["refresh_token_nonce"])
                        user_spotify_clients[user_id] = SpotifyClient(refresh_token=refresh_token)
                    except Exception as e:
                        print(f"Failed to decrypt token for {user_id}: {e}")
                        continue
                        
                client = user_spotify_clients[user_id]
                
                try:
                    current_track = await client.get_currently_playing()
                    state = user_playback_state.get(user_id, {})
                    last_track_id = state.get("last_track_id")
                    
                    if current_track and current_track.get("status") == "playing":
                        track_id = current_track.get("id")
                        progress_ms = current_track.get("progress_ms", 0)
                        duration_ms = current_track.get("duration_ms", 0)
                        
                        if track_id != last_track_id:
                            # Song changed! Save the previous one if listened for > 10 seconds
                            if last_track_id and state.get("max_progress_ms", 0) > 10000:
                                await save_track_to_db(user_id, state, client)
                                
                            # Update to new track
                            user_playback_state[user_id] = {
                                "last_track_id": track_id,
                                "track_name": current_track.get("track"),
                                "artist_name": current_track.get("artist"),
                                "duration_ms": duration_ms,
                                "max_progress_ms": progress_ms,
                                "started_at": datetime.now(timezone.utc).isoformat()
                            }
                        else:
                            # Still playing same track, update progress
                            state["max_progress_ms"] = max(state.get("max_progress_ms", 0), progress_ms)
                            user_playback_state[user_id] = state
                            
                    elif current_track and current_track.get("status") == "inactive":
                        # Stopped playing. Save last track if valid
                        if last_track_id and state.get("max_progress_ms", 0) > 10000:
                            await save_track_to_db(user_id, state, client)
                        
                        if user_id in user_playback_state:
                            del user_playback_state[user_id]
                            
                except Exception as e:
                    print(f"Error polling for {user_id}: {e}")
                    
        except Exception as e:
            print(f"Background loop outer error: {e}")
            
        await asyncio.sleep(20)

async def sync_recently_played_loop():
    """
    Runs every 30 minutes to fetch /recently-played and backfill any missing tracks.
    Includes Time-Windowed Matcher to prevent duplicates.
    """
    print("Recently played sync loop started.")
    await asyncio.sleep(60) # Wait slightly on startup
    
    while True:
        try:
            users_ref = db.collection("users").stream()
            for user_doc in users_ref:
                user_id = user_doc.id
                row = user_doc.to_dict()
                
                if user_id in user_spotify_clients:
                    client = user_spotify_clients[user_id]
                else:
                    if not row.get("refresh_token_cipher"):
                        continue
                    try:
                        refresh_token = encryptor.decrypt(row["refresh_token_cipher"], row["refresh_token_nonce"])
                        client = SpotifyClient(refresh_token=refresh_token)
                        user_spotify_clients[user_id] = client
                    except Exception as e:
                        print(f"Failed to decrypt token for sync {user_id}: {e}")
                        continue
                        
                try:
                    res = await client.get_recently_played(limit=50)
                    if res.get("status") == "success" and res.get("data"):
                        recent_tracks = res["data"]
                        now = datetime.now(timezone.utc)
                        
                        for item in recent_tracks:
                            track = item.get("track")
                            played_at_str = item.get("played_at")
                            if not track or not played_at_str:
                                continue
                                
                            track_id = track.get("id")
                            try:
                                played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))
                            except ValueError:
                                continue
                                
                            # Skip if played more than 24 hours ago
                            if (now - played_at).total_seconds() > 86400:
                                continue
                                
                            # Time-Windowed Matcher: Search for exact track_id within +/- 5 minutes
                            docs = db.collection("listening_history").where("tenant_id", "==", user_id).where("track_id", "==", track_id).stream()
                                     
                            is_duplicate = False
                            for doc in docs:
                                d_time_str = doc.to_dict().get("time")
                                if d_time_str:
                                    try:
                                        d_time = datetime.fromisoformat(d_time_str.replace("Z", "+00:00"))
                                        diff = abs((d_time - played_at).total_seconds())
                                        if diff < 300: # 5 minutes window
                                            is_duplicate = True
                                            break
                                    except ValueError:
                                        pass
                                        
                            if is_duplicate:
                                continue
                                
                            print(f"Syncing missing track for {user_id}: {track.get('name')}")
                            
                            duration_ms = track.get("duration_ms", 1)
                            artist_name = ", ".join([a.get("name") for a in track.get("artists", [])])
                            
                            valence, energy = 0.5, 0.5
                            try:
                                feat_resp = await client.get_audio_features([track_id])
                                if feat_resp.get("status") == "success" and feat_resp.get("data"):
                                    feat = feat_resp["data"][0]
                                    if feat:
                                        valence = feat.get("valence", 0.5)
                                        energy = feat.get("energy", 0.5)
                            except Exception:
                                pass
                                
                            ml_score, listen_type = calculate_ml_weight(user_id, track_id, duration_ms, duration_ms, valence, energy)
                            listen_weight = ml_score
                                
                            lyrics_text, lyr_val = await get_lyrics_and_sentiment(track.get("name"), artist_name)
                            lyrical_valence = lyr_val if lyr_val is not None else (1.0 - valence if valence else 0.5)
                            
                            current_context = row.get("current_context", "None")
                            mood, ai_analysis, time_of_day_fit = await run_deepseek_analysis(
                                track.get("name"), artist_name, valence, energy, current_context
                            )
                            
                            db.collection("listening_history").add({
                                "time": played_at_str,
                                "tenant_id": user_id,
                                "track_id": track_id,
                                "track_name": track.get("name"),
                                "artist_name": artist_name,
                                "duration_ms": duration_ms,
                                "played_ms": duration_ms,
                                "listen_type": listen_type,
                                "listen_weight": listen_weight,
                                "valence": valence,
                                "energy": energy,
                                "mood_category": mood,
                                "acoustic_valence": valence,
                                "lyrical_valence": lyrical_valence,
                                "dissonance_score": abs(valence - lyrical_valence),
                                "ml_analyzed": True,
                                "context": current_context,
                                "ai_analysis": ai_analysis,
                                "time_of_day_fit": time_of_day_fit,
                                "sync_source": "recently_played_api"
                            })
                            
                except Exception as e:
                    print(f"Error in recently-played sync for {user_id}: {e}")
                    
        except Exception as e:
            print(f"Sync loop outer error: {e}")
            
        await asyncio.sleep(1800) # 30 minutes

async def run_deepseek_analysis(track_name, artist_name, valence, energy, current_context):
    ai_mood = "Unknown"
    ai_analysis = "AI analysis unavailable."
    time_of_day_fit = "Anytime"
    
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    if deepseek_key:
        try:
            client_ai = openai.AsyncOpenAI(api_key=deepseek_key, base_url="https://api.deepseek.com")
            prompt = f"""
            Analyze this song: "{track_name}" by {artist_name}.
            Audio Features: Valence={valence}, Energy={energy}.
            User's current activity context: {current_context}.
            
            Provide a JSON response with exactly these keys:
            - "ai_mood": A highly specific, nuanced mood (e.g., "Late Night Nostalgia", "Aggressive Workout", "Melancholy Reflection"). Max 4 words.
            - "ai_analysis": One sentence explaining why this song fits this mood and context.
            - "time_of_day_fit": Best time of day to listen to this (e.g., "Late Night", "Morning", "Afternoon").
            """
            
            response = await client_ai.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a music mood analyzer. Output ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            ai_mood = result.get("ai_mood", ai_mood)
            ai_analysis = result.get("ai_analysis", ai_analysis)
            time_of_day_fit = result.get("time_of_day_fit", time_of_day_fit)
        except Exception as e:
            print(f"DeepSeek AI Error: {e}")

    # Heuristic fallback mood
    mood = ai_mood if ai_mood != "Unknown" else "Unknown"
    if mood == "Unknown":
        if valence > 0.5 and energy > 0.5:
            mood = "Euphoric"
        elif valence < 0.5 and energy > 0.5:
            mood = "Aggressive"
        elif valence < 0.5 and energy < 0.5:
            mood = "Depressive Spiral"
        else:
            mood = "Deep Focus"
            
    return mood, ai_analysis, time_of_day_fit

async def save_track_to_db(user_id, state, client):
    """Helper to analyze and save a track when it's done playing."""
    track_id = state["last_track_id"]
    track_name = state["track_name"]
    artist_name = state["artist_name"]
    
    valence, energy = 0.5, 0.5
    try:
        feat_resp = await client.get_audio_features([track_id])
        if feat_resp.get("status") == "success" and feat_resp.get("data"):
            feat = feat_resp["data"][0]
            if feat:
                valence = feat.get("valence", 0.5)
                energy = feat.get("energy", 0.5)
    except Exception as e:
        print(f"Failed to fetch features for background save: {e}")

    lyrics_text, lyr_val = await get_lyrics_and_sentiment(track_name, artist_name)
    if lyr_val is not None:
        lyrical_valence = lyr_val
    else:
        lyrical_valence = 1.0 - valence if valence else 0.5

    # Retrieve user's current context
    user_doc = db.collection("users").document(user_id).get()
    current_context = user_doc.to_dict().get("current_context", "None") if user_doc.exists else "None"

    # Run DeepSeek AI Integration
    mood, ai_analysis, time_of_day_fit = await run_deepseek_analysis(track_name, artist_name, valence, energy, current_context)

    played_ms = state.get("max_progress_ms", 0)
    duration_ms = state.get("duration_ms", 1)
    
    ml_score, listen_type = calculate_ml_weight(user_id, track_id, played_ms, duration_ms, valence, energy)
    listen_weight = ml_score # Store normalized score in listen_weight key
    
    try:
        db.collection("listening_history").add({
            "time": datetime.now(timezone.utc).isoformat(),
            "tenant_id": user_id,
            "track_id": track_id,
            "track_name": track_name,
            "artist_name": artist_name,
            "duration_ms": state["duration_ms"],
            "played_ms": state["max_progress_ms"],
            "listen_type": listen_type,
            "listen_weight": listen_weight,
            "valence": valence,
            "energy": energy,
            "mood_category": mood,
            "acoustic_valence": valence,
            "lyrical_valence": lyrical_valence,
            "dissonance_score": abs(valence - lyrical_valence),
            "ml_analyzed": True,
            "context": current_context,
            "ai_analysis": ai_analysis,
            "time_of_day_fit": time_of_day_fit
        })
        print(f"Background recorded track for {user_id}: {track_name} (Context: {current_context}, AI Mood: {ai_mood})")
    except Exception as e:
        print(f"Failed to save background track to DB: {e}")

@app.websocket("/ws/stream/live")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    await websocket.accept()
    print("=== [WS] Connection accepted ===")

    if not token:
        print("=== [WS] Missing token ===")
        await websocket.close(code=1008, reason="Missing token")
        return

    # Verify JWT
    user_data = verify_access_token(token)
    if not user_data:
        print("=== [WS] Invalid token ===")
        await websocket.close(code=1008, reason="Invalid token")
        return

    user_id = user_data.get("sub")
    print(f"=== [WS] User authenticated: {user_id} ===")

    # Get user's refresh token from Firestore
    spotify_client = None
    try:
        user_ref = db.collection("users").document(user_id).get()
        if user_ref.exists:
            row = user_ref.to_dict()
            if row.get("refresh_token_cipher"):
                refresh_token = encryptor.decrypt(row["refresh_token_cipher"], row["refresh_token_nonce"])
                spotify_client = SpotifyClient(refresh_token=refresh_token)
                print("=== [WS] Spotify Client instantiated successfully ===")
            else:
                print("=== [WS] No refresh_token_cipher in Firestore ===")
        else:
            print("=== [WS] User document does not exist in Firestore ===")
    except Exception as e:
        print(f"=== [WS] Error initializing Spotify client: {e} ===")

    try:
        while True:
            # Fetch real live track data
            if spotify_client:
                try:
                    current_track = await spotify_client.get_currently_playing()
                    if current_track and current_track.get("status") == "playing":
                        track_id = current_track["id"]
                        track_name = current_track["track"]
                        artist_name = current_track["artist"]
                        progress_ms = current_track.get("progress_ms", 0)
                        duration_ms = current_track.get("duration_ms", 1)
                        album_art = current_track.get("album_art")
                        
                        valence = 0.5
                        energy = 0.5
                        arousal = 0.5
                        lyrical_valence = 0.5
                        lyrics_text = None

                        # Try to fetch real audio features for live inference
                        feat_resp = await spotify_client.get_audio_features([track_id])
                        if feat_resp.get("status") == "success" and feat_resp.get("data"):
                            feat = feat_resp["data"][0]
                            if feat:
                                valence = feat.get("valence", 0.5)
                                energy = feat.get("energy", 0.5)
                                arousal = energy
                                
                        # Try to fetch lyrics
                        lyrics_text, lyr_val = await get_lyrics_and_sentiment(track_name, artist_name)
                        if lyr_val is not None:
                            lyrical_valence = lyr_val
                        else:
                            lyrical_valence = 1.0 - valence if valence else 0.5

                        data = {
                            "status": "playing",
                            "track": track_name,
                            "artist": artist_name,
                            "id": track_id,
                            "progress_ms": progress_ms,
                            "duration_ms": duration_ms,
                            "album_art": album_art,
                            "metrics": {
                                "valence": valence,
                                "arousal": arousal,
                                "energy": energy
                            },
                            "telemetry": {
                                "hr": 70, 
                                "reward": 50
                            },
                            "dissonance": {
                                "acoustic_valence": valence,
                                "lyrical_valence": lyrical_valence,
                                "lyrics": lyrics_text[:100] + "..." if lyrics_text else "No lyrics found for live track."
                            }
                        }
                        await websocket.send_json(data)
                        await asyncio.sleep(5.0)
                        continue

                    elif current_track and current_track.get("status") == "rate_limited":
                        print(f"Rate limited on Live Stream, backing off: {current_track.get('retry_after')}")
                        await asyncio.sleep(current_track.get("retry_after", 5))
                        continue
                        
                except Exception as e:
                    print(f"Spotify API Error: {e}")

            # Fallback if no track or error
            await websocket.send_json({"status": "inactive"})
            await asyncio.sleep(5.0) 

    except WebSocketDisconnect:
        print(f"Client {user_id} disconnected")
    finally:
        if spotify_client:
            await spotify_client.close()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend restored and running!"}

