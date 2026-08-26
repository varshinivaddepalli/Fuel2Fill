-- =====================================================
-- PETRO ASTRA V1 - PRODUCT SALE ITEMS
-- Tracks non-fuel product sales (lubricants, coolants, accessories)
-- =====================================================

-- =====================================================
-- PRODUCT SALE ITEMS TABLE
-- =====================================================

CREATE TABLE product_sale_items (
    product_sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES station_products(station_product_id) ON DELETE RESTRICT,
    sale_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(14, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_psi_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_psi_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT chk_psi_total_amount_positive CHECK (total_amount > 0),
    CONSTRAINT chk_psi_payment_method CHECK (payment_method IN ('cash', 'upi', 'card'))
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_product_sale_items_station_date ON product_sale_items(station_id, sale_date);
CREATE INDEX idx_product_sale_items_employee ON product_sale_items(employee_id);
CREATE INDEX idx_product_sale_items_product ON product_sale_items(product_id);
CREATE INDEX idx_product_sale_items_station_employee_date ON product_sale_items(station_id, employee_id, sale_date);

-- =====================================================
-- TRIGGER FUNCTION: Compute total_amount
-- =====================================================

CREATE OR REPLACE FUNCTION compute_product_sale_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Auto-decrement stock on INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION decrement_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE station_products
    SET current_stock = current_stock - NEW.quantity
    WHERE station_product_id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Restore stock on DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION restore_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE station_products
    SET current_stock = current_stock + OLD.quantity
    WHERE station_product_id = OLD.product_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Compute total before insert/update
CREATE TRIGGER trg_product_sale_items_compute_total
    BEFORE INSERT OR UPDATE ON product_sale_items
    FOR EACH ROW EXECUTE FUNCTION compute_product_sale_total();

-- Decrement stock after insert
CREATE TRIGGER trg_product_sale_items_decrement_stock
    AFTER INSERT ON product_sale_items
    FOR EACH ROW EXECUTE FUNCTION decrement_product_stock();

-- Restore stock after delete
CREATE TRIGGER trg_product_sale_items_restore_stock
    AFTER DELETE ON product_sale_items
    FOR EACH ROW EXECUTE FUNCTION restore_product_stock();

-- Auto-update updated_at
CREATE TRIGGER trg_product_sale_items_updated_at
    BEFORE UPDATE ON product_sale_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE product_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_sale_items_select_authenticated ON product_sale_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY product_sale_items_insert_authenticated ON product_sale_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY product_sale_items_update_authenticated ON product_sale_items
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY product_sale_items_delete_authenticated ON product_sale_items
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE product_sale_items IS 'Non-fuel product sales (lubricants, coolants, accessories) per item';
COMMENT ON COLUMN product_sale_items.product_id IS 'References station_products.station_product_id';
COMMENT ON COLUMN product_sale_items.quantity IS 'Number of units sold';
COMMENT ON COLUMN product_sale_items.unit_price IS 'Price per unit at time of sale (from station_products.selling_price)';
COMMENT ON COLUMN product_sale_items.total_amount IS 'Computed by trigger: quantity * unit_price';
COMMENT ON COLUMN product_sale_items.payment_method IS 'Payment method: cash, upi, or card';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
