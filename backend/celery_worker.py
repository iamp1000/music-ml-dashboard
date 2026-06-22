import os
import math
from celery import Celery
import asyncio
from datetime import datetime, timezone
import dateutil.parser
from spotify_client import SpotifyClient
from security import encryptor
from database import db
from dotenv import load_dotenv
from lyric_analyzer import get_lyrics_and_sentiment

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "spotify_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery_app.task(bind=True, max_retries=3)
def fetch_recent_history_for_user(self, user_id, refresh_token_cipher, nonce_hex):
    """
    Task to fetch recently played tracks for a single user and save to Firestore.
    """
    return asyncio.run(async_fetch_history(self, user_id, refresh_token_cipher, nonce_hex))

async def async_fetch_history(task_instance, user_id, refresh_token_cipher, nonce_hex):
    try:
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return f"User {user_id} not found."
            
        prefs = user_doc.to_dict().get("preferences", {})
        if prefs.get("app_sleep", False):
            return f"User {user_id} is in app sleep mode. Skipping."
        ml_enabled = prefs.get("ml_enabled", True)

        refresh_token = encryptor.decrypt(refresh_token_cipher, nonce_hex)
        client = SpotifyClient(refresh_token=refresh_token)
        
        history_resp = await client.get_recently_played(limit=50)
        
        if history_resp["status"] == "rate_limited":
            delay = history_resp.get("retry_after", 10)
            await client.close()
            raise task_instance.retry(countdown=delay)
            
        elif history_resp["status"] == "success":
            items = history_resp.get("data", [])
            if not items:
                await client.close()
                return f"User {user_id} has no recent plays."

            new_tracks = []
            for item in items:
                played_at = item["played_at"] # ISO 8601 string
                track_id = item["track"]["id"]
                track_name = item["track"]["name"]
                artist_name = item["track"]["artists"][0]["name"]
                duration_ms = item["track"].get("duration_ms", 0)
                
                # Firestore Composite Document ID to avoid duplicates
                doc_id = f"{user_id}_{played_at}_{track_id}".replace(":", "_").replace(".", "_")
                doc_ref = db.collection("listening_history").document(doc_id)
                
                # We can skip a read by using doc_ref.get() or just overwriting. 
                # But to avoid unnecessary audio_features calls, let's check existence:
                if not doc_ref.get().exists:
                    new_tracks.append((played_at, track_id, track_name, artist_name, duration_ms, doc_ref))

            if not new_tracks:
                await client.close()
                return f"User {user_id} has no new plays."

            # Fetch features from offline SQLite DB
            import sqlite3
            db_path = os.path.join(os.path.dirname(__file__), "offline_features.db")
            
            offline_features = {}
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                track_ids_tuple = tuple([t[1] for t in new_tracks])
                if len(track_ids_tuple) == 1:
                    query = f"SELECT track_id, valence, energy FROM track_features WHERE track_id = '{track_ids_tuple[0]}'"
                    cursor.execute(query)
                elif len(track_ids_tuple) > 1:
                    query = f"SELECT track_id, valence, energy FROM track_features WHERE track_id IN {track_ids_tuple}"
                    cursor.execute(query)
                else:
                    query = ""
                
                if query:
                    for row in cursor.fetchall():
                        offline_features[row[0]] = {"valence": row[1], "energy": row[2]}
                conn.close()

            missing_tracks = [t for t in new_tracks if t[1] not in offline_features]
            
            # Audio features completely removed - handled entirely by Gemini later

            # Insert into Firestore
            for played_at, track_id, track_name, artist_name, duration_ms, doc_ref in new_tracks:
                doc_ref.set({
                    "time": played_at,
                    "tenant_id": user_id,
                    "track_id": track_id,
                    "track_name": track_name,
                    "artist_name": artist_name,
                    "duration_ms": duration_ms,
                    "ml_analyzed": False,  # Stage 1: Batch LLM processing will pick this up
                })

            await client.close()
            return f"Inserted {len(new_tracks)} new tracks for {user_id}."
            
        await client.close()
        return f"User {user_id} history fetch failed: {history_resp.get('message')}"
        
    except Exception as exc:
        raise task_instance.retry(exc=exc, countdown=10)

@celery_app.task(bind=True)
def master_fetch_all_users(self):
    """
    Master task that runs every 15 minutes. 
    Queries all active users and spawns sub-tasks.
    """
    users = db.collection("users").stream()
    count = 0
    for u in users:
        data = u.to_dict()
        if data.get("refresh_token_cipher"):
            fetch_recent_history_for_user.delay(u.id, data["refresh_token_cipher"], data["refresh_token_nonce"])
            count += 1
    return f"Spawned fetch tasks for {count} users."

@celery_app.task(bind=True, max_retries=3)
def sync_user_profile_data(self, user_id, refresh_token_cipher, nonce_hex):
    """
    Background task to sync the user's Spotify profile, top items, followers, and playlists.
    Saves to Firestore users/{user_id}/stats/current.
    """
    return asyncio.run(async_sync_profile(self, user_id, refresh_token_cipher, nonce_hex))

async def async_sync_profile(task_instance, user_id, refresh_token_cipher, nonce_hex):
    try:
        refresh_token = encryptor.decrypt(refresh_token_cipher, nonce_hex)
        client = SpotifyClient(refresh_token=refresh_token)
        
        stats = {}
        
        # 1. Profile
        prof_resp = await client.get_profile()
        if prof_resp["status"] == "rate_limited":
            await client.close()
            raise task_instance.retry(countdown=prof_resp["retry_after"])
        if prof_resp["status"] == "success":
            p = prof_resp["data"]
            stats["display_name"] = p.get("display_name")
            stats["followers"] = p.get("followers", {}).get("total", 0)
            stats["images"] = p.get("images", [])
            stats["country"] = p.get("country")
            stats["product"] = p.get("product")
            
        # 2. Following
        follow_resp = await client.get_followed_artists()
        if follow_resp["status"] == "rate_limited":
            await client.close()
            raise task_instance.retry(countdown=follow_resp["retry_after"])
        if follow_resp["status"] == "success":
            stats["following"] = follow_resp["data"].get("artists", {}).get("total", 0)
            
        # 3. Playlists
        play_resp = await client.get_playlists()
        if play_resp["status"] == "rate_limited":
            await client.close()
            raise task_instance.retry(countdown=play_resp["retry_after"])
        if play_resp["status"] == "success":
            stats["playlists"] = play_resp["data"].get("total", 0)
            
        # 4. Saved Tracks
        track_resp = await client.get_saved_tracks(limit=1)
        if track_resp["status"] == "rate_limited":
            await client.close()
            raise task_instance.retry(countdown=track_resp["retry_after"])
        if track_resp["status"] == "success":
            stats["saved_tracks"] = track_resp["data"].get("total", 0)
            
        # 5. Saved Albums
        album_resp = await client.get_saved_albums(limit=1)
        if album_resp["status"] == "rate_limited":
            await client.close()
            raise task_instance.retry(countdown=album_resp["retry_after"])
        if album_resp["status"] == "success":
            stats["saved_albums"] = album_resp["data"].get("total", 0)
            
        # 6. Top Artists (Short term for dashboard)
        top_art_resp = await client.get_top_items(item_type="artists", time_range="short_term", limit=50)
        if top_art_resp["status"] == "rate_limited":
            await client.close()
            raise task_instance.retry(countdown=top_art_resp["retry_after"])
        if top_art_resp["status"] == "success":
            stats["top_artists"] = [
                {
                    "id": a["id"], 
                    "name": a["name"], 
                    "images": a.get("images", []), 
                    "popularity": a.get("popularity", 0),
                    "genres": a.get("genres", [])
                } 
                for a in top_art_resp["data"].get("items", [])
            ]
            
        # Write to Firestore
        db.collection("users").document(user_id).collection("stats").document("current").set(stats, merge=True)
        
        await client.close()
        return f"Successfully synced profile stats for {user_id}"
        
    except Exception as exc:
        raise task_instance.retry(exc=exc, countdown=30)

from llm_telemetry import extract_semantic_telemetry
import httpx

@celery_app.task(bind=True, max_retries=3)
def process_unanalyzed_tracks(self):
    """
    Stage 1: Batch processing. Scans for tracks with ml_analyzed: False,
    fetches lyrics, gets LLM telemetry, and updates the database.
    """
    return asyncio.run(async_process_unanalyzed(self))

async def async_process_unanalyzed(task_instance):
    # Fetch up to 10 un-analyzed tracks
    try:
        unanalyzed_ref = db.collection("listening_history").where("ml_analyzed", "==", False).limit(10).stream()
        tracks = list(unanalyzed_ref)
        
        if not tracks:
            return "No unanalyzed tracks."

        updated_count = 0
        tenant_keys = {}
        tenant_baselines = {}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for doc in tracks:
                data = doc.to_dict()
                track_name = data.get("track_name", "")
                artist_name = data.get("artist_name", "")
                tenant_id = data.get("tenant_id")
                
                if not tenant_id:
                    continue
                    
                # Fetch API Key if we haven't already for this tenant
                if tenant_id not in tenant_keys:
                    settings_ref = db.collection("users").document(tenant_id).collection("settings").document("ml_config")
                    settings_doc = settings_ref.get()
                    if settings_doc.exists:
                        tenant_keys[tenant_id] = settings_doc.to_dict().get("gemini_api_key")
                    else:
                        tenant_keys[tenant_id] = None
                        
                api_key = tenant_keys[tenant_id]
                
                # If no API key, we skip analyzing but leave ml_analyzed as False so it can be picked up later
                if not api_key:
                    continue
                
                # 1. Fetch Lyrics 
                lyrics = ""
                try:
                    resp = await client.get(f"https://lrclib.net/api/search?track_name={track_name}&artist_name={artist_name}")
                    if resp.status_code == 200 and len(resp.json()) > 0:
                        lyrics = resp.json()[0].get("syncedLyrics") or resp.json()[0].get("plainLyrics", "")
                except:
                    pass
                
                # 2. Extract LLM Telemetry
                semantic_data = await extract_semantic_telemetry(track_name, artist_name, lyrics, api_key=api_key)
                
                # 3. Factor AI Telemetry into the Song Weight
                base_weight = data.get("listen_weight", 1.0)
                
                # We boost the weight if the song has high replay value and emotional complexity
                ai_boost = 0.0
                if semantic_data.replay_value > 0.8:
                    ai_boost += 0.2
                elif semantic_data.replay_value < 0.3:
                    ai_boost -= 0.1
                    
                if semantic_data.emotional_complexity > 0.8:
                    ai_boost += 0.15
                    
                if semantic_data.energy_weight > 0.9:
                    ai_boost += 0.1
                    
                # High-dimensional baseline mood vector calculation
                if tenant_id not in tenant_baselines:
                    recent_docs = db.collection("listening_history").where("tenant_id", "==", tenant_id).where("ml_analyzed", "==", True).order_by("time", direction="DESCENDING").limit(10).stream()
                    vectors = []
                    for r_doc in list(recent_docs):
                        r = r_doc.to_dict()
                        # We exclude strongly tagged sessions from the baseline centroid to prevent pollution
                        if r.get("context_tag", "None") == "None" and all(k in r for k in ["valence", "energy", "danceability", "energy_weight", "emotional_complexity", "replay_value"]):
                            vectors.append([
                                r["valence"], r["energy"], r["danceability"], r["energy_weight"], r["emotional_complexity"], r["replay_value"]
                            ])
                    
                    if vectors:
                        centroid = [sum(col) / len(col) for col in zip(*vectors)]
                        tenant_baselines[tenant_id] = centroid
                    else:
                        tenant_baselines[tenant_id] = None
                        
                baseline = tenant_baselines[tenant_id]
                is_contrasting = False
                context_tag = data.get("context_tag", "None")
                
                if baseline:
                    current_vec = [
                        semantic_data.valence, semantic_data.energy, semantic_data.danceability, 
                        semantic_data.energy_weight, semantic_data.emotional_complexity, semantic_data.replay_value
                    ]
                    dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(current_vec, baseline)))
                    # Max dist in 6D [0,1] space is ~2.45.
                    if dist < 0.4:
                        ai_boost += 0.25 # Huge boost for perfectly matching current assumed mood!
                    elif dist < 0.7:
                        ai_boost += 0.1
                    elif dist > 1.5:
                        is_contrasting = True
                    
                # Calculate final adjusted weight
                # If base_weight is 0 (a skip), we keep it 0.0 because they didn't listen to it!
                if base_weight > 0.0:
                    final_weight = max(0.1, base_weight + ai_boost)
                    # If it's a tagged session (e.g., Gym, Focus), it's a CONTEXTUAL shift, NOT a psychological dissonance shift.
                    # We dampen the extreme shift and do NOT flip the weight.
                    if is_contrasting:
                        if context_tag != "None":
                            # Dampen the effect, don't flip it
                            final_weight = final_weight * 0.5 
                        else:
                            # True cognitive dissonance (unexplained massive mood shift)
                            final_weight = -final_weight 
                else:
                    final_weight = 0.0
                
                # 4. Update Firestore (turning strings into dense vectors)
                doc.reference.update({
                    "valence": semantic_data.valence,
                    "energy": semantic_data.energy,
                    "danceability": semantic_data.danceability,
                    "mood_category": semantic_data.mood_category,
                    "lyrics_analysis": semantic_data.lyrics_analysis,
                    "energy_weight": semantic_data.energy_weight,
                    "bpm_estimate": semantic_data.bpm_estimate,
                    "song_genre_estimate": semantic_data.song_genre_estimate,
                    "acoustic_profile": semantic_data.acoustic_profile,
                    "emotional_complexity": semantic_data.emotional_complexity,
                    "lyrical_theme": semantic_data.lyrical_theme,
                    "narrative_arc": semantic_data.narrative_arc,
                    "instrumental_density": semantic_data.instrumental_density,
                    "vocal_intensity": semantic_data.vocal_intensity,
                    "cultural_context": semantic_data.cultural_context,
                    "replay_value": semantic_data.replay_value,
                    "time_of_day_fit": semantic_data.time_of_day_fit,
                    "listen_weight": round(final_weight, 2), # Overwrite with AI-adjusted weight
                    "ml_analyzed": True
                })
                updated_count += 1
                
        return f"Batch processed {updated_count} tracks via LLM pipeline."
    except Exception as exc:
        raise task_instance.retry(exc=exc, countdown=30)

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    'poll-all-history-every-2-minutes': {
        'task': 'celery_worker.master_fetch_all_users',
        'schedule': 120.0, # 2 minutes
    },
    'process-llm-batch-every-minute': {
        'task': 'celery_worker.process_unanalyzed_tracks',
        'schedule': 60.0, # 1 minute
    }
}


