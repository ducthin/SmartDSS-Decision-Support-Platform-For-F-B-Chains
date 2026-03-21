from fastapi import APIRouter
from app.models.schemas import PredictionRequest, PredictionResponse
from app.services.ml_model import ml_service

router = APIRouter()

@router.post("/", response_model=PredictionResponse)
def get_prediction(request: PredictionRequest):
    """
    Endpoint nhận dữ liệu tính năng đầu vào X (Thời tiết, Sự kiện, Ngày lễ,...)
    Trả về bộ Đầu ra Y (Dự đoán doanh thu, số đơn hàng).
    """
    # ml_service sẽ gọi Model Machine Learning
    prediction_result = ml_service.predict(request.model_dump())
    
    return PredictionResponse(
        predicted_revenue=prediction_result["revenue"],
        predicted_orders=prediction_result["orders"],
        confidence_score=prediction_result["confidence"],
        message="Dự báo thật bằng AI" if ml_service.model else "Dự báo giả lập theo logic Rule-based (Model gốc chưa được train)"
    )
