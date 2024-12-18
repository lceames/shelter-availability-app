# Base image for the backend
FROM python:3.9-slim AS backend
WORKDIR /backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD ["python", "app.py"]

# Base image for the frontend
FROM node:16 AS frontend
WORKDIR /frontend
COPY frontend/package.json .
RUN npm install
COPY frontend/ .
RUN npm run build

# Serve the combined app (optional)