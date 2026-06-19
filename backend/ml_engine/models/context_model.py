import torch
import torch.nn as nn
import torch.nn.functional as F

class ContextAwareRecommender(nn.Module):
    """
    Context-Aware Recommender System (CARS).
    Fuses Sequential Momentum (LLM proxy telemetry) with Temporal Context (Time of day).
    """
    def __init__(self, sequence_dim=4, context_dim=4, hidden_dim=64, num_classes=4):
        super(ContextAwareRecommender, self).__init__()
        
        # Dense layer for Track Momentum (Valence, Energy, etc.)
        self.seq_dense = nn.Linear(sequence_dim, hidden_dim // 2)
        
        # Dense layer for Context (Sin Time, Cos Time)
        self.ctx_dense = nn.Linear(context_dim, hidden_dim // 2)
        
        # Fused Multilayer Perceptron
        self.fc1 = nn.Linear(hidden_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, num_classes)
        
    def forward(self, x_seq, x_ctx):
        # Embedding inputs
        h_seq = F.relu(self.seq_dense(x_seq))
        h_ctx = F.relu(self.ctx_dense(x_ctx))
        
        # Concatenate features along feature dimension
        fused = torch.cat([h_seq, h_ctx], dim=1)
        
        # Process through hidden layers
        h_fused = F.relu(self.fc1(fused))
        
        # Classification logits
        logits = self.fc2(h_fused)
        probs = F.softmax(logits, dim=1)
        
        return probs
