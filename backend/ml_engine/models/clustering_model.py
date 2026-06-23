import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from database import SessionLocal
from models import ListeningHistory

class VectorGraphEngine:
    """
    Consumes the 4D Explosive Weight Vectors (Fixation, Immersion, Volatility, Vault)
    and applies K-Means Clustering and PCA dimensionality reduction to generate 3D spatial coordinates
    for the frontend dashboard.
    """
    
    @staticmethod
    def generate_graph_data(user_id: str):
        # Fetch listening history with ML vectors
        with SessionLocal() as db:
            docs = db.query(ListeningHistory).filter(ListeningHistory.tenant_id == user_id).all()
                 
            data_points = []
            vectors = []
            for doc in docs:
                ml_features = doc.ml_features or {}
                w_vec = ml_features.get("w_vec")
                
                # Ensure it's a valid 4D vector
                if isinstance(w_vec, list) and len(w_vec) == 4:
                    data_points.append({
                        "id": doc.id,
                        "track_id": doc.track_id,
                        "track_name": doc.track_name,
                        "artist_name": doc.artist_name,
                        "time": doc.time,
                        "w_vec": w_vec
                    })
                    vectors.append(w_vec)
                    
        if len(vectors) < 3:
            return {"status": "insufficient_data", "message": "Need at least 3 analyzed tracks to generate vector graph.", "data": []}
            
        X = np.array(vectors)
        
        # 1. K-Means Clustering
        # Dynamically determine clusters based on data size (cap at 5 distinct behavioral profiles)
        n_clusters = min(5, max(2, len(vectors) // 10))
        if len(vectors) >= n_clusters:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X)
        else:
            labels = [0] * len(vectors)
            
        # 2. Dimensionality Reduction (PCA to 3D)
        # We crush [Fixation, Immersion, Volatility, Vault] down to [X, Y, Z] so the UI can render it
        if len(vectors) >= 3:
            pca = PCA(n_components=3)
            X_3d = pca.fit_transform(X)
        else:
            X_3d = np.zeros((len(vectors), 3))
            
        # Build the structured JSON payload for the frontend
        results = []
        for i in range(len(data_points)):
            results.append({
                "id": data_points[i]["id"],
                "track_id": data_points[i]["track_id"],
                "track_name": data_points[i]["track_name"],
                "artist_name": data_points[i]["artist_name"],
                "time": data_points[i]["time"],
                "cluster": int(labels[i]),
                "x": round(float(X_3d[i][0]), 3),
                "y": round(float(X_3d[i][1]), 3),
                "z": round(float(X_3d[i][2]), 3),
                "w_vec": data_points[i]["w_vec"]
            })
            
        return {
            "status": "success", 
            "data": results,
            "metadata": {
                "total_points": len(vectors),
                "clusters": int(n_clusters)
            }
        }
