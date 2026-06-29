import os
import sys

# Ensure ffmpeg is in PATH for madmom and torchaudio
ffmpeg_path = r"C:\Users\pranav\AppData\Local\Microsoft\WinGet\Links"
if ffmpeg_path not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + ffmpeg_path
import time
import asyncio
import httpx
import logging
import torch
import warnings
import concurrent.futures
import multiprocessing
import csv

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

import numpy as np
# Patch numpy deprecated aliases for madmom compatibility
np.float = np.float64
np.int = np.int64
np.bool = np.bool_
np.complex = complex
np.object = object
np.unicode = str
np.str = str

from dotenv import load_dotenv

# Ensure we can import from the rest of ml_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.audio_fetcher import AudioFetcher
from utils.audio_processor import AudioProcessor
from models.beat_tracker import BeatTracker
from models.genre_classifier import GenreClassifier
from models.mood_classifier import MoodClassifier

load_dotenv()

# Configuration
CLOUD_API_URL = os.getenv("CLOUD_API_URL", "http://127.0.0.1:8000")
POLL_INTERVAL_SECONDS = 10
MAX_WORKERS = 4  # Cap at 4 to prevent out-of-memory errors on heavy ML models

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Global variables for worker processes
_audio_processor = None
_mood_classifier = None
_beat_tracker = None
_genre_classifier = None
_device = None

def worker_init():
    """Initializes models inside the child process to avoid pickling issues."""
    global _audio_processor, _mood_classifier, _beat_tracker, _genre_classifier, _device
    
    # Re-apply warning filters in the child process
    warnings.filterwarnings("ignore", category=UserWarning)
    warnings.filterwarnings("ignore", category=FutureWarning)
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    
    logging.info(f"Worker process {os.getpid()} initializing models...")
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _audio_processor = AudioProcessor()
    _mood_classifier = MoodClassifier(input_channels=128, hidden_size=256).to(_device)
    _mood_classifier.eval()
    _beat_tracker = BeatTracker()
    _genre_classifier = GenreClassifier()
    logging.info(f"Worker process {os.getpid()} models loaded successfully on {_device}.")

def run_extraction_pipeline_process(track_name: str, artist_name: str):
    """Pure function to run extraction inside a ProcessPool worker."""
    # 2. Fetch Audio via yt-dlp
    with AudioFetcher(track_name, artist_name) as audio_path:
        if not audio_path:
            logging.error(f"[{track_name}] Failed to fetch audio.")
            return None
            
        # 3. Analyze Beats (Madmom)
        logging.info(f"[{track_name}] Audio downloaded. Running Madmom Beat Tracker...")
        beat_data = _beat_tracker.analyze_audio(audio_path)
        
        # 4. Analyze Genre (Librosa + Scikit-learn)
        logging.info(f"[{track_name}] Extracting Genre Features (Librosa)...")
        genre_data = _genre_classifier.predict(audio_path)
        
        # 5. Extract PyTorch Features
        logging.info(f"[{track_name}] Running PyTorch Mel-Spectrogram Inference on {_device}...")
        try:
            log_mel_spec = _audio_processor.process_file(audio_path)
            input_tensor = log_mel_spec.to(_device)
            
            with torch.no_grad():
                valence_tensor, arousal_tensor = _mood_classifier(input_tensor)
                
            valence = float(valence_tensor.squeeze().cpu().numpy())
            arousal = float(arousal_tensor.squeeze().cpu().numpy())
            
            # Convert [-1, 1] to [0, 1]
            valence = (valence + 1.0) / 2.0
            arousal = (arousal + 1.0) / 2.0
        except Exception as e:
            logging.error(f"[{track_name}] PyTorch extraction failed: {e}")
            valence, arousal = 0.5, 0.5
        finally:
            import gc
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
        return {
            "real_bpm": beat_data["bpm"],
            "rhythm_regularity": beat_data["rhythm_regularity"],
            "real_genre": genre_data["predicted_genre"],
            "genre_confidence": genre_data["confidence"],
            "valence": valence,
            "arousal": arousal
        }

CACHE_FILE = "ml_cache.csv"

def load_cache():
    cache = {}
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                key = f"{row['track_name']} - {row['artist_name']}"
                cache[key] = {
                    "real_bpm": float(row["real_bpm"]),
                    "rhythm_regularity": float(row["rhythm_regularity"]),
                    "real_genre": row["real_genre"],
                    "genre_confidence": float(row["genre_confidence"]),
                    "valence": float(row["valence"]),
                    "arousal": float(row["arousal"])
                }
    return cache

def save_to_cache(track_name, artist_name, results):
    file_exists = os.path.exists(CACHE_FILE)
    with open(CACHE_FILE, mode="a", encoding="utf-8", newline="") as f:
        fieldnames = ["track_name", "artist_name", "real_bpm", "rhythm_regularity", "real_genre", "genre_confidence", "valence", "arousal"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        
        row = {
            "track_name": track_name,
            "artist_name": artist_name,
            **results
        }
        writer.writerow(row)

class LocalMLWorker:
    def __init__(self):
        logging.info("Initializing Main Process ML Worker coordinator...")
        self.executor = None
        self.cache = load_cache()
        logging.info(f"Loaded {len(self.cache)} cached songs from local CSV.")

    async def process_job(self, client: httpx.AsyncClient, job: dict):
        doc_id = job["doc_id"]
        track_name = job["track_name"]
        artist_name = job["artist_name"]
        
        cache_key = f"{track_name} - {artist_name}"
        if cache_key in self.cache:
            logging.info(f"[{track_name}] Found in local CSV cache! Skipping ML inference.")
            results = self.cache[cache_key]
        else:
            logging.info(f"[{track_name}] Dispatching to ProcessPool...")
            
            # Run in ProcessPoolExecutor
            loop = asyncio.get_running_loop()
            try:
                results = await loop.run_in_executor(
                    self.executor,
                    run_extraction_pipeline_process,
                    track_name,
                    artist_name
                )
            except Exception as e:
                logging.error(f"[{track_name}] Process crashed: {e}")
                results = None
            
            if not results:
                logging.warning(f"[{track_name}] Extraction failed. Posting fallback results to clear job.")
                results = {
                    "real_bpm": 120.0,
                    "rhythm_regularity": 0.5,
                    "real_genre": "Unknown",
                    "genre_confidence": 0.0,
                    "valence": 0.5,
                    "arousal": 0.5
                }
            else:
                save_to_cache(track_name, artist_name, results)
                self.cache[cache_key] = results
            
        # 6. Post Results back to Cloud
        payload = {
            "doc_id": str(doc_id),
            **results
        }
        
        post_resp = await client.post(f"{CLOUD_API_URL}/ml_jobs/complete", json=payload)
        if post_resp.status_code == 200:
            logging.info(f"[{track_name}] Successfully uploaded results to backend.")
        else:
            logging.error(f"[{track_name}] Failed to upload results: {post_resp.text}")

    async def poll_and_process(self):
        async with httpx.AsyncClient(timeout=60.0) as client:
            while True:
                try:
                    # 1. Fetch pending jobs
                    response = await client.get(f"{CLOUD_API_URL}/ml_jobs/pending?limit=30")
                    if response.status_code != 200:
                        logging.error(f"Failed to fetch jobs: {response.text}")
                        await asyncio.sleep(POLL_INTERVAL_SECONDS)
                        continue
                        
                    data = response.json()
                    jobs = data.get("data", [])
                    
                    if not jobs:
                        logging.info("No pending jobs found. Auto-exiting to free resources.")
                        if self.executor:
                            self.executor.shutdown(wait=False)
                        sys.exit(0)
                        
                    logging.info(f"Fetched {len(jobs)} pending jobs from backend. Dispatching processes...")
                    
                    mp_context = multiprocessing.get_context('spawn')
                    self.executor = concurrent.futures.ProcessPoolExecutor(
                        max_workers=MAX_WORKERS,
                        mp_context=mp_context,
                        initializer=worker_init
                    )
                    
                    # Process them concurrently
                    tasks = [self.process_job(client, job) for job in jobs]
                    await asyncio.gather(*tasks, return_exceptions=True)
                    
                    logging.info("Batch complete. Shutting down process pool to free memory.")
                    self.executor.shutdown(wait=True)
                    self.executor = None
                    
                    import gc
                    gc.collect()
                                
                except Exception as e:
                    logging.error(f"Error in polling loop: {e}")
                    
                await asyncio.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    worker = LocalMLWorker()
    try:
        asyncio.run(worker.poll_and_process())
    except KeyboardInterrupt:
        logging.info("Worker stopped by user.")
        if worker.executor:
            worker.executor.shutdown(wait=False)
