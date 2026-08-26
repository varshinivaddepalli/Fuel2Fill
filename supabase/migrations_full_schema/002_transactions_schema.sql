-- =====================================================
-- PETRO ASTRA V1 - TRANSACTIONS SCHEMA
-- Sales, Purchases, and Financial Records
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE transaction_type AS ENUM ('fuel_sale', 'product_sale', 'service', 'refund');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE purchase_order_status AS ENUM ('draft', 'submitted', 'approved', 'received', 'cancelled');

-- =====================================================
-- CUSTOMERS TABLE (Fleet/Credit Customers)
-- =====================================================

CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) NOT NULL DEFAULT 'individual', -- individual, fleet, corporate
    company_name VARCHAR(255),
    gst_number VARCHAR(15),
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(6),
    -- Credit details
    credit_limit DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 0, -- Days
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_status ON customers(status);

-- =====================================================
-- CUSTOMER VEHICLES (for fleet customers)
-- =====================================================

CREATE TABLE customer_vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    vehicle_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50),
    fuel_type_id UUID REFERENCES fuel_types(fueltype_id),
    tank_capacity DECIMAL(10, 2),
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_customer_vehicle UNIQUE (customer_id, vehicle_number)
);

CREATE INDEX idx_customer_vehicles_customer ON customer_vehicles(customer_id);
CREATE INDEX idx_customer_vehicles_number ON customer_vehicles(vehicle_number);

-- =====================================================
-- SALES TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE sales_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE RESTRICT,
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    transaction_type transaction_type NOT NULL,
    transaction_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Customer info (optional for walk-in)
    customer_id UUID REFERENCES customers(customer_id),
    vehicle_id UUID REFERENCES customer_vehicles(vehicle_id),
    vehicle_number VARCHAR(20),
    -- Employee info
    employee_id UUID REFERENCES employees(employee_id),
    shift_id UUID REFERENCES shifts(shift_id),
    -- Totals
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    -- Status
    status transaction_status NOT NULL DEFAULT 'completed',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_transactions_station ON sales_transactions(station_id);
CREATE INDEX idx_sales_transactions_datetime ON sales_transactions(transaction_datetime);
CREATE INDEX idx_sales_transactions_customer ON sales_transactions(customer_id);
CREATE INDEX idx_sales_transactions_employee ON sales_transactions(employee_id);
CREATE INDEX idx_sales_transactions_status ON sales_transactions(status);
CREATE INDEX idx_sales_transactions_number ON sales_transactions(transaction_number);

-- =====================================================
-- FUEL SALE ITEMS
-- =====================================================

CREATE TABLE fuel_sale_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
    nozzle_id UUID NOT NULL REFERENCES nozzles(nozzle_id),
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id),
    quantity DECIMAL(12, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    opening_reading DECIMAL(15, 3),
    closing_reading DECIMAL(15, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_fuel_quantity CHECK (quantity > 0),
    CONSTRAINT chk_fuel_price CHECK (unit_price > 0)
);

CREATE INDEX idx_fuel_sale_items_transaction ON fuel_sale_items(transaction_id);
CREATE INDEX idx_fuel_sale_items_nozzle ON fuel_sale_items(nozzle_id);
CREATE INDEX idx_fuel_sale_items_fueltype ON fuel_sale_items(fueltype_id);

-- =====================================================
-- PRODUCT SALE ITEMS
-- =====================================================

CREATE TABLE product_sale_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(product_id),
    quantity DECIMAL(12, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_product_quantity CHECK (quantity > 0),
    CONSTRAINT chk_product_price CHECK (unit_price >= 0)
);

CREATE INDEX idx_product_sale_items_transaction ON product_sale_items(transaction_id);
CREATE INDEX idx_product_sale_items_product ON product_sale_items(product_id);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================

CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES sales_transactions(transaction_id) ON DELETE SET NULL,
    station_id UUID NOT NULL REFERENCES stations(station_id),
    payment_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_mode payment_mode NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    reference_number VARCHAR(100),
    -- For credit payments
    customer_id UUID REFERENCES customers(customer_id),
    is_credit_payment BOOLEAN DEFAULT false,
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    received_by UUID REFERENCES employees(employee_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_station ON payments(station_id);
CREATE INDEX idx_payments_datetime ON payments(payment_datetime);
CREATE INDEX idx_payments_mode ON payments(payment_mode);
CREATE INDEX idx_payments_customer ON payments(customer_id);

-- =====================================================
-- CREDIT LEDGER (for tracking credit accounts)
-- =====================================================

CREATE TABLE credit_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(station_id),
    transaction_id UUID REFERENCES sales_transactions(transaction_id),
    payment_id UUID REFERENCES payments(payment_id),
    entry_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entry_type VARCHAR(20) NOT NULL, -- 'sale', 'payment', 'adjustment'
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    running_balance DECIMAL(15, 2) NOT NULL,
    remarks TEXT,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_ledger_customer ON credit_ledger(customer_id);
CREATE INDEX idx_credit_ledger_station ON credit_ledger(station_id);
CREATE INDEX idx_credit_ledger_datetime ON credit_ledger(entry_datetime);

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================

CREATE TABLE suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(50) UNIQUE,
    supplier_type VARCHAR(50), -- 'fuel', 'product', 'both'
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(6),
    -- Bank details
    bank_name VARCHAR(100),
    bank_account VARCHAR(20),
    ifsc_code VARCHAR(11),
    -- Terms
    payment_terms INTEGER DEFAULT 0,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_type ON suppliers(supplier_type);
CREATE INDEX idx_suppliers_status ON suppliers(status);

-- =====================================================
-- PURCHASE ORDERS TABLE
-- =====================================================

CREATE TABLE purchase_orders (
    po_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id),
    po_number VARCHAR(50) NOT NULL UNIQUE,
    po_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    -- Totals
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    -- Status
    status purchase_order_status NOT NULL DEFAULT 'draft',
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_station ON purchase_orders(station_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(po_date);

-- =====================================================
-- PURCHASE ORDER ITEMS
-- =====================================================

CREATE TABLE purchase_order_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- 'fuel', 'product'
    fueltype_id UUID REFERENCES fuel_types(fueltype_id),
    product_id UUID REFERENCES products(product_id),
    quantity DECIMAL(12, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(15, 2) NOT NULL,
    received_quantity DECIMAL(12, 3) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_po_item_type CHECK (
        (item_type = 'fuel' AND fueltype_id IS NOT NULL AND product_id IS NULL) OR
        (item_type = 'product' AND product_id IS NOT NULL AND fueltype_id IS NULL)
    ),
    CONSTRAINT chk_po_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_fueltype ON purchase_order_items(fueltype_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);

-- =====================================================
-- STOCK RECEIPTS (Goods Received)
-- =====================================================

CREATE TABLE stock_receipts (
    receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id),
    po_id UUID REFERENCES purchase_orders(po_id),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    invoice_amount DECIMAL(15, 2),
    -- For fuel receipts
    tank_id UUID REFERENCES tanks(tank_id),
    delivery_challan VARCHAR(100),
    vehicle_number VARCHAR(20),
    driver_name VARCHAR(100),
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'received',
    verified_by UUID REFERENCES users(user_id),
    verified_at TIMESTAMPTZ,
    remarks TEXT,
    received_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_receipts_station ON stock_receipts(station_id);
CREATE INDEX idx_stock_receipts_po ON stock_receipts(po_id);
CREATE INDEX idx_stock_receipts_supplier ON stock_receipts(supplier_id);
CREATE INDEX idx_stock_receipts_date ON stock_receipts(receipt_date);

-- =====================================================
-- STOCK RECEIPT ITEMS
-- =====================================================

CREATE TABLE stock_receipt_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES stock_receipts(receipt_id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES purchase_order_items(item_id),
    item_type VARCHAR(20) NOT NULL,
    fueltype_id UUID REFERENCES fuel_types(fueltype_id),
    product_id UUID REFERENCES products(product_id),
    ordered_quantity DECIMAL(12, 3),
    received_quantity DECIMAL(12, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    -- For fuel: dip readings
    dip_before DECIMAL(10, 2),
    dip_after DECIMAL(10, 2),
    calculated_quantity DECIMAL(12, 3),
    variance DECIMAL(12, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_receipt_quantity CHECK (received_quantity >= 0)
);

CREATE INDEX idx_receipt_items_receipt ON stock_receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_fueltype ON stock_receipt_items(fueltype_id);
CREATE INDEX idx_receipt_items_product ON stock_receipt_items(product_id);

-- =====================================================
-- PRICE CHANGE HISTORY
-- =====================================================

CREATE TABLE price_change_history (
    change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id),
    fueltype_id UUID REFERENCES fuel_types(fueltype_id),
    product_id UUID REFERENCES products(product_id),
    old_price DECIMAL(10, 2) NOT NULL,
    new_price DECIMAL(10, 2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_price_item CHECK (
        (fueltype_id IS NOT NULL AND product_id IS NULL) OR
        (product_id IS NOT NULL AND fueltype_id IS NULL)
    )
);

CREATE INDEX idx_price_history_station ON price_change_history(station_id);
CREATE INDEX idx_price_history_fueltype ON price_change_history(fueltype_id);
CREATE INDEX idx_price_history_product ON price_change_history(product_id);
CREATE INDEX idx_price_history_effective ON price_change_history(effective_from);

-- =====================================================
-- DAILY SUMMARY TABLE (Pre-aggregated reports)
-- =====================================================

CREATE TABLE daily_summaries (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id),
    summary_date DATE NOT NULL,
    -- Fuel sales
    total_fuel_quantity DECIMAL(15, 3) DEFAULT 0,
    total_fuel_sales DECIMAL(15, 2) DEFAULT 0,
    -- Product sales
    total_product_sales DECIMAL(15, 2) DEFAULT 0,
    -- Collections by mode
    cash_collection DECIMAL(15, 2) DEFAULT 0,
    card_collection DECIMAL(15, 2) DEFAULT 0,
    upi_collection DECIMAL(15, 2) DEFAULT 0,
    credit_sales DECIMAL(15, 2) DEFAULT 0,
    -- Totals
    total_sales DECIMAL(15, 2) DEFAULT 0,
    total_collection DECIMAL(15, 2) DEFAULT 0,
    -- Fuel-wise breakdown (JSONB)
    fuel_breakdown JSONB DEFAULT '[]'::jsonb,
    -- Status
    is_finalized BOOLEAN DEFAULT false,
    finalized_by UUID REFERENCES users(user_id),
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_daily_summary UNIQUE (station_id, summary_date)
);

CREATE INDEX idx_daily_summaries_station ON daily_summaries(station_id);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(summary_date);
CREATE INDEX idx_daily_summaries_station_date ON daily_summaries(station_id, summary_date);

-- =====================================================
-- TRIGGERS FOR TRANSACTIONS
-- =====================================================

-- Update customer balance on credit sale
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.entry_type = 'sale' THEN
        UPDATE customers
        SET current_balance = current_balance + NEW.debit_amount,
            updated_at = NOW()
        WHERE customer_id = NEW.customer_id;
    ELSIF NEW.entry_type = 'payment' THEN
        UPDATE customers
        SET current_balance = current_balance - NEW.credit_amount,
            updated_at = NOW()
        WHERE customer_id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_balance
    AFTER INSERT ON credit_ledger
    FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

-- Update inventory on product sale
CREATE OR REPLACE FUNCTION update_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_station_id UUID;
BEGIN
    SELECT station_id INTO v_station_id
    FROM sales_transactions WHERE transaction_id = NEW.transaction_id;

    UPDATE station_inventory
    SET current_stock = current_stock - NEW.quantity,
        updated_at = NOW()
    WHERE station_id = v_station_id AND product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_on_sale
    AFTER INSERT ON product_sale_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_on_sale();

-- Update inventory on stock receipt
CREATE OR REPLACE FUNCTION update_inventory_on_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_station_id UUID;
BEGIN
    IF NEW.item_type = 'product' AND NEW.product_id IS NOT NULL THEN
        SELECT station_id INTO v_station_id
        FROM stock_receipts WHERE receipt_id = NEW.receipt_id;

        UPDATE station_inventory
        SET current_stock = current_stock + NEW.received_quantity,
            last_restocked_at = NOW(),
            updated_at = NOW()
        WHERE station_id = v_station_id AND product_id = NEW.product_id;

        -- Insert if not exists
        IF NOT FOUND THEN
            INSERT INTO station_inventory (station_id, product_id, current_stock, last_restocked_at)
            VALUES (v_station_id, NEW.product_id, NEW.received_quantity, NOW());
        END IF;
    ELSIF NEW.item_type = 'fuel' AND NEW.fueltype_id IS NOT NULL THEN
        -- Update tank stock
        UPDATE tanks
        SET current_stock = current_stock + NEW.received_quantity,
            updated_at = NOW()
        WHERE tank_id = (SELECT tank_id FROM stock_receipts WHERE receipt_id = NEW.receipt_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_on_receipt
    AFTER INSERT ON stock_receipt_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_on_receipt();

-- Generate transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
    v_station_code VARCHAR(10);
    v_date_part VARCHAR(8);
    v_seq INTEGER;
BEGIN
    SELECT SUBSTRING(station_sap_code, 1, 6) INTO v_station_code
    FROM stations WHERE station_id = NEW.station_id;

    v_date_part := TO_CHAR(NEW.transaction_datetime, 'YYYYMMDD');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(transaction_number FROM '.{15}(.*)') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM sales_transactions
    WHERE station_id = NEW.station_id
    AND DATE(transaction_datetime) = DATE(NEW.transaction_datetime);

    NEW.transaction_number := v_station_code || '-' || v_date_part || '-' || LPAD(v_seq::TEXT, 6, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_transaction_number
    BEFORE INSERT ON sales_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_number IS NULL)
    EXECUTE FUNCTION generate_transaction_number();

-- =====================================================
-- RLS FOR TRANSACTION TABLES
-- =====================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Customers - global access for authenticated
CREATE POLICY customers_select ON customers FOR SELECT USING (true);
CREATE POLICY customers_modify ON customers FOR ALL USING (
    get_user_role() IN ('admin', 'manager', 'supervisor')
);

-- Customer vehicles
CREATE POLICY customer_vehicles_select ON customer_vehicles FOR SELECT USING (true);
CREATE POLICY customer_vehicles_modify ON customer_vehicles FOR ALL USING (
    get_user_role() IN ('admin', 'manager', 'supervisor')
);

-- Sales transactions
CREATE POLICY sales_transactions_select ON sales_transactions FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY sales_transactions_insert ON sales_transactions FOR INSERT WITH CHECK (
    station_id IN (SELECT get_user_stations())
);
CREATE POLICY sales_transactions_modify ON sales_transactions FOR UPDATE USING (
    get_user_role() IN ('admin', 'manager', 'supervisor') AND
    station_id IN (SELECT get_user_stations())
);

-- Sale items
CREATE POLICY fuel_sale_items_select ON fuel_sale_items FOR SELECT USING (
    transaction_id IN (
        SELECT transaction_id FROM sales_transactions
        WHERE station_id IN (SELECT get_user_stations())
    ) OR is_admin()
);
CREATE POLICY fuel_sale_items_insert ON fuel_sale_items FOR INSERT WITH CHECK (true);

CREATE POLICY product_sale_items_select ON product_sale_items FOR SELECT USING (
    transaction_id IN (
        SELECT transaction_id FROM sales_transactions
        WHERE station_id IN (SELECT get_user_stations())
    ) OR is_admin()
);
CREATE POLICY product_sale_items_insert ON product_sale_items FOR INSERT WITH CHECK (true);

-- Payments
CREATE POLICY payments_select ON payments FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY payments_insert ON payments FOR INSERT WITH CHECK (
    station_id IN (SELECT get_user_stations())
);

-- Credit ledger
CREATE POLICY credit_ledger_select ON credit_ledger FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY credit_ledger_insert ON credit_ledger FOR INSERT WITH CHECK (
    station_id IN (SELECT get_user_stations())
);

-- Suppliers
CREATE POLICY suppliers_select ON suppliers FOR SELECT USING (true);
CREATE POLICY suppliers_modify ON suppliers FOR ALL USING (
    get_user_role() IN ('admin', 'manager')
);

-- Purchase orders
CREATE POLICY purchase_orders_select ON purchase_orders FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY purchase_orders_modify ON purchase_orders FOR ALL USING (
    get_user_role() IN ('admin', 'manager') AND
    (station_id IN (SELECT get_user_stations()) OR is_admin())
);

-- PO items
CREATE POLICY po_items_select ON purchase_order_items FOR SELECT USING (
    po_id IN (
        SELECT po_id FROM purchase_orders
        WHERE station_id IN (SELECT get_user_stations())
    ) OR is_admin()
);
CREATE POLICY po_items_modify ON purchase_order_items FOR ALL USING (
    get_user_role() IN ('admin', 'manager')
);

-- Stock receipts
CREATE POLICY stock_receipts_select ON stock_receipts FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY stock_receipts_modify ON stock_receipts FOR ALL USING (
    get_user_role() IN ('admin', 'manager', 'supervisor') AND
    station_id IN (SELECT get_user_stations())
);

-- Receipt items
CREATE POLICY receipt_items_select ON stock_receipt_items FOR SELECT USING (
    receipt_id IN (
        SELECT receipt_id FROM stock_receipts
        WHERE station_id IN (SELECT get_user_stations())
    ) OR is_admin()
);
CREATE POLICY receipt_items_modify ON stock_receipt_items FOR ALL USING (
    get_user_role() IN ('admin', 'manager', 'supervisor')
);

-- Price history
CREATE POLICY price_history_select ON price_change_history FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY price_history_insert ON price_change_history FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'manager')
);

-- Daily summaries
CREATE POLICY daily_summaries_select ON daily_summaries FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY daily_summaries_modify ON daily_summaries FOR ALL USING (
    get_user_role() IN ('admin', 'manager', 'supervisor') AND
    station_id IN (SELECT get_user_stations())
);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sales_transactions_updated_at BEFORE UPDATE ON sales_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stock_receipts_updated_at BEFORE UPDATE ON stock_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_daily_summaries_updated_at BEFORE UPDATE ON daily_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- END OF TRANSACTIONS MIGRATION
-- =====================================================
