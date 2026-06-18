import torch
import torch.nn as nn
import torch.nn.functional as F

class Attention(nn.Module):
    def __init__(self, hidden_dim):
        super(Attention, self).__init__()
        self.attention = nn.Linear(hidden_dim, 1)

    def forward(self, x):
        # x shape: [batch_size, seq_length, hidden_dim]
        attn_weights = F.softmax(self.attention(x), dim=1) # [batch_size, seq_length, 1]
        context_vector = torch.sum(attn_weights * x, dim=1) # [batch_size, hidden_dim]
        return context_vector, attn_weights

class SequenceLSTM(nn.Module):
    """
    LSTM with Dual-Scale Attention to track emotional states over time.
    """
    def __init__(self, input_dim=2, hidden_dim=64, num_layers=2):
        super(SequenceLSTM, self).__init__()
        
        # Input dim is 2 (Valence, Arousal) or higher if including other features
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=num_layers, batch_first=True, bidirectional=True)
        self.attention = Attention(hidden_dim * 2) # * 2 for bidirectional
        
        # Predict the next emotional state or a smoothed trend
        self.fc_valence = nn.Linear(hidden_dim * 2, 1)
        self.fc_arousal = nn.Linear(hidden_dim * 2, 1)

    def forward(self, x):
        # x shape: [batch_size, seq_length, input_dim]
        lstm_out, _ = self.lstm(x)
        
        context_vector, attn_weights = self.attention(lstm_out)
        
        pred_valence = torch.tanh(self.fc_valence(context_vector))
        pred_arousal = torch.tanh(self.fc_arousal(context_vector))
        
        return pred_valence, pred_arousal, attn_weights
