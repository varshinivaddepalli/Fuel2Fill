-- =====================================================
-- Migration 020: Stock Management
-- Adds testing_qty to daily_sale_records and triggers
-- to sync tank current_stock on fuel sales
-- =====================================================

-- =====================================================
-- 1. Add testing_qty column to daily_sale_records
-- =====================================================

ALTER TABLE daily_sale_records
ADD COLUMN testing_qty DECIMAL(12, 3) NOT NULL DEFAULT 0
    CONSTRAINT chk_testing_qty_non_negative CHECK (testing_qty >= 0);

COMMENT ON COLUMN daily_sale_records.testing_qty IS 'Testing quantity (liters) deducted from sales calculation';

-- =====================================================
-- 2. Update compute_sale_record_totals() trigger
--    Now: total_liters = close_reading - opening_reading - testing_qty
-- =====================================================

CREATE OR REPLACE FUNCTION compute_sale_record_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total_liters from readings minus testing quantity
    NEW.total_liters := NEW.close_reading - NEW.opening_reading - NEW.testing_qty;

    -- Calculate total_amount from liters and price
    NEW.total_amount := NEW.total_liters * NEW.fuel_price;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. Trigger functions for tank stock sync on sales
-- =====================================================

-- AFTER INSERT: decrement tank stock by total_liters
CREATE OR REPLACE FUNCTION decrement_tank_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_tank_id UUID;
BEGIN
    -- Look up the tank_id from the nozzle
    SELECT tank_id INTO v_tank_id
    FROM nozzles
    WHERE nozzle_id = NEW.nozzle_id;

    IF v_tank_id IS NOT NULL THEN
        UPDATE tanks
        SET current_stock = current_stock - NEW.total_liters
        WHERE tank_id = v_tank_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER UPDATE: adjust tank stock by difference
-- The BEFORE trigger (compute_sale_record_totals) has already set NEW.total_liters
CREATE OR REPLACE FUNCTION adjust_tank_stock_on_sale_update()
RETURNS TRIGGER AS $$
DECLARE
    v_tank_id UUID;
    v_diff DECIMAL;
BEGIN
    -- Only adjust if total_liters actually changed
    IF OLD.total_liters IS DISTINCT FROM NEW.total_liters THEN
        SELECT tank_id INTO v_tank_id
        FROM nozzles
        WHERE nozzle_id = NEW.nozzle_id;

        IF v_tank_id IS NOT NULL THEN
            -- Restore old amount, then deduct new amount
            v_diff := OLD.total_liters - NEW.total_liters;
            UPDATE tanks
            SET current_stock = current_stock + v_diff
            WHERE tank_id = v_tank_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER DELETE: restore tank stock
CREATE OR REPLACE FUNCTION restore_tank_stock_on_sale_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_tank_id UUID;
BEGIN
    SELECT tank_id INTO v_tank_id
    FROM nozzles
    WHERE nozzle_id = OLD.nozzle_id;

    IF v_tank_id IS NOT NULL THEN
        UPDATE tanks
        SET current_stock = current_stock + OLD.total_liters
        WHERE tank_id = v_tank_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Create triggers on daily_sale_records
-- =====================================================

CREATE TRIGGER trg_daily_sale_records_decrement_stock
    AFTER INSERT ON daily_sale_records
    FOR EACH ROW EXECUTE FUNCTION decrement_tank_stock_on_sale();

CREATE TRIGGER trg_daily_sale_records_adjust_stock
    AFTER UPDATE ON daily_sale_records
    FOR EACH ROW EXECUTE FUNCTION adjust_tank_stock_on_sale_update();

CREATE TRIGGER trg_daily_sale_records_restore_stock
    AFTER DELETE ON daily_sale_records
    FOR EACH ROW EXECUTE FUNCTION restore_tank_stock_on_sale_delete();
