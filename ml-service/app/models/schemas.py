from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    temperature: float = Field(..., description="Nhiệt độ dự báo trong ngày (Độ C)")
    rainfall: float = Field(..., description="Lượng mưa dự báo (mm)")
    day_of_week: int = Field(
        ...,
        ge=1,
        le=7,
        description="Thứ trong tuần theo ISO-8601: 1=Thứ Hai … 7=Chủ Nhật (khớp generate_dataset / Java DayOfWeek)",
    )
    is_weekend: int = Field(..., description="Có phải cuối tuần không (1 = Có, 0 = Không)")
    is_holiday: int = Field(..., description="Có phải ngày Lễ/Tết thật theo holiday calendar không (1 = Có, 0 = Không); không dùng cho promotion/event thương mại")
    event_impact_level: int = Field(..., description="Mức độ event/promotion diễn ra tại quán (1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL), tách riêng khỏi is_holiday")
    area_density_score: int = Field(..., description="Điểm mật độ phân tích từ API quanh quán (Location Intelligence)")
    sales_1_day_ago: float = Field(..., description="Doanh thu ngày hôm trước")
    sales_7_days_ago: float = Field(..., description="Doanh thu cùng ngày tuần trước")

class PredictionResponse(BaseModel):
    predicted_revenue: float = Field(..., description="Doanh thu dự báo thu được (VNĐ)")
    predicted_orders: int = Field(..., description="Số lượng đơn hàng dự báo bán được")
    predicted_inventory_demand: dict = Field(..., description="[DSS KHO] Tồn kho nguyên liệu cần có (Tên: Số lượng)", example={"Cà phê (kg)": 2.5})
    confidence_score: float = Field(..., description="Độ tự tin của AI vào dự đoán này (Scale từ 0 tới 1.0)")
    message: str = Field(..., description="Lời nhắn nhủ hoặc giải thích của thuật toán")
