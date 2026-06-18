import torch
import torch.nn as nn

class NeuMF(nn.Module):
    """
    Neural Matrix Factorization combining GMF (Generalized Matrix Factorization)
    and MLP (Multi-Layer Perceptron) for collaborative filtering.
    """
    def __init__(self, num_users, num_items, factor_num=8, layers=[64, 32, 16, 8]):
        super(NeuMF, self).__init__()
        
        # GMF Embeddings
        self.embed_user_GMF = nn.Embedding(num_users, factor_num)
        self.embed_item_GMF = nn.Embedding(num_items, factor_num)
        
        # MLP Embeddings
        self.embed_user_MLP = nn.Embedding(num_users, factor_num * (2 ** (len(layers) - 1)))
        self.embed_item_MLP = nn.Embedding(num_items, factor_num * (2 ** (len(layers) - 1)))
        
        # MLP Layers
        MLP_modules = []
        input_size = factor_num * (2 ** len(layers))
        for out_size in layers:
            MLP_modules.append(nn.Linear(input_size, out_size))
            MLP_modules.append(nn.ReLU())
            input_size = out_size
        self.MLP_layers = nn.Sequential(*MLP_modules)
        
        # Prediction Layer
        self.predict_layer = nn.Linear(factor_num + layers[-1], 1)
        
        # Initialization
        nn.init.normal_(self.embed_user_GMF.weight, std=0.01)
        nn.init.normal_(self.embed_user_MLP.weight, std=0.01)
        nn.init.normal_(self.embed_item_GMF.weight, std=0.01)
        nn.init.normal_(self.embed_item_MLP.weight, std=0.01)

    def forward(self, user_indices, item_indices):
        user_embedding_GMF = self.embed_user_GMF(user_indices)
        item_embedding_GMF = self.embed_item_GMF(item_indices)
        user_embedding_MLP = self.embed_user_MLP(user_indices)
        item_embedding_MLP = self.embed_item_MLP(item_indices)
        
        # GMF part
        gmf_vector = torch.mul(user_embedding_GMF, item_embedding_GMF)
        
        # MLP part
        mlp_vector = torch.cat([user_embedding_MLP, item_embedding_MLP], dim=-1)
        mlp_vector = self.MLP_layers(mlp_vector)
        
        # Concatenate GMF and MLP vectors
        predict_vector = torch.cat([gmf_vector, mlp_vector], dim=-1)
        prediction = torch.sigmoid(self.predict_layer(predict_vector))
        return prediction.squeeze()
