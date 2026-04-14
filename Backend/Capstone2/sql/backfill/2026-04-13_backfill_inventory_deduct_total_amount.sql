-- Backfill inventory DEDUCT transactions where total_amount is NULL.
-- Safe to run multiple times (idempotent).
-- Strategy:
-- 1) If unit_price exists, use it.
-- 2) If unit_price is NULL, fallback to current inventory.unit_cost.
-- Rows without both values remain NULL for manual review.

START TRANSACTION;

UPDATE inventory_transactions it
LEFT JOIN inventory i ON i.id = it.inventory_id
SET it.unit_price = COALESCE(it.unit_price, i.unit_cost),
    it.total_amount = ROUND(it.quantity * COALESCE(it.unit_price, i.unit_cost), 2),
    it.updated_at = NOW()
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL
  AND it.quantity IS NOT NULL
  AND COALESCE(it.unit_price, i.unit_cost) IS NOT NULL;

SELECT ROW_COUNT() AS backfilled_deduct_rows;

COMMIT;

SELECT COUNT(*) AS remaining_deduct_without_total_amount
FROM inventory_transactions it
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL;

SELECT
    it.id,
    it.inventory_id,
    it.quantity,
    it.unit_price,
    i.unit_cost,
    it.reason,
    it.created_at
FROM inventory_transactions it
LEFT JOIN inventory i ON i.id = it.inventory_id
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL
ORDER BY it.created_at DESC
LIMIT 50;
