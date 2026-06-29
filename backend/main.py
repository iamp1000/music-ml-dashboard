import os
import asyncio
import json
import random
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import math
import time
from datetime import datetime, timezone


from ml_engine.utils.feature_extractor import FeatureExtractor
from ml_engine.utils.vector_math import VectorMathEngine
import pandas as pd

from database import SessionLocal, get_db
from routers import auth, telemetry, settings, spotify, ml
from google import genai
from google.genai import types
from pydantic import BaseModel

# Load environment variables
load_dotenv()

app = FastAPI(title="Affective Music SaaS - Restored Backend")

is_gemini_failing = False

@app.on_event("startup")
async def startup_event():
    print("FastAPI TiDB Backend Starting...")
    # Start the background poller
    asyncio.create_task(refresh_users_cache())
    asyncio.create_task(background_polling_loop())
    asyncio.create_task(sync_recently_played_loop())
    # Initialize background task for memory queue
    asyncio.create_task(process_5min_batch_queue_loop())


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

# Legacy callback route to catch Spotify redirects using the old URI
@app.get("/auth/callback", include_in_schema=False)
async def legacy_callback(request: Request):
    # Reconstruct the exact same query parameters and pass them to the correct API route
    query_string = request.url.query
    return RedirectResponse(url=f"/api/auth/callback?{query_string}")

app.include_router(telemetry.router, prefix="/api/telemetry", tags=["Telemetry"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(spotify.router, prefix="/api/spotify", tags=["Spotify"])
app.include_router(ml.router, prefix="/api/ml", tags=["ML"])

# Allow CORS for GitHub Pages / Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/telemetry/gemini_status")
async def get_gemini_status():
    global is_gemini_failing
    return {"is_failing": is_gemini_failing}

@app.get("/google416fb1ef855d328e.html")
async def google_verification():
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content="google-site-verification: google416fb1ef855d328e.html")

@app.get("/ml_jobs/pending")
async def get_pending_ml_jobs(limit: int = 3):
    with SessionLocal() as db:
        # Group by track and artist so local worker doesn't analyze same track 100 times
        from sqlalchemy import func
        pending = db.query(ListeningHistory.track_name, ListeningHistory.artist_name, func.max(ListeningHistory.id).label('doc_id'))\
                    .filter(ListeningHistory.audio_ml_analyzed == 0)\
                    .group_by(ListeningHistory.track_name, ListeningHistory.artist_name)\
                    .limit(limit).all()
        
        jobs = []
        for p in pending:
            jobs.append({
                "doc_id": p.doc_id,
                "track_name": p.track_name,
                "artist_name": p.artist_name
            })
        return {"data": jobs}

class MLJobResult(BaseModel):
    doc_id: int
    real_bpm: float
    rhythm_regularity: float
    real_genre: str
    genre_confidence: float
    valence: float
    arousal: float

@app.post("/ml_jobs/complete")
async def complete_ml_job(payload: MLJobResult):
    with SessionLocal() as db:
        # Find the track to get name/artist
        ref_track = db.query(ListeningHistory).filter(ListeningHistory.id == payload.doc_id).first()
        if not ref_track:
            return {"status": "error", "message": "Reference track not found"}
            
        # Update ALL rows matching this track/artist for ALL users!
        db.query(ListeningHistory).filter(
            ListeningHistory.track_name == ref_track.track_name,
            ListeningHistory.artist_name == ref_track.artist_name,
            ListeningHistory.audio_ml_analyzed == 0
        ).update({
            "audio_ml_analyzed": 1,
            "real_bpm": payload.real_bpm,
            "rhythm_regularity": payload.rhythm_regularity,
            "real_genre": payload.real_genre,
            "genre_confidence": payload.genre_confidence,
            "valence": payload.valence,
            "audio_valence": payload.valence,
            "energy": payload.arousal,
            "audio_arousal": payload.arousal
        }, synchronize_session=False)
        
        db.commit()
    return {"status": "success"}

class ContextUpdate(BaseModel):
    context: str

from typing import List
class SessionContextUpdate(BaseModel):
    document_ids: List[str]
    context: str

@app.get("/api/context")
async def get_context(token: str, db: Session = Depends(get_db)):
    user_data = verify_access_token(token)
    user_id = user_data.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    current = user.current_context if user else "None"
    return {"status": "success", "context": current}

from fastapi import BackgroundTasks

async def retroactive_session_update(user_id: str, new_context: str):
    with SessionLocal() as db:
        docs_list = db.query(ListeningHistory).filter(ListeningHistory.tenant_id == user_id).order_by(desc(ListeningHistory.time)).limit(30).all()
    
    
    if not docs_list:
        return
        
    session_docs = [docs_list[0]]
    for i in range(1, len(docs_list)):
        try:
            prev_time_str = docs_list[i-1].time.replace("Z", "+00:00")
            curr_time_str = docs_list[i].time.replace("Z", "+00:00")
            from datetime import datetime
            prev_time = datetime.fromisoformat(prev_time_str)
            curr_time = datetime.fromisoformat(curr_time_str)
            
            if (prev_time - curr_time).total_seconds() > 30 * 60:
                break
            session_docs.append(docs_list[i])
        except Exception as e:
            print(f"Time parsing error in grouping: {e}")
            break
            
    for doc in session_docs:
        try:
            doc.context = new_context
            db.commit()
        except Exception:
            pass

@app.put("/api/context")
async def update_context(request: ContextUpdate, token: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user_data = verify_access_token(token)
    user_id = user_data.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.current_context = request.context
        db.commit()
    background_tasks.add_task(retroactive_session_update, user_id, request.context)
    return {"status": "success"}

@app.put("/api/history/session/context")
async def update_session_context(request: SessionContextUpdate, token: str, db: Session = Depends(get_db)):
    user_data = verify_access_token(token)
    user_id = user_data.get("sub")
    
    # Process each document ID
    for doc_id in request.document_ids:
        doc = db.query(ListeningHistory).filter(ListeningHistory.id == doc_id).first()
        if not doc:
            continue
        if doc.tenant_id != user_id:
            continue # Unauthorized or wrong user
            
        # Re-run Gemini AI
        track_name = doc.track_name or "Unknown"
        artist_name = doc.artist_name or "Unknown"
        valence = doc.valence or 0.5
        energy = doc.energy or 0.5
        
        mood, ai_analysis, time_fit = await run_gemini_analysis(track_name, artist_name, valence, energy, request.context)
        
        # Update the document
        doc.context = request.context
        # Optional: Save AI fields if added to model later
        db.commit()
        
    return {"status": "success", "message": f"Updated {len(request.document_ids)} tracks."}

@app.get("/api/history")
async def get_history(token: str, limit: int = 50, db: Session = Depends(get_db)):
    user_data = verify_access_token(token)
    user_id = user_data.get("sub")
    
    docs = db.query(ListeningHistory).filter(ListeningHistory.tenant_id == user_id).order_by(desc(ListeningHistory.time)).limit(limit).all()
             
    history = []
    for doc in docs:
        history.append({"id": doc.id, "tenant_id": doc.tenant_id, "time": doc.time, "track_name": doc.track_name, "artist_name": doc.artist_name, "context": doc.context})
        
    return {"status": "success", "data": history}

from state import global_tokens, active_users_cache
from spotify_client import SpotifyClient
from security import verify_access_token, encryptor
from database import SessionLocal, get_db
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import User, ListeningHistory
from fastapi import Depends
from lyric_analyzer import get_lyrics_and_sentiment

# Global state for background polling
user_spotify_clients = {}
user_playback_state = {}
user_last_active_time = {}
user_ml_sessions = {}

user_last_poll_time = {}
user_last_poll_data = {}
five_min_batch_queue = []

async def get_cached_currently_playing(user_id, client):
    import time
    now = time.time()
    if user_id not in user_last_poll_time or (now - user_last_poll_time[user_id]) >= 15:
        data = await client.get_currently_playing()
        user_last_poll_time[user_id] = now
        user_last_poll_data[user_id] = data
        return data
    return user_last_poll_data.get(user_id)

def calculate_ml_weight(user_id, track_id, played_ms, duration_ms, valence, energy):
    """
    Calculates the multi-dimensional ML score and normalizes it 0-100.
    Maintains a rolling state machine per user for Rage Quits, Repeats, and Recoveries.
    """
    val = valence if valence is not None else 0.5
    eng = energy if energy is not None else 0.5
    
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
        dist = ((val - avg_valence)**2 + (eng - avg_energy)**2)**0.5
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
    
    import time
    session["recent_tracks"].append({
        "track_id": track_id,
        "valence": val,
        "energy": eng,
        "time": time.time()
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


async def refresh_users_cache():
    while True:
        try:
            with SessionLocal() as db:
                users_ref = db.query(User).all()
                for user_doc in users_ref:
                    active_users_cache[user_doc.id] = {
                        "display_name": user_doc.display_name,
                        "current_context": user_doc.current_context,
                        "access_token_cipher": user_doc.access_token_cipher,
                        "access_token_nonce": user_doc.access_token_nonce,
                        "refresh_token_cipher": user_doc.refresh_token_cipher,
                        "refresh_token_nonce": user_doc.refresh_token_nonce
                    }
            print("Refreshed active users cache")
        except Exception as e:
            print(f"Error refreshing users cache: {e}")
        await asyncio.sleep(1800) # 30 minutes

async def background_polling_loop():

    """
    Runs continuously, checking all users' Spotify playback every 20 seconds.
    If a song is skipped or finishes, it is saved to telemetry_history.
    """
    print("Background polling loop started.")
    while True:
        try:
            for user_id, row in list(active_users_cache.items()):
                
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
                    current_track = await get_cached_currently_playing(user_id, client)
                    state = user_playback_state.get(user_id, {})
                    last_track_id = state.get("last_track_id")
                    
                    if current_track and current_track.get("status") == "playing":
                        import time
                        user_last_active_time[user_id] = time.time()
                        
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
                            
                        # Auto-reset context after 15 mins of inactivity
                        import time
                        last_active = user_last_active_time.get(user_id)
                        if last_active and time.time() - last_active > 15 * 60:
                            if row.get("current_context") and row.get("current_context") != "None":
                                try:
                                    with SessionLocal() as db:
                                        u = db.query(User).filter(User.id == user_id).first()
                                        if u and u.current_context != "None":
                                            u.current_context = "None"
                                            db.commit()
                                            print(f"Auto-reset context to None for {user_id} due to 15m inactivity.")
                                except Exception as e:
                                    print(f"Failed to reset context for {user_id}: {e}")
                            if user_id in user_last_active_time:
                                del user_last_active_time[user_id]
                            
                except Exception as e:
                    print(f"Error polling for {user_id}: {e}")
                    
        except Exception as e:
            print(f"Background loop outer error: {e}")
            
        await asyncio.sleep(20)

def calculate_and_store_aggregates(user_id: str, db: Session):
    try:
        from models import UserAggregates, ListeningHistory
        from datetime import datetime, timezone, timedelta
        
        one_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
        history = db.query(ListeningHistory).filter(
            ListeningHistory.tenant_id == user_id, 
            ListeningHistory.time >= one_year_ago
        ).all()
        
        total_time_mins = 0
        artists = set()
        genre_counts = {}
        track_counts = {}
        date_counts = {}
        
        for h in history:
            dur_ms = h.duration_ms if h.duration_ms else 204000
            total_time_mins += dur_ms / 60000
            
            if h.artist_name:
                artists.add(h.artist_name)
                
            # Genre logic matching frontend
            genre = h.real_genre
            if not genre and h.ml_features:
                genre = h.ml_features.get("mood_category") or h.ml_features.get("telemetry_summary")
            if genre:
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
                
            # Top Tracks
            t_key = f"{h.track_name} - {h.artist_name}"
            if t_key not in track_counts:
                track_counts[t_key] = {"name": h.track_name, "artist": h.artist_name, "count": 0}
            track_counts[t_key]["count"] += 1
            
            # Timeline data
            try:
                date_str = h.time[:10]
                if date_str not in date_counts:
                    date_counts[date_str] = {"time": 0, "valence": 0, "energy": 0, "count": 0}
                date_counts[date_str]["time"] += dur_ms / 60000
                date_counts[date_str]["valence"] += h.valence if h.valence is not None else 0.5
                date_counts[date_str]["energy"] += h.energy if h.energy is not None else 0.5
                date_counts[date_str]["count"] += 1
            except:
                pass
                
        # Format Top Genres
        sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_genres_formatted = [{"name": g[0], "value": g[1]} for g in sorted_genres]
        
        # Format Top Tracks
        sorted_tracks = sorted(track_counts.values(), key=lambda x: x["count"], reverse=True)[:5]
        
        # Format Timeline
        timeline_data = []
        for date, d in date_counts.items():
            timeline_data.append({
                "name": date,
                "time": round(d["time"]),
                "mood": round((d["valence"] / d["count"]) * 100),
                "energy": round((d["energy"] / d["count"]) * 100)
            })
        timeline_data = sorted(timeline_data, key=lambda x: x["name"])[-30:] # Last 30 days
        
        # Upsert
        agg = db.query(UserAggregates).filter(UserAggregates.tenant_id == user_id).first()
        if not agg:
            agg = UserAggregates(tenant_id=user_id)
            db.add(agg)
            
        agg.updated_at = datetime.now(timezone.utc)
        agg.total_listening_time_mins = round(total_time_mins)
        agg.total_tracks_played = len(history)
        agg.artists_discovered = len(artists)
        agg.genres_explored = len(genre_counts.keys()) or 1
        agg.top_genres_json = top_genres_formatted
        agg.top_artists_json = sorted_tracks # Actually top tracks, matching frontend's usage
        agg.timeline_data_json = timeline_data
        
        db.commit()
    except Exception as e:
        print(f"Error calculating aggregates for {user_id}: {e}")

async def sync_recently_played_loop():
    """
    Runs every 30 minutes to fetch /recently-played and backfill any missing tracks.
    Includes Time-Windowed Matcher to prevent duplicates.
    """
    print("Recently played sync loop started.")
    await asyncio.sleep(60) # Wait slightly on startup
    
    while True:
        try:
            for user_id, row in list(active_users_cache.items()):
                
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
                    tracks_to_process = []
                    res = await client.get_recently_played(limit=50)
                    if res.get("status") == "success" and res.get("data"):
                        recent_tracks = res["data"]
                        now = datetime.now(timezone.utc)
                        
                        # Fetch 24-hour history in ONE query instead of 50 separate queries to save database Request Units
                        from datetime import timedelta
                        one_day_ago = (now - timedelta(days=1)).isoformat()
                        with SessionLocal() as db:
                            db_recent_history = db.query(ListeningHistory).filter(
                                ListeningHistory.tenant_id == user_id,
                                ListeningHistory.time >= one_day_ago
                            ).all()
                            
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
                                
                            # Time-Windowed Matcher: Search memory instead of hitting the database
                            is_duplicate = False
                            for doc in db_recent_history:
                                if doc.track_id != track_id:
                                    continue
                                d_time_str = getattr(doc, "time", None)
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
                            tracks_to_process.append((track, track_id, played_at_str))

                    # Batch processing in chunks of 10
                    for i in range(0, len(tracks_to_process), 10):
                        batch = tracks_to_process[i:i+10]
                        batch_payload = []
                        
                        for track, track_id, p_str in batch:
                            duration_ms = track.get("duration_ms", 1)
                            artist_name = ", ".join([a.get("name") for a in track.get("artists", [])])
                            
                            valence, energy = None, None
                            
                            ml_score, listen_type = calculate_ml_weight(user_id, track_id, duration_ms, duration_ms, valence, energy)
                            
                            batch_payload.append({
                                "track_id": track_id,
                                "track_name": track.get("name"),
                                "artist_name": artist_name,
                                "valence": valence,
                                "energy": energy,
                                "base_weight": ml_score,
                                "listen_type": listen_type,
                                "played_at_str": p_str,
                                "duration_ms": duration_ms
                            })
                            
                        current_context = row.get("current_context", "None")
                        batch_results = await run_gemini_batch_analysis(batch_payload, current_context)
                        
                        # Process and save batch results
                        for t_data in batch_payload:
                            ai_res = batch_results.get(t_data["track_id"], {})
                            
                            # Combine base weight and incremental weight into a single final variable
                            incremental = ai_res.get("incremental_weight", 0.0)
                            final_weight = min(100, max(0, int(t_data["base_weight"] + incremental)))
                            
                            with SessionLocal() as db:
                                new_hist = ListeningHistory(
                                    time=t_data["played_at_str"],
                                    tenant_id=user_id,
                                    track_id=t_data["track_id"],
                                    track_name=t_data["track_name"],
                                    artist_name=t_data["artist_name"],
                                    duration_ms=t_data["duration_ms"],
                                    played_ms=t_data["duration_ms"],
                                    listen_type=t_data["listen_type"],
                                    listen_weight=final_weight,
                                    valence=t_data["valence"],
                                    energy=t_data["energy"],
                                    context=current_context,
                                    ml_features={
                                        "mood_vector": ai_res.get("mood_vector", [0.5, 0.5, 0.5]),
                                        "context_fit_status": ai_res.get("context_fit_status", "MATCH"),
                                        "exclusion_flags": ai_res.get("exclusion_flags", []),
                                        "telemetry_summary": ai_res.get("telemetry_summary", "AI Analyzed")
                                    },
                                    sync_source="recently_played_batch"
                                )
                                db.add(new_hist)
                                db.commit()
                            
                        # Add a 2-second delay between batches to avoid Rate Limits
                        await asyncio.sleep(2)
                        
                    # Calculate aggregates
                    with SessionLocal() as db:
                        from models import UserAggregates
                        agg_exists = db.query(UserAggregates).filter(UserAggregates.tenant_id == user_id).first()
                        if not agg_exists or len(tracks_to_process) > 0:
                            calculate_and_store_aggregates(user_id, db)
                            
                except Exception as e:
                    print(f"Error in recently-played sync for {user_id}: {e}")
                    
        except Exception as e:
            print(f"Sync loop outer error: {e}")
            
        await asyncio.sleep(1800) # 30 minutes


async def run_gemini_analysis(track_name, artist_name, valence, energy, current_context):
    batch = [{
        "track_id": "single",
        "track_name": track_name,
        "artist_name": artist_name,
        "base_weight": 50,
        "valence": valence,
        "energy": energy
    }]
    res = await run_gemini_batch_analysis(batch, current_context)
    data = res.get("single", {})
    return data.get("mood_vector", [0.5,0.5,0.5]), data.get("telemetry_summary", ""), "Matched"

async def run_gemini_batch_analysis(batch_payload, current_context):
    gemini_keys = []
    if os.getenv("GEMINI_API_KEY"): gemini_keys.append(os.getenv("GEMINI_API_KEY"))
    if os.getenv("GEMINI_API_KEY_2"): gemini_keys.append(os.getenv("GEMINI_API_KEY_2"))
    
    result_dict = {}
    if not gemini_keys or not batch_payload:
        return result_dict
        
    prompt_items = []
    for item in batch_payload:
        prompt_items.append(f"""
- Track ID: {item['track_id']}
- Song: "{item['track_name']}" by {item['artist_name']}
- Base Recommendation Weight: {item['base_weight']} (Derived purely from playback duration/engagement, scaled 0-100)
- Acoustic Anchors: Valence={item['valence']}, Energy={item['energy']}
""")

    prompt_body = "".join(prompt_items)

    prompt = f"""
You are a high-performance audio telemetry feature engineering engine. Your task is to ingest a massive payload of raw audio features, evaluate lyrics internally, and output a highly optimized JSON object for a machine learning pipeline.

### ACTIVE USER PROFILE CONTEXT: {current_context}

### COGNITIVE INSTRUCTIONS:
1. Identify each song and instantly recall its lyrics directly from your own pre-trained knowledge base. Do NOT expect external lyrics to be provided.
2. Internally evaluate the song's acoustic features (danceability, tempo, etc.) alongside your recalled lyrical themes to determine how the track behaves emotionally, rhythmically, and structurally.
3. Calculate an absolute "mood_vector" representing the spatial position of this song on a 3-dimensional coordinate grid: [Positivity, Intensity, Cognitive Load]. Scale each float from 0.0 to 1.0.
4. Compare the song's profile against the Active User Profile Context. Determine if it enhances the state, conflicts with it, or is completely isolated to it.
5. Compute an "incremental_weight" modifier between -20.0 and +20.0 based on how perfectly it snaps into the active user context profile.

### INPUT DATA TO EVALUATE:
{prompt_body}

### OUTPUT SPECIFICATION:
Return EXACTLY a JSON object with a single key "results" containing an array. Each object in the array MUST contain these exact keys and NO conversational fluff:
{{
  "results": [
    {{
      "track_id": "string",
      "mood_vector": [0.5, 0.5, 0.5],
      "context_fit_status": "MATCH",
      "incremental_weight": 0.0,
      "exclusion_flags": [],
      "telemetry_summary": "string"
    }}
  ]
}}
"""
    for attempt in range(3):
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
            results_array = result_json.get("results", [])
            for r in results_array:
                if "track_id" in r:
                    result_dict[r["track_id"]] = r
            break # Success, exit retry loop
        except Exception as e:
            err_str = str(e)
            print(f"Gemini Batch AI Error (Attempt {attempt+1}): {err_str}")
            if attempt < 2:
                import re
                match = re.search(r"retry in ([\d\.]+)s", err_str)
                if match:
                    sleep_time = float(match.group(1)) + 1.0
                elif "429" in err_str or "503" in err_str:
                    sleep_time = 60.0
                else:
                    sleep_time = 2 ** attempt
                print(f"Backing off for {sleep_time}s")
                await asyncio.sleep(sleep_time)

    return result_dict
        
    prompt_items = []
    for item in batch_payload:
        prompt_items.append(f"""
- Track ID: {item['track_id']}
- Song: "{item['track_name']}" by {item['artist_name']}
- Base Recommendation Weight: {item['base_weight']} (Derived purely from playback duration/engagement, scaled 0-100)
- Acoustic Anchors: Valence={item['valence']}, Energy={item['energy']}
""")

    prompt_body = "".join(prompt_items)

    prompt = f"""
You are a high-performance audio telemetry feature engineering engine. Your task is to ingest a massive payload of raw audio features, evaluate lyrics internally, and output a highly optimized JSON object for a machine learning pipeline.

### ACTIVE USER PROFILE CONTEXT: {current_context}

### COGNITIVE INSTRUCTIONS:
1. Identify each song and instantly recall its lyrics directly from your own pre-trained knowledge base. Do NOT expect external lyrics to be provided.
2. Internally evaluate the song's acoustic features (danceability, tempo, etc.) alongside your recalled lyrical themes to determine how the track behaves emotionally, rhythmically, and structurally.
3. Calculate an absolute "mood_vector" representing the spatial position of this song on a 3-dimensional coordinate grid: [Positivity, Intensity, Cognitive Load]. Scale each float from 0.0 to 1.0.
4. Compare the song's profile against the Active User Profile Context. Determine if it enhances the state, conflicts with it, or is completely isolated to it.
5. Compute an "incremental_weight" modifier between -20.0 and +20.0 based on how perfectly it snaps into the active user context profile.

### INPUT DATA TO EVALUATE:
{prompt_body}

### OUTPUT SPECIFICATION:
Return EXACTLY a JSON object with a single key "results" containing an array. Each object in the array MUST contain these exact keys and NO conversational fluff:
{{
  "results": [
    {{
      "track_id": "string",
      "mood_vector": [float, float, float],
      "context_fit_status": "MATCH" | "MISMATCH" | "OUTLIER" | "UNACCEPTABLY_BAD",
      "incremental_weight": float,
      "exclusion_flags": ["string", "string"],
      "telemetry_summary": "One sentence technical justification combining lyric sentiment and core acoustic traits against user state."
    }}
  ]
}}
"""
    for attempt in range(3):
        try:
            client_ai = openai.AsyncOpenAI(api_key=deepseek_key, base_url="https://api.deepseek.com")
            response = await client_ai.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a music machine learning API. Output strictly valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                timeout=30.0
            )
            
            result_json = json.loads(response.choices[0].message.content)
            results_array = result_json.get("results", [])
            for r in results_array:
                if "track_id" in r:
                    result_dict[r["track_id"]] = r
            break # Success, exit retry loop
        except Exception as e:
            err_str = str(e)
            print(f"Gemini Batch AI Error (Attempt {attempt+1}): {err_str}")
            if attempt < 2:
                import re
                match = re.search(r"retry in ([\d\.]+)s", err_str)
                if match:
                    sleep_time = float(match.group(1)) + 1.0
                elif "429" in err_str or "503" in err_str:
                    sleep_time = 60.0
                else:
                    sleep_time = 2 ** attempt
                print(f"Backing off for {sleep_time}s")
                await asyncio.sleep(sleep_time)
    if not result_dict:
        return None
    return result_dict

async def save_track_to_db(user_id, state, client):
    """
    Appends the finished track telemetry to the 5-minute memory queue instead of writing instantly.
    This protects Firebase write limits and allows batch processing for the 4D Vector math.
    """
    track_id = state["last_track_id"]
    track_name = state["track_name"]
    artist_name = state["artist_name"]
    played_ms = state.get("max_progress_ms", 0)
    duration_ms = state.get("duration_ms", 1)
    
    # Push to memory queue
    five_min_batch_queue.append({
        "user_id": user_id,
        "track_id": track_id,
        "track_name": track_name,
        "artist_name": artist_name,
        "played_ms": played_ms,
        "duration_ms": duration_ms,
        "played_at": datetime.now(timezone.utc).isoformat(),
        "raw_state": state
    })
    print(f"Queued for 5-min batch: {track_name} by {artist_name} (User: {user_id})")

async def process_5min_batch_queue_loop():
    """
    Wakes up every 5 minutes.
    1. Pops all tracks from the in-memory queue.
    2. Runs feature_extractor.py to get the 15-variable matrix.
    3. Runs vector_math.py to get the 4D Explosive Vector (Fixation, Immersion, Volatility, Vault).
    4. Makes ONE batch request to Gemini for Lyrical Context.
    5. Performs ONE batch write to Firebase.
    """
    global five_min_batch_queue
    while True:
        await asyncio.sleep(300)  # 5 Minutes
        
        if not five_min_batch_queue:
            continue
            
        print(f"=== [Batch Queue] Processing {len(five_min_batch_queue)} queued tracks ===")
        
        # Pop the queue thread-safely
        batch_to_process = five_min_batch_queue.copy()
        five_min_batch_queue.clear()
        
        # Group by user for contextual processing
        user_batches = {}
        for item in batch_to_process:
            uid = item["user_id"]
            if uid not in user_batches:
                user_batches[uid] = []
            user_batches[uid].append(item)
            
        for uid, items in user_batches.items():
            with SessionLocal() as db_session:
                user_doc = db_session.query(User).filter(User.id == uid).first()
                current_context = user_doc.current_context if user_doc else "None"
            
            gemini_payload = []
            final_db_objects = []
            
            # Step 1: Local Math (Feature Extraction + 4D Vector)
            for track in items:
                # Format session tracks for feature extraction
                session_tracks_mock = [track["raw_state"]] 
                
                # Format historical stats mock
                historical_stats_mock = {"tracks": {}}
                
                # 15 Variables
                features = FeatureExtractor.extract_features(track["raw_state"], session_tracks_mock, historical_stats_mock)
                
                # Context overrides for the Math engine
                historical_context = {
                    "session_repeat_count": 0,
                    "base_completion_ratio": track["played_ms"] / track["duration_ms"] if track["duration_ms"] > 0 else 0.0,
                    "artist_plays_7d": 1,
                    "total_plays_7d": 50,
                    "duration_ms": track["duration_ms"]
                }
                
                # 4D Vector Math
                w_vec = VectorMathEngine.generate_vector(features, historical_context)
                
                track["w_vec"] = w_vec
                
                gemini_payload.append({
                    "track_id": track["track_id"],
                    "track_name": track["track_name"],
                    "artist_name": track["artist_name"],
                    "w_vec": w_vec,
                    "duration_ms": track["duration_ms"]
                })
                
            # Step 2: Gemini Batch (1 Request per User Batch)
            gemini_results = await run_gemini_batch_analysis(gemini_payload, current_context)
            
            global is_gemini_failing
            if gemini_results is None:
                is_gemini_failing = True
                print(f"=== [Batch Queue] GEMINI FAILED. Queuing {len(items)} tracks as PENDING ===")
            else:
                is_gemini_failing = False
            
            # Step 3: Write to Firebase
            with SessionLocal() as db:
                for track in items:
                    
                    if gemini_results is None:
                        # Gemini failed completely, write as pending
                        features_json = {
                            "w_vec": track["w_vec"],
                            "gemini_status": "PENDING"
                        }
                    else:
                        ai_res = gemini_results.get(tid, {})
                        if not ai_res:
                            # Gemini succeeded but skipped this track (rare), mark as pending
                            features_json = {
                                "w_vec": track["w_vec"],
                                "gemini_status": "PENDING"
                            }
                        else:
                            features_json = {
                                "w_vec": track["w_vec"],
                                "mood_vector": ai_res.get("mood_vector", [0.5, 0.5, 0.5]),
                                "context_fit_status": ai_res.get("context_fit_status", "MATCH"),
                                "telemetry_summary": ai_res.get("telemetry_summary", "AI Analyzed")
                            }

                    new_hist = ListeningHistory(
                        time=track["played_at"],
                        tenant_id=uid,
                        track_id=tid,
                        track_name=track["track_name"],
                        artist_name=track["artist_name"],
                        duration_ms=track["duration_ms"],
                        played_ms=track["played_ms"],
                        context=current_context,
                        ml_features=features_json,
                        sync_source="5min_batch_queue",
                        audio_ml_analyzed=0
                )
                db.add(new_hist)
                
            db.commit()
            print(f"=== [Batch Queue] Successfully committed {len(items)} tracks for user {uid} ===")

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

    # Get user's refresh token from TiDB
    spotify_client = None
    try:
        with SessionLocal() as db_session:
            user_ref = db_session.query(User).filter(User.id == user_id).first()
            if user_ref:
                if user_ref.refresh_token_cipher:
                    refresh_token = encryptor.decrypt(user_ref.refresh_token_cipher, user_ref.refresh_token_nonce)
                    spotify_client = SpotifyClient(refresh_token=refresh_token)
                    print("=== [WS] Spotify Client instantiated successfully ===")
                else:
                    print("=== [WS] No refresh_token_cipher in TiDB ===")
            else:
                print("=== [WS] User document does not exist in TiDB ===")
    except Exception as e:
        print(f"=== [WS] Error initializing Spotify client: {e} ===")

    try:
        ws_cache = {
            "last_track_id": None,
            "valence": 0.5,
            "energy": 0.5,
            "lyrical_valence": 0.5,
            "lyrics_text": None
        }
        
        while True:
            # Fetch real live track data
            if spotify_client:
                try:
                    current_track = await get_cached_currently_playing(user_id, spotify_client)
                    if current_track and current_track.get("status") == "playing":
                        track_id = current_track["id"]
                        track_name = current_track["track"]
                        artist_name = current_track["artist"]
                        progress_ms = current_track.get("progress_ms", 0)
                        duration_ms = current_track.get("duration_ms", 1)
                        album_art = current_track.get("album_art")
                        
                        valence = ws_cache["valence"]
                        energy = ws_cache["energy"]
                        lyrical_valence = ws_cache["lyrical_valence"]
                        lyrics_text = ws_cache["lyrics_text"]

                        # Only fetch API data ONCE per track change!
                        if track_id != ws_cache["last_track_id"]:
                            ws_cache["last_track_id"] = track_id
                            
                            # Fetch real audio features
                            ws_cache["valence"] = 0.5
                            ws_cache["energy"] = 0.5
                            valence = 0.5
                            energy = 0.5
                            # Determine Lyrical Valence (Simulated since user asked Gemini to infer)
                            ws_cache["lyrical_valence"] = 1.0 - valence if valence else 0.5
                            ws_cache["lyrics_text"] = "Analyzed dynamically by Gemini"
                            lyrical_valence = ws_cache["lyrical_valence"]
                            lyrics_text = ws_cache["lyrics_text"]

                        arousal = energy

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
                        await asyncio.sleep(20.0)
                        continue

                    elif current_track and current_track.get("status") == "rate_limited":
                        retry_after = current_track.get('retry_after', 30)
                        print(f"Rate limited on Live Stream, backing off: {retry_after}s")
                        await websocket.send_json({"status": "rate_limited", "retry_after": retry_after})
                        await asyncio.sleep(retry_after)
                        continue
                        
                except Exception as e:
                    if "429" in str(e):
                        print("Spotify 429 Too Many Requests in WS. Backing off for 30s.")
                        await asyncio.sleep(30.0)
                    else:
                        print(f"Spotify API Error: {e}")

            # Fallback if no track or error
            await websocket.send_json({"status": "inactive"})
            await asyncio.sleep(20.0) 

    except (WebSocketDisconnect, RuntimeError) as e:
        print(f"Client {user_id} disconnected or closed: {e}")
    finally:
        if spotify_client:
            await spotify_client.close()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend restored and running!"}

