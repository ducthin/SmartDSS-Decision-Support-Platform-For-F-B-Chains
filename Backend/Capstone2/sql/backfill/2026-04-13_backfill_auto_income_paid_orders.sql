-- Backfill AUTO_PAYMENT_PAID income records for orders already paid before auto-income rollout.
-- Safe to run multiple times (idempotent).

START TRANSACTION;

SET @auto_income_source := 'AUTO_PAYMENT_PAID';
SET @auto_income_category_name := 'Doanh thu bán hàng (Tự động)';

-- If the named auto-income category already exists, normalize it.
UPDATE finance_categories
SET type = 'INCOME',
    active = 1,
    updated_at = NOW()
WHERE LOWER(name) = LOWER(@auto_income_category_name);

-- Ensure at least one active INCOME category exists.
INSERT INTO finance_categories (name, type, active, created_at, updated_at)
SELECT @auto_income_category_name, 'INCOME', 1, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM finance_categories
    WHERE type = 'INCOME'
      AND active = 1
);

INSERT INTO finance_transactions (
    category_id,
    type,
    amount,
    occurred_at,
    note,
    source_type,
    source_ref_id,
    created_by,
    created_at,
    updated_at
)
SELECT
    COALESCE(
        (
            SELECT fc.id
            FROM finance_categories fc
            WHERE LOWER(fc.name) = LOWER(@auto_income_category_name)
            ORDER BY fc.id ASC
            LIMIT 1
        ),
        (
            SELECT fc.id
            FROM finance_categories fc
            WHERE fc.type = 'INCOME'
              AND fc.active = 1
            ORDER BY fc.id ASC
            LIMIT 1
        )
    ) AS category_id,
    'INCOME' AS type,
    st.total_amount,
    COALESCE(st.paid_at, st.updated_at, st.created_at) AS occurred_at,
    CONCAT('Backfill auto income for paid order #', st.order_id) AS note,
    @auto_income_source AS source_type,
    CAST(st.order_id AS CHAR) AS source_ref_id,
    st.cashier_id AS created_by,
    COALESCE(st.paid_at, st.updated_at, st.created_at) AS created_at,
    COALESCE(st.paid_at, st.updated_at, st.created_at) AS updated_at
FROM sales_transactions st
WHERE st.payment_method IN ('CASH', 'QR')
  AND st.order_id IS NOT NULL
  AND COALESCE(st.total_amount, 0) > 0
  AND NOT EXISTS (
      SELECT 1
      FROM finance_transactions ft
      WHERE ft.source_type = @auto_income_source
        AND ft.source_ref_id = CAST(st.order_id AS CHAR)
  );

SELECT ROW_COUNT() AS inserted_auto_income_rows;

COMMIT;

SELECT COUNT(*) AS remaining_paid_without_auto_income
FROM sales_transactions st
WHERE st.payment_method IN ('CASH', 'QR')
  AND st.order_id IS NOT NULL
  AND COALESCE(st.total_amount, 0) > 0
  AND NOT EXISTS (
      SELECT 1
      FROM finance_transactions ft
      WHERE ft.source_type = 'AUTO_PAYMENT_PAID'
        AND ft.source_ref_id = CAST(st.order_id AS CHAR)
  );
