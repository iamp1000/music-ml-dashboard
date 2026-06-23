from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db
from ml_engine.models.clustering_model import VectorGraphEngine
from auth_utils import verify_firebase_token

router = APIRouter()

@router.get("/vector-graph")
async def get_vector_graph(token: str = Query(...)):
    """
    Returns the K-Means clustered, PCA-reduced 3D coordinate map 
    of the user's listening behavior based on the 4D Explosive Vectors.
    """
    try:
        # Verify the user
        user_info = verify_firebase_token(token)
        user_id = user_info['uid']
        
        # Run the Scikit-Learn pipeline
        graph_data = VectorGraphEngine.generate_graph_data(user_id)
        
        if graph_data["status"] == "insufficient_data":
            return {"data": [], "message": graph_data["message"]}
            
        return graph_data
        
    except Exception as e:
        print(f"Failed to generate vector graph: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate vector graph")
