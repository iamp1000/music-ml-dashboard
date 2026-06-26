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
# This points to your deployed Render instance or localhost for testing
CLOUD_API_URL = os.getenv("CLOUD_API_URL", "http://127.0.0.1:8000")
POLL_INTERVAL_SECONDS = 10

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class LocalMLWorker:
    def __init__(self):
        logging.info("Initializing Heavy ML Models locally...")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logging.info(f"Using device: {self.device}")
        
        self.audio_processor = AudioProcessor()
        
        # Load heavy PyTorch Model
        self.mood_classifier = MoodClassifier(input_channels=128, hidden_size=256).to(self.device)
        self.mood_classifier.eval()
        # In a real environment, load weights here
        
        # Load Madmom and Librosa models
        self.beat_tracker = BeatTracker()
        self.genre_classifier = GenreClassifier()
        
        logging.info("Models loaded successfully. Worker ready.")

    def _run_extraction_pipeline(self, track_name: str, artist_name: str):
        # 2. Fetch Audio via yt-dlp
        with AudioFetcher(track_name, artist_name) as audio_path:
            if not audio_path:
                logging.error(f"[{track_name}] Failed to fetch audio.")
                return None
                
            # 3. Analyze Beats (Madmom)
            logging.info(f"[{track_name}] Audio downloaded. Running Madmom Beat Tracker...")
            beat_data = self.beat_tracker.analyze_audio(audio_path)
            
            # 4. Analyze Genre (Librosa + Scikit-learn)
            logging.info(f"[{track_name}] Extracting Genre Features (Librosa)...")
            genre_data = self.genre_classifier.predict(audio_path)
            
            # 5. Extract PyTorch Features
            logging.info(f"[{track_name}] Running PyTorch Mel-Spectrogram Inference on {self.device}...")
            try:
                log_mel_spec = self.audio_processor.process_file(audio_path)
                input_tensor = log_mel_spec.unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    valence_tensor, arousal_tensor = self.mood_classifier(input_tensor)
                    
                valence = float(valence_tensor.squeeze().cpu().numpy())
                arousal = float(arousal_tensor.squeeze().cpu().numpy())
                
                # Convert [-1, 1] to [0, 1]
                valence = (valence + 1.0) / 2.0
                arousal = (arousal + 1.0) / 2.0
            except Exception as e:
                logging.error(f"[{track_name}] PyTorch extraction failed: {e}")
                valence, arousal = 0.5, 0.5
                
            return {
                "real_bpm": beat_data["bpm"],
                "rhythm_regularity": beat_data["rhythm_regularity"],
                "real_genre": genre_data["predicted_genre"],
                "genre_confidence": genre_data["confidence"],
                "valence": valence,
                "arousal": arousal
            }

    async def process_job(self, client: httpx.AsyncClient, job: dict, semaphore: asyncio.Semaphore):
        async with semaphore:
            doc_id = job["doc_id"]
            track_name = job["track_name"]
            artist_name = job["artist_name"]
            
            logging.info(f"[{track_name}] Thread starting process (Thread Limit Configured)...")
            
            # Run the heavy blocking extraction pipeline in a background thread
            results = await asyncio.to_thread(self._run_extraction_pipeline, track_name, artist_name)
            
            if not results:
                return
                
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
        # We cap at 10 concurrent jobs based on user's RTX 4050 / i7 13th Gen
        semaphore = asyncio.Semaphore(10)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            while True:
                try:
                    # 1. Fetch pending jobs (limit to 30 so thread pool stays saturated)
                    response = await client.get(f"{CLOUD_API_URL}/ml_jobs/pending?limit=30")
                    if response.status_code != 200:
                        logging.error(f"Failed to fetch jobs: {response.text}")
                        await asyncio.sleep(POLL_INTERVAL_SECONDS)
                        continue
                        
                    data = response.json()
                    jobs = data.get("data", [])
                    
                    if not jobs:
                        logging.debug("No pending jobs. Sleeping...")
                        await asyncio.sleep(POLL_INTERVAL_SECONDS)
                        continue
                        
                    logging.info(f"Fetched {len(jobs)} pending jobs from backend. Dispatching threads...")
                    
                    # Process them concurrently
                    tasks = [self.process_job(client, job, semaphore) for job in jobs]
                    await asyncio.gather(*tasks)
                                
                except Exception as e:
                    logging.error(f"Error in polling loop: {e}")
                    
                await asyncio.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    worker = LocalMLWorker()
    try:
        asyncio.run(worker.poll_and_process())
    except KeyboardInterrupt:
        logging.info("Worker stopped by user.")
