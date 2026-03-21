from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import predict

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Microservice AI AI/Machine Learning cho Dự án SmartDSS (Đồ án tốt nghiệp)",
    version="1.0.0"
)

# Cấu hình CORS để cho phép Frontend React hoặc Backend Java (Cùng Localhost hoặc khác IP) gọi sang
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong thực tế nếu chạy Server thật, hãy cấu hình cụ thể lại thay vì Dấu *
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn (Include) các Router API vào App
app.include_router(predict.router, prefix=f"{settings.API_V1_STR}/predict", tags=["Prediction (Dự báo)"])

@app.get("/")
def root():
    return {
        "message": "Welcome to SmartDSS Machine Learning Microservice.",
        "docs": "Truy cập đường dẫn /docs để xem Swagger UI API Specification."
    }

if __name__ == "__main__":
    import uvicorn
    # Chạy Uvicorn trực tiếp nếu file main.py được khởi chạy
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
