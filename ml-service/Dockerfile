FROM python:3.12-slim

WORKDIR /app

# Cài dependencies hệ thống (tối thiểu)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Cache pip dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY app ./app

# Tạo thư mục artifacts và data (model + training data)
RUN mkdir -p /app/artifacts /app/data

# Port FastAPI
EXPOSE 8000

# Chạy với user non-root
RUN useradd -m -u 1001 mluser && chown -R mluser:mluser /app
USER mluser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
