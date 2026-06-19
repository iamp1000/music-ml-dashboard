import asyncio
import httpx
from database import db
from spotify_client import SpotifyClient
from security import encryptor
import os
from dotenv import load_dotenv

load_dotenv()

async def backfill():
    users = list(db.collection("users").limit(1).stream())
    if not users:
        print("No users")
        return
    
    user_data = users[0].to_dict()
    refresh_token = encryptor.decrypt(user_data["refresh_token_cipher"], user_data["refresh_token_nonce"])
    
    client = SpotifyClient(refresh_token=refresh_token)
    await client.get_access_token()
    
    # Get all documents
    docs = db.collection("listening_history").stream()
    
    missing = []
    for doc in docs:
        data = doc.to_dict()
        if "track_name" not in data or "artist_name" not in data:
            missing.append((doc.id, data.get("track_id")))
            
    if not missing:
        print("No tracks need backfilling")
        await client.close()
        return
        
    print(f"Found {len(missing)} tracks to backfill")
    
    # We can fetch 50 tracks at a time
    headers = {"Authorization": f"Bearer {client.access_token}"}
    
    async with httpx.AsyncClient() as http:
        for doc_id, tid in missing:
            if not tid: continue
            resp = await http.get(f"https://api.spotify.com/v1/tracks/{tid}", headers=headers)
            if resp.status_code == 200:
                t = resp.json()
                track_name = t["name"]
                artist_name = t["artists"][0]["name"]
                db.collection("listening_history").document(doc_id).update({
                    "track_name": track_name,
                    "artist_name": artist_name
                })
                print(f"Updated {doc_id} -> {track_name} by {artist_name}")
            else:
                print(f"Failed {tid}: {resp.status_code}")
                
    await client.close()

if __name__ == "__main__":
    asyncio.run(backfill())
