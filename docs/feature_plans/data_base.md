# database schema

## client database

1. client_id
2. client_name
3. client_phone
4. client_pan
5. client_adhar
6. client_address
7. status
8. joining_date

## station database

1. station_id
2. station_name
3. address_line1, address_line2, city, state, pincode
4. station_phone
5. station_sap_code
6. station_gst_number
7. latitude, longitude
8. status
9. opening_date
10. created_at
11. client_id

## station_products database

1. station_product_id (UUID, PK)
2. station_id (FK to stations, CASCADE on delete)
3. product_name
4. purchase_price (DECIMAL 10,2)
5. selling_price (DECIMAL 10,2)
6. discount_amount (DECIMAL 10,2, default 0)
7. current_stock (INTEGER, default 0)
8. minimum_stock (INTEGER, default 0)
9. available (BOOLEAN, default true)
10. created_at
11. updated_at

Constraints:
- Unique: station_id + product_name (one product per station)
- CHECK: current_stock >= 0, minimum_stock >= 0, discount_amount >= 0
- CHECK: purchase_price > 0, selling_price > 0

## fuel types database

1. station_id
2. fueltype_id
3. fueltype_name
4. unit_of_measure
5. fueltype_price
6. hsn_code
7. status
8. created_at

## tank database

1. tank_id
2. tank_capacity
3. station_id
4. fueltype_id
5. status

## pump database

1. pump_id
2. station_id
3. nozzle_count - INTEGER (1-10)
4. status

## nozzle database

1. nozzle_id
2. station_id
3. pump_id
4. tank_id
5. fueltype_id
6. status

## product categories

1. category_id
2. category_name
3. brand_id
4. brand_name
5. type_id
6. type_name

## product database

1. product_id
2. category_id
3. brand_id
4. type_id
5. product_name
6. product_hsncode
7. category
8. purchase_price
9. selling_price
10. discount_amount
11. gst_rate
12. current_stock
13. minimum_stock
14. status

## employee database (IMPLEMENTED)

1. employee_id (UUID, PK)
2. station_id (FK to stations)
3. employee_name
4. employee_role - ENUM (manager, pump_boy, pump_attendant, cashier, accountant, tank_supervisor, security, housekeeping)
5. employee_phone
6. employee_address
7. aadhaar_number
8. employment_type - ENUM (full_time, part_time)
9. joining_date
10. salary
11. employee_photo (URL to Supabase Storage)
12. status
13. created_at
14. updated_at

## employee shifts database (IMPLEMENTED)

1. shift_id (UUID, PK)
2. employee_id (FK to employees)
3. station_id (FK to stations)
4. pump_id (FK to pumps, optional)
5. nozzle_id (FK to nozzles, optional)
6. assigned_by (FK to employees - manager)
7. start_time
8. end_time
9. total_hours
10. status
11. created_at
12. updated_at

## employee attendance (IMPLEMENTED)

1. attendance_id (UUID, PK)
2. employee_id (FK to employees)
3. station_id (FK to stations)
4. shift_id (FK to employee_shifts, optional)
5. attendance_date (unique per employee per day)
6. hours_worked
7. attendance_status - ENUM (present, absent, half_day, leave)
8. marked_by (FK to employees - manager)
9. created_at
10. updated_at

## employee payroll

1. payroll_id
2. employee_id
3. station_id
4. payroll_date
5. employee_salary
6. days_worked
7. overtime_hours
8. bonus
9. incentive
10. deductions
11. net_salary
12. payment_mode
13. approved_by

## daily sale record

### meter readings database

1. nozzle_id
2. meter_reading
3. reading_date
4. reading_time
5. quantity_sold = [ meter_reading today - meter_reading yesterday ]

### employee shift assignments

1. assignment_id
2. shift_id
3. employee_id
4. station_id
5. assignment_date
6. assignment_time
7. assigned_pump_id
8. assigned_dispenser_id
9. assigned_by

### employee shift handovers

1. handover_id (pk)
2. station_id (fk)
3. shift_id (fk)
4. handover_date - date
5. outgoing_employee_id (fk)
6. incoming_employee_id (fk)
7. handover_time - time
8. cash_balance - decimal(15,2)
9. card_collection - decimal(15,2)
10. upi_collection - decimal(15,2)
11. credit_sales - decimal(15,2)
12. nozzle_readings - json [all dispenser readings]
13. tank_dip_readings - json [all tank readings]
14. verified_by - users [supervisor]
15. created_at - timestamp