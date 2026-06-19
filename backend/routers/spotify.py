from fastapi import APIRouter, Request, HTTPException, Query, Response
from database import db
from security import verify_access_token, encryptor
from spotify_client import SpotifyClient

router = APIRouter(tags=["Spotify API"])

async def get_user_spotify_client(request: Request) -> SpotifyClient:
    """Helper function to authenticate and initialize SpotifyClient for the user."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized session")
        
    token = auth_header.split("Bearer ")[1]
    user_data = verify_access_token(token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid session token")
        
    user_id = user_data.get("sub")
    
    # Fetch refresh token from firestore
    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User account not found")
        
    u_dict = user_doc.to_dict()
    refresh_cipher = u_dict.get("refresh_token_cipher")
    nonce = u_dict.get("refresh_token_nonce")
    if not refresh_cipher or not nonce:
        raise HTTPException(status_code=400, detail="Spotify account not linked")
        
    try:
        refresh_token = encryptor.decrypt(refresh_cipher, nonce)
        return SpotifyClient(refresh_token=refresh_token)
    except Exception as e:
        print(f"Decryption error in spotify router: {e}")
        raise HTTPException(status_code=500, detail="Decryption error")

def handle_rate_limit(res: dict, response: Response):
    """Utility to raise 429 if the client response indicates rate limiting."""
    if res.get("status") == "rate_limited":
        retry_after = res.get("retry_after", 1)
        response.headers["Retry-After"] = str(retry_after)
        raise HTTPException(status_code=429, detail=f"Spotify API Rate Limited. Retry after {retry_after} seconds.")

@router.get("/top-tracks")
async def get_top_tracks(request: Request, response: Response, limit: int = 20):
    client = await get_user_spotify_client(request)
    try:
        # Fetch user's top tracks (short term)
        res = await client.request_endpoint(
            "GET", 
            f"https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit={limit}"
        )
        handle_rate_limit(res, response)
        
        if res.get("status") == "success":
            return res["data"]
        raise HTTPException(status_code=res.get("code", 400), detail=res.get("message", "Spotify API error"))
    finally:
        await client.close()

@router.get("/recommendations")
async def get_recommendations(request: Request, response: Response, limit: int = 15):
    client = await get_user_spotify_client(request)
    try:
        # First, fetch top tracks to use as seed_tracks
        top_res = await client.request_endpoint(
            "GET", 
            "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=3"
        )
        handle_rate_limit(top_res, response)
        
        seed_tracks = ""
        if top_res.get("status") == "success" and top_res["data"] and top_res["data"].get("items"):
            items = top_res["data"]["items"]
            seed_tracks = ",".join([t["id"] for t in items])
            
        if not seed_tracks:
            # Fallback to a default seed if no top tracks exist
            seed_tracks = "4PTG3Z6ehGkBFm6PuvYIB4" # Default popular track ID

        res = await client.request_endpoint(
            "GET", 
            f"https://api.spotify.com/v1/recommendations?limit={limit}&seed_tracks={seed_tracks}"
        )
        handle_rate_limit(res, response)
        
        if res.get("status") == "success":
            return res["data"]
        raise HTTPException(status_code=res.get("code", 400), detail=res.get("message", "Spotify API error"))
    finally:
        await client.close()

# --- Player Control Wrappers ---

@router.put("/player/play")
async def play(request: Request, response: Response, device_id: str = Query(None)):
    client = await get_user_spotify_client(request)
    url = "https://api.spotify.com/v1/me/player/play"
    if device_id:
        url += f"?device_id={device_id}"
    try:
        res = await client.request_endpoint("PUT", url)
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()

@router.put("/player/pause")
async def pause(request: Request, response: Response, device_id: str = Query(None)):
    client = await get_user_spotify_client(request)
    url = "https://api.spotify.com/v1/me/player/pause"
    if device_id:
        url += f"?device_id={device_id}"
    try:
        res = await client.request_endpoint("PUT", url)
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()

@router.post("/player/next")
async def next_track(request: Request, response: Response, device_id: str = Query(None)):
    client = await get_user_spotify_client(request)
    url = "https://api.spotify.com/v1/me/player/next"
    if device_id:
        url += f"?device_id={device_id}"
    try:
        res = await client.request_endpoint("POST", url)
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()

@router.post("/player/previous")
async def previous_track(request: Request, response: Response, device_id: str = Query(None)):
    client = await get_user_spotify_client(request)
    url = "https://api.spotify.com/v1/me/player/previous"
    if device_id:
        url += f"?device_id={device_id}"
    try:
        res = await client.request_endpoint("POST", url)
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()

@router.put("/player/volume")
async def set_volume(request: Request, response: Response, volume_percent: int, device_id: str = Query(None)):
    client = await get_user_spotify_client(request)
    url = f"https://api.spotify.com/v1/me/player/volume?volume_percent={volume_percent}"
    if device_id:
        url += f"&device_id={device_id}"
    try:
        res = await client.request_endpoint("PUT", url)
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()

@router.put("/player/shuffle")
async def set_shuffle(request: Request, response: Response, state: bool, device_id: str = Query(None)):
    client = await get_user_spotify_client(request)
    state_str = "true" if state else "false"
    url = f"https://api.spotify.com/v1/me/player/shuffle?state={state_str}"
    if device_id:
        url += f"&device_id={device_id}"
    try:
        res = await client.request_endpoint("PUT", url)
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()

@router.put("/player/repeat")
async def set_repeat(request: Request, response: Response, state: str, device_id: str = Query(None)):
    client = await get_user_spotify_client(request)
    url = f"https://api.spotify.com/v1/me/player/repeat?state={state}"
    if device_id:
        url += f"&device_id={device_id}"
    try:
        res = await client.request_endpoint("PUT", url)
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()

# --- Tracks Saved Status (Like operations) ---

@router.get("/player/like")
async def check_like_status(request: Request, response: Response, track_id: str):
    client = await get_user_spotify_client(request)
    try:
        res = await client.request_endpoint("GET", f"https://api.spotify.com/v1/me/tracks/contains?ids={track_id}")
        handle_rate_limit(res, response)
        if res.get("status") == "success":
            return {"liked": res["data"][0] if res["data"] else False}
        return {"liked": False}
    finally:
        await client.close()

@router.put("/player/like")
async def like_track(request: Request, response: Response, track_id: str):
    client = await get_user_spotify_client(request)
    try:
        res = await client.request_endpoint("PUT", f"https://api.spotify.com/v1/me/tracks?ids={track_id}")
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()

@router.delete("/player/like")
async def unlike_track(request: Request, response: Response, track_id: str):
    client = await get_user_spotify_client(request)
    try:
        res = await client.request_endpoint("DELETE", f"https://api.spotify.com/v1/me/tracks?ids={track_id}")
        handle_rate_limit(res, response)
        return res
    finally:
        await client.close()
