from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import asyncpg
import os

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

class HeartRatePayload(BaseModel):
    tenant_id: str
    bpm: float
    motion_context: str
    timestamp: str

@router.post("/heartrate")
async def ingest_heart_rate(payload: HeartRatePayload, background_tasks: BackgroundTasks):
    """
    Ingests heart rate telemetry from the iOS agent.
    """
    async def save_to_timescale(data: HeartRatePayload):
        try:
            conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
            await conn.execute(
                """
                INSERT INTO telemetry_heart_rate (time, tenant_id, bpm, motion_context)
                VALUES ($1, $2, $3, $4)
                """,
                data.timestamp, data.tenant_id, data.bpm, data.motion_context
            )
            await conn.close()
        except Exception as e:
            print(f"Error saving telemetry: {e}")

    # Offload the database insert to a background task for immediate 200 OK to iOS client
    background_tasks.add_task(save_to_timescale, payload)
    return {"status": "accepted"}
