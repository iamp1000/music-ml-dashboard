from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    picture = Column(String(1024), nullable=True)
    current_context = Column(String(255), default="None")
    created_at = Column(DateTime(timezone=True), nullable=True)
    access_token_cipher = Column(String(2048), nullable=True)
    access_token_nonce = Column(String(255), nullable=True)
    refresh_token_cipher = Column(String(2048), nullable=True)
    refresh_token_nonce = Column(String(255), nullable=True)
    preferences = Column(JSON, nullable=True)
    
class ListeningHistory(Base):
    __tablename__ = "listening_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(String(255), ForeignKey("users.id"), index=True)
    time = Column(String(255), index=True) # ISO format string to match old Firebase
    track_id = Column(String(255))
    track_name = Column(String(255))
    artist_name = Column(String(255))
    duration_ms = Column(Integer)
    played_ms = Column(Integer)
    listen_type = Column(String(50), nullable=True)
    listen_weight = Column(Integer, nullable=True)
    valence = Column(Float, nullable=True)
    energy = Column(Float, nullable=True)
    context = Column(String(255), nullable=True)
    ml_features = Column(JSON, nullable=True)
    sync_source = Column(String(255), nullable=True)
    
    # ML Extracted fields
    audio_ml_analyzed = Column(Integer, default=0) # SQLite/TiDB boolean (0/1)
    real_bpm = Column(Float, nullable=True)
    rhythm_regularity = Column(Float, nullable=True)
    real_genre = Column(String(255), nullable=True)
    genre_confidence = Column(Float, nullable=True)
    audio_valence = Column(Float, nullable=True)
    audio_arousal = Column(Float, nullable=True)

class UserAggregates(Base):
    __tablename__ = "user_aggregates"
    
    tenant_id = Column(String(255), ForeignKey("users.id"), primary_key=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Pre-calculated yearly metrics
    total_listening_time_mins = Column(Integer, default=0)
    total_tracks_played = Column(Integer, default=0)
    artists_discovered = Column(Integer, default=0)
    genres_explored = Column(Integer, default=0)
    
    # Pre-calculated complex JSON objects for graphs
    top_genres_json = Column(JSON, nullable=True)
    top_artists_json = Column(JSON, nullable=True)
    timeline_data_json = Column(JSON, nullable=True)
