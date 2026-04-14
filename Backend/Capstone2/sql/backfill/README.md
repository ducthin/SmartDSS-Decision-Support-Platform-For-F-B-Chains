# Finance Backfill Scripts (2026-04-13)

## Scripts

1. `2026-04-13_backfill_auto_income_paid_orders.sql`
- Backfill `finance_transactions` for paid orders (`CASH`/`QR`) that do not yet have `AUTO_PAYMENT_PAID` records.
- Idempotent.

2. `2026-04-13_backfill_inventory_deduct_total_amount.sql`
- Backfill `inventory_transactions.total_amount` for historical `DEDUCT` rows where it is `NULL`.
- Uses existing `unit_price`; if missing, falls back to current `inventory.unit_cost`.
- Idempotent.

3. `2026-04-13_backfill_inventory_deduct_total_amount_from_nearest_history.sql`
- Advanced backfill for remaining `DEDUCT` rows where `total_amount` is `NULL`.
- Infers `unit_price` from nearest historical transaction of the same inventory with known `unit_price`.
- Prefers earlier transaction when time distance ties.
- Idempotent.

4. `2026-04-13_backfill_inventory_deduct_total_amount_phase3_median_and_review.sql`
- Phase 3 for unresolved rows after script #3.
- Infers `unit_price` by median historical `unit_price` per inventory.
- If median missing, fallback to current `inventory.unit_cost`.
- If still unresolved, upsert into manual review table `inventory_deduct_backfill_review`.
- Idempotent.

## Run order

1. Run auto-income backfill.
2. Run inventory deduct total backfill.
3. If unresolved `DEDUCT` rows remain, run nearest-history advanced backfill.
4. If unresolved rows still remain, run phase 3 median + manual-review backfill.

## Example run (MySQL CLI)

```bash
mysql -h <host> -u <user> -p <database> < sql/backfill/2026-04-13_backfill_auto_income_paid_orders.sql
mysql -h <host> -u <user> -p <database> < sql/backfill/2026-04-13_backfill_inventory_deduct_total_amount.sql
```

## Post-check

Each script prints summary counts at the end:
- Inserted/backfilled row count.
- Remaining rows that still need manual review.
