"""
admin.py
========
API quản trị Auto-Retrain.

Endpoints:
  GET  /api/v1/admin/retrain/status   — xem trạng thái hiện tại
  POST /api/v1/admin/retrain/trigger  — kích hoạt retrain thủ công ngay lập tức
  POST /api/v1/admin/retrain/notify-orders — thông báo số đơn mới để cộng vào counter
"""

from __future__ import annotations

import threading

from fastapi import APIRouter, BackgroundTasks, Body, HTTPException

from app.services.retrain_service import retrain_state, run_retrain

router = APIRouter()


@router.get("/retrain/status", summary="Xem trạng thái hệ thống Auto-Retrain")
def get_retrain_status():
    """
    Trả về toàn bộ trạng thái của hệ thống auto-retrain:
    - Lần retrain cuối, số đơn tích lũy, MAPE hiện tại
    - Cấu hình ngưỡng đang áp dụng
    - Lịch sử 10 lần retrain gần nhất
    """
    return retrain_state.status_dict()


@router.post("/retrain/trigger", summary="Kích hoạt Retrain thủ công ngay lập tức")
def trigger_retrain(background_tasks: BackgroundTasks):
    """
    Kích hoạt retrain thủ công. Quá trình chạy nền, API trả về ngay.
    Kết quả sẽ được ghi vào lịch sử và log server.
    """
    if retrain_state.is_retraining:
        raise HTTPException(status_code=409, detail="Retrain đang chạy. Vui lòng chờ hoàn tất.")

    def _run():
        run_retrain(triggered_by="manual_api")

    t = threading.Thread(target=_run, daemon=True)
    t.start()

    return {
        "success": True,
        "message": "Đã kích hoạt retrain nền. Xem /admin/retrain/status để theo dõi tiến độ.",
    }


@router.post("/retrain/notify-orders", summary="Thông báo số đơn hàng mới (cộng vào counter)")
def notify_new_orders(order_count: int = Body(..., embed=True, ge=1, description="Số đơn mới cần cộng thêm")):
    """
    Dùng khi Backend Java ghi nhận đơn hoàn thành → gọi API này để ML service
    cộng vào bộ đếm nội bộ. Khi counter vượt ngưỡng RETRAIN_ORDER_THRESHOLD,
    scheduler tick tiếp theo sẽ tự động kích hoạt retrain.
    """
    retrain_state.add_orders(order_count)
    status = retrain_state.status_dict()
    return {
        "success": True,
        "message": f"Đã cộng {order_count} đơn vào counter.",
        "orders_since_last_retrain": status["orders_since_last_retrain"],
        "threshold": status["config"]["order_threshold"],
    }
