-- =====================================================
-- PETRO ASTRA V1 - CLIENT BANK ACCOUNTS
-- =====================================================

-- =====================================================
-- ENUM
-- =====================================================

DO $$ BEGIN
  CREATE TYPE bank_account_type AS ENUM ('personal', 'company');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CLIENT BANK ACCOUNTS TABLE
-- =====================================================

CREATE TABLE client_bank_accounts (
    bank_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
    account_type bank_account_type NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_number_last4 VARCHAR(4) NOT NULL CHECK (account_number_last4 ~ '^\d{4}$'),
    bank_name VARCHAR(100) NOT NULL,
    branch VARCHAR(255),
    current_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
    company_name VARCHAR(255),
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_company_name CHECK (account_type = 'personal' OR company_name IS NOT NULL),
    CONSTRAINT uq_client_account_name UNIQUE (client_id, account_name)
);

CREATE INDEX idx_bank_accounts_client ON client_bank_accounts(client_id);
CREATE INDEX idx_bank_accounts_status ON client_bank_accounts(status);
CREATE INDEX idx_bank_accounts_bank_name ON client_bank_accounts(bank_name);
CREATE INDEX idx_bank_accounts_account_type ON client_bank_accounts(account_type);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE TRIGGER trg_bank_accounts_updated_at
    BEFORE UPDATE ON client_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE client_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_accounts_select_authenticated ON client_bank_accounts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY bank_accounts_insert_authenticated ON client_bank_accounts
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY bank_accounts_update_authenticated ON client_bank_accounts
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY bank_accounts_delete_authenticated ON client_bank_accounts
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
