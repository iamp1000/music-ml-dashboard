import asyncio
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from models import ListeningHistory, User
from main import calculate_ml_weight

def run_local_test():
    print("=== Testing ML Weight Calculation Logic ===")
    
    with SessionLocal() as db:
        # Get one recent track to test
        track = db.query(ListeningHistory).filter(ListeningHistory.track_id.isnot(None)).order_by(ListeningHistory.time.desc()).first()
        
        if not track:
            print("No tracks found in the database.")
            return
            
        print(f"Testing Track: {track.track_name} by {track.artist_name}")
        print(f"Played for {track.played_ms}ms out of {track.duration_ms}ms")
        print(f"Valence: {track.valence}, Energy: {track.energy}")
        
        # Calculate ML Weight
        valence = track.valence if track.valence is not None else 0.5
        energy = track.energy if track.energy is not None else 0.5
        
        ml_score, listen_type = calculate_ml_weight(
            user_id=track.tenant_id,
            track_id=track.track_id,
            played_ms=track.played_ms or 0,
            duration_ms=track.duration_ms or 1,
            valence=valence,
            energy=energy
        )
        
        print("\n=== Result ===")
        print(f"Calculated ML Score: {ml_score}/100")
        print(f"Categorized Listen Type: {listen_type}")
        
        if track.ml_features:
            print(f"\nExisting Database ML Features for this track:")
            print(json.dumps(track.ml_features, indent=2))
        else:
            print("\nTrack has no ml_features stored yet.")

if __name__ == "__main__":
    run_local_test()
