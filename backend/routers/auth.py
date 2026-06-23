from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import urllib.parse
import base64
import httpx
from database import get_db
from models import User
from security import encryptor, create_access_token, verify_access_token
from state import active_users_cache

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
async def spotify_callback(code: Optional[str] = None, error: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Handles the Spotify OAuth callback.
    Exchanges the code for tokens, fetches user ID, stores in TiDB, and redirects with JWT.
    """
    if error:
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
            return RedirectResponse(f"{FRONTEND_URL}/?error=token_failed_{response.status_code}")
            
        token_data = response.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")

        # 2. Get User Info
        me_headers = {"Authorization": f"Bearer {access_token}"}
        me_response = await client.get("https://api.spotify.com/v1/me", headers=me_headers)
        if me_response.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/?error=profile_failed_{me_response.status_code}")
            
        me_data = me_response.json()
        spotify_id = me_data.get("id")
        display_name = me_data.get("display_name", "")
        email = me_data.get("email", "")

    # 3. Encrypt Tokens
    access_cipher, access_nonce = encryptor.encrypt(access_token)
    refresh_cipher, refresh_nonce = encryptor.encrypt(refresh_token)

    # 4. Store in TiDB
    try:
        user = db.query(User).filter(User.id == spotify_id).first()
        if not user:
            user = User(id=spotify_id)
            db.add(user)
            
        user.display_name = display_name
        user.email = email
        user.access_token_cipher = access_cipher
        user.access_token_nonce = access_nonce
        user.refresh_token_cipher = refresh_cipher
        user.refresh_token_nonce = refresh_nonce
        db.commit()
        
        print(f"Successfully authenticated {spotify_id} in TiDB")
    except Exception as e:
        print(f"Warning: Could not save to TiDB: {e}")
        db.rollback()

    # 5. Create JWT for Frontend Session
    jwt_token = create_access_token({"sub": spotify_id})

    # 6. Redirect back to frontend with token
    redirect_url = f"{FRONTEND_URL}/dashboard?token={jwt_token}"
    return RedirectResponse(redirect_url)


@router.get("/profile")
async def get_user_profile(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in")
    
    token = auth_header.split("Bearer ")[1]
    user_data = verify_access_token(token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user_id = user_data.get("sub")
    access_token = None
    display_name = None
    
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            display_name = user.display_name
            # Cache it
            active_users_cache[user_id] = {
                "display_name": user.display_name,
                "access_token_cipher": user.access_token_cipher,
                "access_token_nonce": user.access_token_nonce,
                "refresh_token_cipher": user.refresh_token_cipher,
                "refresh_token_nonce": user.refresh_token_nonce
            }
            
            # Always try to refresh the token to ensure the Web Playback SDK gets a valid one
            if user.refresh_token_cipher and user.refresh_token_nonce:
                try:
                    from spotify_client import SpotifyClient
                    refresh_token = encryptor.decrypt(user.refresh_token_cipher, user.refresh_token_nonce)
                    client = SpotifyClient(refresh_token=refresh_token)
                    new_access = await client.get_access_token()
                    
                    # Save new access token
                    cipher, nonce = encryptor.encrypt(new_access)
                    user.access_token_cipher = cipher
                    user.access_token_nonce = nonce
                    db.commit()
                    access_token = new_access
                except Exception as e:
                    print(f"Failed to refresh token in profile load: {e}")
                    # Fallback to decrypting old one
                    if user.access_token_cipher and user.access_token_nonce:
                        access_token = encryptor.decrypt(user.access_token_cipher, user.access_token_nonce)

        # For stats we will just return pending for now since we are starting fresh with TiDB
        return {"status": "pending", "data": {"id": user_id, "access_token": access_token, "display_name": display_name} if access_token or display_name else {"id": user_id}}
    except Exception as db_e:
        print(f"Database error in /auth/profile: {db_e}")
        return {"status": "pending", "data": {"id": user_id, "access_token": access_token, "display_name": display_name} if access_token or display_name else {"id": user_id}}
