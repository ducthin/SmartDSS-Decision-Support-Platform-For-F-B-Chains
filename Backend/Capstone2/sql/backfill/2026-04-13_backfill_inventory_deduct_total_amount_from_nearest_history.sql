-- Advanced backfill for inventory DEDUCT rows where total_amount is NULL.
-- Strategy: infer unit_price from the nearest historical transaction (same inventory)
-- that already has unit_price. Prefer earlier transaction when time distance ties.
-- Idempotent: only touches rows with total_amount IS NULL.

START TRANSACTION;

SELECT COUNT(*) AS pre_remaining_deduct_without_total_amount
FROM inventory_transactions it
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL;

-- Candidate visibility: unresolved rows that can infer price from history.
WITH ranked_candidates AS (
    SELECT
        target.id AS target_id,
        candidate.unit_price AS inferred_unit_price,
        ROW_NUMBER() OVER (
            PARTITION BY target.id
            ORDER BY
                ABS(TIMESTAMPDIFF(SECOND, candidate.created_at, target.created_at)) ASC,
                CASE WHEN candidate.created_at <= target.created_at THEN 0 ELSE 1 END ASC,
                candidate.created_at DESC,
                candidate.id DESC
        ) AS rn
    FROM inventory_transactions target
    JOIN inventory_transactions candidate
      ON candidate.inventory_id = target.inventory_id
     AND candidate.id <> target.id
     AND candidate.unit_price IS NOT NULL
    WHERE target.type = 'DEDUCT'
      AND target.total_amount IS NULL
      AND target.quantity IS NOT NULL
)
SELECT COUNT(*) AS candidates_with_nearest_history
FROM ranked_candidates
WHERE rn = 1;

WITH ranked_candidates AS (
    SELECT
        target.id AS target_id,
        candidate.unit_price AS inferred_unit_price,
        ROW_NUMBER() OVER (
            PARTITION BY target.id
            ORDER BY
                ABS(TIMESTAMPDIFF(SECOND, candidate.created_at, target.created_at)) ASC,
                CASE WHEN candidate.created_at <= target.created_at THEN 0 ELSE 1 END ASC,
                candidate.created_at DESC,
                candidate.id DESC
        ) AS rn
    FROM inventory_transactions target
    JOIN inventory_transactions candidate
      ON candidate.inventory_id = target.inventory_id
     AND candidate.id <> target.id
     AND candidate.unit_price IS NOT NULL
    WHERE target.type = 'DEDUCT'
      AND target.total_amount IS NULL
      AND target.quantity IS NOT NULL
),
nearest_price AS (
    SELECT target_id, inferred_unit_price
    FROM ranked_candidates
    WHERE rn = 1
)
UPDATE inventory_transactions it
JOIN nearest_price np ON np.target_id = it.id
SET it.unit_price = COALESCE(it.unit_price, np.inferred_unit_price),
    it.total_amount = ROUND(it.quantity * COALESCE(it.unit_price, np.inferred_unit_price), 2),
    it.updated_at = NOW()
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL
  AND it.quantity IS NOT NULL
  AND COALESCE(it.unit_price, np.inferred_unit_price) IS NOT NULL;

SELECT ROW_COUNT() AS backfilled_by_nearest_history_rows;

COMMIT;

SELECT COUNT(*) AS post_remaining_deduct_without_total_amount
FROM inventory_transactions it
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL;

-- Remaining unresolved rows for manual investigation.
SELECT
    it.id,
    it.inventory_id,
    it.quantity,
    it.unit_price,
    it.reason,
    it.created_at
FROM inventory_transactions it
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL
ORDER BY it.created_at DESC
LIMIT 50;
