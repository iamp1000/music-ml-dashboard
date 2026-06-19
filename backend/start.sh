#!/bin/bash
# Start redis server in the background
redis-server --daemonize yes

# Start celery worker in the background
celery -A celery_worker.celery_app worker --loglevel=info &

# Start the FastAPI app in the foreground
uvicorn main:app --host 0.0.0.0 --port 8000
