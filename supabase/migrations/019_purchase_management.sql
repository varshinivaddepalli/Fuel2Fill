-- =====================================================
-- PETRO ASTRA V1 - PURCHASE MANAGEMENT
-- Records incoming fuel and product purchases from suppliers.
-- Fuel purchases allocate to specific tanks; product purchases
-- increment station_products stock. Stock updates via triggers.
-- =====================================================

-- =====================================================
-- ADD current_stock TO tanks
-- =====================================================

ALTER TABLE tanks ADD COLUMN current_stock DECIMAL(12, 3) NOT NULL DEFAULT 0;

COMMENT ON COLUMN tanks.current_stock IS 'Current fuel stock in liters, updated by purchase allocation triggers';

-- =====================================================
-- PURCHASES TABLE (header / invoice level)
-- =====================================================

CREATE TABLE purchases (
    purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    purchase_date DATE NOT NULL,
    purchase_type VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    gst_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    vendor_name VARCHAR(255),
    notes TEXT,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_purchase_type CHECK (purchase_type IN ('fuel', 'product')),
    CONSTRAINT chk_purchase_payment_method CHECK (payment_method IN ('bank_transfer', 'cash', 'upi', 'credit')),
    CONSTRAINT chk_purchase_gst_non_negative CHECK (gst_amount >= 0),
    CONSTRAINT chk_purchase_total_non_negative CHECK (total_amount >= 0)
);

-- =====================================================
-- PURCHASE FUEL ITEMS TABLE
-- =====================================================

CREATE TABLE purchase_fuel_items (
    fuel_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(purchase_id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT,
    purchase_price_per_liter DECIMAL(10, 2) NOT NULL,
    total_quantity DECIMAL(12, 3) NOT NULL,
    total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_fuel_item_price_positive CHECK (purchase_price_per_liter > 0),
    CONSTRAINT chk_fuel_item_qty_positive CHECK (total_quantity > 0)
);

-- =====================================================
-- PURCHASE FUEL TANK ALLOCATIONS TABLE
-- =====================================================

CREATE TABLE purchase_fuel_tank_allocations (
    allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fuel_item_id UUID NOT NULL REFERENCES purchase_fuel_items(fuel_item_id) ON DELETE CASCADE,
    tank_id UUID NOT NULL REFERENCES tanks(tank_id) ON DELETE RESTRICT,
    quantity DECIMAL(12, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_allocation_qty_positive CHECK (quantity > 0)
);

-- =====================================================
-- PURCHASE PRODUCT ITEMS TABLE
-- =====================================================

CREATE TABLE purchase_product_items (
    product_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(purchase_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES station_products(station_product_id) ON DELETE RESTRICT,
    purchase_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_product_item_price_positive CHECK (purchase_price > 0),
    CONSTRAINT chk_product_item_qty_positive CHECK (quantity > 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_purchases_station_date ON purchases(station_id, purchase_date);
CREATE INDEX idx_purchases_type ON purchases(purchase_type);

CREATE INDEX idx_purchase_fuel_items_purchase ON purchase_fuel_items(purchase_id);
CREATE INDEX idx_purchase_fuel_items_fuel_type ON purchase_fuel_items(fuel_type_id);

CREATE INDEX idx_purchase_fuel_tank_alloc_fuel_item ON purchase_fuel_tank_allocations(fuel_item_id);
CREATE INDEX idx_purchase_fuel_tank_alloc_tank ON purchase_fuel_tank_allocations(tank_id);

CREATE INDEX idx_purchase_product_items_purchase ON purchase_product_items(purchase_id);
CREATE INDEX idx_purchase_product_items_product ON purchase_product_items(product_id);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- 1. Compute fuel item total_amount = price_per_liter * total_quantity
CREATE OR REPLACE FUNCTION compute_purchase_fuel_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.purchase_price_per_liter * NEW.total_quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Compute product item total_amount = purchase_price * quantity
CREATE OR REPLACE FUNCTION compute_purchase_product_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.purchase_price * NEW.quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Increment tank stock on fuel allocation insert
CREATE OR REPLACE FUNCTION increment_tank_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tanks
    SET current_stock = current_stock + NEW.quantity
    WHERE tank_id = NEW.tank_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Decrement tank stock on fuel allocation delete
CREATE OR REPLACE FUNCTION decrement_tank_stock_on_purchase_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tanks
    SET current_stock = current_stock - OLD.quantity
    WHERE tank_id = OLD.tank_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Increment product stock on product item insert
CREATE OR REPLACE FUNCTION increment_product_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE station_products
    SET current_stock = current_stock + NEW.quantity
    WHERE station_product_id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Decrement product stock on product item delete
CREATE OR REPLACE FUNCTION decrement_product_stock_on_purchase_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE station_products
    SET current_stock = current_stock - OLD.quantity
    WHERE station_product_id = OLD.product_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Fuel item total computation
CREATE TRIGGER trg_compute_purchase_fuel_item_total
    BEFORE INSERT OR UPDATE ON purchase_fuel_items
    FOR EACH ROW EXECUTE FUNCTION compute_purchase_fuel_item_total();

-- Product item total computation
CREATE TRIGGER trg_compute_purchase_product_item_total
    BEFORE INSERT OR UPDATE ON purchase_product_items
    FOR EACH ROW EXECUTE FUNCTION compute_purchase_product_item_total();

-- Tank stock increment on allocation
CREATE TRIGGER trg_increment_tank_stock_on_purchase
    AFTER INSERT ON purchase_fuel_tank_allocations
    FOR EACH ROW EXECUTE FUNCTION increment_tank_stock_on_purchase();

-- Tank stock decrement on allocation delete
CREATE TRIGGER trg_decrement_tank_stock_on_purchase_delete
    AFTER DELETE ON purchase_fuel_tank_allocations
    FOR EACH ROW EXECUTE FUNCTION decrement_tank_stock_on_purchase_delete();

-- Product stock increment on purchase item
CREATE TRIGGER trg_increment_product_stock_on_purchase
    AFTER INSERT ON purchase_product_items
    FOR EACH ROW EXECUTE FUNCTION increment_product_stock_on_purchase();

-- Product stock decrement on purchase item delete
CREATE TRIGGER trg_decrement_product_stock_on_purchase_delete
    AFTER DELETE ON purchase_product_items
    FOR EACH ROW EXECUTE FUNCTION decrement_product_stock_on_purchase_delete();

-- updated_at triggers
CREATE TRIGGER trg_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchase_fuel_items_updated_at
    BEFORE UPDATE ON purchase_fuel_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchase_product_items_updated_at
    BEFORE UPDATE ON purchase_product_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_fuel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_fuel_tank_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_product_items ENABLE ROW LEVEL SECURITY;

-- purchases
CREATE POLICY purchases_select_authenticated ON purchases
    FOR SELECT TO authenticated USING (true);
CREATE POLICY purchases_insert_authenticated ON purchases
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY purchases_update_authenticated ON purchases
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY purchases_delete_authenticated ON purchases
    FOR DELETE TO authenticated USING (true);

-- purchase_fuel_items
CREATE POLICY purchase_fuel_items_select_authenticated ON purchase_fuel_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY purchase_fuel_items_insert_authenticated ON purchase_fuel_items
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY purchase_fuel_items_update_authenticated ON purchase_fuel_items
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY purchase_fuel_items_delete_authenticated ON purchase_fuel_items
    FOR DELETE TO authenticated USING (true);

-- purchase_fuel_tank_allocations
CREATE POLICY purchase_fuel_tank_alloc_select_authenticated ON purchase_fuel_tank_allocations
    FOR SELECT TO authenticated USING (true);
CREATE POLICY purchase_fuel_tank_alloc_insert_authenticated ON purchase_fuel_tank_allocations
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY purchase_fuel_tank_alloc_update_authenticated ON purchase_fuel_tank_allocations
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY purchase_fuel_tank_alloc_delete_authenticated ON purchase_fuel_tank_allocations
    FOR DELETE TO authenticated USING (true);

-- purchase_product_items
CREATE POLICY purchase_product_items_select_authenticated ON purchase_product_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY purchase_product_items_insert_authenticated ON purchase_product_items
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY purchase_product_items_update_authenticated ON purchase_product_items
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY purchase_product_items_delete_authenticated ON purchase_product_items
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE purchases IS 'Purchase invoices for fuel and product procurement';
COMMENT ON COLUMN purchases.purchase_type IS 'Either fuel or product - each purchase is one type';
COMMENT ON COLUMN purchases.gst_amount IS 'GST amount on the invoice';
COMMENT ON COLUMN purchases.total_amount IS 'Total invoice amount (sum of line items + GST)';

COMMENT ON TABLE purchase_fuel_items IS 'Fuel line items within a purchase invoice';
COMMENT ON COLUMN purchase_fuel_items.fuel_type_id IS 'References fuel_types.fueltype_id';
COMMENT ON COLUMN purchase_fuel_items.total_amount IS 'Computed by trigger: price_per_liter * total_quantity';

COMMENT ON TABLE purchase_fuel_tank_allocations IS 'Allocation of purchased fuel to specific tanks';
COMMENT ON COLUMN purchase_fuel_tank_allocations.quantity IS 'Liters allocated to this tank';

COMMENT ON TABLE purchase_product_items IS 'Product line items within a purchase invoice';
COMMENT ON COLUMN purchase_product_items.product_id IS 'References station_products.station_product_id';
COMMENT ON COLUMN purchase_product_items.total_amount IS 'Computed by trigger: purchase_price * quantity';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
