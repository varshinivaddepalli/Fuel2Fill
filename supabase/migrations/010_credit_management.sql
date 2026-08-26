-- =====================================================
-- PETRO ASTRA V1 - CREDIT MANAGEMENT
-- Credit customers, vehicles, transactions, and payments
-- =====================================================

-- =====================================================
-- ENUM TYPES (using defensive DO blocks)
-- =====================================================

-- Credit limit type: either amount (rupees) or quantity (liters)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_limit_type') THEN
        CREATE TYPE credit_limit_type AS ENUM ('amount', 'quantity');
    END IF;
END
$$;

-- Discount type: either fixed amount per liter or percentage
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
        CREATE TYPE discount_type AS ENUM ('amount', 'percentage');
    END IF;
END
$$;

-- =====================================================
-- CREDIT CUSTOMERS TABLE
-- =====================================================

CREATE TABLE credit_customers (
    credit_customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    gst_number VARCHAR(15),
    phone VARCHAR(15) NOT NULL,
    alt_phone VARCHAR(15),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(6),
    credit_limit_type credit_limit_type NOT NULL,
    credit_limit_value DECIMAL(14, 2) NOT NULL,
    discount_type discount_type,
    discount_value DECIMAL(10, 2),
    current_balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
    registered_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_credit_limit_positive CHECK (credit_limit_value > 0),
    CONSTRAINT chk_discount_value_non_negative CHECK (discount_value IS NULL OR discount_value >= 0),
    CONSTRAINT chk_discount_consistency CHECK (
        (discount_type IS NULL AND discount_value IS NULL) OR
        (discount_type IS NOT NULL AND discount_value IS NOT NULL)
    ),
    CONSTRAINT chk_discount_percentage_range CHECK (
        discount_type IS NULL
        OR discount_type = 'amount'
        OR (discount_type = 'percentage' AND discount_value <= 100)
    ),
    CONSTRAINT chk_pincode_format CHECK (pincode IS NULL OR pincode ~ '^\d{6}$'),
    CONSTRAINT chk_phone_format CHECK (phone ~ '^\d{10,15}$'),
    CONSTRAINT chk_alt_phone_format CHECK (alt_phone IS NULL OR alt_phone ~ '^\d{10,15}$'),
    CONSTRAINT chk_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_gst_format CHECK (
        gst_number IS NULL OR
        gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    ),
    -- GST unique per station (same business can be customer at multiple stations)
    CONSTRAINT uq_credit_customer_station_gst UNIQUE (station_id, gst_number)
);

-- Indexes
CREATE INDEX idx_credit_customers_station ON credit_customers(station_id);
CREATE INDEX idx_credit_customers_status ON credit_customers(status);
CREATE INDEX idx_credit_customers_name ON credit_customers(customer_name);
CREATE INDEX idx_credit_customers_gst ON credit_customers(gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX idx_credit_customers_balance ON credit_customers(current_balance);
CREATE INDEX idx_credit_customers_phone ON credit_customers(phone);

-- =====================================================
-- CREDIT CUSTOMER VEHICLES TABLE
-- =====================================================

CREATE TABLE credit_customer_vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_customer_id UUID NOT NULL REFERENCES credit_customers(credit_customer_id) ON DELETE CASCADE,
    vehicle_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50),
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints (permissive regex for various Indian vehicle formats)
    CONSTRAINT chk_vehicle_number_format CHECK (
        -- Allow alphanumeric, 4-15 chars after removing hyphens/spaces
        REPLACE(REPLACE(vehicle_number, '-', ''), ' ', '') ~ '^[A-Z0-9]{4,15}$'
    ),
    CONSTRAINT uq_customer_vehicle UNIQUE (credit_customer_id, vehicle_number)
);

-- Indexes
CREATE INDEX idx_credit_vehicles_customer ON credit_customer_vehicles(credit_customer_id);
CREATE INDEX idx_credit_vehicles_number ON credit_customer_vehicles(vehicle_number);
CREATE INDEX idx_credit_vehicles_status ON credit_customer_vehicles(status);

-- =====================================================
-- CREDIT TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE credit_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_customer_id UUID NOT NULL REFERENCES credit_customers(credit_customer_id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE RESTRICT,
    sale_record_id UUID REFERENCES daily_sale_records(sale_record_id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES credit_customer_vehicles(vehicle_id) ON DELETE SET NULL,
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    transaction_date DATE NOT NULL,
    fuel_quantity DECIMAL(12, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_applied DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gross_amount DECIMAL(14, 2) NOT NULL,
    net_amount DECIMAL(14, 2) NOT NULL,
    running_balance DECIMAL(14, 2) NOT NULL,
    notes TEXT,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_fuel_quantity_positive CHECK (fuel_quantity > 0),
    CONSTRAINT chk_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT chk_discount_non_negative CHECK (discount_applied >= 0),
    CONSTRAINT chk_gross_amount_positive CHECK (gross_amount > 0),
    CONSTRAINT chk_net_amount_positive CHECK (net_amount > 0)
);

-- Indexes
CREATE INDEX idx_credit_txn_customer ON credit_transactions(credit_customer_id);
CREATE INDEX idx_credit_txn_station ON credit_transactions(station_id);
CREATE INDEX idx_credit_txn_sale_record ON credit_transactions(sale_record_id) WHERE sale_record_id IS NOT NULL;
CREATE INDEX idx_credit_txn_vehicle ON credit_transactions(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX idx_credit_txn_fueltype ON credit_transactions(fueltype_id);
CREATE INDEX idx_credit_txn_employee ON credit_transactions(employee_id);
CREATE INDEX idx_credit_txn_date ON credit_transactions(transaction_date);
CREATE INDEX idx_credit_txn_status ON credit_transactions(status);
CREATE INDEX idx_credit_txn_customer_date ON credit_transactions(credit_customer_id, transaction_date DESC);
CREATE INDEX idx_credit_txn_station_customer ON credit_transactions(station_id, credit_customer_id);

-- =====================================================
-- CREDIT PAYMENTS TABLE
-- =====================================================

CREATE TABLE credit_payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_customer_id UUID NOT NULL REFERENCES credit_customers(credit_customer_id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(14, 2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL,
    reference_number VARCHAR(100),
    balance_before DECIMAL(14, 2) NOT NULL,
    balance_after DECIMAL(14, 2) NOT NULL,
    notes TEXT,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_payment_amount_positive CHECK (payment_amount > 0),
    CONSTRAINT chk_payment_mode_valid CHECK (
        payment_mode IN ('cash', 'upi', 'card', 'cheque', 'bank_transfer')
    )
);

-- Indexes
CREATE INDEX idx_credit_payments_customer ON credit_payments(credit_customer_id);
CREATE INDEX idx_credit_payments_station ON credit_payments(station_id);
CREATE INDEX idx_credit_payments_employee ON credit_payments(employee_id);
CREATE INDEX idx_credit_payments_date ON credit_payments(payment_date);
CREATE INDEX idx_credit_payments_status ON credit_payments(status);
CREATE INDEX idx_credit_payments_customer_date ON credit_payments(credit_customer_id, payment_date DESC);
CREATE INDEX idx_credit_payments_station_customer ON credit_payments(station_id, credit_customer_id);

-- =====================================================
-- TRIGGER FUNCTION: Compute credit transaction amounts
-- Uses FOR UPDATE to prevent race conditions
-- =====================================================

CREATE OR REPLACE FUNCTION compute_credit_transaction_amounts()
RETURNS TRIGGER AS $$
DECLARE
    v_discount_type discount_type;
    v_discount_value DECIMAL(10, 2);
    v_current_balance DECIMAL(14, 2);
BEGIN
    -- Calculate gross amount
    NEW.gross_amount := NEW.fuel_quantity * NEW.unit_price;

    -- Lock the customer row and get discount settings to prevent race conditions
    SELECT discount_type, discount_value, current_balance
    INTO v_discount_type, v_discount_value, v_current_balance
    FROM credit_customers
    WHERE credit_customer_id = NEW.credit_customer_id
    FOR UPDATE;

    -- Calculate discount if applicable
    IF v_discount_type IS NOT NULL AND v_discount_value IS NOT NULL THEN
        IF v_discount_type = 'amount' THEN
            -- Fixed discount per liter
            NEW.discount_applied := NEW.fuel_quantity * v_discount_value;
        ELSE
            -- Percentage discount
            NEW.discount_applied := NEW.gross_amount * (v_discount_value / 100);
        END IF;
    ELSE
        NEW.discount_applied := 0;
    END IF;

    -- Calculate net amount
    NEW.net_amount := NEW.gross_amount - NEW.discount_applied;

    -- Calculate running balance (existing balance + new transaction amount)
    -- For UPDATE, we need to account for the old transaction amount
    IF TG_OP = 'UPDATE' THEN
        NEW.running_balance := v_current_balance - OLD.net_amount + NEW.net_amount;
    ELSE
        NEW.running_balance := v_current_balance + NEW.net_amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Update customer balance on transaction
-- =====================================================

CREATE OR REPLACE FUNCTION update_customer_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add transaction amount to balance
        UPDATE credit_customers
        SET current_balance = current_balance + NEW.net_amount,
            updated_at = NOW()
        WHERE credit_customer_id = NEW.credit_customer_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust balance for the difference
        UPDATE credit_customers
        SET current_balance = current_balance - OLD.net_amount + NEW.net_amount,
            updated_at = NOW()
        WHERE credit_customer_id = NEW.credit_customer_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Subtract transaction amount from balance
        UPDATE credit_customers
        SET current_balance = current_balance - OLD.net_amount,
            updated_at = NOW()
        WHERE credit_customer_id = OLD.credit_customer_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Compute payment balance fields
-- Uses FOR UPDATE to prevent race conditions
-- =====================================================

CREATE OR REPLACE FUNCTION compute_credit_payment_balances()
RETURNS TRIGGER AS $$
DECLARE
    v_current_balance DECIMAL(14, 2);
BEGIN
    -- Lock the customer row and get current balance to prevent race conditions
    SELECT current_balance
    INTO v_current_balance
    FROM credit_customers
    WHERE credit_customer_id = NEW.credit_customer_id
    FOR UPDATE;

    -- For UPDATE, we need to account for the old payment amount
    IF TG_OP = 'UPDATE' THEN
        -- Restore the old payment amount to get the correct "before" state
        v_current_balance := v_current_balance + OLD.payment_amount;
    END IF;

    -- Set balance before
    NEW.balance_before := v_current_balance;

    -- Set balance after (payment reduces the balance)
    NEW.balance_after := v_current_balance - NEW.payment_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Update customer balance on payment
-- =====================================================

CREATE OR REPLACE FUNCTION update_customer_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Subtract payment from balance
        UPDATE credit_customers
        SET current_balance = current_balance - NEW.payment_amount,
            updated_at = NOW()
        WHERE credit_customer_id = NEW.credit_customer_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust balance for the difference
        UPDATE credit_customers
        SET current_balance = current_balance + OLD.payment_amount - NEW.payment_amount,
            updated_at = NOW()
        WHERE credit_customer_id = NEW.credit_customer_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Add payment back to balance
        UPDATE credit_customers
        SET current_balance = current_balance + OLD.payment_amount,
            updated_at = NOW()
        WHERE credit_customer_id = OLD.credit_customer_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Credit Customers: updated_at trigger
CREATE TRIGGER trg_credit_customers_updated_at
    BEFORE UPDATE ON credit_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Credit Customer Vehicles: updated_at trigger
CREATE TRIGGER trg_credit_vehicles_updated_at
    BEFORE UPDATE ON credit_customer_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Credit Transactions: compute amounts before insert/update
CREATE TRIGGER trg_credit_txn_compute_amounts
    BEFORE INSERT OR UPDATE ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION compute_credit_transaction_amounts();

-- Credit Transactions: update customer balance after insert/update/delete
CREATE TRIGGER trg_credit_txn_update_balance
    AFTER INSERT OR UPDATE OR DELETE ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION update_customer_balance_on_transaction();

-- Credit Transactions: updated_at trigger
CREATE TRIGGER trg_credit_txn_updated_at
    BEFORE UPDATE ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Credit Payments: compute balances before insert/update
CREATE TRIGGER trg_credit_payment_compute_balances
    BEFORE INSERT OR UPDATE ON credit_payments
    FOR EACH ROW EXECUTE FUNCTION compute_credit_payment_balances();

-- Credit Payments: update customer balance after insert/update/delete
CREATE TRIGGER trg_credit_payment_update_balance
    AFTER INSERT OR UPDATE OR DELETE ON credit_payments
    FOR EACH ROW EXECUTE FUNCTION update_customer_balance_on_payment();

-- Credit Payments: updated_at trigger
CREATE TRIGGER trg_credit_payments_updated_at
    BEFORE UPDATE ON credit_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE credit_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

-- Credit Customers Policies
CREATE POLICY credit_customers_select_authenticated ON credit_customers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY credit_customers_insert_authenticated ON credit_customers
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY credit_customers_update_authenticated ON credit_customers
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY credit_customers_delete_authenticated ON credit_customers
    FOR DELETE TO authenticated USING (true);

-- Credit Customer Vehicles Policies
CREATE POLICY credit_vehicles_select_authenticated ON credit_customer_vehicles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY credit_vehicles_insert_authenticated ON credit_customer_vehicles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY credit_vehicles_update_authenticated ON credit_customer_vehicles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY credit_vehicles_delete_authenticated ON credit_customer_vehicles
    FOR DELETE TO authenticated USING (true);

-- Credit Transactions Policies
CREATE POLICY credit_txn_select_authenticated ON credit_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY credit_txn_insert_authenticated ON credit_transactions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY credit_txn_update_authenticated ON credit_transactions
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY credit_txn_delete_authenticated ON credit_transactions
    FOR DELETE TO authenticated USING (true);

-- Credit Payments Policies
CREATE POLICY credit_payments_select_authenticated ON credit_payments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY credit_payments_insert_authenticated ON credit_payments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY credit_payments_update_authenticated ON credit_payments
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY credit_payments_delete_authenticated ON credit_payments
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE credit_customers IS 'Credit customers who can purchase fuel on credit at a station';
COMMENT ON COLUMN credit_customers.credit_limit_type IS 'Type of credit limit: amount (rupees) or quantity (liters)';
COMMENT ON COLUMN credit_customers.credit_limit_value IS 'Maximum credit allowed (in rupees or liters based on type)';
COMMENT ON COLUMN credit_customers.discount_type IS 'Type of discount: amount (per liter) or percentage';
COMMENT ON COLUMN credit_customers.discount_value IS 'Discount value (rupees per liter or percentage, max 100 for percentage)';
COMMENT ON COLUMN credit_customers.current_balance IS 'Outstanding credit balance (positive = customer owes money)';

COMMENT ON TABLE credit_customer_vehicles IS 'Vehicles registered under credit customers for tracking';
COMMENT ON COLUMN credit_customer_vehicles.vehicle_number IS 'Indian vehicle registration number (e.g., MH12AB1234, 22BH1234AA)';

COMMENT ON TABLE credit_transactions IS 'Credit fuel purchases by customers';
COMMENT ON COLUMN credit_transactions.sale_record_id IS 'Links to daily_sale_records.credit_sales amount';
COMMENT ON COLUMN credit_transactions.gross_amount IS 'Computed: fuel_quantity * unit_price';
COMMENT ON COLUMN credit_transactions.net_amount IS 'Computed: gross_amount - discount_applied';
COMMENT ON COLUMN credit_transactions.running_balance IS 'Customer balance after this transaction';

COMMENT ON TABLE credit_payments IS 'Payments received from credit customers';
COMMENT ON COLUMN credit_payments.payment_mode IS 'Payment method: cash, upi, card, cheque, bank_transfer';
COMMENT ON COLUMN credit_payments.balance_before IS 'Customer balance before this payment';
COMMENT ON COLUMN credit_payments.balance_after IS 'Customer balance after this payment';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
