-- Add business hours override and recurring holiday support to holiday_calendar table
-- Safe to run multiple times (idempotent).

START TRANSACTION;

-- Add business hours override columns
ALTER TABLE holiday_calendar
ADD COLUMN IF NOT EXISTS is_open_on_holiday BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether business is open on this holiday',
ADD COLUMN IF NOT EXISTS override_start_time TIME COMMENT 'Override opening time on this holiday',
ADD COLUMN IF NOT EXISTS override_end_time TIME COMMENT 'Override closing time on this holiday',
ADD COLUMN IF NOT EXISTS special_notes VARCHAR(500) COMMENT 'Special notes for this holiday (e.g., limited hours, special service)';

-- Add indexes for better query performance
ALTER TABLE holiday_calendar
ADD INDEX IF NOT EXISTS idx_is_open_on_holiday (is_open_on_holiday),
ADD INDEX IF NOT EXISTS idx_is_recurring (is_recurring);

COMMIT;
