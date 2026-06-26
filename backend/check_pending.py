import sys
sys.stdout.reconfigure(encoding='utf-8')
from database import SessionLocal
from models import User, ListeningHistory
from sqlalchemy import func

try:
    db = SessionLocal()
    
    users = db.query(User).all()
    user_map = {u.id: u.display_name or "Unknown" for u in users}
    
    print("=== PENDING JOBS BY USER ===\n")
    for uid, name in user_map.items():
        pending = db.query(ListeningHistory).filter(
            ListeningHistory.tenant_id == uid,
            ListeningHistory.audio_ml_analyzed != 1
        ).all()
        print(f"\nUSER: {name} (ID: {uid[:10]}...): {len(pending)} pending songs")
        for song in pending[:20]:
            print(f"   - {song.track_name} by {song.artist_name}")
        if len(pending) > 20:
            print(f"   ...and {len(pending) - 20} more")
    
    print("\n\n=== TOTAL SONG COUNT BY USER ===\n")
    for uid, name in user_map.items():
        total = db.query(func.count(ListeningHistory.id)).filter(
            ListeningHistory.tenant_id == uid
        ).scalar()
        done = db.query(func.count(ListeningHistory.id)).filter(
            ListeningHistory.tenant_id == uid,
            ListeningHistory.audio_ml_analyzed == 1
        ).scalar()
        print(f"USER {name}: {done}/{total} songs analyzed")

except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
