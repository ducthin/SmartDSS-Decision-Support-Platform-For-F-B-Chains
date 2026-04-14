"""
Chay khuyen nghi (tu thu muc ml-service/):
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

`python app/main.py` cung hoat dong nho chinh sys.path ben duoi.
"""

import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

if hasattr(sys.stdout, "reconfigure"):
    for _stream in (sys.stdout, sys.stderr):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import predict
from app.core.config import settings
from app.services.ml_model import ml_service

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Microservice AI/Machine Learning cho du an SmartDSS",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix=f"{settings.API_V1_STR}/predict", tags=["Prediction"])


@app.get("/")
def root():
    return {
        "message": "Welcome to SmartDSS Machine Learning Microservice.",
        "docs": "Truy cap /docs de xem Swagger UI.",
        "health": "/health",
    }


@app.get("/health")
def health():
    return ml_service.health_status()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
