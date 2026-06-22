import os
import tempfile
import yt_dlp
import logging

class AudioFetcher:
    """
    Downloads temporary audio files from YouTube using yt-dlp.
    Designed to be used as a context manager for auto-cleanup.
    """
    def __init__(self, track_name: str, artist_name: str):
        self.query = f"{track_name} {artist_name} audio"
        self.temp_file = None
        
    def __enter__(self):
        # Create a named temporary file
        fd, path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        self.temp_file = path
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'ffmpeg_location': r'C:\Users\pranav\AppData\Local\Microsoft\WinGet\Links',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'outtmpl': self.temp_file.replace('.wav', ''), # yt-dlp appends .wav
            'quiet': True,
            'no_warnings': True,
            'extract_audio': True,
            'audio_format': 'wav',
            # We don't download the whole thing if we can avoid it, but yt-dlp doesn't easily do partial chunks without ffmpeg slicing
            # We'll download the best small audio. Usually songs are 3-4 minutes.
        }
        
        logging.info(f"Downloading audio for: {self.query}")
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(f"ytsearch1:{self.query}", download=True)
                
            # yt-dlp might have added an extension, make sure we return the actual file path
            # The outtmpl above should result in self.temp_file
            if os.path.exists(self.temp_file):
                return self.temp_file
            else:
                logging.error(f"yt-dlp completed but {self.temp_file} not found.")
                return None
        except Exception as e:
            logging.error(f"Error fetching audio: {e}")
            return None

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.temp_file and os.path.exists(self.temp_file):
            try:
                os.remove(self.temp_file)
                logging.info(f"Cleaned up {self.temp_file}")
            except Exception as e:
                logging.error(f"Error cleaning up {self.temp_file}: {e}")
