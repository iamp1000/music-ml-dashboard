import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Define 10 common genres
genres = ["Rock", "Pop", "Hip-Hop", "Jazz", "Classical", "Electronic", "Metal", "Blues", "Country", "Reggae"]

# Generate synthetic training data for 13 MFCC features
X = []
y = []

# We'll create 100 samples per genre with slight statistical differences 
# so the model can actually predict them based on the 13 MFCC means
np.random.seed(42)
for i, genre in enumerate(genres):
    # Base means for the 13 MFCCs for this genre (just random vectors)
    base_mfcc = np.random.uniform(-50, 50, size=13)
    
    for _ in range(100):
        # Add some noise to create individual samples
        sample = base_mfcc + np.random.normal(0, 10, size=13)
        X.append(sample)
        y.append(genre)

X = np.array(X)
y = np.array(y)

print("Training Random Forest Classifier on synthetic MFCC data...")
model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X, y)

# Ensure the pretrained directory exists
model_dir = r"p:\music spotify final boss\ml_engine\models\pretrained"
os.makedirs(model_dir, exist_ok=True)

model_path = os.path.join(model_dir, "genre_model.joblib")
joblib.dump(model, model_path)

print(f"Successfully generated and saved pre-trained model to {model_path}!")
