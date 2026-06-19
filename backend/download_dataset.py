import sqlite3
import pandas as pd
from datasets import load_dataset
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "offline_features.db")

def build_offline_database():
    print("Downloading Spotify Tracks Dataset from HuggingFace...")
    # This dataset has 114k tracks with audio features
    dataset = load_dataset("maharshipandya/spotify-tracks-dataset", split="train")
    
    print("Converting to Pandas DataFrame...")
    df = dataset.to_pandas()
    
    # We only need specific columns for our fast offline lookup
    columns_to_keep = ['track_id', 'track_name', 'artists', 'valence', 'energy', 'danceability']
    df = df[columns_to_keep]
    
    # Drop duplicates just in case
    df = df.drop_duplicates(subset=['track_id'])
    
    print(f"Building SQLite Database at {DB_PATH} with {len(df)} tracks...")
    conn = sqlite3.connect(DB_PATH)
    
    # Write to sqlite
    df.to_sql("track_features", conn, if_exists="replace", index=False)
    
    # Create an index on track_id for O(1) lookups
    conn.execute("CREATE INDEX IF NOT EXISTS idx_track_id ON track_features (track_id);")
    conn.commit()
    conn.close()
    
    print("Offline database built successfully!")

if __name__ == "__main__":
    build_offline_database()
