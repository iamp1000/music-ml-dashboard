import os
import httpx
import base64
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")

class SpotifyClient:
    def __init__(self, access_token=None, refresh_token=None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.client = httpx.AsyncClient()

    async def get_access_token(self):
        """Exchange refresh token for a new access token"""
        auth_string = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
        auth_bytes = auth_string.encode("utf-8")
        auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

        headers = {
            "Authorization": f"Basic {auth_base64}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token
        }

        response = await self.client.post("https://accounts.spotify.com/api/token", headers=headers, data=data)
        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data.get("access_token")
            return self.access_token
        else:
            raise Exception("Failed to refresh token")

    async def get_currently_playing(self):
        """Fetch currently playing track with rate limit awareness"""
        if not self.access_token and self.refresh_token:
            await self.get_access_token()

        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        response = await self.client.get("https://api.spotify.com/v1/me/player/currently-playing", headers=headers)
        
        # Handle Rate Limiting (429 Too Many Requests)
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 1))
            return {"status": "rate_limited", "retry_after": retry_after}
        
        # 204 No Content means nothing is playing
        if response.status_code == 204:
            return {"status": "inactive"}

        if response.status_code == 200:
            data = response.json()
            if not data.get("item"):
                return {"status": "inactive"}
            
            return {
                "status": "playing",
                "track": data["item"]["name"],
                "artist": ", ".join([artist["name"] for artist in data["item"]["artists"]]),
                "id": data["item"]["id"],
                "progress_ms": data.get("progress_ms"),
                "duration_ms": data["item"]["duration_ms"],
                "is_playing": data.get("is_playing", False)
            }
        
        # Unauthorized (Token Expired)
        if response.status_code == 401 and self.refresh_token:
            await self.get_access_token()
            return await self.get_currently_playing()
            
        return {"status": "error", "message": f"HTTP {response.status_code}"}

    async def get_recently_played(self, limit=50):
        """Fetch recently played tracks (up to 50)"""
        if not self.access_token and self.refresh_token:
            await self.get_access_token()

        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        response = await self.client.get(f"https://api.spotify.com/v1/me/player/recently-played?limit={limit}", headers=headers)
        
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 1))
            return {"status": "rate_limited", "retry_after": retry_after}

        if response.status_code == 401 and self.refresh_token:
            await self.get_access_token()
            return await self.get_recently_played(limit)

        if response.status_code == 200:
            return {"status": "success", "data": response.json().get("items", [])}
            
        return {"status": "error", "message": f"HTTP {response.status_code}"}

    async def get_audio_features(self, track_ids: list):
        """Fetch audio features for up to 100 tracks at once"""
        if not track_ids:
            return {"status": "success", "data": []}

        if not self.access_token and self.refresh_token:
            await self.get_access_token()

        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        ids_string = ",".join(track_ids)
        response = await self.client.get(f"https://api.spotify.com/v1/audio-features?ids={ids_string}", headers=headers)

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 1))
            return {"status": "rate_limited", "retry_after": retry_after}

        if response.status_code == 401 and self.refresh_token:
            await self.get_access_token()
            return await self.get_audio_features(track_ids)

        if response.status_code == 200:
            return {"status": "success", "data": response.json().get("audio_features", [])}
            
        return {"status": "error", "message": f"HTTP {response.status_code}"}

    async def _fetch_endpoint(self, url):
        """Generic endpoint fetcher with token refresh and rate limit handling"""
        if not self.access_token and self.refresh_token:
            await self.get_access_token()
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        response = await self.client.get(url, headers=headers)
        
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 1))
            return {"status": "rate_limited", "retry_after": retry_after}
            
        if response.status_code == 401 and self.refresh_token:
            await self.get_access_token()
            return await self._fetch_endpoint(url)
            
        if response.status_code == 200:
            return {"status": "success", "data": response.json()}
            
        return {"status": "error", "message": f"HTTP {response.status_code}"}

    async def get_profile(self):
        return await self._fetch_endpoint("https://api.spotify.com/v1/me")

    async def get_top_items(self, item_type="artists", time_range="short_term", limit=50):
        return await self._fetch_endpoint(f"https://api.spotify.com/v1/me/top/{item_type}?time_range={time_range}&limit={limit}")

    async def get_followed_artists(self, limit=50):
        return await self._fetch_endpoint(f"https://api.spotify.com/v1/me/following?type=artist&limit={limit}")

    async def get_playlists(self, limit=50):
        return await self._fetch_endpoint(f"https://api.spotify.com/v1/me/playlists?limit={limit}")

    async def get_saved_albums(self, limit=50):
        return await self._fetch_endpoint(f"https://api.spotify.com/v1/me/albums?limit={limit}")

    async def get_saved_tracks(self, limit=50):
        return await self._fetch_endpoint(f"https://api.spotify.com/v1/me/tracks?limit={limit}")

    async def close(self):
        await self.client.aclose()
