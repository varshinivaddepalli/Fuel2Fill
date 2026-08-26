-- =====================================================
-- PETRO ASTRA V1 - DATABASE SCHEMA
-- Supabase/PostgreSQL Migration
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geolocation (optional)

-- =====================================================
-- ENUMS (for type safety and consistency)
-- =====================================================

CREATE TYPE status_type AS ENUM ('active', 'inactive', 'suspended', 'deleted');
CREATE TYPE pump_type AS ENUM ('single', 'dual', 'triple');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'temporary');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'leave', 'holiday');
CREATE TYPE payment_mode AS ENUM ('cash', 'bank_transfer', 'cheque', 'upi');
CREATE TYPE unit_of_measure AS ENUM ('litre', 'kg', 'piece', 'unit');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'supervisor', 'employee');

-- =====================================================
-- USERS TABLE (for system access)
-- =====================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- Links to Supabase auth.users
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(15) UNIQUE,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth_id ON users(auth_id);

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

-- =====================================================
-- STATIONS TABLE
-- =====================================================

CREATE TABLE stations (
    station_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
    station_name VARCHAR(255) NOT NULL,
    -- Address properly decomposed
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
    CONSTRAINT chk_station_pincode CHECK (pincode ~ '^[0-9]{6}$')
);

CREATE INDEX idx_stations_client ON stations(client_id);
CREATE INDEX idx_stations_status ON stations(status);
CREATE INDEX idx_stations_city ON stations(city);
CREATE INDEX idx_stations_state ON stations(state);

-- =====================================================
-- FUEL TYPES TABLE (Global - not per station)
-- =====================================================

CREATE TABLE fuel_types (
    fueltype_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fueltype_name VARCHAR(100) NOT NULL UNIQUE,
    fueltype_code VARCHAR(20) NOT NULL UNIQUE,
    unit_of_measure unit_of_measure NOT NULL DEFAULT 'litre',
    hsn_code VARCHAR(8) NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STATION FUEL PRICES (Station-specific pricing)
-- =====================================================

CREATE TABLE station_fuel_prices (
    price_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT,
    current_price DECIMAL(10, 2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_price_positive CHECK (current_price > 0),
    CONSTRAINT uq_station_fuel_effective UNIQUE (station_id, fueltype_id, effective_from)
);

CREATE INDEX idx_station_fuel_prices_station ON station_fuel_prices(station_id);
CREATE INDEX idx_station_fuel_prices_fueltype ON station_fuel_prices(fueltype_id);
CREATE INDEX idx_station_fuel_prices_effective ON station_fuel_prices(effective_from, effective_to);

-- =====================================================
-- TANKS TABLE
-- =====================================================

CREATE TABLE tanks (
    tank_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT,
    tank_name VARCHAR(100),
    tank_capacity DECIMAL(12, 2) NOT NULL,
    current_stock DECIMAL(12, 2) NOT NULL DEFAULT 0,
    minimum_stock DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status status_type NOT NULL DEFAULT 'active',
    installation_date DATE,
    last_calibration_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_tank_capacity CHECK (tank_capacity > 0),
    CONSTRAINT chk_tank_current_stock CHECK (current_stock >= 0),
    CONSTRAINT chk_tank_minimum_stock CHECK (minimum_stock >= 0)
);

CREATE INDEX idx_tanks_station ON tanks(station_id);
CREATE INDEX idx_tanks_fueltype ON tanks(fueltype_id);
CREATE INDEX idx_tanks_status ON tanks(status);

-- =====================================================
-- PUMPS TABLE (Dispensing Units)
-- =====================================================

CREATE TABLE pumps (
    pump_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    pump_number INTEGER NOT NULL,
    pump_type pump_type NOT NULL,
    pump_model VARCHAR(100),
    manufacturer VARCHAR(100),
    status status_type NOT NULL DEFAULT 'active',
    installation_date DATE,
    last_maintenance_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_pump_station_number UNIQUE (station_id, pump_number)
);

CREATE INDEX idx_pumps_station ON pumps(station_id);
CREATE INDEX idx_pumps_status ON pumps(status);

-- =====================================================
-- NOZZLES TABLE
-- =====================================================

CREATE TABLE nozzles (
    nozzle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    pump_id UUID NOT NULL REFERENCES pumps(pump_id) ON DELETE CASCADE,
    tank_id UUID NOT NULL REFERENCES tanks(tank_id) ON DELETE RESTRICT,
    fueltype_id UUID NOT NULL REFERENCES fuel_types(fueltype_id) ON DELETE RESTRICT,
    nozzle_number INTEGER NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_nozzle_pump_number UNIQUE (pump_id, nozzle_number),
    CONSTRAINT chk_nozzle_number CHECK (nozzle_number > 0)
);

CREATE INDEX idx_nozzles_station ON nozzles(station_id);
CREATE INDEX idx_nozzles_pump ON nozzles(pump_id);
CREATE INDEX idx_nozzles_tank ON nozzles(tank_id);
CREATE INDEX idx_nozzles_fueltype ON nozzles(fueltype_id);

-- =====================================================
-- PRODUCT CATEGORIES (Normalized - 3 separate tables)
-- =====================================================

CREATE TABLE brands (
    brand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_types (
    type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(100) NOT NULL UNIQUE,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    parent_category_id UUID REFERENCES categories(category_id),
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_category_id);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================

CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    brand_id UUID REFERENCES brands(brand_id) ON DELETE SET NULL,
    type_id UUID REFERENCES product_types(type_id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(50) UNIQUE,
    product_hsncode VARCHAR(8) NOT NULL,
    product_description TEXT,
    purchase_price DECIMAL(12, 2) NOT NULL,
    selling_price DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    gst_rate DECIMAL(5, 2) NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_purchase_price CHECK (purchase_price >= 0),
    CONSTRAINT chk_selling_price CHECK (selling_price >= 0),
    CONSTRAINT chk_discount CHECK (discount_amount >= 0),
    CONSTRAINT chk_gst_rate CHECK (gst_rate >= 0 AND gst_rate <= 100)
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_type ON products(type_id);
CREATE INDEX idx_products_status ON products(status);

-- =====================================================
-- STATION INVENTORY (Stock per station)
-- =====================================================

CREATE TABLE station_inventory (
    inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    current_stock DECIMAL(12, 2) NOT NULL DEFAULT 0,
    minimum_stock DECIMAL(12, 2) NOT NULL DEFAULT 0,
    maximum_stock DECIMAL(12, 2),
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_station_product UNIQUE (station_id, product_id),
    CONSTRAINT chk_inventory_stock_positive CHECK (current_stock >= 0),
    CONSTRAINT chk_inventory_min_stock CHECK (minimum_stock >= 0)
);

CREATE INDEX idx_station_inventory_station ON station_inventory(station_id);
CREATE INDEX idx_station_inventory_product ON station_inventory(product_id);
CREATE INDEX idx_station_inventory_low_stock ON station_inventory(current_stock)
    WHERE current_stock <= minimum_stock;

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================

CREATE TABLE employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE RESTRICT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    employee_code VARCHAR(20) UNIQUE,
    employee_phone VARCHAR(15) NOT NULL,
    employee_email VARCHAR(255),
    aadhaar_number VARCHAR(12) UNIQUE,
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(6),
    -- Employment details
    department VARCHAR(100),
    designation VARCHAR(100),
    employment_type employment_type NOT NULL DEFAULT 'full_time',
    base_salary DECIMAL(12, 2) NOT NULL,
    joining_date DATE NOT NULL,
    termination_date DATE,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_employee_aadhaar CHECK (aadhaar_number IS NULL OR aadhaar_number ~ '^[0-9]{12}$'),
    CONSTRAINT chk_employee_salary CHECK (base_salary >= 0),
    CONSTRAINT chk_termination_after_joining CHECK (termination_date IS NULL OR termination_date >= joining_date)
);

CREATE INDEX idx_employees_station ON employees(station_id);
CREATE INDEX idx_employees_user ON employees(user_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);

-- =====================================================
-- EMPLOYEE DOCUMENTS (Normalized)
-- =====================================================

CREATE TABLE employee_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type);

-- =====================================================
-- SHIFTS TABLE
-- =====================================================

CREATE TABLE shifts (
    shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(station_id) ON DELETE CASCADE,
    shift_name VARCHAR(100) NOT NULL,
    shift_code VARCHAR(20),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_overnight BOOLEAN NOT NULL DEFAULT false,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_shift_station_name UNIQUE (station_id, shift_name)
);

CREATE INDEX idx_shifts_station ON shifts(station_id);
CREATE INDEX idx_shifts_status ON shifts(status);

-- =====================================================
-- EMPLOYEE ATTENDANCE TABLE
-- =====================================================

CREATE TABLE employee_attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(shift_id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    attendance_status attendance_status NOT NULL DEFAULT 'present',
    overtime_hours DECIMAL(4, 2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_employee_attendance_date UNIQUE (employee_id, attendance_date),
    CONSTRAINT chk_checkout_after_checkin CHECK (check_out_time IS NULL OR check_out_time >= check_in_time),
    CONSTRAINT chk_overtime CHECK (overtime_hours >= 0)
);

CREATE INDEX idx_attendance_employee ON employee_attendance(employee_id);
CREATE INDEX idx_attendance_station ON employee_attendance(station_id);
CREATE INDEX idx_attendance_date ON employee_attendance(attendance_date);
CREATE INDEX idx_attendance_status ON employee_attendance(attendance_status);
CREATE INDEX idx_attendance_station_date ON employee_attendance(station_id, attendance_date);

-- =====================================================
-- EMPLOYEE PAYROLL TABLE
-- =====================================================

CREATE TABLE employee_payroll (
    payroll_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE RESTRICT,
    payroll_period_start DATE NOT NULL,
    payroll_period_end DATE NOT NULL,
    base_salary DECIMAL(12, 2) NOT NULL,
    days_worked INTEGER NOT NULL DEFAULT 0,
    total_working_days INTEGER NOT NULL,
    overtime_hours DECIMAL(6, 2) DEFAULT 0,
    overtime_rate DECIMAL(10, 2) DEFAULT 0,
    overtime_amount DECIMAL(12, 2) DEFAULT 0,
    bonus DECIMAL(12, 2) DEFAULT 0,
    incentive DECIMAL(12, 2) DEFAULT 0,
    -- Deductions
    deduction_pf DECIMAL(12, 2) DEFAULT 0,
    deduction_esi DECIMAL(12, 2) DEFAULT 0,
    deduction_tax DECIMAL(12, 2) DEFAULT 0,
    deduction_advance DECIMAL(12, 2) DEFAULT 0,
    deduction_other DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) GENERATED ALWAYS AS (
        deduction_pf + deduction_esi + deduction_tax + deduction_advance + deduction_other
    ) STORED,
    -- Earnings
    gross_salary DECIMAL(12, 2) NOT NULL,
    net_salary DECIMAL(12, 2) NOT NULL,
    -- Payment details
    payment_mode payment_mode NOT NULL,
    payment_reference VARCHAR(100),
    payment_date DATE,
    -- Approval workflow
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_employee_payroll_period UNIQUE (employee_id, payroll_period_start, payroll_period_end),
    CONSTRAINT chk_payroll_period CHECK (payroll_period_end >= payroll_period_start),
    CONSTRAINT chk_days_worked CHECK (days_worked >= 0 AND days_worked <= total_working_days),
    CONSTRAINT chk_net_salary CHECK (net_salary >= 0)
);

CREATE INDEX idx_payroll_employee ON employee_payroll(employee_id);
CREATE INDEX idx_payroll_station ON employee_payroll(station_id);
CREATE INDEX idx_payroll_period ON employee_payroll(payroll_period_start, payroll_period_end);
CREATE INDEX idx_payroll_status ON employee_payroll(status);

-- =====================================================
-- METER READINGS TABLE
-- =====================================================

CREATE TABLE meter_readings (
    reading_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nozzle_id UUID NOT NULL REFERENCES nozzles(nozzle_id) ON DELETE RESTRICT,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    reading_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    opening_reading DECIMAL(15, 3) NOT NULL,
    closing_reading DECIMAL(15, 3) NOT NULL,
    quantity_dispensed DECIMAL(15, 3) GENERATED ALWAYS AS (closing_reading - opening_reading) STORED,
    shift_id UUID REFERENCES shifts(shift_id),
    recorded_by UUID REFERENCES users(user_id),
    verified_by UUID REFERENCES users(user_id),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_closing_gte_opening CHECK (closing_reading >= opening_reading),
    CONSTRAINT chk_readings_positive CHECK (opening_reading >= 0 AND closing_reading >= 0)
);

CREATE INDEX idx_meter_readings_nozzle ON meter_readings(nozzle_id);
CREATE INDEX idx_meter_readings_station ON meter_readings(station_id);
CREATE INDEX idx_meter_readings_datetime ON meter_readings(reading_datetime);
CREATE INDEX idx_meter_readings_shift ON meter_readings(shift_id);
CREATE INDEX idx_meter_readings_station_date ON meter_readings(station_id, reading_datetime);

-- =====================================================
-- EMPLOYEE SHIFT ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE employee_shift_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(shift_id) ON DELETE RESTRICT,
    assignment_date DATE NOT NULL,
    assigned_pump_id UUID REFERENCES pumps(pump_id) ON DELETE SET NULL,
    assigned_nozzle_ids UUID[],
    assigned_by UUID NOT NULL REFERENCES users(user_id),
    assignment_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_employee_shift_date UNIQUE (employee_id, assignment_date, shift_id)
);

CREATE INDEX idx_shift_assignments_employee ON employee_shift_assignments(employee_id);
CREATE INDEX idx_shift_assignments_station ON employee_shift_assignments(station_id);
CREATE INDEX idx_shift_assignments_date ON employee_shift_assignments(assignment_date);
CREATE INDEX idx_shift_assignments_status ON employee_shift_assignments(status);

-- =====================================================
-- EMPLOYEE SHIFT HANDOVERS TABLE
-- =====================================================

CREATE TABLE employee_shift_handovers (
    handover_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(shift_id) ON DELETE RESTRICT,
    handover_date DATE NOT NULL,
    handover_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outgoing_employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    incoming_employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
    -- Financial collections
    cash_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    card_collection DECIMAL(15, 2) NOT NULL DEFAULT 0,
    upi_collection DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_collection DECIMAL(15, 2) GENERATED ALWAYS AS (
        cash_balance + card_collection + upi_collection
    ) STORED,
    -- Readings stored as JSONB for flexibility
    nozzle_readings JSONB NOT NULL DEFAULT '[]'::jsonb,
    tank_dip_readings JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Verification
    discrepancy_amount DECIMAL(15, 2) DEFAULT 0,
    discrepancy_reason TEXT,
    verified_by UUID REFERENCES users(user_id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_different_employees CHECK (outgoing_employee_id != incoming_employee_id),
    CONSTRAINT chk_collections_positive CHECK (
        cash_balance >= 0 AND
        card_collection >= 0 AND
        upi_collection >= 0 AND
        credit_sales >= 0
    )
);

CREATE INDEX idx_handovers_station ON employee_shift_handovers(station_id);
CREATE INDEX idx_handovers_date ON employee_shift_handovers(handover_date);
CREATE INDEX idx_handovers_outgoing ON employee_shift_handovers(outgoing_employee_id);
CREATE INDEX idx_handovers_incoming ON employee_shift_handovers(incoming_employee_id);
CREATE INDEX idx_handovers_status ON employee_shift_handovers(status);
CREATE INDEX idx_handovers_nozzle_readings ON employee_shift_handovers USING GIN (nozzle_readings);
CREATE INDEX idx_handovers_tank_readings ON employee_shift_handovers USING GIN (tank_dip_readings);

-- =====================================================
-- AUDIT LOG TABLE (for compliance and tracking)
-- =====================================================

CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(user_id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(changed_by);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate nozzle fuel type matches tank
CREATE OR REPLACE FUNCTION validate_nozzle_tank_fueltype()
RETURNS TRIGGER AS $$
DECLARE
    tank_fuel_type UUID;
BEGIN
    SELECT fueltype_id INTO tank_fuel_type
    FROM tanks WHERE tank_id = NEW.tank_id;

    IF tank_fuel_type != NEW.fueltype_id THEN
        RAISE EXCEPTION 'Nozzle fuel type must match tank fuel type';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update tank stock after meter reading
CREATE OR REPLACE FUNCTION update_tank_stock_on_reading()
RETURNS TRIGGER AS $$
DECLARE
    nozzle_tank_id UUID;
    dispensed_qty DECIMAL(15, 3);
BEGIN
    SELECT tank_id INTO nozzle_tank_id
    FROM nozzles WHERE nozzle_id = NEW.nozzle_id;

    dispensed_qty := NEW.closing_reading - NEW.opening_reading;

    UPDATE tanks
    SET current_stock = current_stock - dispensed_qty,
        updated_at = NOW()
    WHERE tank_id = nozzle_tank_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- APPLY TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fuel_types_updated_at BEFORE UPDATE ON fuel_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tanks_updated_at BEFORE UPDATE ON tanks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pumps_updated_at BEFORE UPDATE ON pumps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_nozzles_updated_at BEFORE UPDATE ON nozzles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_product_types_updated_at BEFORE UPDATE ON product_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_station_inventory_updated_at BEFORE UPDATE ON station_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employee_attendance_updated_at BEFORE UPDATE ON employee_attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employee_payroll_updated_at BEFORE UPDATE ON employee_payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shift_assignments_updated_at BEFORE UPDATE ON employee_shift_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shift_handovers_updated_at BEFORE UPDATE ON employee_shift_handovers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Nozzle validation trigger
CREATE TRIGGER trg_nozzle_fueltype_check
    BEFORE INSERT OR UPDATE ON nozzles
    FOR EACH ROW EXECUTE FUNCTION validate_nozzle_tank_fueltype();

-- Tank stock update trigger
CREATE TRIGGER trg_update_tank_stock
    AFTER INSERT ON meter_readings
    FOR EACH ROW EXECUTE FUNCTION update_tank_stock_on_reading();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE nozzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS HELPER FUNCTIONS
-- =====================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get current user's station(s)
CREATE OR REPLACE FUNCTION get_user_stations()
RETURNS SETOF UUID AS $$
    SELECT e.station_id
    FROM employees e
    JOIN users u ON u.user_id = e.user_id
    WHERE u.auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND role = 'admin'
    )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Users table policies
CREATE POLICY users_select_own ON users FOR SELECT USING (auth_id = auth.uid() OR is_admin());
CREATE POLICY users_admin_all ON users FOR ALL USING (is_admin());

-- Clients table policies
CREATE POLICY clients_admin_all ON clients FOR ALL USING (is_admin());
CREATE POLICY clients_manager_select ON clients FOR SELECT USING (
    get_user_role() IN ('manager', 'supervisor')
);

-- Stations table policies
CREATE POLICY stations_admin_all ON stations FOR ALL USING (is_admin());
CREATE POLICY stations_employee_select ON stations FOR SELECT USING (
    station_id IN (SELECT get_user_stations())
);

-- Fuel types - global read access
CREATE POLICY fuel_types_select_all ON fuel_types FOR SELECT USING (true);
CREATE POLICY fuel_types_admin_modify ON fuel_types FOR ALL USING (is_admin());

-- Station fuel prices
CREATE POLICY station_fuel_prices_select ON station_fuel_prices FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY station_fuel_prices_admin_modify ON station_fuel_prices FOR ALL USING (is_admin());

-- Tanks
CREATE POLICY tanks_select ON tanks FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY tanks_admin_modify ON tanks FOR ALL USING (is_admin());

-- Pumps
CREATE POLICY pumps_select ON pumps FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY pumps_admin_modify ON pumps FOR ALL USING (is_admin());

-- Nozzles
CREATE POLICY nozzles_select ON nozzles FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY nozzles_admin_modify ON nozzles FOR ALL USING (is_admin());

-- Products - global catalog read access
CREATE POLICY brands_select_all ON brands FOR SELECT USING (true);
CREATE POLICY brands_admin_modify ON brands FOR ALL USING (is_admin());

CREATE POLICY product_types_select_all ON product_types FOR SELECT USING (true);
CREATE POLICY product_types_admin_modify ON product_types FOR ALL USING (is_admin());

CREATE POLICY categories_select_all ON categories FOR SELECT USING (true);
CREATE POLICY categories_admin_modify ON categories FOR ALL USING (is_admin());

CREATE POLICY products_select_all ON products FOR SELECT USING (true);
CREATE POLICY products_admin_modify ON products FOR ALL USING (is_admin());

-- Station inventory
CREATE POLICY station_inventory_select ON station_inventory FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY station_inventory_modify ON station_inventory FOR ALL USING (
    get_user_role() IN ('admin', 'manager', 'supervisor') AND
    (station_id IN (SELECT get_user_stations()) OR is_admin())
);

-- Employees
CREATE POLICY employees_select ON employees FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY employees_admin_modify ON employees FOR ALL USING (
    get_user_role() IN ('admin', 'manager')
);

-- Employee documents
CREATE POLICY employee_documents_select ON employee_documents FOR SELECT USING (
    employee_id IN (
        SELECT employee_id FROM employees
        WHERE station_id IN (SELECT get_user_stations())
    ) OR is_admin()
);
CREATE POLICY employee_documents_admin_modify ON employee_documents FOR ALL USING (
    get_user_role() IN ('admin', 'manager')
);

-- Shifts
CREATE POLICY shifts_select ON shifts FOR SELECT USING (
    station_id IS NULL OR station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY shifts_admin_modify ON shifts FOR ALL USING (is_admin());

-- Employee attendance
CREATE POLICY attendance_select_own ON employee_attendance FOR SELECT USING (
    employee_id IN (
        SELECT e.employee_id FROM employees e
        JOIN users u ON u.user_id = e.user_id
        WHERE u.auth_id = auth.uid()
    )
);
CREATE POLICY attendance_station_select ON employee_attendance FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) AND
    get_user_role() IN ('admin', 'manager', 'supervisor')
);
CREATE POLICY attendance_modify ON employee_attendance FOR ALL USING (
    get_user_role() IN ('admin', 'manager', 'supervisor') AND
    station_id IN (SELECT get_user_stations())
);

-- Employee payroll
CREATE POLICY payroll_select_own ON employee_payroll FOR SELECT USING (
    employee_id IN (
        SELECT e.employee_id FROM employees e
        JOIN users u ON u.user_id = e.user_id
        WHERE u.auth_id = auth.uid()
    )
);
CREATE POLICY payroll_admin_all ON employee_payroll FOR ALL USING (
    get_user_role() IN ('admin', 'manager')
);

-- Meter readings
CREATE POLICY meter_readings_select ON meter_readings FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY meter_readings_insert ON meter_readings FOR INSERT WITH CHECK (
    station_id IN (SELECT get_user_stations())
);
CREATE POLICY meter_readings_admin_modify ON meter_readings FOR UPDATE USING (
    get_user_role() IN ('admin', 'manager', 'supervisor')
);

-- Shift assignments
CREATE POLICY shift_assignments_select ON employee_shift_assignments FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY shift_assignments_modify ON employee_shift_assignments FOR ALL USING (
    get_user_role() IN ('admin', 'manager', 'supervisor') AND
    station_id IN (SELECT get_user_stations())
);

-- Shift handovers
CREATE POLICY shift_handovers_select ON employee_shift_handovers FOR SELECT USING (
    station_id IN (SELECT get_user_stations()) OR is_admin()
);
CREATE POLICY shift_handovers_insert ON employee_shift_handovers FOR INSERT WITH CHECK (
    station_id IN (SELECT get_user_stations())
);
CREATE POLICY shift_handovers_verify ON employee_shift_handovers FOR UPDATE USING (
    get_user_role() IN ('admin', 'manager', 'supervisor') AND
    station_id IN (SELECT get_user_stations())
);

-- Audit logs - admin only
CREATE POLICY audit_logs_admin_only ON audit_logs FOR SELECT USING (is_admin());

-- =====================================================
-- SEED DATA: Default Fuel Types
-- =====================================================

INSERT INTO fuel_types (fueltype_name, fueltype_code, unit_of_measure, hsn_code) VALUES
    ('Petrol', 'MS', 'litre', '27101210'),
    ('Diesel', 'HSD', 'litre', '27101930'),
    ('Premium Petrol', 'XP', 'litre', '27101210'),
    ('Premium Diesel', 'XD', 'litre', '27101930'),
    ('CNG', 'CNG', 'kg', '27112100');

-- =====================================================
-- SEED DATA: Default Shifts
-- =====================================================

INSERT INTO shifts (station_id, shift_name, shift_code, start_time, end_time, is_overnight) VALUES
    (NULL, 'Morning Shift', 'MORNING', '06:00:00', '14:00:00', false),
    (NULL, 'Afternoon Shift', 'AFTERNOON', '14:00:00', '22:00:00', false),
    (NULL, 'Night Shift', 'NIGHT', '22:00:00', '06:00:00', true);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
