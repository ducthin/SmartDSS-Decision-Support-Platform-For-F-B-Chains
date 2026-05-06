-- Add priority and status fields to staff_calls table to enhance staff call management
-- Allows customers to set priority levels (NORMAL, URGENT) and track call status
-- Safe to run multiple times (idempotent).

START TRANSACTION;

-- Add priority column if not exists
ALTER TABLE staff_calls
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' COMMENT 'Call priority level: NORMAL or URGENT';

-- Add status column if not exists
ALTER TABLE staff_calls
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'Call status: PENDING, ACCEPTED, COMPLETED, CANCELLED';

-- Add indexes for better query performance
ALTER TABLE staff_calls
ADD INDEX IF NOT EXISTS idx_staff_calls_priority (priority),
ADD INDEX IF NOT EXISTS idx_staff_calls_status (status),
ADD INDEX IF NOT EXISTS idx_staff_calls_table_status (table_name, status);

COMMIT;
