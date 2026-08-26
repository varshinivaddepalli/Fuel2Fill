"""Database schema context for the LLM to understand the data structure."""

SCHEMA_CONTEXT = """
## Database Schema for Petro Astra Fuel Station Management

**CRITICAL NAMING CONVENTION**: The fuel_types table uses `fueltype_id` (no underscore between fuel and type) as its primary key.
When joining with fuel_types, always use `fueltype_id`, NOT `fuel_type_id`. Similarly, use `fueltype_name` and `fueltype_price`.

### Table: clients
- client_id (UUID, PK)
- client_email (TEXT, unique)
- client_name (TEXT)
- client_phone (TEXT)
- client_pan (TEXT, optional) - PAN card number
- client_aadhaar (TEXT, optional) - Aadhaar number
- address_line1, address_line2, city, state, pincode (TEXT, optional)
- client_photo (TEXT, optional) - Photo URL
- status (ENUM: active, inactive, suspended, deleted)
- joining_date (DATE)
- created_at, updated_at (TIMESTAMPTZ)

### Table: stations
- station_id (UUID, PK)
- client_id (UUID, FK → clients) - **IMPORTANT: Use this to scope queries to user's data**
- station_name (TEXT)
- address_line1 (TEXT) - Street address
- address_line2 (TEXT, optional)
- city (TEXT)
- state (TEXT)
- pincode (TEXT)
- station_phone (TEXT)
- station_sap_code (TEXT) - SAP system code
- station_gst_number (TEXT) - GST registration
- latitude, longitude (DECIMAL, optional)
- opening_date (DATE)
- status (ENUM: active, inactive, deleted)
- created_at, updated_at (TIMESTAMPTZ)

### Table: fuel_types
- fueltype_id (UUID, PK) - **NOTE: No underscore between fuel and type**
- station_id (UUID, FK → stations)
- fueltype_name (TEXT) - e.g., 'Petrol', 'Diesel', 'CNG'
- unit_of_measure (TEXT) - Default 'liters'
- fueltype_price (DECIMAL) - Current selling price
- hsn_code (TEXT) - HSN classification code
- status (ENUM: active, inactive)
- created_at, updated_at (TIMESTAMPTZ)

### Table: tanks
- tank_id (UUID, PK)
- station_id (UUID, FK → stations)
- fueltype_id (UUID, FK → fuel_types) - **NOTE: No underscore between fuel and type**
- tank_capacity (DECIMAL) - Tank capacity in liters
- current_stock (DECIMAL) - Current fuel stock in liters (updated by purchase allocation triggers)
- status (ENUM: active, inactive)
- created_at, updated_at (TIMESTAMPTZ)

### Table: pumps
- pump_id (UUID, PK)
- station_id (UUID, FK → stations)
- pump_name (TEXT)
- nozzle_count (INTEGER, 1-10)
- status (ENUM: active, inactive)
- created_at, updated_at (TIMESTAMPTZ)

### Table: nozzles
- nozzle_id (UUID, PK)
- station_id (UUID, FK → stations)
- pump_id (UUID, FK → pumps)
- tank_id (UUID, FK → tanks)
- fueltype_id (UUID, FK → fuel_types) - **NOTE: No underscore between fuel and type**
- status (ENUM: active, inactive)
- created_at, updated_at (TIMESTAMPTZ)

### Table: station_products
- station_product_id (UUID, PK)
- station_id (UUID, FK → stations)
- product_name (TEXT)
- purchase_price (DECIMAL) - Cost price per unit
- selling_price (DECIMAL) - Selling price per unit
- discount_amount (DECIMAL) - Discount amount
- current_stock (INTEGER) - Current stock quantity (updated by purchase and sale triggers)
- minimum_stock (INTEGER) - Minimum stock threshold
- available (BOOLEAN) - Whether product is available for sale
- created_at, updated_at (TIMESTAMPTZ)

### Table: employees
- employee_id (UUID, PK)
- station_id (UUID, FK → stations)
- employee_name (TEXT)
- employee_phone (TEXT)
- employee_address (TEXT, optional)
- employee_role (ENUM: manager, pump_boy, pump_attendant, cashier, accountant, tank_supervisor, security, housekeeping)
- employment_type (ENUM: full_time, part_time)
- aadhaar_number (TEXT, optional)
- joining_date (DATE)
- salary (DECIMAL)
- employee_photo (TEXT, optional)
- status (ENUM: active, inactive, terminated)
- created_at, updated_at (TIMESTAMPTZ)

### Table: employee_shifts
- shift_id (UUID, PK)
- employee_id (UUID, FK → employees)
- station_id (UUID, FK → stations)
- pump_id (UUID, FK → pumps, optional)
- nozzle_id (UUID, FK → nozzles, optional)
- assigned_by (UUID, FK → employees) - Manager who assigned
- start_time (TIMESTAMPTZ)
- end_time (TIMESTAMPTZ, optional)
- total_hours (DECIMAL)
- status (ENUM: active, completed, cancelled)
- created_at, updated_at (TIMESTAMPTZ)

### Table: employee_attendance
- attendance_id (UUID, PK)
- employee_id (UUID, FK → employees)
- station_id (UUID, FK → stations)
- shift_id (UUID, FK → employee_shifts, optional)
- attendance_date (DATE)
- hours_worked (DECIMAL)
- attendance_status (ENUM: present, absent, half_day, leave)
- marked_by (UUID, FK → employees) - Manager who marked
- created_at, updated_at (TIMESTAMPTZ)

### Table: daily_fuel_price
- price_update_id (UUID, PK)
- station_id (UUID, FK → stations)
- fueltype_id (UUID, FK → fuel_types)
- new_price (DECIMAL)
- effective_date (DATE)
- employee_id (UUID, FK → employees) - Who updated
- status (ENUM: active)
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE constraint on (station_id, fueltype_id) - one active price per fuel type per station

### Table: price_history_logs
- history_id (UUID, PK)
- station_id (UUID, FK → stations)
- fueltype_id (UUID, FK → fuel_types)
- old_price (DECIMAL, nullable for first entry)
- new_price (DECIMAL)
- effective_date (DATE)
- price_update_id (UUID, FK → daily_fuel_price)
- created_at (TIMESTAMPTZ) - Immutable audit log

### Table: daily_sale_records
- sale_record_id (UUID, PK)
- station_id (UUID, FK → stations)
- pump_id (UUID, FK → pumps)
- nozzle_id (UUID, FK → nozzles)
- employee_id (UUID, FK → employees) - Who recorded the sale
- sale_date (DATE)
- fuel_price (DECIMAL) - Price per liter at time of sale
- opening_reading (DECIMAL) - Meter reading at start of day
- close_reading (DECIMAL) - Meter reading at end of day
- testing_qty (DECIMAL) - Testing quantity in liters deducted from sales (default 0)
- total_liters (DECIMAL) - Computed: close_reading - opening_reading - testing_qty
- total_amount (DECIMAL) - Computed: total_liters × fuel_price
- cash_sales (DECIMAL) - Cash payments received
- upi_sales (DECIMAL) - UPI/digital payments received
- card_sales (DECIMAL) - Card payments received
- credit_sales (DECIMAL) - Credit/receivable sales
- status (ENUM: active, inactive, deleted)
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE constraint on (nozzle_id, sale_date) - one record per nozzle per day

### Table: product_sale_items
- product_sale_id (UUID, PK)
- station_id (UUID, FK → stations)
- employee_id (UUID, FK → employees) - Who recorded the sale
- product_id (UUID, FK → station_products.station_product_id)
- sale_date (DATE)
- quantity (INTEGER) - Number of units sold
- unit_price (DECIMAL) - Price per unit at time of sale
- total_amount (DECIMAL) - Computed by trigger: quantity × unit_price
- payment_method (ENUM: cash, upi, card)
- status (ENUM: active, inactive, suspended, deleted)
- created_at, updated_at (TIMESTAMPTZ)

### Table: station_expenses
- expense_id (UUID, PK)
- station_id (UUID, FK → stations)
- approved_by (UUID, FK → employees) - Employee who approved the expense
- expense_date (DATE)
- category (ENUM: maintenance, utilities, rent, insurance, marketing, office_supplies, transportation, professional_fees, taxes, other)
- amount (DECIMAL) - Expense amount in INR
- payment_method (ENUM: cash, upi, card, credit, bank_transfer)
- vendor_name (TEXT, optional) - Vendor/supplier name
- description (TEXT, optional) - Notes about the expense
- status (ENUM: active, inactive, suspended, deleted)
- created_at, updated_at (TIMESTAMPTZ)

### Table: purchases
- purchase_id (UUID, PK)
- station_id (UUID, FK → stations)
- purchase_date (DATE)
- purchase_type (ENUM: fuel, product) - Each purchase is either fuel or product, not both
- payment_method (ENUM: bank_transfer, cash, upi, credit)
- gst_amount (DECIMAL) - GST on the invoice
- total_amount (DECIMAL) - Total invoice amount (line items + GST)
- vendor_name (TEXT, optional) - Supplier name
- notes (TEXT, optional)
- status (ENUM: active, inactive, suspended, deleted)
- created_at, updated_at (TIMESTAMPTZ)

### Table: purchase_fuel_items
- fuel_item_id (UUID, PK)
- purchase_id (UUID, FK → purchases)
- fuel_type_id (UUID, FK → fuel_types.fueltype_id) - **NOTE: Column is fuel_type_id but references fueltype_id**
- purchase_price_per_liter (DECIMAL) - Purchase price per liter
- total_quantity (DECIMAL) - Total liters purchased
- total_amount (DECIMAL) - Computed by trigger: price_per_liter × total_quantity
- created_at, updated_at (TIMESTAMPTZ)

### Table: purchase_fuel_tank_allocations
- allocation_id (UUID, PK)
- fuel_item_id (UUID, FK → purchase_fuel_items)
- tank_id (UUID, FK → tanks)
- quantity (DECIMAL) - Liters allocated to this tank (triggers update tanks.current_stock)
- created_at (TIMESTAMPTZ) - Immutable record

### Table: purchase_product_items
- product_item_id (UUID, PK)
- purchase_id (UUID, FK → purchases)
- product_id (UUID, FK → station_products.station_product_id)
- purchase_price (DECIMAL) - Purchase price per unit
- quantity (INTEGER) - Number of units purchased (triggers update station_products.current_stock)
- total_amount (DECIMAL) - Computed by trigger: purchase_price × quantity
- created_at, updated_at (TIMESTAMPTZ)

## Important Relationships

1. **Client → Stations**: One client can have multiple stations
2. **Station → Fuel Types, Tanks, Pumps, Products, Employees**: All belong to a station
3. **Pump → Nozzles**: A pump has multiple nozzles
4. **Nozzle → Tank → Fuel Type**: Each nozzle is connected to a tank which holds a specific fuel type
5. **Employee → Shifts, Attendance**: Track employee work patterns
6. **Nozzle → Daily Sale Records**: Each nozzle has daily sale records tracking meter readings and payments
7. **Station → Product Sales**: Non-fuel product sales (lubricants, accessories) tracked per item
8. **Station → Expenses**: Station-level expense tracking (maintenance, utilities, rent, etc.)
9. **Station → Purchases**: Incoming fuel and product purchases from suppliers
10. **Purchase → Fuel Items → Tank Allocations**: Fuel purchases are allocated to specific tanks, updating tank current_stock
11. **Purchase → Product Items**: Product purchases update station_products.current_stock

## Security Note

**ALL queries MUST include a JOIN or WHERE clause that filters by client_id through the stations table.**
The client_id will be provided as a parameter and must be used to ensure data isolation.

Example pattern:
```sql
SELECT e.* FROM employees e
JOIN stations s ON e.station_id = s.station_id
WHERE s.client_id = $1
```
"""


def get_schema_context() -> str:
    """Return the database schema context."""
    return SCHEMA_CONTEXT
