-- =====================================================
-- PETRO ASTRA V1 - EMPLOYEES, SHIFTS, ATTENDANCE
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role_type') THEN
        CREATE TYPE employee_role_type AS ENUM ('manager', 'pump_boy');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
        CREATE TYPE employment_type AS ENUM ('full_time', 'part_time');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_type') THEN
        CREATE TYPE attendance_status_type AS ENUM ('present', 'absent', 'half_day', 'leave');
    END IF;
END
$$;

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================

CREATE TABLE employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE RESTRICT,
    employee_name VARCHAR(255) NOT NULL,
    employee_role employee_role_type NOT NULL,
    employee_phone VARCHAR(15) NOT NULL,
    employee_address TEXT,
    aadhaar_number VARCHAR(12) UNIQUE,
    employment_type employment_type NOT NULL DEFAULT 'full_time',
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary DECIMAL(12, 2) NOT NULL,
    employee_photo VARCHAR(500),  -- URL/path to Supabase Storage
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_employee_phone CHECK (employee_phone ~ '^[0-9]{10,15}$'),
    CONSTRAINT chk_employee_aadhaar CHECK (aadhaar_number IS NULL OR aadhaar_number ~ '^[0-9]{12}$'),
    CONSTRAINT chk_employee_salary CHECK (salary >= 0)
);

CREATE INDEX idx_employees_station ON employees(station_id);
CREATE INDEX idx_employees_role ON employees(employee_role);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_name ON employees(employee_name);
CREATE INDEX idx_employees_employment_type ON employees(employment_type);

-- =====================================================
-- EMPLOYEE SHIFTS TABLE
-- =====================================================

CREATE TABLE employee_shifts (
    shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    pump_id UUID REFERENCES pumps(pump_id) ON DELETE SET NULL,
    nozzle_id UUID REFERENCES nozzles(nozzle_id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,  -- Manager who assigned
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    total_hours DECIMAL(5, 2),  -- Computed or stored after shift ends
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_shift_times CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT chk_shift_hours CHECK (total_hours IS NULL OR total_hours >= 0)
);

CREATE INDEX idx_shifts_employee ON employee_shifts(employee_id);
CREATE INDEX idx_shifts_station ON employee_shifts(station_id);
CREATE INDEX idx_shifts_pump ON employee_shifts(pump_id);
CREATE INDEX idx_shifts_nozzle ON employee_shifts(nozzle_id);
CREATE INDEX idx_shifts_assigned_by ON employee_shifts(assigned_by);
CREATE INDEX idx_shifts_start_time ON employee_shifts(start_time);
CREATE INDEX idx_shifts_status ON employee_shifts(status);

-- =====================================================
-- EMPLOYEE ATTENDANCE TABLE
-- =====================================================

CREATE TABLE employee_attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
    shift_id UUID REFERENCES employee_shifts(shift_id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    hours_worked DECIMAL(5, 2),
    attendance_status attendance_status_type NOT NULL DEFAULT 'present',
    marked_by UUID REFERENCES employees(employee_id) ON DELETE SET NULL,  -- Manager who marked
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_hours_worked CHECK (hours_worked IS NULL OR hours_worked >= 0),
    CONSTRAINT uq_employee_attendance_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX idx_attendance_employee ON employee_attendance(employee_id);
CREATE INDEX idx_attendance_station ON employee_attendance(station_id);
CREATE INDEX idx_attendance_shift ON employee_attendance(shift_id);
CREATE INDEX idx_attendance_date ON employee_attendance(attendance_date);
CREATE INDEX idx_attendance_status ON employee_attendance(attendance_status);
CREATE INDEX idx_attendance_marked_by ON employee_attendance(marked_by);

-- =====================================================
-- TRIGGERS: Auto-update updated_at
-- =====================================================

CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_employee_shifts_updated_at
    BEFORE UPDATE ON employee_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_employee_attendance_updated_at
    BEFORE UPDATE ON employee_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

-- Employees Policies
CREATE POLICY employees_select_authenticated ON employees
    FOR SELECT TO authenticated USING (true);

CREATE POLICY employees_insert_authenticated ON employees
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY employees_update_authenticated ON employees
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY employees_delete_authenticated ON employees
    FOR DELETE TO authenticated USING (true);

-- Employee Shifts Policies
CREATE POLICY employee_shifts_select_authenticated ON employee_shifts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY employee_shifts_insert_authenticated ON employee_shifts
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY employee_shifts_update_authenticated ON employee_shifts
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY employee_shifts_delete_authenticated ON employee_shifts
    FOR DELETE TO authenticated USING (true);

-- Employee Attendance Policies
CREATE POLICY employee_attendance_select_authenticated ON employee_attendance
    FOR SELECT TO authenticated USING (true);

CREATE POLICY employee_attendance_insert_authenticated ON employee_attendance
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY employee_attendance_update_authenticated ON employee_attendance
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY employee_attendance_delete_authenticated ON employee_attendance
    FOR DELETE TO authenticated USING (true);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
