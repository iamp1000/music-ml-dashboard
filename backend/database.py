import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def init_db():
    """
    Initializes PostgreSQL connection and creates TimescaleDB hypertables.
    """
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Ensure TimescaleDB extension is loaded
    await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
    
    # 1. Users Table
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            spotify_id TEXT PRIMARY KEY,
            display_name TEXT,
            access_token_cipher TEXT,
            access_token_nonce TEXT,
            refresh_token_cipher TEXT,
            refresh_token_nonce TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)

    # 2. Telemetry (Heart Rate) Hypertable
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS telemetry_heart_rate (
            time TIMESTAMPTZ NOT NULL,
            tenant_id TEXT NOT NULL REFERENCES users(spotify_id),
            bpm FLOAT NOT NULL,
            motion_context TEXT
        );
    """)
    # Convert to Hypertable partitioned by time
    try:
        await conn.execute("SELECT create_hypertable('telemetry_heart_rate', 'time', if_not_exists => TRUE);")
    except Exception as e:
        print("Hypertable telemetry_heart_rate may already exist.")

    # 3. Listening History Hypertable
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS listening_history (
            time TIMESTAMPTZ NOT NULL,
            tenant_id TEXT NOT NULL REFERENCES users(spotify_id),
            track_id TEXT NOT NULL,
            valence FLOAT,
            arousal FLOAT,
            energy FLOAT
        );
    """)
    try:
        await conn.execute("SELECT create_hypertable('listening_history', 'time', if_not_exists => TRUE);")
    except Exception as e:
        print("Hypertable listening_history may already exist.")

    await conn.close()
    print("Database schemas and Hypertables initialized successfully.")
