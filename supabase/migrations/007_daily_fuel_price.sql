-- =====================================================
-- PETRO ASTRA V1 - DAILY FUEL PRICE & PRICE HISTORY LOGS
-- =====================================================

-- =====================================================
-- DAILY FUEL PRICE TABLE
-- Stores the current active price for each station's fuel type
-- =====================================================

CREATE TABLE daily_fuel_price (
    price_update_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT,
    new_price DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_price_positive CHECK (new_price >= 0),
    CONSTRAINT uq_station_fueltype_price UNIQUE (station_id, fueltype_id)
);

CREATE INDEX idx_daily_fuel_price_station ON daily_fuel_price(station_id);
CREATE INDEX idx_daily_fuel_price_fueltype ON daily_fuel_price(fueltype_id);
CREATE INDEX idx_daily_fuel_price_employee ON daily_fuel_price(employee_id);
CREATE INDEX idx_daily_fuel_price_effective_date ON daily_fuel_price(effective_date);
CREATE INDEX idx_daily_fuel_price_status ON daily_fuel_price(status);

-- =====================================================
-- PRICE HISTORY LOGS TABLE
-- Audit table - automatically populated by trigger
-- Records all price changes
-- =====================================================

CREATE TABLE price_history_logs (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE CASCADE,
    old_price DECIMAL(10, 2),  -- NULL for first entry
    new_price DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    price_update_id UUID NOT NULL REFERENCES daily_fuel_price(price_update_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- No updated_at or status - audit logs are immutable
);

CREATE INDEX idx_price_history_station ON price_history_logs(station_id);
CREATE INDEX idx_price_history_fueltype ON price_history_logs(fueltype_id);
CREATE INDEX idx_price_history_price_update ON price_history_logs(price_update_id);
CREATE INDEX idx_price_history_effective_date ON price_history_logs(effective_date);
CREATE INDEX idx_price_history_created_at ON price_history_logs(created_at);

-- =====================================================
-- TRIGGER FUNCTION: Log price history
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
        -- Price update - capture old price
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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for auto-logging price history
CREATE TRIGGER trg_daily_fuel_price_history
    AFTER INSERT OR UPDATE ON daily_fuel_price
    FOR EACH ROW EXECUTE FUNCTION log_price_history();

-- Trigger for auto-update updated_at
CREATE TRIGGER trg_daily_fuel_price_updated_at
    BEFORE UPDATE ON daily_fuel_price
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE daily_fuel_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history_logs ENABLE ROW LEVEL SECURITY;

-- Daily Fuel Price Policies
CREATE POLICY daily_fuel_price_select_authenticated ON daily_fuel_price
    FOR SELECT TO authenticated USING (true);

CREATE POLICY daily_fuel_price_insert_authenticated ON daily_fuel_price
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY daily_fuel_price_update_authenticated ON daily_fuel_price
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY daily_fuel_price_delete_authenticated ON daily_fuel_price
    FOR DELETE TO authenticated USING (true);

-- Price History Logs Policies (read-only for audit trail)
CREATE POLICY price_history_logs_select_authenticated ON price_history_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY price_history_logs_insert_authenticated ON price_history_logs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY price_history_logs_update_authenticated ON price_history_logs
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY price_history_logs_delete_authenticated ON price_history_logs
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
