-- Phase 3 advanced backfill for remaining DEDUCT rows with NULL total_amount.
-- Strategy:
-- 1) Infer unit_price from median(unit_price) per inventory across all historical rows with known unit_price.
-- 2) If median is missing, fallback to current inventory.unit_cost.
-- 3) Remaining unresolved rows are upserted into manual review table for approval.
--
-- Idempotent:
-- - Update only affects rows where total_amount IS NULL.
-- - Review table uses transaction_id as PK and ON DUPLICATE KEY UPDATE.

START TRANSACTION;

SELECT COUNT(*) AS pre_remaining_deduct_without_total_amount
FROM inventory_transactions it
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL;

CREATE TABLE IF NOT EXISTS inventory_deduct_backfill_review (
    transaction_id BIGINT PRIMARY KEY,
    inventory_id BIGINT NOT NULL,
    quantity DECIMAL(16, 4) NULL,
    reason VARCHAR(255) NULL,
    transaction_created_at DATETIME NULL,
    median_unit_price DECIMAL(12, 2) NULL,
    inventory_unit_cost DECIMAL(12, 2) NULL,
    suggested_unit_price DECIMAL(12, 2) NULL,
    review_reason VARCHAR(80) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TEMPORARY TABLE IF EXISTS tmp_median_unit_price;

CREATE TEMPORARY TABLE tmp_median_unit_price (
    inventory_id BIGINT PRIMARY KEY,
    median_unit_price DECIMAL(12, 2) NULL
);

INSERT INTO tmp_median_unit_price (inventory_id, median_unit_price)
SELECT
    ranked.inventory_id,
    ROUND(AVG(ranked.unit_price), 2) AS median_unit_price
FROM (
    SELECT
        it.inventory_id,
        it.unit_price,
        ROW_NUMBER() OVER (PARTITION BY it.inventory_id ORDER BY it.unit_price) AS rn,
        COUNT(*) OVER (PARTITION BY it.inventory_id) AS cnt
    FROM inventory_transactions it
    WHERE it.unit_price IS NOT NULL
) ranked
WHERE ranked.rn IN ((ranked.cnt + 1) DIV 2, (ranked.cnt + 2) DIV 2)
GROUP BY ranked.inventory_id;

UPDATE inventory_transactions it
LEFT JOIN tmp_median_unit_price mpi ON mpi.inventory_id = it.inventory_id
LEFT JOIN inventory i ON i.id = it.inventory_id
SET it.unit_price = COALESCE(it.unit_price, mpi.median_unit_price, i.unit_cost),
    it.total_amount = ROUND(it.quantity * COALESCE(it.unit_price, mpi.median_unit_price, i.unit_cost), 2),
    it.updated_at = NOW()
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL
  AND it.quantity IS NOT NULL
  AND COALESCE(it.unit_price, mpi.median_unit_price, i.unit_cost) IS NOT NULL;

SELECT ROW_COUNT() AS backfilled_by_phase3_rows;

INSERT INTO inventory_deduct_backfill_review (
    transaction_id,
    inventory_id,
    quantity,
    reason,
    transaction_created_at,
    median_unit_price,
    inventory_unit_cost,
    suggested_unit_price,
    review_reason
)
SELECT
    it.id AS transaction_id,
    it.inventory_id,
    it.quantity,
    it.reason,
    it.created_at AS transaction_created_at,
    tmp.median_unit_price,
    i.unit_cost AS inventory_unit_cost,
    COALESCE(tmp.median_unit_price, i.unit_cost) AS suggested_unit_price,
    CASE
        WHEN it.quantity IS NULL THEN 'MISSING_QUANTITY'
        WHEN tmp.median_unit_price IS NULL AND i.unit_cost IS NULL THEN 'MISSING_MEDIAN_AND_UNIT_COST'
        WHEN tmp.median_unit_price IS NULL THEN 'MEDIAN_NOT_FOUND'
        ELSE 'UNRESOLVED_AFTER_PHASE3'
    END AS review_reason
FROM inventory_transactions it
LEFT JOIN tmp_median_unit_price tmp ON tmp.inventory_id = it.inventory_id
LEFT JOIN inventory i ON i.id = it.inventory_id
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL
ON DUPLICATE KEY UPDATE
    inventory_id = VALUES(inventory_id),
    quantity = VALUES(quantity),
    reason = VALUES(reason),
    transaction_created_at = VALUES(transaction_created_at),
    median_unit_price = VALUES(median_unit_price),
    inventory_unit_cost = VALUES(inventory_unit_cost),
    suggested_unit_price = VALUES(suggested_unit_price),
    review_reason = VALUES(review_reason),
    updated_at = NOW();

SELECT ROW_COUNT() AS review_rows_upserted;

DROP TEMPORARY TABLE IF EXISTS tmp_median_unit_price;

COMMIT;

SELECT COUNT(*) AS post_remaining_deduct_without_total_amount
FROM inventory_transactions it
WHERE it.type = 'DEDUCT'
  AND it.total_amount IS NULL;

SELECT COUNT(*) AS rows_pending_manual_review
FROM inventory_deduct_backfill_review;

SELECT
    r.transaction_id,
    r.inventory_id,
    r.quantity,
    r.median_unit_price,
    r.inventory_unit_cost,
    r.suggested_unit_price,
    r.review_reason,
    r.transaction_created_at
FROM inventory_deduct_backfill_review r
ORDER BY r.updated_at DESC
LIMIT 100;
