-- =====================================================
-- PETRO ASTRA V1 - SETTLEMENTS
-- Records movement of funds between payment methods
-- (e.g., cash to bank, UPI to bank, bank to bank)
-- =====================================================

-- =====================================================
-- SETTLEMENTS TABLE
-- =====================================================

CREATE TABLE settlements (
    settlement_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
    station_id          UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    settlement_date     DATE NOT NULL,
    from_method         VARCHAR(20) NOT NULL,
    to_method           VARCHAR(20) NOT NULL,
    from_bank_account_id UUID REFERENCES client_bank_accounts(bank_account_id) ON DELETE RESTRICT,
    to_bank_account_id   UUID REFERENCES client_bank_accounts(bank_account_id) ON DELETE RESTRICT,
    amount              DECIMAL(14,2) NOT NULL,
    reference_number    VARCHAR(100),
    notes               TEXT,
    status              status_type NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_settlement_amount CHECK (amount > 0),
    CONSTRAINT chk_settlement_from_method CHECK (from_method IN ('cash','upi','card','bank')),
    CONSTRAINT chk_settlement_to_method CHECK (to_method IN ('cash','upi','card','bank')),
    CONSTRAINT chk_settlement_not_same CHECK (
        (from_method != to_method) OR
        (from_method = 'bank' AND to_method = 'bank' AND from_bank_account_id IS DISTINCT FROM to_bank_account_id)
    ),
    CONSTRAINT chk_settlement_from_bank CHECK (
        (from_method = 'bank' AND from_bank_account_id IS NOT NULL) OR (from_method != 'bank')
    ),
    CONSTRAINT chk_settlement_to_bank CHECK (
        (to_method = 'bank' AND to_bank_account_id IS NOT NULL) OR (to_method != 'bank')
    )
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_settlements_station_date ON settlements(station_id, settlement_date);
CREATE INDEX idx_settlements_client ON settlements(client_id);
CREATE INDEX idx_settlements_from_bank ON settlements(from_bank_account_id) WHERE from_bank_account_id IS NOT NULL;
CREATE INDEX idx_settlements_to_bank ON settlements(to_bank_account_id) WHERE to_bank_account_id IS NOT NULL;

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE TRIGGER trg_settlements_updated_at
    BEFORE UPDATE ON settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- TRIGGER: Update bank balance on INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION settlement_update_bank_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to destination bank account
    IF NEW.to_method = 'bank' AND NEW.to_bank_account_id IS NOT NULL THEN
        UPDATE client_bank_accounts
        SET current_balance = current_balance + NEW.amount
        WHERE bank_account_id = NEW.to_bank_account_id;
    END IF;

    -- Subtract from source bank account
    IF NEW.from_method = 'bank' AND NEW.from_bank_account_id IS NOT NULL THEN
        UPDATE client_bank_accounts
        SET current_balance = current_balance - NEW.amount
        WHERE bank_account_id = NEW.from_bank_account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_settlement_balance_insert
    AFTER INSERT ON settlements
    FOR EACH ROW EXECUTE FUNCTION settlement_update_bank_balance();

-- =====================================================
-- TRIGGER: Reverse bank balance on DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION settlement_reverse_bank_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Reverse: subtract from destination bank account
    IF OLD.to_method = 'bank' AND OLD.to_bank_account_id IS NOT NULL THEN
        UPDATE client_bank_accounts
        SET current_balance = current_balance - OLD.amount
        WHERE bank_account_id = OLD.to_bank_account_id;
    END IF;

    -- Reverse: add back to source bank account
    IF OLD.from_method = 'bank' AND OLD.from_bank_account_id IS NOT NULL THEN
        UPDATE client_bank_accounts
        SET current_balance = current_balance + OLD.amount
        WHERE bank_account_id = OLD.from_bank_account_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_settlement_balance_delete
    AFTER DELETE ON settlements
    FOR EACH ROW EXECUTE FUNCTION settlement_reverse_bank_balance();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY settlements_select_authenticated ON settlements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY settlements_insert_authenticated ON settlements
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY settlements_update_authenticated ON settlements
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY settlements_delete_authenticated ON settlements
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE settlements IS 'Settlement transaction logs recording movement of funds between payment methods (cash, UPI, card, bank)';
COMMENT ON COLUMN settlements.from_method IS 'Source payment method: cash, upi, card, bank';
COMMENT ON COLUMN settlements.to_method IS 'Destination payment method: cash, upi, card, bank';
COMMENT ON COLUMN settlements.from_bank_account_id IS 'Source bank account (required when from_method is bank)';
COMMENT ON COLUMN settlements.to_bank_account_id IS 'Destination bank account (required when to_method is bank)';
COMMENT ON COLUMN settlements.amount IS 'Settlement amount in INR';
COMMENT ON COLUMN settlements.reference_number IS 'Optional transaction reference number';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
