"""
Chay khuyen nghi (tu thu muc ml-service/):
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

`python app/main.py` cung hoat dong nho chinh sys.path ben duoi.
"""

import sys
from contextlib import asynccontextmanager
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

import logging

# ── APScheduler: import có fallback nếu chưa cài ─────────────────────────────
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    _APSCHEDULER_AVAILABLE = True
except ImportError:
    _APSCHEDULER_AVAILABLE = False
    logging.warning(
        "[Scheduler] APScheduler chưa được cài đặt — auto-retrain bị vô hiệu hóa. "
        "Chạy: pip install \"APScheduler>=3.10.4\" \"pytz>=2024.1\" để kích hoạt."
    )

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import predict
from app.api import admin as admin_router
from app.core.config import settings
from app.services.ml_model import ml_service
from app.services.retrain_service import retrain_state, scheduler_tick

log = logging.getLogger(__name__)

# ── Khởi tạo scheduler (chỉ khi APScheduler có sẵn) ──────────────────────────
_scheduler = None
if _APSCHEDULER_AVAILABLE:
    try:
        import pytz  # noqa: F401
        _scheduler = BackgroundScheduler(timezone=settings.APP_TIMEZONE)
    except Exception as _e:
        log.warning("[Scheduler] Không khởi tạo được scheduler: %s", _e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi động và dọn dẹp scheduler cùng vòng đời FastAPI."""
    if settings.RETRAIN_ENABLED and _scheduler is not None:
        _scheduler.add_job(
            scheduler_tick,
            trigger="interval",
            minutes=settings.RETRAIN_CHECK_INTERVAL_MINUTES,
            id="auto_retrain_tick",
            replace_existing=True,
        )
        _scheduler.start()
        log.info(
            "[Scheduler] Auto-retrain đã khởi động — "
            "tick mỗi %d phút | interval %d ngày | ngưỡng đơn %d.",
            settings.RETRAIN_CHECK_INTERVAL_MINUTES,
            settings.RETRAIN_INTERVAL_DAYS,
            settings.RETRAIN_ORDER_THRESHOLD,
        )
    elif not _APSCHEDULER_AVAILABLE:
        log.warning(
            "[Scheduler] Auto-retrain KHÔNG chạy do APScheduler chưa được cài. "
            "Cài đặt: pip install \"APScheduler>=3.10.4\" \"pytz>=2024.1\""
        )
    else:
        log.info("[Scheduler] Auto-retrain bị tắt (RETRAIN_ENABLED=False).")

    yield  # ── ứng dụng đang chạy ──

    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        log.info("[Scheduler] Auto-retrain scheduler đã dừng.")


# ── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Microservice AI/Machine Learning cho du an SmartDSS",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix=f"{settings.API_V1_STR}/predict", tags=["Prediction"])
app.include_router(admin_router.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin / Auto-Retrain"])


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to SmartDSS Machine Learning Microservice.",
        "docs": "Truy cap /docs de xem Swagger UI.",
        "health": "/health",
        "retrain_status": f"{settings.API_V1_STR}/admin/retrain/status",
        "scheduler_available": _APSCHEDULER_AVAILABLE,
    }


@app.get("/health", tags=["Root"])
def health():
    status = ml_service.health_status()
    status["auto_retrain"] = {
        "enabled": settings.RETRAIN_ENABLED,
        "scheduler_available": _APSCHEDULER_AVAILABLE,
        "is_retraining": retrain_state.is_retraining,
        "last_retrain_at": (
            retrain_state.last_retrain_at.isoformat() if retrain_state.last_retrain_at else None
        ),
        "orders_since_last_retrain": retrain_state.orders_since_last_retrain,
    }
    return status


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
