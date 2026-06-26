import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal
from models import ListeningHistory
from main import calculate_ml_weight

def recalculate_all_weights():
    print("Connecting to database to recalculate weights...")
    updated_count = 0
    with SessionLocal() as db:
        # Fetch all tracks
        tracks = db.query(ListeningHistory).all()
        total_tracks = len(tracks)
        print(f"Found {total_tracks} tracks. Recalculating...")
        
        for track in tracks:
            # Safely handle missing values
            duration_ms = track.duration_ms or 1
            played_ms = track.played_ms or 0
            valence = track.valence if track.valence is not None else 0.5
            energy = track.energy if track.energy is not None else 0.5
            
            # Recalculate using the new math engine
            ml_score, listen_type = calculate_ml_weight(
                user_id=track.tenant_id,
                track_id=track.track_id,
                played_ms=played_ms,
                duration_ms=duration_ms,
                valence=valence,
                energy=energy
            )
            
            # Update the database row
            track.listen_weight = ml_score
            track.listen_type = listen_type
            
            updated_count += 1
            if updated_count % 500 == 0:
                print(f"Processed {updated_count}/{total_tracks} tracks...")
                
        # Commit all updates at once
        db.commit()
        print(f"Successfully updated all {updated_count} tracks with the new ML weights!")

if __name__ == "__main__":
    recalculate_all_weights()
