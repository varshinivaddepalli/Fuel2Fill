-- =====================================================
-- PETRO ASTRA V1 - CLIENTS & STATIONS SCHEMA
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_type') THEN
        CREATE TYPE status_type AS ENUM ('active', 'inactive', 'suspended', 'deleted');
    END IF;
END
$$;

-- =====================================================
-- CLIENTS TABLE
-- =====================================================

CREATE TABLE clients (
    client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(15) NOT NULL,
    client_pan VARCHAR(10) UNIQUE,
    client_aadhaar VARCHAR(12) UNIQUE,
    -- Address decomposed for normalization
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(6),
    status status_type NOT NULL DEFAULT 'active',
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_client_pan CHECK (client_pan IS NULL OR client_pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
    CONSTRAINT chk_client_aadhaar CHECK (client_aadhaar IS NULL OR client_aadhaar ~ '^[0-9]{12}$'),
    CONSTRAINT chk_client_phone CHECK (client_phone ~ '^[0-9]{10,15}$'),
    CONSTRAINT chk_client_pincode CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$')
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_phone ON clients(client_phone);
CREATE INDEX idx_clients_name ON clients(client_name);

-- =====================================================
-- STATIONS TABLE
-- =====================================================

CREATE TABLE stations (
    station_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
    station_name VARCHAR(255) NOT NULL,
    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(6) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    station_phone VARCHAR(15) NOT NULL,
    station_sap_code VARCHAR(50) UNIQUE NOT NULL,
    station_gst_number VARCHAR(15) UNIQUE NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    opening_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_station_gst CHECK (station_gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
    CONSTRAINT chk_station_pincode CHECK (pincode ~ '^[0-9]{6}$'),
    CONSTRAINT chk_station_phone CHECK (station_phone ~ '^[0-9]{10,15}$')
);

CREATE INDEX idx_stations_client ON stations(client_id);
CREATE INDEX idx_stations_status ON stations(status);
CREATE INDEX idx_stations_city ON stations(city);
CREATE INDEX idx_stations_state ON stations(state);
CREATE INDEX idx_stations_name ON stations(station_name);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_stations_updated_at
    BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all clients and stations
CREATE POLICY clients_select_authenticated ON clients
    FOR SELECT TO authenticated USING (true);

CREATE POLICY stations_select_authenticated ON stations
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete (adjust as needed)
CREATE POLICY clients_insert_authenticated ON clients
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY clients_update_authenticated ON clients
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY clients_delete_authenticated ON clients
    FOR DELETE TO authenticated USING (true);

CREATE POLICY stations_insert_authenticated ON stations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY stations_update_authenticated ON stations
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY stations_delete_authenticated ON stations
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
