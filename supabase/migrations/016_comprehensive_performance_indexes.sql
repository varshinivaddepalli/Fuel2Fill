-- Comprehensive performance indexes for faster queries
-- This migration adds missing indexes identified through performance analysis

-- =====================================================
-- ATTENDANCE QUERIES (frequently slow without indexes)
-- =====================================================

-- Index for attendance date range queries (getClientAttendance, getCalendarAttendance)
-- Covers: WHERE station_id IN (...) AND attendance_date >= X
CREATE INDEX IF NOT EXISTS idx_attendance_station_date
ON employee_attendance(station_id, attendance_date DESC);

-- Index for employee-specific attendance lookups (getDailyAttendance, markAttendance)
-- Covers: WHERE employee_id = X AND attendance_date = Y
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
ON employee_attendance(employee_id, attendance_date);

-- =====================================================
-- SHIFTS QUERIES
-- =====================================================

-- Index for shift queries by station (getClientShifts)
-- Covers: WHERE station_id IN (...) AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_shifts_station_status
ON employee_shifts(station_id, status);

-- Index for employee shift lookups
-- Covers: WHERE employee_id = X AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_shifts_employee_status
ON employee_shifts(employee_id, status);

-- =====================================================
-- CREDIT CUSTOMERS QUERIES
-- =====================================================

-- Index for credit customer queries by station (getClientCreditCustomers)
-- Covers: WHERE station_id IN (...) AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_credit_customers_station_status
ON credit_customers(station_id, status);

-- Index for vehicle lookups by customer (vehicle count queries)
-- Covers: WHERE credit_customer_id IN (...) AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_status
ON credit_customer_vehicles(credit_customer_id, status);

-- =====================================================
-- CREDIT TRANSACTIONS QUERIES
-- =====================================================

-- Index for transaction queries by customer
-- Covers: WHERE credit_customer_id = X ORDER BY transaction_date
CREATE INDEX IF NOT EXISTS idx_transactions_customer_date
ON credit_transactions(credit_customer_id, transaction_date DESC);

-- Index for transaction queries by station and date
-- Covers: WHERE station_id IN (...) AND transaction_date >= X
CREATE INDEX IF NOT EXISTS idx_transactions_station_date
ON credit_transactions(station_id, transaction_date DESC);

-- =====================================================
-- DAILY FUEL PRICE QUERIES
-- =====================================================

-- Index for price lookups by station and fuel type
-- Covers: WHERE station_id = X AND fueltype_id = Y
CREATE INDEX IF NOT EXISTS idx_fuel_price_station_fuel
ON daily_fuel_price(station_id, fueltype_id);

-- =====================================================
-- DAILY SALE RECORDS QUERIES
-- =====================================================

-- Index for sale records by nozzle and date
-- Covers: WHERE nozzle_id = X AND sale_date = Y
CREATE INDEX IF NOT EXISTS idx_sales_nozzle_date
ON daily_sale_records(nozzle_id, sale_date DESC);

-- Index for sale records by station and date
-- Covers: WHERE station_id = X AND sale_date >= Y
CREATE INDEX IF NOT EXISTS idx_sales_station_date
ON daily_sale_records(station_id, sale_date DESC);

-- =====================================================
-- PUMPS AND NOZZLES QUERIES
-- =====================================================

-- Index for pump lookups by station
-- Covers: WHERE station_id = X AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_pumps_station_status
ON pumps(station_id, status);

-- Index for nozzle lookups by pump
-- Covers: WHERE pump_id = X AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_nozzles_pump_status
ON nozzles(pump_id, status);

-- =====================================================
-- TANKS AND FUEL TYPES QUERIES
-- =====================================================

-- Index for tank lookups by station
-- Covers: WHERE station_id = X AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_tanks_station_status
ON tanks(station_id, status);

-- Index for fuel type lookups by station
-- Covers: WHERE station_id = X AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_fuel_types_station_status
ON fuel_types(station_id, status);

-- =====================================================
-- CLICK ASTRA QUERIES
-- =====================================================

-- Index for click astra document queries by client
-- Covers: WHERE client_id = X ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_click_astra_client_created
ON click_astra(client_id, created_at DESC);

-- =====================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- =====================================================
-- This helps the query planner make better decisions
ANALYZE clients;
ANALYZE stations;
ANALYZE employees;
ANALYZE employee_attendance;
ANALYZE employee_shifts;
ANALYZE credit_customers;
ANALYZE credit_customer_vehicles;
ANALYZE credit_transactions;
ANALYZE daily_fuel_price;
ANALYZE daily_sale_records;
ANALYZE pumps;
ANALYZE nozzles;
ANALYZE tanks;
ANALYZE fuel_types;
