import asyncio
import os
from database import db
from security import encryptor
from spotify_client import SpotifyClient

async def test_live():
    # Find any user with a refresh token
    users = db.collection("users").limit(1).stream()
    for user in users:
        row = user.to_dict()
        if row.get("refresh_token_cipher"):
            refresh_token = encryptor.decrypt(row["refresh_token_cipher"], row["refresh_token_nonce"])
            print("Got refresh token for user:", row.get("display_name"))
            client = SpotifyClient(refresh_token=refresh_token)
            
            print("Fetching access token...")
            try:
                access = await client.get_access_token()
                print("Got access token:", access[:10], "...")
            except Exception as e:
                print("Failed to get access token:", e)
                return
            
            print("Fetching currently playing...")
            try:
                track = await client.get_currently_playing()
                print("Result:", track)
            except Exception as e:
                print("Failed to get currently playing:", e)
            return

if __name__ == "__main__":
    asyncio.run(test_live())
