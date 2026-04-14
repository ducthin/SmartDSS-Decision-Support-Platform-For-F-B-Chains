"""
Generate simulated order/sales data for a date window ending at a chosen day.

Flow per order:
1) Create order
2) Move status to PREPARING -> COMPLETED
3) Mark CASH paid
4) Backfill timestamps in MySQL to spread data across future days
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import random
import sys
import urllib.request
from dataclasses import dataclass
from decimal import Decimal

import pymysql

BASE = "http://localhost:8080/api/v1"
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "ducthinh123"
DB_NAME = "smartdss"
DAYS = 30
MIN_ORDERS_PER_DAY = 30
MAX_ORDERS_PER_DAY = 50
MIN_INVENTORY_QUANTITY = 500000


@dataclass
class CreatedOrder:
    order_id: int
    item_name: str
    total_amount: Decimal
    status: str
    payment_method: str
    payment_status: str
    simulated_at: dt.datetime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simulate completed paid orders over multiple days.")
    parser.add_argument("--days", type=int, default=DAYS, help="Number of days to simulate (default: 30)")
    parser.add_argument(
        "--end-date",
        default=dt.date.today().isoformat(),
        help="Window end date (YYYY-MM-DD). Default: today",
    )
    parser.add_argument(
        "--min-orders-per-day",
        type=int,
        default=MIN_ORDERS_PER_DAY,
        help="Minimum orders per day (default: 30)",
    )
    parser.add_argument(
        "--max-orders-per-day",
        type=int,
        default=MAX_ORDERS_PER_DAY,
        help="Maximum orders per day (default: 50)",
    )
    parser.add_argument(
        "--min-inventory-quantity",
        type=int,
        default=MIN_INVENTORY_QUANTITY,
        help="Ensure each inventory item has at least this quantity before simulation",
    )
    return parser.parse_args()


def api_request(method: str, path: str, payload=None, token: str | None = None):
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=45) as resp:
        body = resp.read().decode("utf-8")
    return json.loads(body)


def pick_candidates(menu_data: list[dict]) -> list[dict]:
    available = [m for m in menu_data if m.get("available") is True]
    non_drink = [m for m in available if not m.get("drink")]
    drink = [m for m in available if m.get("drink")]
    return non_drink if non_drink else drink


def build_line_item(item: dict) -> dict | None:
    line = {
        "menuItemId": int(item["id"]),
        "quantity": random.choice([1, 1, 2]),
    }
    if item.get("drink"):
        sizes = item.get("drinkSizes") or []
        if not sizes or not sizes[0].get("code"):
            return None
        line["selectedSizeCode"] = str(sizes[0]["code"])
    return line


def open_db_connection() -> pymysql.connections.Connection:
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        autocommit=False,
        charset="utf8mb4",
    )


def ensure_inventory_capacity(min_quantity: int) -> None:
    conn = open_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE inventory SET quantity = CASE WHEN quantity < %s THEN %s ELSE quantity END",
                (min_quantity, min_quantity),
            )
        conn.commit()
    finally:
        conn.close()


def backfill_timestamps(rows: list[CreatedOrder]) -> None:
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        autocommit=False,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cur:
            for row in rows:
                ts = row.simulated_at.strftime("%Y-%m-%d %H:%M:%S")
                oid = row.order_id

                cur.execute("UPDATE orders SET created_at=%s, updated_at=%s WHERE id=%s", (ts, ts, oid))
                cur.execute("UPDATE order_items SET created_at=%s, updated_at=%s WHERE order_id=%s", (ts, ts, oid))
                cur.execute(
                    "UPDATE sales_transactions SET created_at=%s, updated_at=%s, paid_at=%s WHERE order_id=%s",
                    (ts, ts, ts, oid),
                )
                cur.execute(
                    """
                    UPDATE sales_items si
                    JOIN sales_transactions st ON st.id = si.sales_transaction_id
                    SET si.created_at=%s, si.updated_at=%s
                    WHERE st.order_id=%s
                    """,
                    (ts, ts, oid),
                )
                cur.execute(
                    "UPDATE inventory_transactions SET created_at=%s, updated_at=%s WHERE reason LIKE %s",
                    (ts, ts, f"Order #{oid}%"),
                )
        conn.commit()
    finally:
        conn.close()


def main() -> int:
    args = parse_args()
    if args.days <= 0:
        print("SIMULATION_FAILED: --days must be > 0")
        return 1
    if args.min_orders_per_day <= 0 or args.max_orders_per_day <= 0:
        print("SIMULATION_FAILED: order counts must be > 0")
        return 1
    if args.min_orders_per_day > args.max_orders_per_day:
        print("SIMULATION_FAILED: --min-orders-per-day cannot exceed --max-orders-per-day")
        return 1
    try:
        end_date_obj = dt.date.fromisoformat(args.end_date)
    except ValueError:
        print("SIMULATION_FAILED: --end-date must be YYYY-MM-DD")
        return 1

    login = api_request("POST", "/auth/login", {"username": "admin", "password": "admin123"})
    token = ((login or {}).get("data") or {}).get("token")
    if not token:
        print("SIMULATION_FAILED: login token missing")
        return 1

    ensure_inventory_capacity(args.min_inventory_quantity)

    menu_resp = api_request("GET", "/menu/all", token=token)
    menu_data = (menu_resp or {}).get("data") or []
    candidates = pick_candidates(menu_data)
    if not candidates:
        print("SIMULATION_FAILED: no available menu items")
        return 1

    random.seed(20260412)
    created: list[CreatedOrder] = []
    failures: list[str] = []
    daily_counts: dict[str, int] = {}

    start_date_obj = end_date_obj - dt.timedelta(days=args.days - 1)
    for day in range(args.days):
        target_date = start_date_obj + dt.timedelta(days=day)
        orders_today = random.randint(args.min_orders_per_day, args.max_orders_per_day)
        for _ in range(orders_today):
            item = random.choice(candidates)
            line = build_line_item(item)
            if line is None:
                failures.append(f"item={item.get('name')} reason=drink has no size code")
                continue

            payload = {
                "note": f"AUTO_SIM_MONTH {target_date.isoformat()}",
                "orderItems": [line],
            }

            try:
                created_order = api_request("POST", "/orders", payload=payload, token=token)
                order_data = (created_order or {}).get("data") or {}
                order_id = int(order_data.get("id"))
                total_amount = Decimal(str(order_data.get("totalAmount") or "0"))

                api_request("PUT", f"/orders/{order_id}/status", payload={"status": "PREPARING"}, token=token)
                completed = api_request("PUT", f"/orders/{order_id}/status", payload={"status": "COMPLETED"}, token=token)
                paid = api_request("POST", f"/payments/orders/{order_id}/cash", token=token)

                simulated_at = dt.datetime.combine(
                    target_date,
                    dt.time(random.randint(8, 21), random.randint(0, 59), random.randint(0, 59)),
                )

                created.append(
                    CreatedOrder(
                        order_id=order_id,
                        item_name=str(item.get("name") or "Unknown"),
                        total_amount=total_amount,
                        status=((completed or {}).get("data") or {}).get("status") or "UNKNOWN",
                        payment_method=((paid or {}).get("data") or {}).get("paymentMethod") or "UNKNOWN",
                        payment_status=((paid or {}).get("data") or {}).get("status") or "UNKNOWN",
                        simulated_at=simulated_at,
                    )
                )
                key = target_date.isoformat()
                daily_counts[key] = daily_counts.get(key, 0) + 1
            except Exception as ex:
                failures.append(f"item={item.get('name')} reason={ex}")

    if not created:
        print("SIMULATION_FAILED: no order created")
        return 1

    backfill_timestamps(created)

    start_date = start_date_obj.isoformat()
    end_date = end_date_obj.isoformat()
    start_daily = api_request("GET", f"/reports/daily-sales?date={start_date}", token=token)
    end_daily = api_request("GET", f"/reports/daily-sales?date={end_date}", token=token)

    sdata = ((start_daily or {}).get("data") or [{}])[0]
    edata = ((end_daily or {}).get("data") or [{}])[0]

    print(
        f"SIMULATION_OK created={len(created)} failures={len(failures)} "
        f"range={start_date}..{end_date} ordersPerDay={args.min_orders_per_day}-{args.max_orders_per_day}"
    )
    if daily_counts:
        min_day = min(daily_counts.values())
        max_day = max(daily_counts.values())
        print(f"DAILY_VOLUME min={min_day} max={max_day} days={len(daily_counts)}")

    print("SAMPLE_CREATED:")
    for row in created[:8]:
        print(
            f"  orderId={row.order_id} item={row.item_name} amount={row.total_amount} "
            f"status={row.status} payment={row.payment_method}/{row.payment_status} at={row.simulated_at}"
        )

    print(
        f"DAILY_CHECK start({start_date}) orders={sdata.get('totalOrders')} revenue={sdata.get('totalRevenue')}"
    )
    print(
        f"DAILY_CHECK end({end_date}) orders={edata.get('totalOrders')} revenue={edata.get('totalRevenue')}"
    )

    if failures:
        print("FAILURES:")
        for line in failures[:10]:
            print("  " + line)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
