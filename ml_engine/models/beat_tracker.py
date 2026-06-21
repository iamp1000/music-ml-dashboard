import numpy as np
import madmom
from madmom.features.beats import RNNBeatProcessor, DBNBeatTrackingProcessor

class BeatTracker:
    """
    Uses Madmom's Recurrent Neural Networks to predict beat timestamps and BPM.
    Includes rhythmic regularity analysis to differentiate steady beats from varied ones.
    """
    def __init__(self):
        # We instantiate the heavy models once when the class is loaded
        print("Loading madmom RNN Beat Processor...")
        self.processor = RNNBeatProcessor()
        self.tracker = DBNBeatTrackingProcessor(fps=100)

    def analyze_audio(self, audio_file_path: str):
        """
        Runs beat tracking on the audio file.
        Returns a dict with BPM, beat array, beat count, and rhythm regularity.
        """
        try:
            # Generate beat activation function using RNN
            act = self.processor(audio_file_path)
            
            # Extract beat timestamps using Dynamic Bayesian Network
            beats = self.tracker(act)
            
            if len(beats) < 2:
                return {
                    "bpm": 0.0,
                    "beat_count": len(beats),
                    "rhythm_regularity": 0.0
                }
                
            # Calculate BPM from average beat interval
            intervals = np.diff(beats)
            mean_interval = np.mean(intervals)
            bpm = 60.0 / mean_interval if mean_interval > 0 else 0
            
            # Calculate rhythm regularity
            # High regularity (like EDM) has very low variance in intervals
            # Low regularity (like jazz or classical) has higher variance
            std_dev = np.std(intervals)
            # Normalize regularity: 0 = highly irregular, 1 = perfectly regular
            # Typical std_dev is between 0 (perfect) and 0.2 (sloppy)
            regularity = max(0.0, 1.0 - (std_dev / 0.2)) if std_dev < 0.2 else 0.0
            
            return {
                "bpm": round(float(bpm), 2),
                "beat_count": len(beats),
                "rhythm_regularity": round(float(regularity), 4)
            }
        except Exception as e:
            print(f"Error in BeatTracker: {e}")
            return {
                "bpm": 0.0,
                "beat_count": 0,
                "rhythm_regularity": 0.0
            }
