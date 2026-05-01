from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartDSS ML Microservice"
    API_V1_STR: str = "/api/v1"

    # Đường dẫn tệp model và dữ liệu train
    MODEL_PATH: str = "artifacts/model.joblib"
    TRAINING_DATA_PATH: str = "data/training_data.csv"

    # ── Auto-Retrain Configuration ──────────────────────────────────────────
    # Bật/tắt toàn bộ hệ thống auto-retrain
    RETRAIN_ENABLED: bool = True

    # Retrain theo chu kỳ: sau bao nhiêu ngày kể từ lần train cuối
    RETRAIN_INTERVAL_DAYS: int = 7

    # Retrain theo lượng đơn: sau bao nhiêu đơn hàng mới được ghi nhận
    RETRAIN_ORDER_THRESHOLD: int = 1000

    # Chạy check scheduler mỗi bao nhiêu phút (background tick)
    RETRAIN_CHECK_INTERVAL_MINUTES: int = 30

    # Chỉ deploy model mới nếu MAPE test tốt hơn model hiện tại ít nhất N%
    # Đặt 0.0 để luôn deploy sau khi train
    RETRAIN_MAPE_IMPROVEMENT_PCT: float = 0.5

    # TimeZone để log và tính chu kỳ ngày
    APP_TIMEZONE: str = "Asia/Ho_Chi_Minh"

    class Config:
        case_sensitive = True


settings = Settings()
