from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import os
import urllib.parse

router = APIRouter(prefix="/auth", tags=["Authentication"])

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")

@router.get("/login")
def login_spotify():
    """
    Initiates the Spotify OAuth 2.0 flow.
    """
    scope = "user-read-playback-state user-read-recently-played user-read-private"
    params = {
        "client_id": SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": scope,
        "show_dialog": "true"
    }
    url = f"https://accounts.spotify.com/authorize?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@router.get("/callback")
async def spotify_callback(code: str):
    """
    Handles the Spotify OAuth callback.
    Exchanges the code for tokens and stores them in memory.
    """
    auth_string = f"{SPOTIFY_CLIENT_ID}:{os.getenv('SPOTIFY_CLIENT_SECRET')}"
    auth_bytes = auth_string.encode("utf-8")
    auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

    headers = {
        "Authorization": f"Basic {auth_base64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": SPOTIFY_REDIRECT_URI
    }

    from state import global_tokens
    import httpx
    
    async with httpx.AsyncClient() as client:
        response = await client.post("https://accounts.spotify.com/api/token", headers=headers, data=data)
        if response.status_code == 200:
            token_data = response.json()
            global_tokens["access_token"] = token_data.get("access_token")
            global_tokens["refresh_token"] = token_data.get("refresh_token")

    # Redirect back to the React dashboard
    return RedirectResponse("http://localhost:3000/dashboard")
