from fastapi import APIRouter, HTTPException

from app.models.schemas import PredictionRequest, PredictionResponse
from app.services.ml_model import ModelUnavailableError, ml_service

router = APIRouter()


@router.post("/", response_model=PredictionResponse)
def get_prediction(request: PredictionRequest):
    """
    Nhap bo dac trung dau vao va tra ve du bao tu model da train.
    Khong fallback sang mock/rule-based khi model khong kha dung.
    """
    try:
        prediction_result = ml_service.predict(request.model_dump())
    except ModelUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "MODEL_UNAVAILABLE",
                "message": str(exc),
            },
        ) from exc

    return PredictionResponse(
        predicted_revenue=prediction_result["revenue"],
        predicted_orders=prediction_result["orders"],
        predicted_inventory_demand=prediction_result.get("inventory_demand", {}),
        confidence_score=prediction_result["confidence"],
        message="Du bao tu mo hinh da huan luyen (scikit-learn)",
    )
