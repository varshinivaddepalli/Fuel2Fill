-- =====================================================
-- PETRO ASTRA V1 - CLICK ASTRA RLS FIX
-- Fix overly permissive RLS policies to restrict access to own records
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS click_astra_select_authenticated ON click_astra;
DROP POLICY IF EXISTS click_astra_insert_authenticated ON click_astra;
DROP POLICY IF EXISTS click_astra_update_authenticated ON click_astra;
DROP POLICY IF EXISTS click_astra_delete_authenticated ON click_astra;

-- Create secure policies - restrict to own client's records
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
-- END OF MIGRATION
-- =====================================================
