import os
from celery import Celery
import asyncio
from spotify_client import SpotifyClient
from security import encryptor
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "affective_worker",
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery_app.task(bind=True, max_retries=3)
def poll_spotify_for_user(self, user_id, refresh_token_cipher, nonce_hex):
    """
    Task to poll Spotify API. If rate limited, it implements Celery's retry mechanism
    honoring the Retry-After header.
    """
    # In a real sync Celery worker, we run the async client using asyncio.run
    return asyncio.run(async_poll(self, user_id, refresh_token_cipher, nonce_hex))

async def async_poll(task_instance, user_id, refresh_token_cipher, nonce_hex):
    try:
        # Decrypt token
        refresh_token = encryptor.decrypt(refresh_token_cipher, nonce_hex)
        
        # Initialize client (it will fetch access token automatically using refresh token)
        client = SpotifyClient(refresh_token=refresh_token)
        
        data = await client.get_currently_playing()
        await client.close()
        
        if data["status"] == "rate_limited":
            # Smart backoff based on Spotify's Retry-After
            delay = data.get("retry_after", 5)
            raise task_instance.retry(countdown=delay)
            
        elif data["status"] == "playing":
            # Here we would insert the track ID into the TimescaleDB hypertable
            # along with querying the PyTorch model for valence/arousal mapping.
            return f"User {user_id} is playing: {data['track']}"
            
        return f"User {user_id} inactive."
        
    except Exception as exc:
        raise task_instance.retry(exc=exc, countdown=10)

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    'poll-all-active-users-every-30-seconds': {
        'task': 'celery_worker.poll_spotify_for_user',
        'schedule': 30.0,
        # In production, this would be a master task that queries TimescaleDB 
        # for all users and spawns sub-tasks for each.
        'args': ('demo_user_id', 'encrypted_token_hex_placeholder', 'nonce_placeholder')
    },
}
