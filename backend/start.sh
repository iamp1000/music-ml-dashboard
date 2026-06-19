#!/bin/bash
# Start redis server in the background
redis-server --daemonize yes

# Start celery worker in the background with concurrency=1 to save memory
celery -A celery_worker.celery_app worker --concurrency=1 --loglevel=info &

# Start celery beat for scheduled tasks in the background
celery -A celery_worker.celery_app beat --loglevel=info &

# Start the FastAPI app in the foreground
uvicorn main:app --host 0.0.0.0 --port 8000
