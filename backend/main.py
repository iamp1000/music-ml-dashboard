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

from database import init_db
from routers import auth, telemetry

# Load environment variables
load_dotenv()

app = FastAPI(title="Affective Music SaaS - Restored Backend")

@app.on_event("startup")
async def startup_event():
    try:
        await init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Warning: Database initialization failed. Ensure Postgres is running. Error: {e}")

app.include_router(auth.router)
app.include_router(telemetry.router)

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

@app.websocket("/ws/stream/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    spotify_client = SpotifyClient(
        access_token=global_tokens.get("access_token"),
        refresh_token=global_tokens.get("refresh_token")
    )
    try:
        t = 0
        while True:
            # Generate realistic oscillating inference data
            valence = math.sin(t * 0.1) * 0.5 + 0.5
            arousal = math.cos(t * 0.15) * 0.5 + 0.5
            energy = math.sin(t * 0.2) * 0.5 + 0.5
            hr = 75 + math.sin(t * 0.05) * 15
            reward = 50 + t * 0.5
            
            # Fetch real track data
            track_name = "Waiting for Spotify..."
            if global_tokens.get("access_token") or global_tokens.get("refresh_token"):
                spotify_client.access_token = global_tokens.get("access_token")
                spotify_client.refresh_token = global_tokens.get("refresh_token")
                try:
                    current_track = await spotify_client.get_currently_playing()
                    if current_track.get("status") == "playing":
                        track_name = f"{current_track.get('artist')} - {current_track.get('track')}"
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
                    "hr": hr,
                    "reward": reward
                },
                "dissonance": {
                    "acoustic_valence": valence,
                    "lyrical_valence": 1.0 - valence
                }
            }
            await websocket.send_json(data)
            await asyncio.sleep(2.0)
            t += 1
    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        await spotify_client.close()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend restored and running!"}
