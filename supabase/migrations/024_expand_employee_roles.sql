-- =====================================================
-- PETRO ASTRA V1 - EXPAND EMPLOYEE ROLES
-- =====================================================
-- Adds new employee roles: pump_attendant, cashier, accountant,
-- tank_supervisor, security, housekeeping
-- Keeps existing 'pump_boy' for backward compatibility

ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'pump_attendant';
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'tank_supervisor';
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'security';
ALTER TYPE employee_role_type ADD VALUE IF NOT EXISTS 'housekeeping';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
