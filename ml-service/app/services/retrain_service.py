"""
retrain_service.py
==================
Dịch vụ Auto-Retrain định kỳ và theo ngưỡng đơn hàng.

Logic hoạt động:
  1. Scheduler (APScheduler) chạy background, tick mỗi RETRAIN_CHECK_INTERVAL_MINUTES phút.
  2. Mỗi tick kiểm tra 2 điều kiện:
       a. Đã đủ RETRAIN_INTERVAL_DAYS ngày kể từ lần retrain cuối?
       b. Đã tích lũy đủ RETRAIN_ORDER_THRESHOLD đơn hàng mới?
     Thỏa bất kỳ 1 điều kiện → kích hoạt retrain.
  3. Sau khi train xong, so sánh MAPE test mới vs cũ.
     Nếu cải thiện hơn RETRAIN_MAPE_IMPROVEMENT_PCT → ghi đè model.joblib + hot-reload MLService.
     Nếu không → giữ model cũ, ghi log warning.
  4. Counter đơn hàng được reset sau mỗi lần retrain thành công.

Tất cả tham số đều đọc từ settings (config.py) → có thể chỉnh qua biến môi trường.
"""

from __future__ import annotations

import logging
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import pytz

from app.core.config import settings

log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent.parent  # ml-service/
TRAIN_SCRIPT = ROOT / "scripts" / "train_model.py"
MODEL_PATH = ROOT / Path(settings.MODEL_PATH)
DATA_PATH = ROOT / Path(settings.TRAINING_DATA_PATH)

_tz = pytz.timezone(settings.APP_TIMEZONE)


def _now_local() -> datetime:
    return datetime.now(tz=_tz)


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class RetrainState:
    """
    Trạng thái toàn cục của hệ thống auto-retrain.
    Thread-safe thông qua lock.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()

        # Thời điểm lần retrain thành công cuối cùng (None = chưa retrain lần nào)
        self.last_retrain_at: Optional[datetime] = None

        # Số đơn hàng tích lũy kể từ lần retrain cuối
        self.orders_since_last_retrain: int = 0

        # Đang chạy retrain hay không (chống chạy đồng thời)
        self.is_retraining: bool = False

        # Lịch sử các lần retrain (giữ 20 bản gần nhất)
        self.retrain_history: list[dict] = []

        # MAPE của model đang chạy (None nếu chưa biết)
        self.current_model_mape: Optional[float] = None

        # Lý do lần kích hoạt retrain gần nhất
        self.last_trigger_reason: Optional[str] = None

        # Lần check scheduler gần nhất
        self.last_checked_at: Optional[datetime] = None

    def add_orders(self, count: int) -> None:
        """Gọi mỗi khi hệ thống ghi nhận đơn hàng mới."""
        with self._lock:
            self.orders_since_last_retrain += count

    def should_retrain(self) -> tuple[bool, str]:
        """
        Kiểm tra xem có nên retrain không.
        Trả về (True/False, lý do).
        """
        with self._lock:
            if self.is_retraining:
                return False, "Đang trong quá trình retrain"

            # Kiểm tra điều kiện ngày
            if self.last_retrain_at is None:
                # Chưa retrain lần nào → chỉ train nếu có data
                if DATA_PATH.exists():
                    return True, "Chưa có lịch sử retrain, kích hoạt lần đầu"
                return False, "Chưa có file dữ liệu training"

            days_since = (_now_local() - self.last_retrain_at).days
            if days_since >= settings.RETRAIN_INTERVAL_DAYS:
                return True, f"Đã {days_since} ngày kể từ lần retrain cuối (ngưỡng: {settings.RETRAIN_INTERVAL_DAYS} ngày)"

            # Kiểm tra điều kiện số đơn
            if self.orders_since_last_retrain >= settings.RETRAIN_ORDER_THRESHOLD:
                return True, (
                    f"Đã tích lũy {self.orders_since_last_retrain} đơn kể từ lần retrain cuối "
                    f"(ngưỡng: {settings.RETRAIN_ORDER_THRESHOLD} đơn)"
                )

            return False, (
                f"Chưa đủ điều kiện. "
                f"Ngày: {days_since}/{settings.RETRAIN_INTERVAL_DAYS}. "
                f"Đơn: {self.orders_since_last_retrain}/{settings.RETRAIN_ORDER_THRESHOLD}."
            )

    def status_dict(self) -> dict:
        """Trả về trạng thái dưới dạng dict để trả về API."""
        with self._lock:
            return {
                "retrain_enabled": settings.RETRAIN_ENABLED,
                "is_retraining": self.is_retraining,
                "last_retrain_at": self.last_retrain_at.isoformat() if self.last_retrain_at else None,
                "orders_since_last_retrain": self.orders_since_last_retrain,
                "current_model_mape_pct": round(self.current_model_mape, 2) if self.current_model_mape else None,
                "last_trigger_reason": self.last_trigger_reason,
                "last_checked_at": self.last_checked_at.isoformat() if self.last_checked_at else None,
                "config": {
                    "interval_days": settings.RETRAIN_INTERVAL_DAYS,
                    "order_threshold": settings.RETRAIN_ORDER_THRESHOLD,
                    "check_interval_minutes": settings.RETRAIN_CHECK_INTERVAL_MINUTES,
                    "mape_improvement_pct": settings.RETRAIN_MAPE_IMPROVEMENT_PCT,
                },
                "history": self.retrain_history[-10:],  # 10 bản gần nhất
            }


# Singleton state
retrain_state = RetrainState()


def _run_train_subprocess() -> tuple[bool, Optional[float], str]:
    """
    Chạy scripts/train_model.py như subprocess.
    Trả về (success, mape_pct, log_output).
    """
    python_exec = sys.executable
    cmd = [python_exec, str(TRAIN_SCRIPT)]

    log.info("[Retrain] Khởi chạy subprocess: %s", " ".join(cmd))
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(ROOT),
            timeout=600,  # tối đa 10 phút
        )
        output = proc.stdout + proc.stderr
        if proc.returncode != 0:
            log.error("[Retrain] Train script thất bại (returncode=%d):\n%s", proc.returncode, output[-3000:])
            return False, None, output[-3000:]

        log.info("[Retrain] Train script hoàn thành. Output tail:\n%s", output[-1500:])
        return True, None, output

    except subprocess.TimeoutExpired:
        log.error("[Retrain] Train script timeout sau 600s.")
        return False, None, "Timeout"
    except Exception as exc:
        log.exception("[Retrain] Lỗi khi chạy subprocess: %s", exc)
        return False, None, str(exc)


def _read_mape_from_bundle(path: Path) -> Optional[float]:
    """Đọc MAPE test từ file model.joblib."""
    try:
        bundle = joblib.load(path)
        if isinstance(bundle, dict):
            return bundle.get("test_mape_revenue_pct")
    except Exception as exc:
        log.warning("[Retrain] Không đọc được MAPE từ bundle: %s", exc)
    return None


def run_retrain(triggered_by: str = "scheduler") -> dict:
    """
    Thực hiện một chu kỳ retrain đầy đủ (thread-safe).
    Được gọi từ scheduler hoặc API trigger thủ công.
    """
    with retrain_state._lock:
        if retrain_state.is_retraining:
            return {"success": False, "message": "Retrain đang chạy, bỏ qua yêu cầu."}
        retrain_state.is_retraining = True
        retrain_state.last_trigger_reason = triggered_by

    started_at = _now_local()
    log.info("[Retrain] ── Bắt đầu retrain ── trigger=%s  time=%s", triggered_by, started_at.isoformat())

    # Lưu MAPE cũ để so sánh
    old_mape = _read_mape_from_bundle(MODEL_PATH) if MODEL_PATH.exists() else None

    try:
        success, _, output_log = _run_train_subprocess()

        if not success:
            err_msg = "Train script lỗi"
            if output_log:
                lines = [L.strip() for L in output_log.split("\n") if L.strip()]
                if lines:
                    err_msg = lines[-1][:80] # Lấy dòng lỗi cuối cùng
            _record_history(started_at, triggered_by, success=False, note=f"Lỗi: {err_msg}")
            return {"success": False, "message": f"Train thất bại. Lỗi: {err_msg}"}

        new_mape = _read_mape_from_bundle(MODEL_PATH)

        # Quyết định deploy
        should_deploy, deploy_note = _evaluate_deploy(old_mape, new_mape)

        if should_deploy:
            log.info("[Retrain] ✅ Deploy model mới. MAPE cũ=%s → mới=%s. %s", old_mape, new_mape, deploy_note)
            _hot_reload_model()
            with retrain_state._lock:
                retrain_state.last_retrain_at = _now_local()
                retrain_state.orders_since_last_retrain = 0
                retrain_state.current_model_mape = new_mape
            _record_history(started_at, triggered_by, success=True, note=deploy_note, mape=new_mape)
            return {
                "success": True,
                "message": f"Retrain và deploy thành công. {deploy_note}",
                "old_mape_pct": old_mape,
                "new_mape_pct": new_mape,
            }
        else:
            log.warning("[Retrain] ⚠ Model mới không đủ tốt hơn. %s. Giữ model cũ.", deploy_note)
            _record_history(started_at, triggered_by, success=True, note=f"Hoàn thành, giữ mô hình cũ: {deploy_note}", mape=new_mape)
            # Vẫn reset timer ngày (đã train thành công, chỉ không deploy)
            with retrain_state._lock:
                retrain_state.last_retrain_at = _now_local()
                retrain_state.orders_since_last_retrain = 0
            return {
                "success": False,
                "message": f"Train xong nhưng không deploy. {deploy_note}",
                "old_mape_pct": old_mape,
                "new_mape_pct": new_mape,
            }

    finally:
        with retrain_state._lock:
            retrain_state.is_retraining = False
        elapsed = (_now_local() - started_at).total_seconds()
        log.info("[Retrain] ── Kết thúc retrain ── elapsed=%.1fs", elapsed)


def _evaluate_deploy(old_mape: Optional[float], new_mape: Optional[float]) -> tuple[bool, str]:
    """Quyết định có nên deploy model mới không."""
    if new_mape is None:
        return True, "Không đọc được MAPE mới → deploy để cập nhật weights."

    if old_mape is None:
        return True, f"Không có model cũ để so sánh → deploy mới (MAPE={new_mape:.1f}%)."

    threshold = settings.RETRAIN_MAPE_IMPROVEMENT_PCT
    improvement = old_mape - new_mape  # dương = model mới tốt hơn
    if improvement >= threshold:
        return True, f"Model mới tốt hơn {improvement:.2f}% MAPE ({old_mape:.1f}% → {new_mape:.1f}%)."
    else:
        return False, (
            f"Cải thiện MAPE không đủ ngưỡng: {improvement:.2f}% < {threshold}% "
            f"(cũ={old_mape:.1f}% → mới={new_mape:.1f}%)."
        )


def _hot_reload_model() -> None:
    """Yêu cầu MLService load lại model.joblib ngay lập tức."""
    try:
        from app.services.ml_model import ml_service
        ml_service.load_model()
        log.info("[Retrain] Hot-reload MLService hoàn thành.")
    except Exception as exc:
        log.error("[Retrain] Hot-reload thất bại: %s", exc)


def _record_history(
    started_at: datetime,
    triggered_by: str,
    success: bool,
    note: str,
    mape: Optional[float] = None,
) -> None:
    record = {
        "started_at": started_at.isoformat(),
        "triggered_by": triggered_by,
        "success": success,
        "note": note,
        "mape_pct": round(mape, 2) if mape is not None else None,
    }
    with retrain_state._lock:
        retrain_state.retrain_history.append(record)
        if len(retrain_state.retrain_history) > 20:
            retrain_state.retrain_history.pop(0)


def scheduler_tick() -> None:
    """
    Hàm được APScheduler gọi định kỳ.
    Kiểm tra điều kiện và kích hoạt retrain nếu cần.
    """
    with retrain_state._lock:
        retrain_state.last_checked_at = _now_local()

    if not settings.RETRAIN_ENABLED:
        return

    should, reason = retrain_state.should_retrain()
    log.debug("[Scheduler] Check retrain → %s | %s", should, reason)

    if should:
        log.info("[Scheduler] Kích hoạt retrain. Lý do: %s", reason)
        # Chạy trong thread riêng để không block scheduler
        t = threading.Thread(target=run_retrain, args=(reason,), daemon=True)
        t.start()
