import datetime
from fastapi import APIRouter, Header, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import ListeningHistory
from security import verify_access_token
from collections import defaultdict
import math

router = APIRouter(tags=["Analytics"])

@router.get("/timeline")
async def get_analytics_timeline(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.split(" ")[1]
    user_data = verify_access_token(token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = user_data.get("sub")
    
    # Fetch 500 analyzed tracks to build the timeline
    results = db.query(ListeningHistory)\
                .filter(ListeningHistory.tenant_id == user_id, ListeningHistory.audio_ml_analyzed == 1)\
                .order_by(desc(ListeningHistory.time))\
                .limit(500)\
                .all()
                
    if not results:
        return {"status": "success", "data": {"sessions": [], "stats": {}}}

    # Group into sessions (15-min gap rule)
    results = list(reversed(results)) # chronological
    
    sessions = []
    current_session = None
    
    artist_counts = defaultdict(int)
    mood_counts = defaultdict(int)
    context_counts = defaultdict(int)
    
    for r in results:
        t_time = r.time
        if isinstance(t_time, str):
            try:
                t_time = datetime.datetime.fromisoformat(t_time.replace("Z", "+00:00"))
            except:
                continue
                
        # Aggregate stats
        artist = r.artist_name or "Unknown Artist"
        artist_counts[artist] += 1
        
        # Determine mood from ML features or fallback to model's valence/energy if provided
        mood = "Unknown"
        if r.ml_features and "predicted_mood" in r.ml_features:
            mood = r.ml_features["predicted_mood"]
        elif r.valence is not None and r.energy is not None:
            if r.valence > 0.5 and r.energy > 0.5: mood = "Euphoric"
            elif r.valence < 0.5 and r.energy > 0.5: mood = "Aggressive"
            elif r.valence < 0.5 and r.energy < 0.5: mood = "Depressive"
            else: mood = "Chill"
            
        mood_counts[mood] += 1
        
        ctx = r.context or "General"
        context_counts[ctx] += 1
        
        if not current_session:
            current_session = {
                "start_time": t_time.isoformat(),
                "end_time": t_time.isoformat(),
                "dominant_mood": mood,
                "tracks": []
            }
            
        # Check gap
        last_time = datetime.datetime.fromisoformat(current_session["end_time"])
        gap_mins = (t_time - last_time).total_seconds() / 60.0
        
        if gap_mins > 30: # 30 min gap starts new session
            sessions.append(current_session)
            current_session = {
                "start_time": t_time.isoformat(),
                "end_time": t_time.isoformat(),
                "dominant_mood": mood,
                "tracks": []
            }
            
        current_session["tracks"].append({
            "track_name": r.track_name,
            "artist_name": artist,
            "time": t_time.isoformat(),
            "mood": mood,
            "context": ctx,
            "image": None # We don't store image yet
        })
        current_session["end_time"] = t_time.isoformat()
        
    if current_session:
        sessions.append(current_session)
        
    # Sort sessions newest first
    sessions = list(reversed(sessions))
    
    # Format stats
    stats = {
        "top_artists": [{"name": k, "count": v} for k, v in sorted(artist_counts.items(), key=lambda x: x[1], reverse=True)[:10]],
        "top_moods": [{"name": k, "count": v} for k, v in sorted(mood_counts.items(), key=lambda x: x[1], reverse=True)[:5]],
        "top_contexts": [{"name": k, "count": v} for k, v in sorted(context_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
    }

    return {"status": "success", "data": {"sessions": sessions, "stats": stats}}
