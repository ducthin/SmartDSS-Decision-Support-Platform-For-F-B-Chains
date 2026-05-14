"""
mix_data.py
===========
Tạo data tổng hợp được calibrate theo data thật, rồi merge với data thật.

Calibration từ data thật (2026-03-14 → 2026-05-14):
  - Doanh thu ngày thường:  500k – 1.2M
  - Doanh thu slow days:    40k  – 350k
  - Giá trị trung bình/đơn: ~25,000 VNĐ
  - area_density_score thực: 59 – 81 (trung bình ~65)

Chạy:
  python scripts/mix_data.py
"""
from __future__ import annotations
import sys
from pathlib import Path
from datetime import date, timedelta

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
REAL_CSV  = ROOT / "data" / "training_data.csv"        # data thật hiện tại
OUT_CSV   = ROOT / "data" / "training_data.csv"        # ghi đè

np.random.seed(42)

# ── Tham số calibrate theo data thật ──────────────────────────────────────────
BASE_REVENUE     = 600_000   # baseline ngày thường (was 2_800_000)
AVG_ORDER_VALUE  = 25_000    # giá trị trung bình/đơn (was 50_000)
AREA_DENSITY     = 65        # area_density_score trung bình thực tế

SEASON = {1:0.92,2:1.00,3:1.10,4:1.18,5:1.22,6:1.28,
          7:1.25,8:1.12,9:0.88,10:0.78,11:0.85,12:1.05}
DOW    = {1:0.82,2:0.87,3:0.92,4:0.96,5:1.05,6:1.20,7:1.12}

WEATHER = {  # (temp_mean, temp_std, rain_mean, prob_rain)
    1:(22.5,2.0,80,0.52), 2:(23.2,2.2,30,0.30), 3:(25.5,2.0,15,0.18),
    4:(28.0,1.8,25,0.20), 5:(30.5,1.5,50,0.30), 6:(31.8,1.2,60,0.35),
    7:(31.5,1.3,55,0.32), 8:(31.0,1.5,80,0.38), 9:(28.5,2.0,280,0.68),
   10:(26.0,2.5,520,0.80),11:(24.0,2.5,350,0.72),12:(22.8,2.3,180,0.60),
}

FIXED_HOL = {
    (1,1):("Tết Dương lịch",1.30),(2,14):("Valentine",1.55),
    (3,8):("Quốc tế Phụ nữ",1.20),(4,30):("Giải phóng miền Nam",1.40),
    (5,1):("Quốc tế Lao động",1.45),(9,2):("Quốc khánh",1.45),
    (12,24):("Giáng sinh Eve",1.45),(12,25):("Giáng sinh",1.35),
    (12,31):("Tất niên",1.55),
}
EXTRA_HOL = {
    date(2024,4,18):("Giỗ Tổ Hùng Vương",1.25),
    date(2024,2,5):("Mùng 1 Tết",1.85), date(2024,2,6):("Mùng 2 Tết",2.05),
    date(2024,2,7):("Mùng 3 Tết",2.00), date(2024,2,8):("Mùng 4 Tết",1.85),
    date(2024,2,9):("Mùng 5 Tết",1.70), date(2024,2,10):("Mùng 6 Tết",1.45),
    date(2025,1,29):("Mùng 2 Tết",2.05),date(2025,1,28):("Mùng 1 Tết",1.85),
    date(2025,1,30):("Mùng 3 Tết",2.00),date(2025,1,31):("Mùng 4 Tết",1.85),
    date(2025,2,1):("Mùng 5 Tết",1.70), date(2025,2,2):("Mùng 6 Tết",1.45),
    date(2025,4,7):("Giỗ Tổ Hùng Vương",1.25),
    date(2026,1,29):("Mùng 2 Tết",2.05),date(2026,1,28):("Mùng 1 Tết",1.85),
    date(2026,1,30):("Mùng 3 Tết",2.00),
}


def holiday_info(d: date):
    if d in EXTRA_HOL:
        return EXTRA_HOL[d]
    k = (d.month, d.day)
    if k in FIXED_HOL:
        return FIXED_HOL[k]
    return "", 1.0


def gen_weather(d: date):
    mt, st, mr, pr = WEATHER[d.month]
    temp = float(np.clip(np.random.normal(mt, st), 15, 39))
    if np.random.random() < pr:
        scale = mr / max(pr * 30 * 2, 1)
        rain = float(np.clip(np.random.gamma(2.0, scale), 0, 140))
    else:
        rain = 0.0
    return round(temp, 2), round(rain, 2)


def calc_revenue(d: date, temp, rain, hol_mult, prev_rev) -> float:
    rev = BASE_REVENUE * SEASON[d.month] * DOW[d.isoweekday()]

    if hol_mult != 1.0:
        rev = rev * 0.85 * hol_mult + rev * 0.15

    # Thời tiết
    if rain > 60:   rev *= 0.55
    elif rain > 30: rev *= 0.75
    elif rain > 10: rev *= 0.90
    if temp > 35:   rev *= 1.15
    elif temp > 32: rev *= 1.07
    elif temp < 20: rev *= 0.92

    # Momentum nhẹ 12%
    if prev_rev > 0:
        baseline = BASE_REVENUE * SEASON[d.month]
        ratio = float(np.clip(prev_rev / max(baseline, 1), 0.5, 2.0))
        rev = rev * 0.88 + rev * 0.12 * ratio

    # Tăng trưởng 2024→2026: +10%
    day_idx = (d - date(2024, 1, 1)).days
    rev *= 1.0 + (day_idx / 730) * 0.10

    # Noise ±8%
    rev *= float(np.clip(np.random.normal(1.0, 0.08), 0.80, 1.20))

    return round(max(150_000.0, rev), -3)


def generate_synthetic(start: date, end: date) -> pd.DataFrame:
    rows = []
    prev_rev = BASE_REVENUE
    d = start
    while d <= end:
        dw = d.isoweekday()
        hol_name, hol_mult = holiday_info(d)
        is_hol = 1 if hol_name else 0
        temp, rain = gen_weather(d)
        rev = calc_revenue(d, temp, rain, hol_mult, prev_rev)
        orders = max(1, int(rev / AVG_ORDER_VALUE))

        # area_density: add small variation ±5 around base
        ads = int(np.clip(AREA_DENSITY + np.random.randint(-5, 6), 55, 85))
        if is_hol: ads = min(ads + 8, 85)

        rows.append({
            "date": d.isoformat(), "day_of_week": dw,
            "is_weekend": int(dw >= 6), "is_holiday": is_hol,
            "holiday_name": hol_name, "temperature": temp, "rainfall": rain,
            "event_impact_level": 1, "area_density_score": ads,
            "sales_1_day_ago": prev_rev, "sales_7_days_ago": 0.0,
            "revenue": rev, "orders": orders,
        })
        prev_rev = rev
        d += timedelta(days=1)

    df = pd.DataFrame(rows)
    df["sales_7_days_ago"] = df["revenue"].shift(7).fillna(BASE_REVENUE)
    return df


def main():
    # ── Đọc data thật ─────────────────────────────────────────────────────────
    if not REAL_CSV.exists():
        print(f"❌ Không tìm thấy: {REAL_CSV}"); sys.exit(1)

    real_df = pd.read_csv(REAL_CSV)
    real_df["date"] = pd.to_datetime(real_df["date"]).dt.strftime("%Y-%m-%d")
    real_start = pd.to_datetime(real_df["date"].min()).date()
    print(f"[INFO] Data thật: {len(real_df)} dòng | {real_df['date'].min()} → {real_df['date'].max()}")

    # ── Sinh data giả calibrated cho khoảng trước real data ───────────────────
    syn_start = date(2024, 1, 1)
    syn_end   = real_start - timedelta(days=1)
    print(f"[INFO] Sinh data tổng hợp calibrated: {syn_start} → {syn_end}...")
    syn_df = generate_synthetic(syn_start, syn_end)
    print(f"[INFO] Data tổng hợp: {len(syn_df)} dòng")

    # ── Thống kê so sánh ──────────────────────────────────────────────────────
    real_nz = real_df[real_df["revenue"].astype(float) > 0]
    print(f"\n── So sánh revenue (non-zero) ──")
    print(f"  Real  → mean={real_nz['revenue'].astype(float).mean():>12,.0f}  "
          f"median={real_nz['revenue'].astype(float).median():>12,.0f}")
    print(f"  Synth → mean={syn_df['revenue'].mean():>12,.0f}  "
          f"median={syn_df['revenue'].median():>12,.0f}")

    # ── Merge ──────────────────────────────────────────────────────────────────
    merged = pd.concat([syn_df, real_df], ignore_index=True)
    merged = merged.drop_duplicates(subset="date", keep="last")
    merged = merged.sort_values("date").reset_index(drop=True)

    # Tính lại lag qua ranh giới synthetic→real
    rev_by_date = dict(zip(merged["date"], merged["revenue"].astype(float)))
    merged["sales_1_day_ago"] = merged["date"].apply(
        lambda d: rev_by_date.get(
            str((pd.Timestamp(d) - pd.Timedelta(days=1)).date()), BASE_REVENUE)
    )
    merged["sales_7_days_ago"] = merged["date"].apply(
        lambda d: rev_by_date.get(
            str((pd.Timestamp(d) - pd.Timedelta(days=7)).date()), BASE_REVENUE)
    )

    # ── Lưu ───────────────────────────────────────────────────────────────────
    col_order = ["date","day_of_week","is_weekend","is_holiday","holiday_name",
                 "temperature","rainfall","event_impact_level","area_density_score",
                 "sales_1_day_ago","sales_7_days_ago","revenue","orders"]
    merged[col_order].to_csv(OUT_CSV, index=False, float_format="%.2f")

    print(f"\n{'='*55}")
    print(f"✅ Đã lưu: {OUT_CSV}")
    print(f"   Tổng: {len(merged)} dòng | {merged['date'].min()} → {merged['date'].max()}")
    print(f"   Revenue mean toàn bộ: {merged['revenue'].astype(float).mean():,.0f} VNĐ")
    print(f"\n👉 Chạy train: python scripts/train_model.py --test-ratio 0.15 --min-test-days 30 --cv-splits 5")


if __name__ == "__main__":
    main()
