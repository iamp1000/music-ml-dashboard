#!/bin/bash
# Render FastAPI Boot Script
# Note: ML background tasks have been migrated to an external Google Cloud ML microservice.

# Start the FastAPI app in the foreground
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
