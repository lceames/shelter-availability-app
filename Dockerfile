# Base image for the backend
FROM python:3.9-slim AS backend
WORKDIR /backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ backend
COPY frontend/build ./frontend/build
CMD ["python", "backend/app.py"]