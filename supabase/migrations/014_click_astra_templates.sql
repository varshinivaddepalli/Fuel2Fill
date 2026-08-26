-- =====================================================
-- PETRO ASTRA V1 - CLICK ASTRA TEMPLATES
-- Saved templates for extraction columns
-- =====================================================

-- =====================================================
-- CLICK ASTRA TEMPLATES TABLE
-- =====================================================

CREATE TABLE click_astra_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    extraction_columns JSONB NOT NULL DEFAULT '[]',
    llm_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_click_astra_templates_client ON click_astra_templates(client_id);
CREATE UNIQUE INDEX idx_click_astra_templates_client_name ON click_astra_templates(client_id, name);

-- =====================================================
-- TRIGGER: Update updated_at on modification
-- =====================================================

CREATE TRIGGER trg_click_astra_templates_updated_at
    BEFORE UPDATE ON click_astra_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE click_astra_templates ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users - restrict to own client's records
CREATE POLICY click_astra_templates_select_authenticated ON click_astra_templates
    FOR SELECT TO authenticated
    USING (
        client_id = (
            SELECT client_id FROM clients
            WHERE client_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY click_astra_templates_insert_authenticated ON click_astra_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        client_id = (
            SELECT client_id FROM clients
            WHERE client_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY click_astra_templates_update_authenticated ON click_astra_templates
    FOR UPDATE TO authenticated
    USING (
        client_id = (
            SELECT client_id FROM clients
            WHERE client_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY click_astra_templates_delete_authenticated ON click_astra_templates
    FOR DELETE TO authenticated
    USING (
        client_id = (
            SELECT client_id FROM clients
            WHERE client_email = auth.jwt()->>'email'
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE click_astra_templates IS 'Saved templates for Click Astra extraction columns';
COMMENT ON COLUMN click_astra_templates.name IS 'User-given name for the template';
COMMENT ON COLUMN click_astra_templates.extraction_columns IS 'JSON array of column names to extract';
COMMENT ON COLUMN click_astra_templates.llm_instructions IS 'Default LLM instructions for this template';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
