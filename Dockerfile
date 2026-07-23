# Production Dockerfile for SignAI ISL Translator PWA
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

COPY backend/ ./backend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

EXPOSE 8000

ENV PORT=8000
CMD ["python", "-m", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000"]
