import asyncio
import sqlite3
import os
from database import db
from lyric_analyzer import get_lyrics_and_sentiment

async def backfill_features():
    print("Starting historical features backfill...")
    db_path = os.path.join(os.path.dirname(__file__), "offline_features.db")
    if not os.path.exists(db_path):
        print("Offline DB not found")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    docs = db.collection("listening_history").stream()
    
    updates = 0
    for doc in docs:
        data = doc.to_dict()
        track_id = data.get("track_id")
        track_name = data.get("track_name")
        artist_name = data.get("artist_name")
        
        if not track_id or not track_name or not artist_name:
            continue
            
        # Get from offline sqlite
        cursor.execute("SELECT valence, energy FROM track_features WHERE track_id = ?", (track_id,))
        row = cursor.fetchone()
        
        base_valence = data.get("valence", 0.5)
        energy = data.get("energy", 0.5)
        
        if row:
            base_valence = float(row[0])
            energy = float(row[1])
        
        # Analyze lyrics
        _, lyrical_valence = await get_lyrics_and_sentiment(track_name, artist_name)
        
        final_valence = base_valence
        if lyrical_valence is not None:
            final_valence = (base_valence + lyrical_valence) / 2.0
            print(f"[{track_name}] Base: {base_valence:.2f}, Lyrical: {lyrical_valence:.2f} -> Final: {final_valence:.2f}")
        else:
            print(f"[{track_name}] Offline Base: {base_valence:.2f} (No lyrics found)")
            
        doc.reference.update({
            "valence": float(final_valence),
            "arousal": float(energy),
            "energy": float(energy)
        })
        updates += 1
        
    conn.close()
    print(f"Backfill complete! Updated {updates} historic tracks.")

if __name__ == "__main__":
    asyncio.run(backfill_features())
