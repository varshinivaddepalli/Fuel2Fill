-- =====================================================
-- PETRO ASTRA V1 - FUEL TYPES, TANKS, PUMPS, NOZZLES
-- =====================================================

-- =====================================================
-- FUEL TYPES TABLE
-- Station-specific fuel types with pricing
-- =====================================================

CREATE TABLE fuel_types (
    fueltype_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    fueltype_name VARCHAR(100) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'liters',
    fueltype_price DECIMAL(10, 2) NOT NULL,
    hsn_code VARCHAR(20),
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_fueltype_price CHECK (fueltype_price >= 0),
    CONSTRAINT uq_station_fueltype UNIQUE (station_id, fueltype_name)
);

CREATE INDEX idx_fuel_types_station ON fuel_types(station_id);
CREATE INDEX idx_fuel_types_status ON fuel_types(status);
CREATE INDEX idx_fuel_types_name ON fuel_types(fueltype_name);

-- =====================================================
-- TANKS TABLE
-- Fuel storage tanks at stations
-- =====================================================

CREATE TABLE tanks (
    tank_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT,
    tank_capacity DECIMAL(10, 2) NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_tank_capacity CHECK (tank_capacity > 0)
);

CREATE INDEX idx_tanks_station ON tanks(station_id);
CREATE INDEX idx_tanks_fueltype ON tanks(fueltype_id);
CREATE INDEX idx_tanks_status ON tanks(status);

-- =====================================================
-- PUMPS TABLE
-- Fuel dispensing pumps at stations
-- =====================================================

CREATE TABLE pumps (
    pump_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    pump_type VARCHAR(50) NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_pump_type CHECK (pump_type IN ('single', 'dual', 'triple'))
);

CREATE INDEX idx_pumps_station ON pumps(station_id);
CREATE INDEX idx_pumps_status ON pumps(status);
CREATE INDEX idx_pumps_type ON pumps(pump_type);

-- =====================================================
-- NOZZLES TABLE
-- Individual nozzles on pumps, connected to tanks
-- =====================================================

CREATE TABLE nozzles (
    nozzle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    pump_id UUID NOT NULL REFERENCES pumps(pump_id) ON DELETE CASCADE,
    tank_id UUID NOT NULL REFERENCES tanks(tank_id) ON DELETE RESTRICT,
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nozzles_station ON nozzles(station_id);
CREATE INDEX idx_nozzles_pump ON nozzles(pump_id);
CREATE INDEX idx_nozzles_tank ON nozzles(tank_id);
CREATE INDEX idx_nozzles_fueltype ON nozzles(fueltype_id);
CREATE INDEX idx_nozzles_status ON nozzles(status);

-- =====================================================
-- TRIGGERS: Auto-update updated_at
-- =====================================================

CREATE TRIGGER trg_fuel_types_updated_at
    BEFORE UPDATE ON fuel_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tanks_updated_at
    BEFORE UPDATE ON tanks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pumps_updated_at
    BEFORE UPDATE ON pumps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_nozzles_updated_at
    BEFORE UPDATE ON nozzles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE nozzles ENABLE ROW LEVEL SECURITY;

-- Fuel Types Policies
CREATE POLICY fuel_types_select_authenticated ON fuel_types
    FOR SELECT TO authenticated USING (true);

CREATE POLICY fuel_types_insert_authenticated ON fuel_types
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY fuel_types_update_authenticated ON fuel_types
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY fuel_types_delete_authenticated ON fuel_types
    FOR DELETE TO authenticated USING (true);

-- Tanks Policies
CREATE POLICY tanks_select_authenticated ON tanks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY tanks_insert_authenticated ON tanks
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY tanks_update_authenticated ON tanks
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY tanks_delete_authenticated ON tanks
    FOR DELETE TO authenticated USING (true);

-- Pumps Policies
CREATE POLICY pumps_select_authenticated ON pumps
    FOR SELECT TO authenticated USING (true);

CREATE POLICY pumps_insert_authenticated ON pumps
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY pumps_update_authenticated ON pumps
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY pumps_delete_authenticated ON pumps
    FOR DELETE TO authenticated USING (true);

-- Nozzles Policies
CREATE POLICY nozzles_select_authenticated ON nozzles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY nozzles_insert_authenticated ON nozzles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY nozzles_update_authenticated ON nozzles
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY nozzles_delete_authenticated ON nozzles
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
