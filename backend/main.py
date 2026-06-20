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

from state import global_tokens
from spotify_client import SpotifyClient
from security import verify_access_token, encryptor
from database import db
from lyric_analyzer import get_lyrics_and_sentiment

@app.websocket("/ws/stream/live")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    await websocket.accept()

    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    # Verify JWT
    user_data = verify_access_token(token)
    if not user_data:
        await websocket.close(code=1008, reason="Invalid token")
        return

    user_id = user_data.get("sub")

    # Get user's refresh token from Firestore
    spotify_client = None
    try:
        SPOTIFY_SCOPES = "user-read-recently-played user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private user-top-read user-follow-read playlist-read-private user-library-read"
        user_ref = db.collection("users").document(user_id).get()
        if user_ref.exists:
            row = user_ref.to_dict()
            if row.get("refresh_token_cipher"):
                refresh_token = encryptor.decrypt(row["refresh_token_cipher"], row["refresh_token_nonce"])
                spotify_client = SpotifyClient(refresh_token=refresh_token)
    except Exception as e:
        print(f"WS Error (Firestore missing or error): {e}")

    try:
        last_track_id = None
        last_track_name = None
        last_artist_name = None
        last_duration_ms = 0
        max_progress_ms = 0
        started_at = None
        
        while True:
            # Fetch real live track data
            track_name = "No track playing"
            artist_name = "Unknown Artist"
            valence = 0.0
            arousal = 0.0
            energy = 0.0
            lyrics_text = None
            lyrical_valence = 0.0

            if spotify_client:
                try:
                    current_track = await spotify_client.get_currently_playing()
                    if current_track and current_track.get("item"):
                        track_id = current_track["item"]["id"]
                        track_name = current_track["item"]["name"]
                        artist_name = current_track["item"]["artists"][0]["name"]
                        progress_ms = current_track.get("progress_ms", 0)
                        duration_ms = current_track["item"].get("duration_ms", 1)
                        
                        # Track changing logic
                        if track_id != last_track_id:
                            if last_track_id is not None:
                                # Evaluate the previous track
                                percent_played = max_progress_ms / max(last_duration_ms, 1)
                                remaining_ms = last_duration_ms - max_progress_ms
                                
                                if remaining_ms <= 30000 or percent_played >= 0.95:
                                    listen_type = "complete"
                                    weight = 1.0
                                    if last_duration_ms > 480000:
                                        weight = 1.7
                                        listen_type = "legendary_complete"
                                    elif last_duration_ms > 240000:
                                        weight = 1.5
                                        listen_type = "epic_complete"
                                elif max_progress_ms < 30000:
                                    listen_type = "skip"
                                    weight = 0.0
                                elif percent_played < 0.5:
                                    listen_type = "partial_skip"
                                    weight = 0.1
                                else:
                                    listen_type = "semi_complete"
                                    weight = 0.6
                                    
                                # Insert into Firestore
                                doc_id = f"{user_id}_{started_at}_{last_track_id}".replace(":", "_").replace(".", "_")
                                db.collection("listening_history").document(doc_id).set({
                                    "time": started_at,
                                    "tenant_id": user_id,
                                    "track_id": last_track_id,
                                    "track_name": last_track_name,
                                    "artist_name": last_artist_name,
                                    "duration_ms": last_duration_ms,
                                    "played_ms": max_progress_ms,
                                    "listen_type": listen_type,
                                    "listen_weight": weight,
                                    "ml_analyzed": False
                                })
                            
                            # Initialize new track state
                            last_track_id = track_id
                            last_track_name = track_name
                            last_artist_name = artist_name
                            last_duration_ms = duration_ms
                            max_progress_ms = progress_ms
                            started_at = datetime.now(timezone.utc).isoformat()
                        else:
                            # Still same track
                            max_progress_ms = max(max_progress_ms, progress_ms)
                        
                        # Try to fetch real audio features for live inference
                        feat_resp = await spotify_client.get_audio_features([current_track["item"]["id"]])
                        if feat_resp.get("status") == "success" and feat_resp.get("data"):
                            feat = feat_resp["data"][0]
                            if feat:
                                valence = feat.get("valence", 0.0)
                                energy = feat.get("energy", 0.0)
                                arousal = energy
                                
                        # Try to fetch lyrics
                        lyrics_text, lyr_val = await get_lyrics_and_sentiment(track_name, artist_name)
                        if lyr_val is not None:
                            lyrical_valence = lyr_val
                        else:
                            lyrical_valence = 1.0 - valence if valence else 0.0

                    elif current_track and current_track.get("status") == "rate_limited":
                        print(f"Rate limited on Live Stream, backing off: {current_track.get('retry_after')}")
                        await asyncio.sleep(current_track.get("retry_after", 5))
                except Exception as e:
                    print(f"Spotify API Error: {e}")

            data = {
                "track": track_name,
                "artist": artist_name,
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
    except WebSocketDisconnect:
        print(f"Client {user_id} disconnected")
    finally:
        if spotify_client:
            await spotify_client.close()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend restored and running!"}

