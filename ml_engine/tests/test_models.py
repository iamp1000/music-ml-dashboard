import torch
import sys
import os

# Add ml_engine to path for tests
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.mood_classifier import MoodClassifier
from models.sequence_lstm import SequenceLSTM
from models.hybrid_recommender import NeuMF

def test_mood_classifier():
    model = MoodClassifier(input_channels=128, hidden_size=256)
    # Batch of 4, 128 Mel bins, 100 time steps
    dummy_input = torch.randn(4, 128, 100)
    valence, arousal = model(dummy_input)
    assert valence.shape == (4, 1), f"Expected (4, 1), got {valence.shape}"
    assert arousal.shape == (4, 1), f"Expected (4, 1), got {arousal.shape}"
    print("MoodClassifier shape test passed.")

def test_sequence_lstm():
    model = SequenceLSTM(input_dim=2, hidden_dim=64, num_layers=2)
    # Batch of 4, sequence length 50, input features 2 (valence, arousal)
    dummy_input = torch.randn(4, 50, 2)
    pred_valence, pred_arousal, attn_weights = model(dummy_input)
    assert pred_valence.shape == (4, 1)
    assert pred_arousal.shape == (4, 1)
    assert attn_weights.shape == (4, 50, 1)
    print("SequenceLSTM shape test passed.")

def test_neumf():
    num_users = 100
    num_items = 1000
    model = NeuMF(num_users=num_users, num_items=num_items)
    # Batch of 4 user/item pairs
    user_indices = torch.tensor([1, 45, 99, 0])
    item_indices = torch.tensor([5, 500, 999, 10])
    predictions = model(user_indices, item_indices)
    assert predictions.shape == (4,)
    print("NeuMF shape test passed.")

if __name__ == "__main__":
    test_mood_classifier()
    test_sequence_lstm()
    test_neumf()
