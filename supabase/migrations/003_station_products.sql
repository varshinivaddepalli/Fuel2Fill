-- =====================================================
-- PETRO ASTRA V1 - STATION PRODUCTS SCHEMA
-- =====================================================

-- =====================================================
-- STATION_PRODUCTS TABLE
-- =====================================================

CREATE TABLE station_products (
    station_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one product per station
    CONSTRAINT uq_station_product UNIQUE (station_id, product_name),

    -- CHECK constraints
    CONSTRAINT chk_current_stock_non_negative CHECK (current_stock >= 0),
    CONSTRAINT chk_minimum_stock_non_negative CHECK (minimum_stock >= 0),
    CONSTRAINT chk_discount_amount_non_negative CHECK (discount_amount >= 0),
    CONSTRAINT chk_purchase_price_positive CHECK (purchase_price > 0),
    CONSTRAINT chk_selling_price_positive CHECK (selling_price > 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_station_products_station ON station_products(station_id);
CREATE INDEX idx_station_products_name ON station_products(product_name);
CREATE INDEX idx_station_products_available ON station_products(available);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE TRIGGER trg_station_products_updated_at
    BEFORE UPDATE ON station_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
