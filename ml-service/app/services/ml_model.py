import os
import sys

import joblib
import pandas as pd

from app.core.config import settings

# Tranh UnicodeEncodeError tren Windows (console cp1252) khi log tieng Viet
if hasattr(sys.stdout, "reconfigure"):
    for _stream in (sys.stdout, sys.stderr):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


FEATURE_COLUMNS = [
    "day_of_week",
    "is_weekend",
    "is_holiday",
    "temperature",
    "rainfall",
    "event_impact_level",
    "area_density_score",
    "sales_1_day_ago",
    "sales_7_days_ago",
]


class ModelUnavailableError(RuntimeError):
    """Raised when the trained ML model is not available for inference."""


class MLService:
    def __init__(self):
        self.model = None
        self.revenue_model = None
        self.orders_model = None
        self._bundle_meta = None
        self._load_error = None
        self.load_model()

    def _confidence_from_bundle(self) -> float:
        """
        Tính confidence theo 2 tầng:

        Tầng 1 — CV MAE trên tập train (ổn định, không bị ảnh hưởng bởi
                  distribution shift giữa data tổng hợp và data thật):
            relative_cv_error = cv_mae / median_revenue_train
            base_confidence   = 1 - relative_cv_error
            Ví dụ: cv_mae=76k, median=700k → error=10.9% → base=89%

        Tầng 2 — Penalty nếu test R2 âm (phát hiện distribution shift rõ):
            R2 >= 0  : không penalty (model vẫn tốt hơn đoán trung bình)
            R2 < 0   : penalty tối đa 15% (model bị lệch nhiều trên data thật)

        Kết quả clamp vào [0.50, 0.94].
        """
        bundle = self._bundle_meta
        if not isinstance(bundle, dict):
            return 0.80

        # ── Tầng 1: CV MAE ────────────────────────────────────────────────────
        cv_mae      = bundle.get("cv_mae_revenue_mean")
        train_mae   = bundle.get("train_mae_revenue")   # fallback
        # Ước tính median revenue từ train MAE (in-sample MAE thường = ~5-8% median)
        # Dùng test_mae làm proxy nếu không có thông tin trực tiếp
        test_mae    = bundle.get("test_mae_revenue", bundle.get("training_mae_revenue"))

        if cv_mae is not None and cv_mae > 0:
            # Ước tính typical revenue: nếu train MAPE ~5% thì train_mae = 5% * median
            train_mape  = bundle.get("train_mape_revenue_pct")
            if train_mape and float(train_mape) > 0:
                estimated_median = float(train_mae) / (float(train_mape) / 100.0)
                relative_error   = float(cv_mae) / max(estimated_median, 1.0)
            else:
                # Fallback: giả sử typical revenue ~700k
                relative_error = float(cv_mae) / 700_000.0
            base = float(max(0.0, 1.0 - relative_error))
        else:
            base = 0.72   # không có CV info → moderate default

        # ── Tầng 2: Penalty nếu distribution shift (R2 test âm) ──────────────
        r2 = bundle.get("test_r2_revenue", bundle.get("training_r2_revenue"))
        if r2 is not None:
            r2 = float(r2)
            if r2 < 0:
                # R2 âm = model tệ hơn trung bình trên test → penalty tối đa 15%
                penalty = min(0.15, abs(r2) * 0.03)
                base -= penalty

        return float(round(max(0.50, min(0.94, base)), 4))

    def load_model(self):
        """Load the trained model bundle once on service startup."""
        self.model = None
        self.revenue_model = None
        self.orders_model = None
        self._bundle_meta = None
        self._load_error = None

        if not os.path.exists(settings.MODEL_PATH):
            self._load_error = (
                f"Khong tim thay model tai '{settings.MODEL_PATH}'. "
                "Hay train model va khoi dong lai ML service."
            )
            print(f"[WARNING] {self._load_error}")
            return

        try:
            bundle = joblib.load(settings.MODEL_PATH)
            if isinstance(bundle, dict) and "revenue_model" in bundle:
                self.model = bundle
                self.revenue_model = bundle["revenue_model"]
                self.orders_model = bundle.get("orders_model")
                self._bundle_meta = bundle
                ver = bundle.get("version", "?")
                mae = bundle.get("test_mae_revenue", bundle.get("training_mae_revenue", 0))
                r2 = bundle.get("test_r2_revenue", bundle.get("training_r2_revenue", 0))
                mape = bundle.get("test_mape_revenue_pct")
                ev = bundle.get("eval_method", "")
                print(f"[SUCCESS] Nap Model Bundle v{ver} tu {settings.MODEL_PATH}")
                if ev:
                    print(
                        "          Danh gia: "
                        f"{ev} | test {bundle.get('test_date_start', '?')} -> {bundle.get('test_date_end', '?')}"
                    )
                extra = f" | MAPE test: {mape:.1f}%" if mape is not None else ""
                print(f"          MAE doanh thu (test): {mae:,.0f} VND | R2 test: {r2:.3f}{extra}")
                return

            # Legacy single-estimator file
            self.model = bundle
            self.revenue_model = bundle
            print(f"[SUCCESS] Nap Model (Legacy) tu {settings.MODEL_PATH}")
        except Exception as exc:
            self._load_error = f"Khong the nap model tu {settings.MODEL_PATH}: {exc}"
            print(f"[ERROR] {self._load_error}")

    def ensure_model_ready(self):
        if self.revenue_model is None:
            detail = self._load_error or (
                "Model chua san sang. Hay kiem tra artifacts/model.joblib va khoi dong lai service."
            )
            raise ModelUnavailableError(detail)

    def health_status(self) -> dict:
        ready = self.revenue_model is not None
        return {
            "status": "ready" if ready else "model_unavailable",
            "model_loaded": ready,
            "detail": None if ready else self._load_error,
            "model_path": settings.MODEL_PATH,
        }

    def predict(self, features: dict) -> dict:
        """Run inference with the trained model only."""
        self.ensure_model_ready()

        row = {col: features.get(col, 0) for col in FEATURE_COLUMNS}
        df = pd.DataFrame([row])

        predicted_revenue = float(self.revenue_model.predict(df)[0])
        if self.orders_model is not None:
            predicted_orders = max(1, int(round(self.orders_model.predict(df)[0])))
        else:
            predicted_orders = max(1, int(predicted_revenue / 55000))

        return {
            "revenue": predicted_revenue,
            "orders": predicted_orders,
            "inventory_demand": {},
            "confidence": self._confidence_from_bundle(),
        }


ml_service = MLService()
