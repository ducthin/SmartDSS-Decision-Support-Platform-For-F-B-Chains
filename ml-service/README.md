# SmartDSS ML Microservice

Microservice bằng Python/FastAPI chuyên đảm nhiệm việc chạy mô hình Machine Learning dự đoán lượng khách, doanh thu và tồn kho cho toàn bộ hệ thống SmartDSS.

## 1. Cấu trúc Thư mục (Clean Architecture)
- `app/api/`: Chứa các API Endpoints (Controllers/Routers).
- `app/core/`: Chứa cấu hình dự án (Config, Data Variables).
- `app/models/`: Chứa các Pydantic Schemas (DTOs dùng để xác thực dữ liệu đầu vào/ra).
- `app/services/`: Chứa nghiệp vụ kinh doanh và Logic Inference (gọi mô hình Machine Learning).
- `artifacts/`: Thư mục lưu trữ model File đã được train xong (`.joblib`, `.pkl`).
- `data/`: Thư mục lưu các file CSV (Raw Data) do MySQL sinh ra để chuẩn bị cho quá trình huấn luyện AI.

## 2. Hướng dẫn sử dụng (How to run)

1. Cài đặt môi trường ảo (Virtual Environment):
   ```bash
   python -m venv venv
   # Nếu dùng Windows mở PowerShell:
   .\venv\Scripts\activate
   ```

2. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```

3. Khởi chạy API Server:
   ```bash
   python app/main.py
   # Hoặc dùng dòng lệnh: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. Truy cập tài liệu API tự động đẹp mắt bằng Swagger UI (Tính năng mạnh nhất của FastAPI): 
   - `http://localhost:8000/docs`

## 3. Quy trình làm việc với Data (Workflow)
- **Bước 1**: Từ Project Java/MySQL hiện tại, Export toàn bộ lịch sử bán hàng ra file `.csv`, lưu vào thư mục `/data`.
- **Bước 2**: Dùng Jupyter Notebook (Hoặc file Python tách rời) dùng Pandas và Scikit-Learn để train Model nhận diện quy luật ăn uống của khách hàng.
- **Bước 3**: Lưu kết quả Model học được thành file `model.joblib` ném vào thư mục `/artifacts`.
- **Bước 4**: Sửa file `ml_model.py` để trỏ vào `model.joblib`. Bật Server lên và gọi API `POST /api/v1/predict` là Java sẽ nhận được số liệu dự đoán tương lai!
