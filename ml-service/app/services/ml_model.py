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
        """Map test-time MAPE to a bounded confidence score."""
        bundle = self._bundle_meta
        if not isinstance(bundle, dict):
            return 0.85
        mape = bundle.get("test_mape_revenue_pct")
        if mape is None:
            return 0.85
        return float(max(0.42, min(0.94, 1.0 - (float(mape) / 130.0))))

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
