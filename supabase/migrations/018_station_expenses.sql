-- =====================================================
-- PETRO ASTRA V1 - STATION EXPENSES
-- Tracks station-level expenses (maintenance, utilities, rent, etc.)
-- =====================================================

-- =====================================================
-- STATION EXPENSES TABLE
-- =====================================================

CREATE TABLE station_expenses (
    expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    approved_by UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    expense_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    vendor_name VARCHAR(255),
    description TEXT,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_expense_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_expense_category CHECK (category IN (
        'maintenance', 'utilities', 'rent', 'insurance', 'marketing',
        'office_supplies', 'transportation', 'professional_fees', 'taxes', 'other'
    )),
    CONSTRAINT chk_expense_payment_method CHECK (payment_method IN (
        'cash', 'upi', 'card', 'credit', 'bank_transfer'
    ))
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_station_expenses_station_date ON station_expenses(station_id, expense_date);
CREATE INDEX idx_station_expenses_approved_by ON station_expenses(approved_by);
CREATE INDEX idx_station_expenses_category ON station_expenses(category);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE TRIGGER trg_station_expenses_updated_at
    BEFORE UPDATE ON station_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE station_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY station_expenses_select_authenticated ON station_expenses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY station_expenses_insert_authenticated ON station_expenses
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY station_expenses_update_authenticated ON station_expenses
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY station_expenses_delete_authenticated ON station_expenses
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE station_expenses IS 'Station-level expense records (maintenance, utilities, rent, etc.)';
COMMENT ON COLUMN station_expenses.approved_by IS 'References employees.employee_id - employee who approved the expense';
COMMENT ON COLUMN station_expenses.category IS 'Expense category: maintenance, utilities, rent, insurance, marketing, office_supplies, transportation, professional_fees, taxes, other';
COMMENT ON COLUMN station_expenses.amount IS 'Expense amount in INR';
COMMENT ON COLUMN station_expenses.payment_method IS 'Payment method: cash, upi, card, credit, bank_transfer';
COMMENT ON COLUMN station_expenses.vendor_name IS 'Optional vendor/supplier name';
COMMENT ON COLUMN station_expenses.description IS 'Optional description or notes about the expense';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
