from __future__ import annotations

import argparse
import joblib
import sys
from pathlib import Path

# UTF-8 console on Windows (tránh lỗi khi in tiếng Việt)
if hasattr(sys.stdout, "reconfigure"):
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit

ROOT = Path(__file__).parent.parent  # ml-service/
DATA_PATH = ROOT / "data" / "training_data.csv"
ARTIFACT_DIR = ROOT / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "model.joblib"

FEATURES = [
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
TARGET_REVENUE = "revenue"
TARGET_ORDERS = "orders"

BUNDLE_VERSION = "1.1.0"


def mape_pct(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """MAPE (%); bỏ qua giá trị ~0 (ở đây revenue/orders đều > 0)."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = np.abs(y_true) > 1e-6
    if not np.any(mask):
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)


def rmse(y_true, y_pred) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))


def chronological_holdout(
    df: pd.DataFrame, test_ratio: float, min_test_days: int
) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = df.sort_values("date").reset_index(drop=True)
    n = len(df)
    n_test = max(min_test_days, int(round(n * test_ratio)))
    n_test = min(n_test, n - 1)  # giữ ít nhất 1 mẫu train
    if n_test < 1:
        raise ValueError("Dataset quá nhỏ để chia hold-out.")
    train_df = df.iloc[: n - n_test].copy()
    test_df = df.iloc[n - n_test :].copy()
    return train_df, test_df


def time_series_cv_mae(
    X: pd.DataFrame,
    y: pd.Series,
    model_factory,
    n_splits: int = 5,
) -> tuple[float, float, int]:
    """
    TimeSeriesSplit trên tập train (thứ tự thời gian đã đúng).
    Trả về (mean_mae, std_mae, n_folds_thực_tế).
    """
    n = len(X)
    max_splits = min(n_splits, max(2, n // 20))  # mỗi fold ~đủ dữ liệu
    max_splits = max(2, min(max_splits, n - 2))
    tscv = TimeSeriesSplit(n_splits=max_splits)
    scores: list[float] = []
    for tr_idx, va_idx in tscv.split(X):
        if len(va_idx) == 0:
            continue
        m = model_factory()
        m.fit(X.iloc[tr_idx], y.iloc[tr_idx])
        pred = m.predict(X.iloc[va_idx])
        scores.append(mean_absolute_error(y.iloc[va_idx], pred))
    if not scores:
        return float("nan"), float("nan"), 0
    return float(np.mean(scores)), float(np.std(scores)), len(scores)


def train(test_ratio: float, min_test_days: int, cv_splits: int) -> None:
    if not DATA_PATH.exists():
        print(f"❌ Không tìm thấy: {DATA_PATH}")
        print("   Chạy trước: python scripts/generate_dataset.py")
        return

    df = pd.read_csv(DATA_PATH)
    if "date" not in df.columns:
        print("❌ CSV cần có cột 'date' (YYYY-MM-DD) để chia tập theo thời gian.")
        return

    df["date"] = pd.to_datetime(df["date"])
    missing = [c for c in FEATURES + [TARGET_REVENUE, TARGET_ORDERS] if c not in df.columns]
    if missing:
        print(f"❌ Thiếu cột: {missing}")
        return

    print(f"✅ Đọc dataset: {len(df)} dòng  ({DATA_PATH})")

    train_df, test_df = chronological_holdout(df, test_ratio=test_ratio, min_test_days=min_test_days)
    print("\n── Chia dữ liệu (chronological hold-out, không shuffle) ──")
    print(f"  Train: {len(train_df)} ngày  ({train_df['date'].min().date()} → {train_df['date'].max().date()})")
    print(f"  Test:  {len(test_df)} ngày  ({test_df['date'].min().date()} → {test_df['date'].max().date()})")

    X_train = train_df[FEATURES]
    X_test = test_df[FEATURES]
    y_rev_train, y_rev_test = train_df[TARGET_REVENUE], test_df[TARGET_REVENUE]
    y_ord_train, y_ord_test = train_df[TARGET_ORDERS], test_df[TARGET_ORDERS]

    def rev_factory():
        return RandomForestRegressor(
            n_estimators=200,
            max_depth=12,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=1,
        )

    def ord_factory():
        return GradientBoostingRegressor(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.08,
            random_state=42,
        )

    print(f"\n── TimeSeries CV trên tập train (tối đa {cv_splits} fold) ──")
    cv_mae_rev_mean, cv_mae_rev_std, cv_n = time_series_cv_mae(
        X_train, y_rev_train, rev_factory, n_splits=cv_splits
    )
    cv_mae_ord_mean, cv_mae_ord_std, _ = time_series_cv_mae(
        X_train, y_ord_train, ord_factory, n_splits=cv_splits
    )
    if cv_n:
        print(f"  CV MAE doanh thu (chỉ train): {cv_mae_rev_mean:,.0f} ± {cv_mae_rev_std:,.0f} VNĐ  ({cv_n} fold)")
        print(f"  CV MAE số đơn (chỉ train):    {cv_mae_ord_mean:.2f} ± {cv_mae_ord_std:.2f} đơn")
    else:
        print("  (Bỏ qua CV — tập train quá nhỏ)")

    print("\n── Huấn luyện mô hình cuối cùng trên TOÀN BỘ tập train ──")
    rev_model = rev_factory()
    rev_model.fit(X_train, y_rev_train)
    ord_model = ord_factory()
    ord_model.fit(X_train, y_ord_train)

    # Metrics: train (in-sample) vs test (out-of-time)
    y_rev_tr_p = rev_model.predict(X_train)
    y_rev_te_p = rev_model.predict(X_test)
    y_ord_tr_p = ord_model.predict(X_train)
    y_ord_te_p = ord_model.predict(X_test)

    def report_block(name: str, y_t, y_p, currency: bool) -> dict:
        mae = mean_absolute_error(y_t, y_p)
        r2 = r2_score(y_t, y_p)
        mp = mape_pct(np.asarray(y_t), np.asarray(y_p))
        rms = rmse(y_t, y_p)
        unit = "VNĐ" if currency else "đơn"
        if currency:
            print(f"  [{name}] MAE={mae:,.0f} {unit} | RMSE={rms:,.0f} | MAPE={mp:.1f}% | R2={r2:.3f}")
        else:
            print(f"  [{name}] MAE={mae:.2f} {unit} | RMSE={rms:.2f} | MAPE={mp:.1f}% | R2={r2:.3f}")
        return {"mae": mae, "rmse": rms, "mape_pct": mp, "r2": r2}

    print("\n── Doanh thu ──")
    tr_rev = report_block("Train (in-sample)", y_rev_train, y_rev_tr_p, currency=True)
    te_rev = report_block("Test (out-of-time)", y_rev_test, y_rev_te_p, currency=True)

    print("\n── Số đơn ──")
    tr_ord = report_block("Train (in-sample)", y_ord_train, y_ord_tr_p, currency=False)
    te_ord = report_block("Test (out-of-time)", y_ord_test, y_ord_te_p, currency=False)

    # gap = MAE_train − MAE_test : dương ⇒ test dễ hơn (sai số test nhỏ hơn train)
    gap = tr_rev["mae"] - te_rev["mae"]
    print(f"\n── Chênh MAE train − test (doanh thu): {gap:,.0f} VNĐ ──")
    if gap > 250_000:
        print("  ⚠ Test sai số thấp hơn train rất nhiều — kiểm tra tập test có “dễ”/đặc biệt không.")
    elif gap < -400_000:
        print("  ⚠ Test sai số cao hơn train rất nhiều — overfit hoặc giai đoạn test khác phân phối (regime shift).")

    print("\n── Feature importance (RandomForest doanh thu) ──")
    importance = pd.Series(rev_model.feature_importances_, index=FEATURES).sort_values(ascending=False)
    for feat, imp in importance.items():
        bar = "#" * int(imp * 40)
        print(f"  {feat:<25} {bar} {imp:.3f}")

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    bundle = {
        "revenue_model": rev_model,
        "orders_model": ord_model,
        "features": FEATURES,
        "version": BUNDLE_VERSION,
        "eval_method": "chronological_holdout",
        "test_ratio": test_ratio,
        "min_test_days": min_test_days,
        "test_date_start": str(test_df["date"].min().date()),
        "test_date_end": str(test_df["date"].max().date()),
        "train_date_start": str(train_df["date"].min().date()),
        "train_date_end": str(train_df["date"].max().date()),
        "cv_mae_revenue_mean": cv_mae_rev_mean,
        "cv_mae_revenue_std": cv_mae_rev_std,
        "cv_mae_orders_mean": cv_mae_ord_mean,
        "cv_mae_orders_std": cv_mae_ord_std,
        "cv_n_folds": cv_n,
        "train_mae_revenue": tr_rev["mae"],
        "train_rmse_revenue": tr_rev["rmse"],
        "train_mape_revenue_pct": tr_rev["mape_pct"],
        "train_r2_revenue": tr_rev["r2"],
        "test_mae_revenue": te_rev["mae"],
        "test_rmse_revenue": te_rev["rmse"],
        "test_mape_revenue_pct": te_rev["mape_pct"],
        "test_r2_revenue": te_rev["r2"],
        "train_mae_orders": tr_ord["mae"],
        "test_mae_orders": te_ord["mae"],
        "test_mape_orders_pct": te_ord["mape_pct"],
        "test_r2_orders": te_ord["r2"],
        # Tuong thich code cu doc training_mae_revenue / training_r2_revenue
        "training_mae_revenue": te_rev["mae"],
        "training_r2_revenue": te_rev["r2"],
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"\n✅ Đã lưu model: {MODEL_PATH}")
    print("   → Restart uvicorn để tải model mới.")


def main():
    p = argparse.ArgumentParser(description="Train SmartDSS — đánh giá theo thời gian.")
    p.add_argument(
        "--test-ratio",
        type=float,
        default=0.15,
        help="Tỷ lệ ngày gần nhất làm test (mặc định 0.15)",
    )
    p.add_argument(
        "--min-test-days",
        type=int,
        default=45,
        help="Tối thiểu số ngày test (mặc định 45)",
    )
    p.add_argument(
        "--cv-splits",
        type=int,
        default=5,
        help="Số fold tối đa TimeSeriesSplit trên tập train (mặc định 5)",
    )
    args = p.parse_args()
    train(test_ratio=args.test_ratio, min_test_days=args.min_test_days, cv_splits=args.cv_splits)


if __name__ == "__main__":
    main()
