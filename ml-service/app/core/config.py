from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartDSS ML Microservice"
    API_V1_STR: str = "/api/v1"
    MODEL_PATH: str = "artifacts/model.joblib" # Đường dẫn lưu tệp weights AI sau khi train

    class Config:
        case_sensitive = True

settings = Settings()
