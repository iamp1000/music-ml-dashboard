from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from typing import Optional
import os
import urllib.parse
import base64
import httpx
from database import db
from security import encryptor, create_access_token

router = APIRouter(tags=["Authentication"])

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://iamp1000.github.io/music-ml-dashboard")

@router.get("/login")
def login_spotify():
    """
    Initiates the Spotify OAuth 2.0 flow.
    """
    scope = "user-read-currently-playing user-read-playback-state user-modify-playback-state user-read-recently-played user-read-private user-read-email user-top-read user-follow-read playlist-read-private user-library-read streaming"
    
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
async def spotify_callback(code: Optional[str] = None, error: Optional[str] = None):
    """
    Handles the Spotify OAuth callback.
    Exchanges the code for tokens, fetches user ID, stores in DB, and redirects with JWT.
    """
    if error:
        # Redirect back to frontend with the error so the user isn't stuck on a blank JSON screen
        return RedirectResponse(f"{FRONTEND_URL}?error={error}")
    
    if not code:
        return RedirectResponse(f"{FRONTEND_URL}?error=missing_code")
    auth_string = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
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

    async with httpx.AsyncClient() as client:
        # 1. Get Tokens
        response = await client.post("https://accounts.spotify.com/api/token", headers=headers, data=data)
        if response.status_code != 200:
            retry_after = response.headers.get("Retry-After", "unknown")
            print(f"Spotify /api/token failed: {response.status_code} (Retry-After: {retry_after}s) - {response.text}")
            return RedirectResponse(f"{FRONTEND_URL}/?error=token_failed_{response.status_code}")
            
        token_data = response.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")

        # 2. Get User Info
        me_headers = {"Authorization": f"Bearer {access_token}"}
        me_response = await client.get("https://api.spotify.com/v1/me", headers=me_headers)
        if me_response.status_code != 200:
            retry_after = me_response.headers.get("Retry-After", "unknown")
            print(f"Spotify /v1/me failed: {me_response.status_code} (Retry-After: {retry_after}s) - {me_response.text}")
            return RedirectResponse(f"{FRONTEND_URL}/?error=profile_failed_{me_response.status_code}_retry_{retry_after}")
            
        me_data = me_response.json()
        spotify_id = me_data.get("id")
        display_name = me_data.get("display_name", "")

    # 3. Encrypt Tokens
    access_cipher, access_nonce = encryptor.encrypt(access_token)
    refresh_cipher, refresh_nonce = encryptor.encrypt(refresh_token)

    # 4. Store in Firestore (with fallback if DB doesn't exist yet)
    try:
        user_ref = db.collection("users").document(spotify_id)
        user_ref.set({
            "display_name": display_name,
            "access_token_cipher": access_cipher,
            "access_token_nonce": access_nonce,
            "refresh_token_cipher": refresh_cipher,
            "refresh_token_nonce": refresh_nonce,
        }, merge=True)
        
        # Skipping background sync since Celery was removed to improve performance
        print(f"Successfully authenticated {spotify_id}")
    except Exception as e:
        print(f"Warning: Could not save to Firestore (has it been created?): {e}")

    # 5. Create JWT for Frontend Session
    jwt_token = create_access_token({"sub": spotify_id})

    # 6. Redirect back to frontend with token
    redirect_url = f"{FRONTEND_URL}/dashboard?token={jwt_token}"
    return RedirectResponse(redirect_url)

from fastapi import HTTPException
from security import verify_access_token

@router.get("/profile")
async def get_user_profile(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in")
    
    token = auth_header.split("Bearer ")[1]
    user_data = verify_access_token(token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = user_data.get("sub")
    
    # Decrypt access token and refresh token
    access_token = None
    display_name = None
    
    try:
        user_doc = db.collection("users").document(user_id).get()
        if user_doc.exists:
            u_dict = user_doc.to_dict()
            display_name = u_dict.get("display_name")
            
            # Always try to refresh the token to ensure the Web Playback SDK gets a valid one
            ref_cipher = u_dict.get("refresh_token_cipher")
            ref_nonce = u_dict.get("refresh_token_nonce")
            if ref_cipher and ref_nonce:
                try:
                    from spotify_client import SpotifyClient
                    refresh_token = encryptor.decrypt(ref_cipher, ref_nonce)
                    client = SpotifyClient(refresh_token=refresh_token)
                    new_access = await client.get_access_token()
                    
                    # Save new access token
                    cipher, nonce = encryptor.encrypt(new_access)
                    db.collection("users").document(user_id).update({
                        "access_token_cipher": cipher,
                        "access_token_nonce": nonce
                    })
                    access_token = new_access
                except Exception as e:
                    print(f"Failed to refresh token in profile load: {e}")
                    # Fallback to decrypting old one
                    cipher = u_dict.get("access_token_cipher")
                    nonce = u_dict.get("access_token_nonce")
                    if cipher and nonce:
                        access_token = encryptor.decrypt(cipher, nonce)

        stats_doc = db.collection("users").document(user_id).collection("stats").document("current").get()
        if not stats_doc.exists:
            # If stats do not exist yet, we still return pending but can provide access token
            return {"status": "pending", "data": {"id": user_id, "access_token": access_token, "display_name": display_name} if access_token or display_name else {"id": user_id}}
            
        data = stats_doc.to_dict()
        data["id"] = user_id
        if access_token:
            data["access_token"] = access_token
        if display_name:
            data["display_name"] = display_name
            
        return {"status": "success", "data": data}
    except Exception as db_e:
        print(f"Database error in /auth/profile: {db_e}")
        # If the database fails (e.g. Firebase not configured), return a minimal profile
        return {"status": "pending", "data": {"id": user_id, "access_token": access_token, "display_name": display_name} if access_token or display_name else {"id": user_id}}


