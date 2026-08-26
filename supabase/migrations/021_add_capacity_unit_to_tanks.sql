-- Add capacity_unit column to tanks table
-- Supports "liters" (default) and "kg" for different fuel types
ALTER TABLE tanks ADD COLUMN capacity_unit TEXT NOT NULL DEFAULT 'liters';
