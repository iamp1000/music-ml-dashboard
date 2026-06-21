import os
import librosa
import numpy as np
import joblib

class GenreClassifier:
    """
    Classifies musical genre using librosa MFCCs and a pre-trained scikit-learn model.
    Falls back to a basic heuristic if the pre-trained model is missing.
    """
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), "pretrained", "genre_model.joblib")
        self.model = None
        
        # We try to load the pre-trained model
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                print("Loaded pre-trained genre classifier.")
            except Exception as e:
                print(f"Error loading model: {e}")
        else:
            print(f"Pre-trained model not found at {self.model_path}. Will use fallback heuristic.")

    def extract_features(self, audio_file_path: str):
        """Extracts 13 MFCCs averaged over time."""
        y, sr = librosa.load(audio_file_path, sr=22050, duration=30)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        return np.mean(mfcc.T, axis=0)
        
    def predict(self, audio_file_path: str):
        try:
            features = self.extract_features(audio_file_path)
            
            if self.model:
                features_reshaped = features.reshape(1, -1)
                predicted = self.model.predict(features_reshaped)[0]
                probs = self.model.predict_proba(features_reshaped)[0]
                confidence = float(np.max(probs))
                return {
                    "predicted_genre": predicted,
                    "confidence": round(confidence, 4)
                }
            else:
                # Fallback heuristic based on standard MFCC profiles
                # Extremely crude, just for scaffolding until model is trained
                energy = np.mean(features[1:4]) # Lower MFCCs correlate loosely with energy/bass
                if energy > 100:
                    return {"predicted_genre": "Metal/Hard Rock", "confidence": 0.5}
                elif energy > 50:
                    return {"predicted_genre": "Pop/Dance", "confidence": 0.5}
                else:
                    return {"predicted_genre": "Acoustic/Classical", "confidence": 0.5}
                    
        except Exception as e:
            print(f"Error in GenreClassifier: {e}")
            return {"predicted_genre": "Unknown", "confidence": 0.0}
