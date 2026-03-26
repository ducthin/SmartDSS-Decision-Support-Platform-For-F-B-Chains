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

3. Khởi chạy API Server (luôn `cd` vào thư mục `ml-service` trước):
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   # Hoặc: python app/main.py  (đã thêm sys.path để import đúng package app)
   ```

4. Truy cập tài liệu API tự động đẹp mắt bằng Swagger UI (Tính năng mạnh nhất của FastAPI): 
   - `http://localhost:8000/docs`

## 2.1 Ghi chú Windows / phiên bản scikit-learn
- Nếu thấy cảnh báo **InconsistentVersionWarning** khi load `artifacts/model.joblib`: môi trường đang dùng sklearn **cũ hơn** bản đã train. Chạy `pip install -U "scikit-learn>=1.8.0"` (trùng `requirements.txt`) rồi khởi động lại service.

## 2.2 Đánh giá mô hình (nghiêm ngặt theo thời gian)

Script `scripts/train_model.py` **không shuffle** ngẫu nhiên: giữ thứ tự ngày, lấy một **hold-out cuối cùng** làm tập test (mặc định ~15% ngày, tối thiểu 45 ngày). Như vậy `sales_1_day_ago` / `sales_7_days_ago` trên tập test vẫn là quá khứ thật so với từng ngày dự báo — tránh đánh giá quá lạc quan so với shuffle.

- TimeSeries CV trên **chỉ** phần train: báo cáo MAE trung bình ± độ lệch.
- Metric test: MAE, RMSE, MAPE (%), R² cho doanh thu và số đơn.
- Có thể chỉnh:  
  `python scripts/train_model.py --test-ratio 0.12 --min-test-days 60 --cv-splits 5`

`model.joblib` lưu thêm metadata (`test_mae_revenue`, `test_mape_revenue_pct`, khoảng ngày test, …). API inference dùng **MAPE test** để hiệu chỉnh `confidence_score` (không còn cố định 0.85).

## 3. Quy trình làm việc với Data (Workflow)
- **Bước 1**: Từ Project Java/MySQL hiện tại, Export toàn bộ lịch sử bán hàng ra file `.csv`, lưu vào thư mục `/data`.
- **Bước 2**: Dùng Jupyter Notebook (Hoặc file Python tách rời) dùng Pandas và Scikit-Learn để train Model nhận diện quy luật ăn uống của khách hàng.
- **Bước 3**: Lưu kết quả Model học được thành file `model.joblib` ném vào thư mục `/artifacts`.
- **Bước 4**: Sửa file `ml_model.py` để trỏ vào `model.joblib`. Bật Server lên và gọi API `POST /api/v1/predict` là Java sẽ nhận được số liệu dự đoán tương lai!
