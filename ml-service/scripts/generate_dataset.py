import pandas as pd
import numpy as np
import os
from pathlib import Path
from datetime import date, timedelta

# Luôn lưu vào ml-service/data/ bất kẻ script được chạy từ đâu
ROOT = Path(__file__).parent.parent   # ml-service/
DATA_DIR = ROOT / "data"

np.random.seed(2024)  # Tái lập kết quả cho báo cáo

# ─────────────────────────────────────────────────────────
# THÔNG SỐ QUÁN (Tùy chỉnh cho phù hợp thực tế)
# ─────────────────────────────────────────────────────────
BASE_REVENUE       = 2_800_000  # Doanh thu baseline ngày thường vắng nhất (VNĐ)
AVG_ORDER_VALUE    = 50_000     # Giá trị trung bình một hoá đơn (~ly cà phê + bánh)
AREA_DENSITY_SCORE = 115        # Điểm mật độ khu vực (>80 là khu khá đông)

# ─────────────────────────────────────────────────────────
# NGÀY LỄ VIỆT NAM 2024–2025 (Đầy đủ & chính xác)
# ─────────────────────────────────────────────────────────

# Ngày lễ Dương lịch cố định hằng năm
# Hệ số (revenue_multiplier) được tinh chỉnh cẩn thận:
#   1.0 = bình thường | >1 = đông hơn | <1 = vắng hơn
FIXED_HOLIDAYS = {
    (1,  1):  ("Tết Dương lịch",         1.35),
    (2, 14):  ("Valentine",              1.60),  # Giới trẻ đi cà phê nhiều
    (3,  8):  ("Quốc tế Phụ nữ",         1.25),
    (4, 30):  ("Giải phóng miền Nam",    1.45),
    (5,  1):  ("Quốc tế Lao động",       1.50),
    (6,  1):  ("Quốc tế Thiếu nhi",      1.15),
    (9,  2):  ("Quốc khánh",             1.50),
    (10, 20): ("Ngày Phụ nữ VN",         1.20),
    (11, 20): ("Ngày Nhà giáo VN",       1.10),
    (12, 24): ("Giáng sinh Eve",          1.50),
    (12, 25): ("Giáng sinh",             1.40),
    (12, 31): ("Tất niên Dương lịch",    1.60),
}

# Ngày Giỗ Tổ Hùng Vương (Mùng 10 tháng 3 Âm lịch)
GIO_TO = {
    date(2024, 4, 18): ("Giỗ Tổ Hùng Vương", 1.30),
    date(2025, 4,  7): ("Giỗ Tổ Hùng Vương", 1.30),
}

# Ngày nghỉ bù theo quyết định Nhà nước
EXTRA_REST = {
    date(2024, 9,  3): ("Nghỉ bù Quốc khánh",  1.45),
    date(2025, 4, 28): ("Nghỉ bù 30/4",         1.40),
    date(2025, 5,  2): ("Nghỉ bù 1/5",          1.35),
}

# Sự kiện thương mại (tác động nhẹ offline)
COMMERCIAL = {
    date(2024,  7,  7): ("7/7 Cặp đôi",    1.18),
    date(2025,  7,  7): ("7/7 Cặp đôi",    1.18),
    date(2024,  8,  8): ("8/8 Phong thuỷ", 1.10),
    date(2025,  8,  8): ("8/8 Phong thuỷ", 1.10),
    date(2024, 11, 11): ("11/11 Độc thân", 1.15),
    date(2025, 11, 11): ("11/11 Độc thân", 1.15),
}

# ─────────────────────────────────────────────────────────
# TẾT NGUYÊN ĐÁN 2024 & 2025
# Quán mở xuyên Tết – đây là đỉnh cao nhất trong năm!
# Giới trẻ rảnh rỗi + gia đình đi chơi + khách du lịch
# Hệ số được hiệu chỉnh để cân bằng với seasonal × DOW
# ─────────────────────────────────────────────────────────
TET_2024 = {
    date(2024, 2,  2): ("Trước Tết 28 Chạp",  1.70),
    date(2024, 2,  3): ("Trước Tết 29 Chạp",  1.85),  # Rất đông
    date(2024, 2,  4): ("Giao thừa 30 Chạp",  1.65),
    date(2024, 2,  5): ("Mùng 1 Tết",          1.90),  # Ra đường chúc Tết
    date(2024, 2,  6): ("Mùng 2 Tết",          2.10),  # Đỉnh cao
    date(2024, 2,  7): ("Mùng 3 Tết",          2.05),
    date(2024, 2,  8): ("Mùng 4 Tết",          1.90),
    date(2024, 2,  9): ("Mùng 5 Tết",          1.75),
    date(2024, 2, 10): ("Mùng 6 Tết",          1.50),
    date(2024, 2, 11): ("Mùng 7 Tết",          1.25),
    date(2024, 2, 14): ("Rằm Tháng Giêng",     1.30),
}

TET_2025 = {
    date(2025, 1, 25): ("Trước Tết 26 Chạp",  1.65),
    date(2025, 1, 26): ("Trước Tết 27 Chạp",  1.75),
    date(2025, 1, 27): ("Trước Tết 28 Chạp",  1.88),
    date(2025, 1, 28): ("Mùng 1 Tết",          1.92),
    date(2025, 1, 29): ("Mùng 2 Tết",          2.15),  # Đỉnh cao
    date(2025, 1, 30): ("Mùng 3 Tết",          2.08),
    date(2025, 1, 31): ("Mùng 4 Tết",          1.92),
    date(2025, 2,  1): ("Mùng 5 Tết",          1.72),
    date(2025, 2,  2): ("Mùng 6 Tết",          1.48),
    date(2025, 2,  3): ("Mùng 7 Tết",          1.25),
    date(2025, 2, 12): ("Rằm Tháng Giêng",     1.28),
}


def get_holiday_info(d: date) -> tuple[float, str]:
    """Trả về (hệ số holiday, tên holiday). Chỉ đánh dấu ngày lễ/Tết thật."""
    for lookup in [TET_2024, TET_2025, EXTRA_REST, GIO_TO]:
        if d in lookup:
            name, mult = lookup[d]
            return mult, name
    key = (d.month, d.day)
    if key in FIXED_HOLIDAYS:
        name, mult = FIXED_HOLIDAYS[key]
        return mult, name
    return 1.0, ""


def get_event_info(d: date) -> tuple[float, int]:
    """Trả về (hệ số event thương mại, impact level). Không trộn vào is_holiday."""
    if d in COMMERCIAL:
        _, mult = COMMERCIAL[d]
        if mult >= 1.25:
            impact = 3
        elif mult >= 1.10:
            impact = 2
        else:
            impact = 1
        return mult, impact
    return 1.0, 1


# ─────────────────────────────────────────────────────────
# THỜI TIẾT THEO THÁNG – ĐÀ NẴNG
# Nguồn: Số liệu khí tượng thuỷ văn lịch sử 10 năm
# ─────────────────────────────────────────────────────────
#          (temp_mean, temp_std, rain_mean_mm, prob_rain)
WEATHER_BY_MONTH = {
    1:  (22.5, 2.0,  80, 0.52),
    2:  (23.2, 2.2,  30, 0.30),
    3:  (25.5, 2.0,  15, 0.18),
    4:  (28.0, 1.8,  25, 0.20),
    5:  (30.5, 1.5,  50, 0.30),
    6:  (31.8, 1.2,  60, 0.35),
    7:  (31.5, 1.3,  55, 0.32),
    8:  (31.0, 1.5,  80, 0.38),
    9:  (28.5, 2.0, 280, 0.68),
    10: (26.0, 2.5, 520, 0.80),
    11: (24.0, 2.5, 350, 0.72),
    12: (22.8, 2.3, 180, 0.60),
}


def gen_weather(d: date) -> tuple[float, float]:
    mt, st, mr, pr = WEATHER_BY_MONTH[d.month]
    temp = float(np.clip(np.random.normal(mt, st), 15, 39))
    if np.random.random() < pr:
        scale = mr / max(pr * 30 * 2, 1)
        rain = float(np.clip(np.random.gamma(2.0, scale), 0, 140))
    else:
        rain = 0.0
    return round(temp, 1), round(rain, 1)


# ─────────────────────────────────────────────────────────
# HỆ SỐ MÙA VỤ THEO THÁNG (đã thu hẹp dải để tránh quá trừu tượng)
# ─────────────────────────────────────────────────────────
SEASON = {
    1:  0.92,  # Sau Tết, vắng nhẹ
    2:  1.05,  # Tháng Tết (Tết được xử lý riêng qua holiday_mult)
    3:  1.10,  # Ấm, sinh viên đi học
    4:  1.20,  # Cao điểm du lịch Đà Nẵng
    5:  1.28,  # Nóng → uống nhiều
    6:  1.35,  # ĐỈNH hè
    7:  1.32,
    8:  1.18,
    9:  0.90,  # Mưa đến
    10: 0.78,  # Mưa lũ — thấp nhất
    11: 0.85,
    12: 1.08,  # Cuối năm sôi động
}

# ─────────────────────────────────────────────────────────
# HỆ SỐ NGÀY TRONG TUẦN
# ─────────────────────────────────────────────────────────
DOW = {
    1: 0.82,   # Thứ Hai — vắng nhất
    2: 0.87,
    3: 0.92,
    4: 0.96,
    5: 1.05,   # Thứ Sáu — bắt đầu sôi động
    6: 1.22,   # Thứ Bảy — đông nhất ngày thường
    7: 1.15,   # Chủ Nhật
}


def calc_revenue(d: date, temp: float, rain: float,
                 hol_mult: float, event_mult: float, prev_rev: float) -> float:
    """Tính doanh thu với 7 yếu tố tự nhiên được cân bằng kỹ."""
    rev = BASE_REVENUE

    # 1 — Mùa vụ
    rev *= SEASON[d.month]

    # 2 — Ngày trong tuần
    rev *= DOW[d.isoweekday()]

    # 3 — Mật độ khu vực
    if AREA_DENSITY_SCORE >= 120:
        rev *= 1.30
    elif AREA_DENSITY_SCORE >= 80:
        rev *= 1.12

    # 4 — Ngày lễ: giữ độc lập với event_impact_level để feature không bị double-count
    if hol_mult != 1.0:
        rev = rev * 0.85 * hol_mult + rev * 0.15

    # 5 — Event thương mại / local promotion: tác động riêng, nhẹ hơn holiday thật
    if event_mult != 1.0:
        rev = rev * 0.92 * event_mult + rev * 0.08

    # 6 — Thời tiết
    if rain > 60:
        rev *= 0.52           # Mưa rất to, ngập đường
    elif rain > 30:
        rev *= 0.72           # Mưa to
    elif rain > 10:
        rev *= 0.88           # Mưa nhẹ: một số khách ở nhà, nhưng nhiều người ghé uống cà phê ngắm mưa
    # Không mưa: không điều chỉnh

    if temp > 35:
        rev *= 1.18           # Nóng cực → bán đồ lạnh nhiều
    elif temp > 32:
        rev *= 1.08
    elif temp < 20:
        rev *= 0.90           # Lạnh hiếm gặp ở Đà Nẵng → ít người ra đường

    # 7 — Momentum (Stickiness): Hôm qua đông → hôm nay vẫn đông một phần
    if prev_rev > 0:
        baseline = BASE_REVENUE * SEASON[d.month]
        ratio = prev_rev / max(baseline, 1)
        ratio = float(np.clip(ratio, 0.6, 1.8))
        # Tác động nhẹ 15%: không kéo lệch quá nhiều
        rev = rev * 0.85 + rev * 0.15 * ratio

    # 8 — Tăng trưởng tự nhiên (quán quen dần, 12% sau 2 năm)
    day_idx = (d - date(2024, 1, 1)).days
    growth = 1.0 + (day_idx / 730) * 0.12
    rev *= growth

    # 9 — Nhiễu cấu trúc ±7% (phân phối chuẩn, không uniform)
    noise = float(np.clip(np.random.normal(1.0, 0.07), 0.82, 1.18))
    rev *= noise

    return round(max(600_000.0, rev), -3)   # Làm tròn nghìn; tối thiểu 600k


# ─────────────────────────────────────────────────────────
# SINH DỮ LIỆU
# ─────────────────────────────────────────────────────────
def main():
    start = date(2024, 1, 1)
    end   = date(2025, 12, 31)
    rows  = []
    prev_rev = BASE_REVENUE

    print(f"🔄 Sinh dataset {start} → {end}...")
    d = start
    while d <= end:
        dw      = d.isoweekday()
        is_wknd = int(dw in [6, 7])
        hol_mult, hol_name = get_holiday_info(d)
        event_mult, impact = get_event_info(d)
        is_hol  = 1 if hol_name else 0
        temp, rain = gen_weather(d)

        rev    = calc_revenue(d, temp, rain, hol_mult, event_mult, prev_rev)
        orders = max(1, int(rev / AVG_ORDER_VALUE))

        rows.append({
            "date":               d.isoformat(),
            "day_of_week":        dw,
            "is_weekend":         is_wknd,
            "is_holiday":         is_hol,
            "holiday_name":       hol_name,
            "temperature":        temp,
            "rainfall":           rain,
            "event_impact_level": impact,
            "area_density_score": AREA_DENSITY_SCORE,
            "sales_1_day_ago":    prev_rev,
            "revenue":            rev,
            "orders":             orders,
        })
        prev_rev = rev
        d += timedelta(days=1)

    df = pd.DataFrame(rows)
    df["sales_7_days_ago"] = df["revenue"].shift(7).fillna(BASE_REVENUE)
    df = df[[
        "date", "day_of_week", "is_weekend", "is_holiday", "holiday_name",
        "temperature", "rainfall", "event_impact_level",
        "area_density_score", "sales_1_day_ago", "sales_7_days_ago",
        "revenue", "orders",
    ]]

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DATA_DIR / "training_data.csv"
    df.to_csv(out_path, index=False, encoding="utf-8-sig")

    # ── Báo cáo thống kê ──
    print(f"\n✅ Lưu: {out_path}  ({len(df)} dòng)")
    print(f"\n📊 Doanh thu:")
    print(f"   Trung bình/ngày  : {df['revenue'].mean():>12,.0f} VNĐ")
    print(f"   Cao nhất         : {df['revenue'].max():>12,.0f} VNĐ")
    print(f"   Thấp nhất        : {df['revenue'].min():>12,.0f} VNĐ")
    print(f"   Độ lệch chuẩn   : {df['revenue'].std():>12,.0f} VNĐ")
    print(f"   Ngày lễ tác động: {df['is_holiday'].sum()} ngày")

    print(f"\n🏆 Top 7 ngày doanh thu cao nhất:")
    top = df.nlargest(7, "revenue")[["date", "holiday_name", "revenue", "temperature", "rainfall"]]
    for _, r in top.iterrows():
        print(f"   {r['date']}  {str(r['holiday_name']):<28}  {r['revenue']:>12,.0f} VNĐ"
              f"  🌡{r['temperature']}°C  🌧{r['rainfall']}mm")

    print(f"\n📉 Top 7 ngày doanh thu thấp nhất:")
    low = df.nsmallest(7, "revenue")[["date", "holiday_name", "revenue", "temperature", "rainfall"]]
    for _, r in low.iterrows():
        print(f"   {r['date']}  {str(r['holiday_name']):<28}  {r['revenue']:>12,.0f} VNĐ"
              f"  🌡{r['temperature']}°C  🌧{r['rainfall']}mm")

    print(f"\n👉 Chạy tiếp: python scripts/train_model.py")


if __name__ == "__main__":
    main()
