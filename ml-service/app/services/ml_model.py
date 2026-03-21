import os
import joblib
import pandas as pd
from app.core.config import settings

class MLService:
    def __init__(self):
        self.model = None
        self.load_model()

    def load_model(self):
        """Hàm này khởi chạy 1 lần khi Server bật để đưa Model AI vào RAM"""
        if os.path.exists(settings.MODEL_PATH):
            try:
                self.model = joblib.load(settings.MODEL_PATH)
                print(f"[SUCCESS] Đã nạp thành công bộ não AI từ {settings.MODEL_PATH}")
            except Exception as e:
                print(f"[ERROR] Lỗi khi nạp file Model: {e}")
                self.model = None
        else:
            print(f"[WARNING] Không tìm thấy file Model '{settings.MODEL_PATH}'. Sẽ sử dụng Thuật toán Giả lập Rule-based tạm thời.")

    def predict(self, features: dict) -> dict:
        """Thực thi suy luận (Inference) dựa vào dữ liệu X đầu vào"""
        # --- NẾU ĐÃ CÓ MODEL AI THẬT SỰ ---
        if self.model:
            # Chuyển JSON thành DataFrame chuẩn của Pandas 1 dòng
            df = pd.DataFrame([features])
            
            # Predict (Giả sử model này đang dự đoán Doanh Thu)
            predicted_value = self.model.predict(df)[0]
            
            # Đã có doanh thu, ta dùng công thức tính nhẩm ra biểu đồ Số đơn hàng
            avg_order_value = 50000 
            predicted_orders = int(predicted_value / avg_order_value)
            
            return {
                "revenue": float(predicted_value),
                "orders": predicted_orders,
                "confidence": 0.85 # Tùy ý thay đổi hoặc dùng model.predict_proba()
            }
            
        # --- MOCK LOGIC: NẾU CHƯA TRAIN MODEL KỊP (Trường hợp Server mới dựng) ---
        # Dùng kỹ thuật Luật (Rule-based) để mô phỏng giống y hệt AI
        base_revenue = 8000000 # Doanh thu cơ bản ngày vắng là 8 triệu
        
        is_weekend = features.get("is_weekend", 0)
        is_holiday = features.get("is_holiday", 0)
        impact = features.get("event_impact_level", 1)
        rain = features.get("rainfall", 0)
        
        expected_revenue = base_revenue
        if is_weekend == 1: 
            expected_revenue *= 1.3  # Cuối tuần tăng 30% khách
        if is_holiday == 1: 
            expected_revenue *= 1.6  # Ngày lễ x1.6 lần
            
        # Mưa to thì trừ đi doanh số
        if rain > 20:
            expected_revenue *= 0.6  # Giảm 40% doanh thu
        elif rain > 5:
            expected_revenue *= 0.85 # Giảm 15%
            
        # Có sự kiện đặc biệt (Acoustic, Khai trương) - Hệ số x (Mức độ * 10%)
        if impact > 1:
            expected_revenue *= (1 + (impact * 0.15))
            
        expected_orders = int(expected_revenue / 45000) # Tính ngược về số cốc/bát phở đã bán
        
        return {
            "revenue": expected_revenue,
            "orders": expected_orders,
            "confidence": 0.5 # Model giả lập nên tự tin thấp hơn
        }

# Inject singleton pattern
ml_service = MLService()
