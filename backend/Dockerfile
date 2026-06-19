FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (Redis and dos2unix for Windows line endings)
RUN apt-get update && \
    apt-get install -y redis-server dos2unix && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Fix line endings and make start script executable
RUN dos2unix start.sh && chmod +x start.sh

# Expose the port
EXPOSE 8000

# Start the application using the script
CMD ["./start.sh"]
