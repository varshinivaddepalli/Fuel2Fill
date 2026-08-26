-- Migration: Replace pump_type column with nozzle_count integer column

-- Add nozzle_count column as INTEGER
ALTER TABLE pumps ADD COLUMN nozzle_count INTEGER;

-- Migrate existing data: single→1, dual→2, triple→3
UPDATE pumps SET nozzle_count = CASE
  WHEN pump_type = 'single' THEN 1
  WHEN pump_type = 'dual' THEN 2
  WHEN pump_type = 'triple' THEN 3
  ELSE 1
END;

-- Set NOT NULL after migration
ALTER TABLE pumps ALTER COLUMN nozzle_count SET NOT NULL;

-- Add CHECK constraint (1-10)
ALTER TABLE pumps ADD CONSTRAINT chk_nozzle_count CHECK (nozzle_count >= 1 AND nozzle_count <= 10);

-- Drop old pump_type column and its constraint/index
ALTER TABLE pumps DROP CONSTRAINT IF EXISTS chk_pump_type;
DROP INDEX IF EXISTS idx_pumps_type;
ALTER TABLE pumps DROP COLUMN pump_type;
