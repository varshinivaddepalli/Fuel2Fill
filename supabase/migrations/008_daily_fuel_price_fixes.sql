-- =====================================================
-- PETRO ASTRA V1 - DAILY FUEL PRICE FIXES
-- Fixes issues from 007_daily_fuel_price.sql
-- =====================================================

-- =====================================================
-- FIX 1: Update trigger to only log when price changes
-- =====================================================

CREATE OR REPLACE FUNCTION log_price_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- First price entry - no old price
        INSERT INTO price_history_logs (
            station_id,
            fueltype_id,
            old_price,
            new_price,
            effective_date,
            price_update_id
        ) VALUES (
            NEW.station_id,
            NEW.fueltype_id,
            NULL,
            NEW.new_price,
            NEW.effective_date,
            NEW.price_update_id
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if price actually changed
        IF OLD.new_price IS DISTINCT FROM NEW.new_price THEN
            INSERT INTO price_history_logs (
                station_id,
                fueltype_id,
                old_price,
                new_price,
                effective_date,
                price_update_id
            ) VALUES (
                NEW.station_id,
                NEW.fueltype_id,
                OLD.new_price,
                NEW.new_price,
                NEW.effective_date,
                NEW.price_update_id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 2: Remove UPDATE/DELETE policies from audit table
-- Audit logs should be immutable
-- =====================================================

DROP POLICY IF EXISTS price_history_logs_update_authenticated ON price_history_logs;
DROP POLICY IF EXISTS price_history_logs_delete_authenticated ON price_history_logs;

-- =====================================================
-- FIX 3: Change fueltype_id ON DELETE to RESTRICT
-- Preserves audit history even if fuel type deletion is attempted
-- =====================================================

ALTER TABLE price_history_logs
    DROP CONSTRAINT IF EXISTS price_history_logs_fueltype_id_fkey;

ALTER TABLE price_history_logs
    ADD CONSTRAINT price_history_logs_fueltype_id_fkey
    FOREIGN KEY (fueltype_id) REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT;

-- =====================================================
-- FIX 4: Add composite index for common query pattern
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daily_fuel_price_station_date
    ON daily_fuel_price(station_id, effective_date);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
