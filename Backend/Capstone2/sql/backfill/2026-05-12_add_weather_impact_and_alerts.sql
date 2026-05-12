-- Add weather impact tracking and alert features
-- Safe to run multiple times (idempotent).

START TRANSACTION;

-- Add new weather measurement columns
ALTER TABLE weather_data
ADD COLUMN IF NOT EXISTS pressure INT COMMENT 'Atmospheric pressure in hPa',
ADD COLUMN IF NOT EXISTS visibility INT COMMENT 'Visibility in meters',
ADD COLUMN IF NOT EXISTS uv_index DOUBLE COMMENT 'UV index value',
ADD COLUMN IF NOT EXISTS weather_impact_score DECIMAL(5, 2) COMMENT 'Business impact score (0-100, higher = more negative)',
ADD COLUMN IF NOT EXISTS is_alert BOOLEAN DEFAULT FALSE COMMENT 'Whether weather alert is active',
ADD COLUMN IF NOT EXISTS alert_message VARCHAR(300) COMMENT 'Alert message for extreme weather conditions';

-- Add indexes for impact score queries
ALTER TABLE weather_data
ADD INDEX IF NOT EXISTS idx_weather_impact_score (weather_impact_score),
ADD INDEX IF NOT EXISTS idx_is_alert (is_alert),
ADD INDEX IF NOT EXISTS idx_record_date_impact (record_date, weather_impact_score);

COMMIT;
