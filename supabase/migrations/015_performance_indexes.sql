-- Performance optimization indexes
-- This migration adds indexes to improve query performance

-- Index on clients.client_email for faster auth lookups
-- This is called on every authenticated request
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(client_email);

-- Composite index for common dashboard queries (status filter is frequent)
CREATE INDEX IF NOT EXISTS idx_stations_client_status ON stations(client_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_station_status ON employees(station_id, status);

-- Index for faster employee lookups by role (used in manager dropdowns)
CREATE INDEX IF NOT EXISTS idx_employees_station_role_status ON employees(station_id, employee_role, status);
