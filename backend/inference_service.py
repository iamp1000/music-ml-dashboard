import sys
import os
import torch

# Ensure ml_engine is in the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ml_engine")))

from models.mood_classifier import MoodClassifier
from models.sequence_lstm import SequenceLSTM
from utils.audio_processor import AudioProcessor

class AffectiveInferenceEngine:
    """
    Wraps the PyTorch models into a production-ready inference service.
    """
    def __init__(self):
        # Set device to GPU if available, else CPU
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load Models
        self.mood_classifier = MoodClassifier(input_channels=128, hidden_size=256).to(self.device)
        self.sequence_lstm = SequenceLSTM(input_dim=2, hidden_dim=64, num_layers=2).to(self.device)
        
        # In a real environment, load state_dict (weights) here:
        # self.mood_classifier.load_state_dict(torch.load('path/to/weights.pth'))
        
        # Set models to evaluation mode
        self.mood_classifier.eval()
        self.sequence_lstm.eval()

        self.audio_processor = AudioProcessor()

    def analyze_audio_file(self, file_path: str):
        """
        Takes an audio file, generates a Mel-spectrogram, and predicts Valence & Arousal.
        """
        try:
            # Generate Log-Scaled Mel-Spectrogram
            log_mel_spec = self.audio_processor.process_file(file_path)
            
            # Prepare tensor for model (Batch size 1)
            # shape expected: [batch_size, n_mels, time_steps]
            input_tensor = log_mel_spec.unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                valence, arousal = self.mood_classifier(input_tensor)
                
            return {
                "valence": float(valence.squeeze().cpu().numpy() if torch.cuda.is_available() else valence.squeeze().numpy()),
                "arousal": float(arousal.squeeze().cpu().numpy() if torch.cuda.is_available() else arousal.squeeze().numpy())
            }
        except Exception as e:
            return {"error": str(e)}

# Singleton Engine
inference_engine = AffectiveInferenceEngine()
