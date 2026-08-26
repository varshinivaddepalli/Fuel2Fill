-- =====================================================
-- PETRO ASTRA V1 - CLICK ASTRA (OCR Document Processing)
-- Table for storing OCR processed documents and AI responses
-- =====================================================

-- =====================================================
-- ENUM TYPE: Processing status for Click Astra records
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'click_astra_status') THEN
        CREATE TYPE click_astra_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'verified');
    END IF;
END
$$;

-- =====================================================
-- CLICK ASTRA TABLE
-- =====================================================

CREATE TABLE click_astra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,                          -- User-given name for the image/document
    image_name VARCHAR(255) NOT NULL,                    -- Original filename
    image_url TEXT NOT NULL,                             -- URL to Supabase storage
    date DATE NOT NULL DEFAULT CURRENT_DATE,             -- Date of the document
    extraction_columns JSONB,                            -- Columns/fields user wants to extract
    llm_instructions TEXT,                               -- Custom instructions for LLM
    ocr_extracted_data JSONB,                            -- Raw OCR output from Mistral
    ai_response JSONB,                                   -- Structured response from LLM
    processing_status click_astra_status NOT NULL DEFAULT 'pending',
    error_message TEXT,                                  -- Error message if processing failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_click_astra_client ON click_astra(client_id);
CREATE INDEX idx_click_astra_date ON click_astra(date);
CREATE INDEX idx_click_astra_status ON click_astra(processing_status);
CREATE INDEX idx_click_astra_client_date ON click_astra(client_id, date DESC);
CREATE INDEX idx_click_astra_created ON click_astra(created_at DESC);

-- =====================================================
-- TRIGGER: Update updated_at on modification
-- =====================================================

CREATE TRIGGER trg_click_astra_updated_at
    BEFORE UPDATE ON click_astra
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE click_astra ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users - restrict to own client's records
CREATE POLICY click_astra_select_authenticated ON click_astra
    FOR SELECT TO authenticated
    USING (
        client_id = (
            SELECT client_id FROM clients
            WHERE client_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY click_astra_insert_authenticated ON click_astra
    FOR INSERT TO authenticated
    WITH CHECK (
        client_id = (
            SELECT client_id FROM clients
            WHERE client_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY click_astra_update_authenticated ON click_astra
    FOR UPDATE TO authenticated
    USING (
        client_id = (
            SELECT client_id FROM clients
            WHERE client_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY click_astra_delete_authenticated ON click_astra
    FOR DELETE TO authenticated
    USING (
        client_id = (
            SELECT client_id FROM clients
            WHERE client_email = auth.jwt()->>'email'
        )
    );

-- =====================================================
-- STORAGE BUCKET: click-astra-images
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'click-astra-images',
    'click-astra-images',
    true,
    10485760,  -- 10MB limit (larger for documents)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload click astra images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'click-astra-images');

CREATE POLICY "Authenticated users can read click astra images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'click-astra-images');

CREATE POLICY "Authenticated users can update click astra images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'click-astra-images');

CREATE POLICY "Authenticated users can delete click astra images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'click-astra-images');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE click_astra IS 'OCR processed documents with AI-extracted data for Click Astra feature';
COMMENT ON COLUMN click_astra.name IS 'User-provided name/label for the document';
COMMENT ON COLUMN click_astra.image_name IS 'Original filename of the uploaded image/document';
COMMENT ON COLUMN click_astra.image_url IS 'URL to the image stored in Supabase storage';
COMMENT ON COLUMN click_astra.extraction_columns IS 'JSON array of column names user wants to extract from the document';
COMMENT ON COLUMN click_astra.llm_instructions IS 'Custom instructions provided by user for the LLM to process the OCR data';
COMMENT ON COLUMN click_astra.ocr_extracted_data IS 'Raw OCR output from Mistral OCR in JSON format';
COMMENT ON COLUMN click_astra.ai_response IS 'Structured response from LLM after processing OCR data';
COMMENT ON COLUMN click_astra.processing_status IS 'Current processing status: pending, processing, completed, failed, verified';
COMMENT ON COLUMN click_astra.error_message IS 'Error message if processing failed';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
