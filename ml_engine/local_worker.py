import os
import sys
import time
import asyncio
import httpx
import logging
import torch

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

    async def poll_and_process(self):
        async with httpx.AsyncClient(timeout=60.0) as client:
            while True:
                try:
                    # 1. Fetch pending jobs
                    response = await client.get(f"{CLOUD_API_URL}/ml_jobs/pending?limit=3")
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
                        
                    logging.info(f"Found {len(jobs)} pending jobs.")
                    
                    for job in jobs:
                        doc_id = job["doc_id"]
                        track_name = job["track_name"]
                        artist_name = job["artist_name"]
                        
                        logging.info(f"Processing: {track_name} by {artist_name}")
                        
                        # 2. Fetch Audio via yt-dlp
                        with AudioFetcher(track_name, artist_name) as audio_path:
                            if not audio_path:
                                logging.error(f"Failed to fetch audio for {track_name}")
                                continue
                                
                            # 3. Analyze Beats (Madmom)
                            beat_data = self.beat_tracker.analyze_audio(audio_path)
                            
                            # 4. Analyze Genre (Librosa + Scikit-learn)
                            genre_data = self.genre_classifier.predict(audio_path)
                            
                            # 5. Extract PyTorch Features
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
                                logging.error(f"PyTorch extraction failed: {e}")
                                valence, arousal = 0.5, 0.5
                                
                            # 6. Post Results back to Cloud
                            payload = {
                                "doc_id": doc_id,
                                "real_bpm": beat_data["bpm"],
                                "rhythm_regularity": beat_data["rhythm_regularity"],
                                "real_genre": genre_data["predicted_genre"],
                                "genre_confidence": genre_data["confidence"],
                                "valence": valence,
                                "arousal": arousal
                            }
                            
                            post_resp = await client.post(f"{CLOUD_API_URL}/ml_jobs/complete", json=payload)
                            if post_resp.status_code == 200:
                                logging.info(f"Successfully processed and uploaded {track_name}")
                            else:
                                logging.error(f"Failed to upload results for {track_name}: {post_resp.text}")
                                
                except Exception as e:
                    logging.error(f"Error in polling loop: {e}")
                    
                await asyncio.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    worker = LocalMLWorker()
    try:
        asyncio.run(worker.poll_and_process())
    except KeyboardInterrupt:
        logging.info("Worker stopped by user.")
