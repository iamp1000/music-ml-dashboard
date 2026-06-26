import sys
from database import SessionLocal
from models import ListeningHistory

try:
    db = SessionLocal()
    completed = db.query(ListeningHistory).filter(ListeningHistory.audio_ml_analyzed == True).all()

    print(f"\n✅ Total tracks successfully processed and uploaded to TiDB: {len(completed)}\n")
    print("-" * 80)
    for song in completed[:15]:
        print(f"🎵 Track: {song.track_name} by {song.artist_name}")
        print(f"   - Detected Genre: {song.real_genre} (Confidence: {song.genre_confidence})")
        print(f"   - BPM: {song.real_bpm}")
        print(f"   - Audio Valence: {song.audio_valence} | Audio Arousal: {song.audio_arousal}")
        print("-" * 80)
except Exception as e:
    print(f"Error checking database: {e}")
