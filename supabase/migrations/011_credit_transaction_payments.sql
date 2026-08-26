-- =====================================================
-- PETRO ASTRA V1 - CREDIT TRANSACTION PAYMENT TRACKING
-- Links payments to specific transactions with partial payment support
-- =====================================================

-- =====================================================
-- ENUM TYPE: Payment Status
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
        CREATE TYPE payment_status_type AS ENUM ('unpaid', 'partially_paid', 'paid');
    END IF;
END
$$;

-- =====================================================
-- ADD COLUMNS TO credit_transactions
-- =====================================================

-- Add payment tracking columns to credit_transactions
ALTER TABLE credit_transactions
    ADD COLUMN IF NOT EXISTS payment_status payment_status_type NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- Add constraint to ensure amount_paid doesn't exceed net_amount
ALTER TABLE credit_transactions
    ADD CONSTRAINT chk_amount_paid_non_negative CHECK (amount_paid >= 0),
    ADD CONSTRAINT chk_amount_paid_not_exceeds_net CHECK (amount_paid <= net_amount);

-- Index for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_credit_txn_payment_status ON credit_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_credit_txn_unpaid ON credit_transactions(credit_customer_id, payment_status) WHERE payment_status != 'paid';

-- =====================================================
-- ADD COLUMN TO credit_payments
-- =====================================================

-- Add transaction_id to credit_payments to link payments to specific transactions
ALTER TABLE credit_payments
    ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES credit_transactions(transaction_id) ON DELETE SET NULL;

-- Index for finding payments linked to a transaction
CREATE INDEX IF NOT EXISTS idx_credit_payments_transaction ON credit_payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- =====================================================
-- TRIGGER FUNCTION: Update transaction payment status
-- Called after a payment is inserted/updated/deleted
-- =====================================================

CREATE OR REPLACE FUNCTION update_transaction_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(14, 2);
    v_net_amount DECIMAL(14, 2);
    v_new_status payment_status_type;
BEGIN
    -- Only process if transaction_id is set
    IF NEW.transaction_id IS NOT NULL THEN
        -- Get the total payments for this transaction
        SELECT COALESCE(SUM(payment_amount), 0)
        INTO v_total_paid
        FROM credit_payments
        WHERE transaction_id = NEW.transaction_id
          AND status = 'active';

        -- Get the transaction's net amount
        SELECT net_amount
        INTO v_net_amount
        FROM credit_transactions
        WHERE transaction_id = NEW.transaction_id;

        -- Determine payment status
        IF v_total_paid >= v_net_amount THEN
            v_new_status := 'paid';
        ELSIF v_total_paid > 0 THEN
            v_new_status := 'partially_paid';
        ELSE
            v_new_status := 'unpaid';
        END IF;

        -- Update the transaction
        UPDATE credit_transactions
        SET payment_status = v_new_status,
            amount_paid = LEAST(v_total_paid, v_net_amount),
            updated_at = NOW()
        WHERE transaction_id = NEW.transaction_id;
    END IF;

    -- Handle OLD transaction_id on UPDATE (if transaction changed)
    IF TG_OP = 'UPDATE' AND OLD.transaction_id IS NOT NULL AND OLD.transaction_id != NEW.transaction_id THEN
        -- Recalculate for the old transaction
        SELECT COALESCE(SUM(payment_amount), 0)
        INTO v_total_paid
        FROM credit_payments
        WHERE transaction_id = OLD.transaction_id
          AND status = 'active';

        SELECT net_amount
        INTO v_net_amount
        FROM credit_transactions
        WHERE transaction_id = OLD.transaction_id;

        IF v_net_amount IS NOT NULL THEN
            IF v_total_paid >= v_net_amount THEN
                v_new_status := 'paid';
            ELSIF v_total_paid > 0 THEN
                v_new_status := 'partially_paid';
            ELSE
                v_new_status := 'unpaid';
            END IF;

            UPDATE credit_transactions
            SET payment_status = v_new_status,
                amount_paid = LEAST(v_total_paid, v_net_amount),
                updated_at = NOW()
            WHERE transaction_id = OLD.transaction_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Handle payment deletion
-- =====================================================

CREATE OR REPLACE FUNCTION update_transaction_on_payment_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(14, 2);
    v_net_amount DECIMAL(14, 2);
    v_new_status payment_status_type;
BEGIN
    -- Only process if transaction_id was set
    IF OLD.transaction_id IS NOT NULL THEN
        -- Get the total remaining payments for this transaction
        SELECT COALESCE(SUM(payment_amount), 0)
        INTO v_total_paid
        FROM credit_payments
        WHERE transaction_id = OLD.transaction_id
          AND status = 'active'
          AND payment_id != OLD.payment_id;

        -- Get the transaction's net amount
        SELECT net_amount
        INTO v_net_amount
        FROM credit_transactions
        WHERE transaction_id = OLD.transaction_id;

        IF v_net_amount IS NOT NULL THEN
            -- Determine payment status
            IF v_total_paid >= v_net_amount THEN
                v_new_status := 'paid';
            ELSIF v_total_paid > 0 THEN
                v_new_status := 'partially_paid';
            ELSE
                v_new_status := 'unpaid';
            END IF;

            -- Update the transaction
            UPDATE credit_transactions
            SET payment_status = v_new_status,
                amount_paid = LEAST(v_total_paid, v_net_amount),
                updated_at = NOW()
            WHERE transaction_id = OLD.transaction_id;
        END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update transaction payment status after payment insert/update
CREATE TRIGGER trg_payment_update_txn_status
    AFTER INSERT OR UPDATE ON credit_payments
    FOR EACH ROW EXECUTE FUNCTION update_transaction_payment_status();

-- Update transaction payment status after payment delete
CREATE TRIGGER trg_payment_delete_update_txn_status
    BEFORE DELETE ON credit_payments
    FOR EACH ROW EXECUTE FUNCTION update_transaction_on_payment_delete();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN credit_transactions.payment_status IS 'Payment status: unpaid, partially_paid, paid';
COMMENT ON COLUMN credit_transactions.amount_paid IS 'Total amount paid against this transaction';
COMMENT ON COLUMN credit_payments.transaction_id IS 'Links this payment to a specific credit transaction (optional)';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
