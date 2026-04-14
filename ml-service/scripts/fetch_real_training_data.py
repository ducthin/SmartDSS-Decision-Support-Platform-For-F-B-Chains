"""
Fetch real ML training data CSV from SmartDSS backend and save it to data/training_data.csv.

Usage examples:
  python scripts/fetch_real_training_data.py --token <JWT>
  python scripts/fetch_real_training_data.py --username manager --password manager123
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any
from urllib import error, parse, request

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = ROOT / "data" / "training_data.csv"


def iso_days_ago(days: int) -> str:
    return (date.today() - timedelta(days=days)).isoformat()


def post_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body)


def get_csv(url: str, token: str) -> bytes:
    req = request.Request(
        url,
        method="GET",
        headers={
            "Accept": "text/csv",
            "Authorization": f"Bearer {token}",
        },
    )
    with request.urlopen(req, timeout=90) as resp:
        return resp.read()


def login_for_token(api_base: str, username: str, password: str) -> str:
    payload = {"username": username, "password": password}
    login_url = f"{api_base.rstrip('/')}/auth/login"
    data = post_json(login_url, payload)

    token = (
        data.get("data", {}).get("token")
        if isinstance(data, dict)
        else None
    )
    if not token:
        raise RuntimeError("Login succeeded but token was not found in response body.")
    return token


def build_export_url(api_base: str, from_date: str, to_date: str, area_density_score: int | None) -> str:
    params: dict[str, Any] = {
        "fromDate": from_date,
        "toDate": to_date,
    }
    if area_density_score is not None:
        params["areaDensityScore"] = area_density_score
    query = parse.urlencode(params)
    return f"{api_base.rstrip('/')}/reports/ml-training-data.csv?{query}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch real training CSV from SmartDSS backend.")
    parser.add_argument(
        "--api-base",
        default=os.getenv("SMARTDSS_API_BASE", "http://localhost:8080/api/v1"),
        help="Backend API base URL (default: http://localhost:8080/api/v1)",
    )
    parser.add_argument("--from-date", default=iso_days_ago(365), help="From date (YYYY-MM-DD)")
    parser.add_argument("--to-date", default=date.today().isoformat(), help="To date (YYYY-MM-DD)")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="Output CSV path (default: ml-service/data/training_data.csv)",
    )
    parser.add_argument("--token", default=os.getenv("SMARTDSS_TOKEN"), help="JWT token (Manager/Admin)")
    parser.add_argument("--username", default=os.getenv("SMARTDSS_USERNAME"), help="Username for login")
    parser.add_argument("--password", default=os.getenv("SMARTDSS_PASSWORD"), help="Password for login")
    parser.add_argument(
        "--area-density-score",
        type=int,
        default=None,
        help="Optional fixed area_density_score override (0..300).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    token = args.token
    if not token and args.username and args.password:
        try:
            token = login_for_token(args.api_base, args.username, args.password)
            print("[INFO] Logged in successfully and acquired JWT token.")
        except Exception as exc:
            print(f"[ERROR] Failed to login: {exc}", file=sys.stderr)
            return 2

    if not token:
        print(
            "[ERROR] Missing auth token. Provide --token or --username/--password.",
            file=sys.stderr,
        )
        return 2

    export_url = build_export_url(
        args.api_base,
        args.from_date,
        args.to_date,
        args.area_density_score,
    )

    try:
        csv_bytes = get_csv(export_url, token)
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"[ERROR] Backend returned HTTP {exc.code}: {body}", file=sys.stderr)
        return 3
    except Exception as exc:
        print(f"[ERROR] Failed to download training CSV: {exc}", file=sys.stderr)
        return 3

    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(csv_bytes)

    text = csv_bytes.decode("utf-8-sig", errors="replace")
    lines = [line for line in text.splitlines() if line.strip()]
    row_count = max(0, len(lines) - 1)

    print(f"[SUCCESS] Saved CSV to: {output_path}")
    print(f"[SUCCESS] Rows: {row_count} (from {args.from_date} to {args.to_date})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
