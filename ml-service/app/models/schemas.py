from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    temperature: float = Field(..., description="Nhiệt độ dự báo trong ngày (Độ C)", example=25.5)
    rainfall: float = Field(..., description="Lượng mưa dự báo (mm)", example=5.0)
    is_weekend: int = Field(..., description="Có phải cuối tuần không (1 = Có, 0 = Không)", example=1)
    is_holiday: int = Field(..., description="Có phải ngày Lễ/Tết không (1 = Có, 0 = Không)", example=0)
    event_impact_level: int = Field(..., description="Mức độ sự kiện diễn ra tại quán (1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL)", example=2)

class PredictionResponse(BaseModel):
    predicted_revenue: float = Field(..., description="Doanh thu dự báo thu được (VNĐ)")
    predicted_orders: int = Field(..., description="Số lượng đơn hàng dự báo bán được")
    confidence_score: float = Field(..., description="Độ tự tin của AI vào dự đoán này (Scale từ 0 tới 1.0)")
    message: str = Field(..., description="Lời nhắn nhủ hoặc giải thích của thuật toán")
