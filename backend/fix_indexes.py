import os
from sqlalchemy import text
from database import SessionLocal

def add_indexes():
    print("Connecting to TiDB to add missing indexes...")
    try:
        with SessionLocal() as db:
            print("Creating idx_audio_ml index if not exists...")
            db.execute(text("CREATE INDEX idx_audio_ml ON listening_history(audio_ml_analyzed);"))
            db.commit()
            print("Created idx_audio_ml")
    except Exception as e:
        print(f"Index idx_audio_ml might already exist or error: {e}")
        
    try:
        with SessionLocal() as db:
            print("Creating idx_track_id index if not exists...")
            db.execute(text("CREATE INDEX idx_track_id ON listening_history(track_id);"))
            db.commit()
            print("Created idx_track_id")
    except Exception as e:
        print(f"Index idx_track_id might already exist or error: {e}")

if __name__ == "__main__":
    add_indexes()
    print("Done!")
