# Database Schema

This document contains the complete database schema for Petro Astra V1.

## Clients Table
- `client_id` (UUID, PK)
- `client_email` (links to auth user)
- `client_name`, `client_phone` (required)
- `client_pan`, `client_aadhaar` (optional, validated format)
- Address fields: `address_line1`, `address_line2`, `city`, `state`, `pincode`
- `client_photo` (URL to Supabase Storage, optional)
- `status` (enum: active, inactive, suspended, deleted)
- `joining_date`, `created_at`, `updated_at`

## Stations Table
- `station_id` (UUID, PK)
- `client_id` (FK to clients)
- Station details: name, address, phone, SAP code, GST number
- `latitude`, `longitude` for location
- `status`, `opening_date`, timestamps

## Fuel Types Table
- `fueltype_id` (UUID, PK)
- `station_id` (FK to stations)
- `fueltype_name` (VARCHAR(100))
- `unit_of_measure` (VARCHAR(20), default 'liters')
- `fueltype_price` (DECIMAL(10,2))
- `hsn_code` (VARCHAR(20), nullable)
- `status`, timestamps
- **Constraint**: UNIQUE (station_id, fueltype_name)

## Tanks Table
- `tank_id` (UUID, PK)
- `station_id` (FK to stations)
- `fueltype_id` (FK to fuel_types)
- `tank_name`, `tank_capacity` (DECIMAL(10,2))
- `capacity_unit` (TEXT, default 'liters') — supports 'liters' and 'kg'
- `current_stock` (DECIMAL(12,3), default 0) — updated by purchase allocation and sale triggers
- `status`, timestamps

## Pumps Table
- `pump_id` (UUID, PK)
- `station_id` (FK to stations)
- `pump_name`, `nozzle_count` (INTEGER, 1-10)
- `status`, timestamps

## Nozzles Table
- `nozzle_id` (UUID, PK)
- `station_id` (FK to stations)
- `pump_id` (FK to pumps)
- `tank_id` (FK to tanks)
- `fueltype_id` (FK to fuel_types)
- `nozzle_name`
- `status`, timestamps

## Station Products Table
- `station_product_id` (UUID, PK)
- `station_id` (FK to stations)
- `product_name`, `hsn_code` (VARCHAR(20), nullable)
- `purchase_price`, `selling_price`, `discount_amount`
- `current_stock`, `minimum_stock`
- `available` (BOOLEAN)
- timestamps

## Employees Table
- `employee_id` (UUID, PK)
- `station_id` (FK to stations)
- `employee_name`, `employee_phone`, `employee_address`
- `employee_role` (enum: manager, pump_boy, pump_attendant, cashier, accountant, tank_supervisor, security, housekeeping)
- `employment_type` (enum: full_time, part_time)
- `aadhaar_number` (optional, validated 12-digit)
- `joining_date`, `salary`
- `employee_photo` (URL to Supabase Storage)
- `status`, timestamps

## Employee Shifts Table
- `shift_id` (UUID, PK)
- `employee_id` (FK to employees)
- `station_id` (FK to stations)
- `pump_id` (FK to pumps, optional)
- `nozzle_id` (FK to nozzles, optional)
- `assigned_by` (FK to employees - manager)
- `start_time`, `end_time`, `total_hours`
- `status`, timestamps

## Employee Attendance Table
- `attendance_id` (UUID, PK)
- `employee_id` (FK to employees)
- `station_id` (FK to stations)
- `shift_id` (FK to employee_shifts, optional)
- `attendance_date` (unique per employee per day)
- `hours_worked`
- `attendance_status` (enum: present, absent, half_day, leave)
- `marked_by` (FK to employees - manager)
- timestamps

## Daily Fuel Price Table
- `price_update_id` (UUID, PK)
- `station_id` (FK to stations)
- `fueltype_id` (FK to fuel_types)
- `new_price` (DECIMAL(10,2), NOT NULL)
- `effective_date` (DATE, NOT NULL)
- `employee_id` (FK to employees - who updated)
- `status`, timestamps
- **Constraint**: UNIQUE (station_id, fueltype_id) - one active price per station+fuel

## Price History Logs Table
- `history_id` (UUID, PK)
- `station_id` (FK to stations)
- `fueltype_id` (FK to fuel_types)
- `old_price` (DECIMAL(10,2), NULL for first entry)
- `new_price` (DECIMAL(10,2), NOT NULL)
- `effective_date` (DATE)
- `price_update_id` (FK to daily_fuel_price)
- `created_at` (no updated_at - immutable audit log)
- **Trigger**: Automatically populated on INSERT/UPDATE to daily_fuel_price

## Daily Sale Records Table
- `sale_record_id` (UUID, PK)
- `station_id` (FK to stations)
- `pump_id` (FK to pumps)
- `nozzle_id` (FK to nozzles)
- `employee_id` (FK to employees - who recorded the sale)
- `sale_date` (DATE)
- `fuel_price` (DECIMAL(10,2) - price per liter at time of sale)
- `opening_reading` (DECIMAL(12,3) - meter reading at start of day)
- `close_reading` (DECIMAL(12,3) - meter reading at end of day)
- `testing_qty` (DECIMAL(12,3), default 0) — testing quantity deducted from sales
- `total_liters` (DECIMAL(12,3) - **computed**: close_reading - opening_reading - testing_qty)
- `total_amount` (DECIMAL(14,2) - **computed**: total_liters × fuel_price)
- `cash_sales` (DECIMAL(14,2) - cash payments received)
- `upi_sales` (DECIMAL(14,2) - UPI/digital payments received)
- `card_sales` (DECIMAL(14,2) - card payments received)
- `credit_sales` (DECIMAL(14,2) - credit/receivable sales)
- `status`, timestamps
- **Constraint**: UNIQUE (nozzle_id, sale_date) - one record per nozzle per day
- **Trigger**: Auto-computes `total_liters` and `total_amount` on INSERT/UPDATE
- **Helper Function**: `get_previous_close_reading(nozzle_id, sale_date)` - fetches previous day's close reading
- **Tank Stock Sync Triggers** (migration 020):
  - `decrement_tank_stock_on_sale` — AFTER INSERT: decrements tank.current_stock by total_liters (via nozzle→tank lookup)
  - `adjust_tank_stock_on_sale_update` — AFTER UPDATE: adjusts tank stock by difference if total_liters changed
  - `restore_tank_stock_on_sale_delete` — AFTER DELETE: restores tank.current_stock

## Credit Customers Table
- `credit_customer_id` (UUID, PK)
- `station_id` (FK to stations) - one station per customer
- `customer_name` (VARCHAR(255), NOT NULL)
- `gst_number` (VARCHAR(15), unique per station)
- `phone`, `alt_phone` (contact numbers)
- `email` (optional, validated format)
- Address fields: `address_line1`, `address_line2`, `city`, `state`, `pincode`
- `credit_limit_type` (enum: amount, quantity) - limit in ₹ or liters
- `credit_limit_value` (DECIMAL(14,2), must be > 0)
- `discount_type` (enum: amount, percentage, nullable)
- `discount_value` (DECIMAL(10,2), max 100 for percentage)
- `current_balance` (DECIMAL(14,2), default 0) - outstanding credit (positive = owed)
- `registered_date`, `status`, timestamps
- **Constraint**: UNIQUE (station_id, gst_number)
- **Triggers**: Auto-updated by transactions and payments

## Credit Customer Vehicles Table
- `vehicle_id` (UUID, PK)
- `credit_customer_id` (FK to credit_customers, CASCADE delete)
- `vehicle_number` (VARCHAR(20), Indian format e.g., MH12AB1234, 22BH1234AA)
- `vehicle_type` (VARCHAR(50), optional - e.g., Truck, Car, Bus)
- `status`, timestamps
- **Constraint**: UNIQUE (credit_customer_id, vehicle_number)

## Credit Transactions Table
- `transaction_id` (UUID, PK)
- `credit_customer_id` (FK to credit_customers, RESTRICT delete)
- `station_id` (FK to stations, RESTRICT delete)
- `sale_record_id` (FK to daily_sale_records, optional - links to credit_sales)
- `vehicle_id` (FK to credit_customer_vehicles, optional)
- `fueltype_id` (FK to fuel_types, RESTRICT delete)
- `employee_id` (FK to employees - who recorded)
- `transaction_date` (DATE)
- `fuel_quantity` (DECIMAL(12,3) - liters dispensed)
- `unit_price` (DECIMAL(10,2) - price per liter at time of sale)
- `discount_applied` (DECIMAL(10,2) - **computed** from customer discount settings)
- `gross_amount` (DECIMAL(14,2) - **computed**: quantity × unit_price)
- `net_amount` (DECIMAL(14,2) - **computed**: gross_amount - discount_applied)
- `running_balance` (DECIMAL(14,2) - customer balance after this transaction)
- `notes` (TEXT, optional)
- `payment_status` (enum: unpaid, partially_paid, paid — default 'unpaid')
- `amount_paid` (DECIMAL(14,2), default 0) — total amount paid against this transaction
- `status`, timestamps
- **Triggers**:
  - Auto-compute amounts and discount based on customer settings
  - Auto-update `credit_customers.current_balance` on INSERT/UPDATE/DELETE
  - Uses FOR UPDATE lock to prevent race conditions

## Credit Payments Table
- `payment_id` (UUID, PK)
- `credit_customer_id` (FK to credit_customers, RESTRICT delete)
- `station_id` (FK to stations, RESTRICT delete)
- `transaction_id` (FK to credit_transactions, optional — SET NULL on delete) — links payment to specific transaction
- `employee_id` (FK to employees - who received payment)
- `payment_date` (DATE)
- `payment_amount` (DECIMAL(14,2), must be > 0)
- `payment_mode` (VARCHAR(20): cash, upi, card, cheque, bank_transfer)
- `reference_number` (VARCHAR(100), optional - UPI ref, cheque no, etc.)
- `balance_before` (DECIMAL(14,2) - **computed** before payment)
- `balance_after` (DECIMAL(14,2) - **computed** after payment)
- `notes` (TEXT, optional)
- `status`, timestamps
- **Triggers**:
  - Auto-compute balance_before and balance_after
  - Auto-update `credit_customers.current_balance` on INSERT/UPDATE/DELETE
  - Uses FOR UPDATE lock to prevent race conditions
- **Transaction Payment Status Triggers** (migration 011):
  - Auto-update credit_transactions.payment_status and amount_paid when payments are inserted/updated/deleted

## Product Sale Items Table
- `product_sale_id` (UUID, PK)
- `station_id` (FK to stations)
- `employee_id` (FK to employees)
- `product_id` (FK to station_products.station_product_id)
- `sale_date` (DATE)
- `quantity` (INTEGER)
- `unit_price` (DECIMAL(10,2))
- `total_amount` (DECIMAL(14,2) - **computed**: quantity × unit_price)
- `payment_method` (VARCHAR(20): cash, upi, card, bank_transfer, credit)
- `status` (enum: active, inactive, suspended, deleted)
- `created_at`, `updated_at`
- **Triggers**:
  - `compute_product_sale_total` - Auto-computes `total_amount` on INSERT/UPDATE
  - `decrement_product_stock` - Auto-decrements `current_stock` on station_products after INSERT
  - `restore_product_stock` - Restores `current_stock` on station_products after DELETE
  - `update_updated_at` - Auto-updates `updated_at` timestamp
- **RLS**: Same as daily_sale_records (authenticated users full access)
- **Migration**: `017_product_sale_items.sql`

## Station Expenses Table
- `expense_id` (UUID, PK)
- `station_id` (FK to stations, CASCADE delete)
- `approved_by` (FK to employees, RESTRICT delete)
- `expense_date` (DATE)
- `category` (VARCHAR(50): maintenance, utilities, rent, insurance, marketing, office_supplies, transportation, professional_fees, taxes, other)
- `amount` (DECIMAL(14,2), must be > 0)
- `payment_method` (VARCHAR(20): cash, upi, card, credit, bank_transfer)
- `vendor_name` (VARCHAR(255), optional)
- `description` (TEXT, optional)
- `status`, timestamps
- **Migration**: `018_station_expenses.sql`

## Purchases Table
- `purchase_id` (UUID, PK)
- `station_id` (FK to stations, CASCADE delete)
- `purchase_date` (DATE)
- `purchase_type` (VARCHAR(20): fuel, product)
- `payment_method` (VARCHAR(20): bank_transfer, cash, upi, credit)
- `gst_amount` (DECIMAL(14,2), default 0)
- `total_amount` (DECIMAL(14,2), default 0)
- `vendor_name` (VARCHAR(255), optional)
- `notes` (TEXT, optional)
- `status`, timestamps
- **Migration**: `019_purchase_management.sql`

## Purchase Fuel Items Table
- `fuel_item_id` (UUID, PK)
- `purchase_id` (FK to purchases, CASCADE delete)
- `fuel_type_id` (FK to fuel_types.fueltype_id, RESTRICT delete)
- `purchase_price_per_liter` (DECIMAL(10,2))
- `total_quantity` (DECIMAL(12,3))
- `total_amount` (DECIMAL(14,2) - **computed**: price_per_liter × total_quantity)
- timestamps
- **Trigger**: `compute_purchase_fuel_item_total` — auto-computes total_amount

## Purchase Fuel Tank Allocations Table
- `allocation_id` (UUID, PK)
- `fuel_item_id` (FK to purchase_fuel_items, CASCADE delete)
- `tank_id` (FK to tanks, RESTRICT delete)
- `quantity` (DECIMAL(12,3), must be > 0)
- `created_at`
- **Triggers**:
  - `increment_tank_stock_on_purchase` — AFTER INSERT: increments tanks.current_stock
  - `decrement_tank_stock_on_purchase_delete` — AFTER DELETE: decrements tanks.current_stock

## Purchase Product Items Table
- `product_item_id` (UUID, PK)
- `purchase_id` (FK to purchases, CASCADE delete)
- `product_id` (FK to station_products.station_product_id, RESTRICT delete)
- `purchase_price` (DECIMAL(10,2))
- `quantity` (INTEGER, must be > 0)
- `total_amount` (DECIMAL(14,2) - **computed**: purchase_price × quantity)
- timestamps
- **Triggers**:
  - `compute_purchase_product_item_total` — auto-computes total_amount
  - `increment_product_stock_on_purchase` — AFTER INSERT: increments station_products.current_stock
  - `decrement_product_stock_on_purchase_delete` — AFTER DELETE: decrements station_products.current_stock

## Client Bank Accounts Table
- `bank_account_id` (UUID, PK)
- `client_id` (FK to clients, RESTRICT delete)
- `account_type` (enum: personal, company)
- `account_name` (VARCHAR(100))
- `account_holder_name` (VARCHAR(255))
- `account_number_last4` (VARCHAR(4), regex validated: 4 digits)
- `bank_name` (VARCHAR(100))
- `branch` (VARCHAR(255), optional)
- `current_balance` (DECIMAL(14,2), default 0)
- `company_name` (VARCHAR(255), required if account_type = 'company')
- `status`, timestamps
- **Constraint**: UNIQUE (client_id, account_name)
- **Constraint**: company_name required when account_type = 'company'
- **Migration**: `025_client_bank_accounts.sql`

## Settlements Table
- `settlement_id` (UUID, PK)
- `client_id` (FK to clients, RESTRICT delete)
- `station_id` (FK to stations, CASCADE delete)
- `settlement_date` (DATE)
- `from_method` (VARCHAR(20): cash, upi, card, bank)
- `to_method` (VARCHAR(20): cash, upi, card, bank)
- `from_bank_account_id` (FK to client_bank_accounts, optional)
- `to_bank_account_id` (FK to client_bank_accounts, optional)
- `amount` (DECIMAL(14,2), must be > 0)
- `reference_number` (VARCHAR(100), optional)
- `notes` (TEXT, optional)
- `status`, timestamps
- **Constraint**: from/to cannot be same method (unless both bank with different accounts)
- **Constraint**: bank account required when method is 'bank'
- **Triggers**: Auto-update `client_bank_accounts.current_balance` on INSERT/DELETE
- **Migration**: `026_settlements.sql`

## Click Astra Table
- `id` (UUID, PK)
- `client_id` (FK to clients, CASCADE delete)
- `name` (VARCHAR(255) - user-given name for the document)
- `image_name` (VARCHAR(255) - original filename)
- `image_url` (TEXT - URL to Supabase storage)
- `date` (DATE - document date)
- `extraction_columns` (JSONB - array of column names to extract)
- `llm_instructions` (TEXT - custom instructions for LLM)
- `ocr_extracted_data` (JSONB - raw OCR output from Mistral)
- `ai_response` (JSONB - structured response from LLM)
- `processing_status` (enum: pending, processing, completed, failed, verified)
- `error_message` (TEXT - error message if processing failed)
- `created_at`, `updated_at`
- **Migration**: `012_click_astra.sql`

## Click Astra Templates Table
- `id` (UUID, PK)
- `client_id` (FK to clients, CASCADE delete)
- `name` (VARCHAR(100) - template name, unique per client)
- `extraction_columns` (JSONB - array of column names)
- `llm_instructions` (TEXT - default instructions for this template)
- `created_at`, `updated_at`
- **Migration**: `014_click_astra_templates.sql`

---

## Supabase Storage Buckets

### employee-photos Bucket
- **Purpose**: Store employee profile photos
- **Access**: Public bucket (authenticated users can upload/read/delete)
- **File limits**: 5MB max, JPEG/PNG/WebP only
- **Migration**: `005_employee_photos_bucket.sql`
- **Usage**: Upload via client-side `supabase.storage.upload()`, get public URL via `getPublicUrl()`

### client-photos Bucket
- **Purpose**: Store client profile photos
- **Access**: Public bucket (authenticated users can upload/read/delete)
- **File limits**: 5MB max, JPEG/PNG/WebP only
- **Migration**: `006_client_photo.sql`
- **Usage**: Upload via client-side `supabase.storage.upload()`, get public URL via `getPublicUrl()`

### click-astra-images Bucket
- **Purpose**: Store uploaded documents for OCR processing
- **Access**: Public bucket (authenticated users can upload/read/delete)
- **File limits**: 10MB max, JPEG/PNG/WebP/PDF only
- **Migration**: `012_click_astra.sql`
- **Usage**: Upload via client-side `supabase.storage.upload()`, get public URL via `getPublicUrl()`

---

## TypeScript Types (`/frontend/src/types/database.ts`)

Defined types:
- `StatusType` - Enum: `active` | `inactive` | `suspended` | `deleted`
- `Client`, `ClientInsert` - Client profile
- `Station`, `StationInsert` - Station data
- `EmployeeRoleType` - Enum: `manager` | `pump_boy` | `pump_attendant` | `cashier` | `accountant` | `tank_supervisor` | `security` | `housekeeping`
- `EmploymentType` - Enum: `full_time` | `part_time`
- `AttendanceStatusType` - Enum: `present` | `absent` | `half_day` | `leave`
- `FuelType`, `FuelTypeInsert` - Fuel type data (uses `fueltype_id`, `fueltype_name`, `fueltype_price`, `unit_of_measure`)
- `Tank`, `TankInsert` - Tank data (includes `capacity_unit`, `current_stock`)
- `Pump`, `PumpInsert` - Pump data (includes `pump_name`, `nozzle_count`)
- `Nozzle`, `NozzleInsert` - Nozzle data (includes `station_id`)
- `StationProduct`, `StationProductInsert` - Product data (includes `hsn_code`, `current_stock`, `minimum_stock`)
- `Employee`, `EmployeeInsert` - Employee data
- `EmployeeShift`, `EmployeeShiftInsert` - Shift assignment data
- `EmployeeAttendance`, `EmployeeAttendanceInsert` - Attendance data
- `DailyFuelPrice`, `DailyFuelPriceInsert` - Daily fuel price updates
- `PriceHistoryLog` - Price change audit log (no insert type - trigger populated)
- `DailySaleRecord`, `DailySaleRecordInsert` - Daily nozzle sales (includes `testing_qty`)
- `CreditLimitType` - Enum: `amount` | `quantity`
- `DiscountType` - Enum: `amount` | `percentage`
- `PaymentMode` - Enum: `cash` | `upi` | `card` | `cheque` | `bank_transfer`
- `PaymentStatusType` - Enum: `unpaid` | `partially_paid` | `paid`
- `CreditCustomer`, `CreditCustomerInsert` - Credit customer profiles with limits and discounts
- `CreditCustomerVehicle`, `CreditCustomerVehicleInsert` - Vehicles registered to credit customers
- `CreditTransaction`, `CreditTransactionInsert` - Credit fuel purchases (includes `payment_status`, `amount_paid`)
- `CreditPayment`, `CreditPaymentInsert` - Payments from credit customers (includes `transaction_id`)
- `ProductPaymentMethod` - Enum: `cash` | `upi` | `card` | `bank_transfer` | `credit`
- `ProductSaleItem`, `ProductSaleItemInsert` - Product sale records
- `ExpenseCategory` - Enum: 10 values (maintenance, utilities, rent, insurance, marketing, office_supplies, transportation, professional_fees, taxes, other)
- `ExpensePaymentMethod` - Enum: `cash` | `upi` | `card` | `credit` | `bank_transfer`
- `StationExpense`, `StationExpenseInsert` - Station expense records
- `PurchaseType` - Enum: `fuel` | `product`
- `PurchasePaymentMethod` - Enum: `bank_transfer` | `cash` | `upi` | `credit`
- `Purchase`, `PurchaseInsert` - Purchase invoice records
- `PurchaseFuelItem`, `PurchaseFuelItemInsert` - Fuel line items in purchases
- `PurchaseFuelTankAllocation`, `PurchaseFuelTankAllocationInsert` - Tank allocation for purchased fuel
- `PurchaseProductItem`, `PurchaseProductItemInsert` - Product line items in purchases
- `BankAccountType` - Enum: `personal` | `company`
- `ClientBankAccount`, `ClientBankAccountInsert` - Client bank account records
- `SettlementMethod` - Enum: `cash` | `upi` | `card` | `bank`
- `Settlement`, `SettlementInsert` - Settlement transaction records
- `ClickAstraStatus` - Enum: `pending` | `processing` | `completed` | `failed` | `verified`
- `ClickAstra`, `ClickAstraInsert` - OCR document records
- `ClickAstraTemplate`, `ClickAstraTemplateInsert` - Saved extraction column templates

**Dashboard types** (`/frontend/src/types/dashboard.ts`):
- `TimePeriod` - Enum: `today` | `7days` | `30days` | `custom`
- `DateRange` - Date range with `from`/`to` strings
- `KpiMetric` - Value with previousValue and changePercent
- `DashboardKpisData` - Revenue, liters, expenses, netProfit, creditOutstanding KPIs + charts data
- `RevenueTrendPoint` - Date + revenue + liters for trend chart
- `PaymentBreakdown` - Cash, UPI, card, credit totals
- `StationComparisonItem` - Station revenue/liters comparison
- `DashboardOperationalData` - Tanks, stock alerts, credit overview, alerts, workforce
- `TankLevel` - Tank fill levels with capacity and percentage
- `ProductStockAlert` - Low-stock product alerts
- `CreditOverview` - Outstanding totals and top customers
- `AlertSeverity` - Enum: `warning` | `critical`
- `AlertType` - Enum: `low_tank` | `low_stock` | `credit_limit`
- `DashboardAlert` - Alert with type, severity, title, description, link
- `WorkforceData` - Employee counts, active shifts, attendance breakdown

---

See `/supabase/migrations/` for full SQL migrations.
