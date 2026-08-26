-- =====================================================
-- PETRO ASTRA V1 - DAILY SALE RECORDS
-- Tracks daily fuel sales per nozzle with meter readings and payment breakdowns
-- =====================================================

-- =====================================================
-- DAILY SALE RECORDS TABLE
-- =====================================================

CREATE TABLE daily_sale_records (
    sale_record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    pump_id UUID NOT NULL REFERENCES pumps(pump_id) ON DELETE CASCADE,
    nozzle_id UUID NOT NULL REFERENCES nozzles(nozzle_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    sale_date DATE NOT NULL,
    fuel_price DECIMAL(10, 2) NOT NULL,
    opening_reading DECIMAL(12, 3) NOT NULL,
    close_reading DECIMAL(12, 3) NOT NULL,
    total_liters DECIMAL(12, 3) NOT NULL,
    total_amount DECIMAL(14, 2) NOT NULL,
    cash_sales DECIMAL(14, 2) NOT NULL DEFAULT 0,
    upi_sales DECIMAL(14, 2) NOT NULL DEFAULT 0,
    card_sales DECIMAL(14, 2) NOT NULL DEFAULT 0,
    credit_sales DECIMAL(14, 2) NOT NULL DEFAULT 0,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_fuel_price_positive CHECK (fuel_price > 0),
    CONSTRAINT chk_close_gte_open CHECK (close_reading >= opening_reading),
    CONSTRAINT chk_cash_sales_non_negative CHECK (cash_sales >= 0),
    CONSTRAINT chk_upi_sales_non_negative CHECK (upi_sales >= 0),
    CONSTRAINT chk_card_sales_non_negative CHECK (card_sales >= 0),
    CONSTRAINT chk_credit_sales_non_negative CHECK (credit_sales >= 0),
    CONSTRAINT chk_total_liters_non_negative CHECK (total_liters >= 0),
    CONSTRAINT chk_total_amount_non_negative CHECK (total_amount >= 0),
    CONSTRAINT uq_nozzle_sale_date UNIQUE (nozzle_id, sale_date)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_daily_sale_records_station ON daily_sale_records(station_id);
CREATE INDEX idx_daily_sale_records_pump ON daily_sale_records(pump_id);
CREATE INDEX idx_daily_sale_records_nozzle ON daily_sale_records(nozzle_id);
CREATE INDEX idx_daily_sale_records_employee ON daily_sale_records(employee_id);
CREATE INDEX idx_daily_sale_records_sale_date ON daily_sale_records(sale_date);
CREATE INDEX idx_daily_sale_records_status ON daily_sale_records(status);
CREATE INDEX idx_daily_sale_records_nozzle_date ON daily_sale_records(nozzle_id, sale_date DESC);

-- =====================================================
-- TRIGGER FUNCTION: Get previous day's close reading
-- =====================================================

CREATE OR REPLACE FUNCTION get_previous_close_reading(p_nozzle_id UUID, p_sale_date DATE)
RETURNS DECIMAL(12, 3) AS $$
DECLARE
    prev_reading DECIMAL(12, 3);
BEGIN
    SELECT close_reading INTO prev_reading
    FROM daily_sale_records
    WHERE nozzle_id = p_nozzle_id
      AND sale_date < p_sale_date
    ORDER BY sale_date DESC
    LIMIT 1;

    RETURN COALESCE(prev_reading, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Compute totals and auto-populate opening reading
-- =====================================================

CREATE OR REPLACE FUNCTION compute_sale_record_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total_liters from readings
    NEW.total_liters := NEW.close_reading - NEW.opening_reading;

    -- Calculate total_amount from liters and price
    NEW.total_amount := NEW.total_liters * NEW.fuel_price;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for auto-computing totals
CREATE TRIGGER trg_daily_sale_records_compute_totals
    BEFORE INSERT OR UPDATE ON daily_sale_records
    FOR EACH ROW EXECUTE FUNCTION compute_sale_record_totals();

-- Trigger for auto-update updated_at
CREATE TRIGGER trg_daily_sale_records_updated_at
    BEFORE UPDATE ON daily_sale_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE daily_sale_records ENABLE ROW LEVEL SECURITY;

-- Daily Sale Records Policies
CREATE POLICY daily_sale_records_select_authenticated ON daily_sale_records
    FOR SELECT TO authenticated USING (true);

CREATE POLICY daily_sale_records_insert_authenticated ON daily_sale_records
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY daily_sale_records_update_authenticated ON daily_sale_records
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY daily_sale_records_delete_authenticated ON daily_sale_records
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- COMMENT ON TABLE
-- =====================================================

COMMENT ON TABLE daily_sale_records IS 'Daily fuel sales records per nozzle with meter readings and payment breakdowns';
COMMENT ON COLUMN daily_sale_records.opening_reading IS 'Meter reading at start of day (typically previous day close reading)';
COMMENT ON COLUMN daily_sale_records.close_reading IS 'Meter reading at end of day';
COMMENT ON COLUMN daily_sale_records.total_liters IS 'Computed: close_reading - opening_reading';
COMMENT ON COLUMN daily_sale_records.total_amount IS 'Computed: total_liters * fuel_price';
COMMENT ON COLUMN daily_sale_records.cash_sales IS 'Total cash payments received';
COMMENT ON COLUMN daily_sale_records.upi_sales IS 'Total UPI/digital payments received';
COMMENT ON COLUMN daily_sale_records.card_sales IS 'Total card payments received';
COMMENT ON COLUMN daily_sale_records.credit_sales IS 'Total credit/receivable sales';
COMMENT ON FUNCTION get_previous_close_reading IS 'Helper function to fetch previous day close reading for a nozzle';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
