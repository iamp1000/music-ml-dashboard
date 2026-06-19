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
        while True:
            # Fetch real live track data
            track_name = "No track playing"
            valence = 0.0
            arousal = 0.0
            energy = 0.0
            lyrics_text = None
            lyrical_valence = 0.0

            if spotify_client:
                try:
                    current_track = await spotify_client.get_currently_playing()
                    if current_track and current_track.get("status") == "playing":
                        artist_name = current_track.get('artist')
                        track_title = current_track.get('track')
                        track_name = f"{artist_name} - {track_title}"

                        # Try to fetch real audio features for live inference
                        feat_resp = await spotify_client.get_audio_features([current_track["id"]])
                        if feat_resp.get("status") == "success" and feat_resp.get("data"):
                            feat = feat_resp["data"][0]
                            if feat:
                                valence = feat.get("valence", 0.0)
                                energy = feat.get("energy", 0.0)
                                arousal = energy
                                
                        # Try to fetch lyrics
                        lyrics_text, lyr_val = await get_lyrics_and_sentiment(track_title, artist_name)
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
                "metrics": {
                    "valence": valence,
                    "arousal": arousal,
                    "energy": energy
                },
                "telemetry": {
                    "hr": 70, # Core placeholder until Phase 3 Hardware Integration
                    "reward": 50
                },
                "dissonance": {
                    "acoustic_valence": valence,
                    "lyrical_valence": lyrical_valence,
                    "lyrics": lyrics_text[:100] + "..." if lyrics_text else "No lyrics found for live track."
                }
            }
            await websocket.send_json(data)
            await asyncio.sleep(5.0) # Poll every 5 seconds
    except WebSocketDisconnect:
        print(f"Client {user_id} disconnected")
    finally:
        if spotify_client:
            await spotify_client.close()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend restored and running!"}

