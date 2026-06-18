import torch
import torch.nn as nn
import torch.nn.functional as F

class MoodClassifier(nn.Module):
    """
    1D CNN + GRU model for predicting Valence and Arousal from Mel-spectrograms.
    Inspired by Personalized-DMER architecture.
    """
    def __init__(self, input_channels=128, hidden_size=256):
        super(MoodClassifier, self).__init__()
        
        # Spatial feature extraction across frequency bins
        # Input shape: [batch_size, n_mels (channels), time_steps]
        self.conv1 = nn.Conv1d(in_channels=input_channels, out_channels=256, kernel_size=5, padding=2)
        self.bn1 = nn.BatchNorm1d(256)
        self.pool1 = nn.MaxPool1d(kernel_size=2)
        
        self.conv2 = nn.Conv1d(in_channels=256, out_channels=512, kernel_size=5, padding=2)
        self.bn2 = nn.BatchNorm1d(512)
        self.pool2 = nn.MaxPool1d(kernel_size=2)
        
        # Temporal tracking
        self.gru = nn.GRU(input_size=512, hidden_size=hidden_size, num_layers=2, batch_first=True, bidirectional=True)
        
        # Prediction heads for Valence and Arousal (Continuous values [-1.0, 1.0])
        self.fc_valence = nn.Linear(hidden_size * 2, 1)
        self.fc_arousal = nn.Linear(hidden_size * 2, 1)
        
    def forward(self, x):
        # x shape: [batch_size, n_mels, time_steps]
        
        x = self.pool1(F.relu(self.bn1(self.conv1(x))))
        x = self.pool2(F.relu(self.bn2(self.conv2(x))))
        
        # Prepare for GRU: [batch_size, time_steps, channels]
        x = x.transpose(1, 2)
        
        gru_out, _ = self.gru(x)
        
        # Global average pooling over time
        x = torch.mean(gru_out, dim=1)
        
        # Bound outputs to [-1, 1] for circumplex coordinates
        valence = torch.tanh(self.fc_valence(x))
        arousal = torch.tanh(self.fc_arousal(x))
        
        return valence, arousal
