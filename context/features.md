# Implemented Features

This document details all implemented features in Petro Astra V1.

---

## Authentication (`/login`)
- Two-column layout with video background (`/public/login_video.mp4`)
- Email + Password authentication only
- Supabase integration with graceful fallback when env vars missing

## Password Reset (`/forgot-password`)
- 3-step OTP flow: enter email → verify code → set new password
- User is automatically logged in after password update
- Same two-column layout as login

## Dashboard (`/dashboard`)
- Collapsible sidebar using shadcn/ui sidebar component
- Breadcrumb navigation showing current route path
- Scroll progress bar in sticky header (horizontal fill indicator on page scroll)
- Sidebar state persisted via cookies
- User profile section in footer with avatar and logout
- Protected route - redirects to `/login` if not authenticated
- Redirects to `/onboarding` if user has no client profile
- **Dashboard V2** with time period selector and operational panels:
  - **KPI Cards** (top row): Revenue, Liters Sold, Expenses, Net Profit, Credit Outstanding — each with change % vs previous period
  - **Time Period Selector**: Today, Last 7 Days, Last 30 Days, Custom Date Range
  - **Station Filter**: All stations or specific station
  - **Charts** (collapsible panels):
    - Revenue Trend (line chart over time)
    - Station Comparison (bar chart of revenue/liters by station)
    - Payment Breakdown (pie chart: cash, UPI, card, credit)
  - **Operational Panels** (right column):
    - Tank Levels: Fill percentage bars with capacity info
    - Stock Alerts: Low-stock product warnings
    - Credit Overview: Outstanding totals and top customers by utilization
    - Workforce: Employee count, active shifts, attendance breakdown
    - Alerts: Critical/warning alerts for low tanks, low stock, credit limits
    - Quick Actions: Shortcut buttons to common pages
  - **Loading Skeleton**: Full skeleton UI while data loads
  - **Code Splitting**: All 8 chart/card components lazy-loaded via `next/dynamic` with skeleton fallbacks
  - Uses React Query hooks (`useDashboardKpis()`, `useDashboardOperational()`)
  - Components: `dashboard/` (dashboard-content, dashboard-header, dashboard-skeleton, kpi-card, kpi-row, revenue-trend-chart, station-comparison-chart, payment-breakdown-chart, credit-overview-card, workforce-card, alerts-card, stock-alerts-card, tank-levels-card, quick-actions-card)
  - Server action: `actions/dashboard-v2.ts`

## User Profile (`/profile`)
- Accessible from user dropdown menu (near logout button)
- View/edit mode toggle with Edit Profile button
- **Profile Photo**:
  - Upload button: Select image from device
  - Capture button: Opens camera modal with live preview
  - Shows initials fallback when no photo
  - Uploads to Supabase Storage (`client-photos` bucket)
- **Displayed fields**:
  - Basic info: name, email (read-only), phone
  - Identity documents: PAN, Aadhaar (masked by default with eye toggle to reveal)
  - Address: line1, line2, city, state, pincode
  - Account info: status, member since date
- **Security features**:
  - PAN masked as `XXXXX1234X` (middle 4 digits visible)
  - Aadhaar masked as `XXXX XXXX 9012` (last 4 digits visible)
  - Eye icon to toggle visibility of sensitive fields
- Form validation using centralized validators from `lib/validation/indian-formats.ts`
- Toast notification on successful save
- Uses server action (`actions/profile.ts`)
- Component: `profile-form.tsx`

## Breadcrumb Navigation
- Dynamic breadcrumb component in dashboard header
- Intelligent route-to-label mapping (e.g., "add-station" → "Add Station")
- **Dynamic labels for entity pages** (e.g., employee profile shows name instead of UUID, station detail shows station name)
  - Uses `BreadcrumbProvider` context from `providers/breadcrumb-context.tsx`
  - Pages set labels via `useBreadcrumb().setDynamicLabel(segment, label)`
  - Pages clear labels via `useBreadcrumb().clearDynamicLabel(segment)` on unmount
- Non-navigable routes: `registration`, `employee` (category pages without content)
- Located in `components/dashboard/dashboard-breadcrumb.tsx`

## Onboarding (`/onboarding`)
- First-time user setup flow
- Checks if user's email exists in `clients` table
- Collects client profile information:
  - Required: Full name, phone number
  - Optional: PAN, Aadhaar, address fields
- Form validation for Indian document formats (PAN, Aadhaar, pincode)
- On completion, creates client record and redirects to dashboard
- Shows success toast notification

---

## Registration Module

### Add Station (`/registration/add-station`)
- Form to register new fuel stations linked to current user's client
- Required fields: station name, SAP code, GST number, phone, opening date, full address
- Optional fields: latitude, longitude coordinates
- Validation for Indian formats (GST, pincode, phone)
- Uses server action (`actions/station.ts`)

### Add Fuel Type (`/registration/add-fuel-type`)
- Register fuel types (Petrol, Diesel, CNG, etc.) for a station
- Dependent station selection dropdown
- Fields: fuel name, HSN code, current price
- Uses server action (`actions/fuel-type.ts`)

### Add Tank (`/registration/add-tank`)
- Register storage tanks for a station
- Cascading dropdowns: Station → Fuel Type
- Fields: tank name, capacity, current stock
- Uses server action (`actions/tank.ts`)

### Add Pump (`/registration/add-pump`)
- Register fuel dispensing pumps
- Station selection dropdown
- Fields: pump name, pump type (enum: submersible, suction)
- Uses server action (`actions/pump.ts`)

### Add Nozzle (`/registration/add-nozzle`)
- Register nozzles (most complex form)
- Links: pump, tank, and fuel type together
- Cascading selections with dependency validation
- Uses server action (`actions/nozzle.ts`)

### Add Product (`/registration/add-product`)
- Register non-fuel products (lubricants, accessories, etc.)
- Fields: product name, category, price, stock quantity
- Uses server action (`actions/station-product.ts`)

### Add Bank Account (`/registration/add-bank-account`)
- Register client bank accounts (personal or company)
- Fields: account type (personal/company), account name, account holder name, last 4 digits of account number, bank name, branch, opening balance
- Company name required when account type is 'company'
- Unique constraint: one account name per client
- Uses server action (`actions/bank-account.ts`)
- Component: `registration/add-bank-account-form.tsx`

### Add Employee (`/employee/add-employee`)
- Register employees for a station
- Station selection dropdown
- Fields: name, role (8 roles: manager, pump_boy, pump_attendant, cashier, accountant, tank_supervisor, security, housekeeping), phone, address, aadhaar, employment type, joining date, salary
- **Photo upload/capture feature:**
  - Upload button: Select image from device
  - Capture button: Opens camera modal with live preview using `getUserMedia()` API
  - **Switch camera button**: Toggle between front and back cameras on mobile devices
  - Captures photo from video stream to canvas, converts to JPEG
  - Uploads to Supabase Storage (`employee-photos` bucket)
  - Stores public URL in `employee_photo` field
- Validates phone and aadhaar formats
- Uses server action (`actions/employee.ts`)

### View Stations (`/registration/view-stations`)
- View all client's stations with infrastructure counts
- **Station Cards** (clickable - entire card navigates to detail):
  - Status badge (active/inactive)
  - Station name, address, phone
  - Infrastructure counts: fuel types, tanks, pumps, nozzles, products
  - Hover effect with colored left border indicator
  - Dropdown menu (3-dot) for Edit and Delete actions
- **Station Detail Page** (`/registration/view-stations/[station_id]`):
  - Back navigation to stations list
  - Header with station name, status, address, SAP code, GST
  - **Tabbed interface**:
    - **Overview tab**: Contact info, address, registration details, coordinates
    - **Infrastructure tab**: Fuel types, tanks, pumps, nozzles with status indicators
    - **Products tab**: Station products with price, category, stock, status toggle
- **Edit Station Dialog**: Update station details
- **Delete Confirmation Dialog**: Confirm deletion with validation
- Uses React Query hooks (`useStationsWithCounts()`, `useStationDetail()`) for instant navigation
- Prefetches station detail on card hover
- **Station Topology View**:
  - Visual tree representation of station infrastructure hierarchy
  - Tree structure: Station → Fuel Types → Tanks → Pumps → Nozzles
  - Interactive tree nodes with expand/collapse
  - Accessible from station detail page
  - Components: `stations/topology/` (topology-view, topology-dialog, station-tree, tree-node)
- Uses server actions (`actions/station-detail.ts`, `actions/station.ts`)
- Components: `stations/` (view-stations-list, station-card, station-detail, station-overview-tab, station-infrastructure-tab, station-products-tab, station-edit-dialog, delete-confirm-dialog)

---

## Employee Module

### View Employee (`/employee/view-employee`)
- Displays all employees across client's stations
- Employees grouped by station with station name as section header
- Summary stats showing total stations and employees count
- Clickable employee cards (navigate to profile)
- Employee card displays:
  - Photo (with initials fallback)
  - Name with hover highlight
  - Role badge (Manager, Pump Boy, Pump Attendant, Cashier, Accountant, Tank Supervisor, Security, Housekeeping)
  - Joining date (monospace)
  - Employment type indicator
  - Employee ID (truncated)
- Horizontal card layout, 1-2 columns grid
- Uses server action (`actions/employees.ts` → `getClientEmployees()`)
- Components: `employee-card.tsx`, `view-employee-list.tsx`

### Employee Profile (`/employee/[id]`)
- Detailed employee profile page
- Header section with large photo, name, role badge, station
- Employment Details card:
  - Role, Employment Type, Joining Date, Salary (INR formatted)
- Contact Information card:
  - Phone, Address, Aadhaar (masked: XXXX XXXX 1234)
- Station assignment info with status
- Back navigation to employee list
- Uses server action (`actions/employees.ts` → `getEmployeeById()`)
- Component: `employee-profile.tsx`

### Employee Shifts (`/employee/shifts`)
- Manage and assign shifts to employees (managers and pump boys)
- **Filter Bar** (horizontal, above table):
  - Employee name search (partial match, case-insensitive)
  - Station dropdown filter
  - Role dropdown (Manager / Pump Boy)
  - Status dropdown (Ongoing / Completed)
  - Date range picker (From Date / To Date)
  - Assigned By dropdown (managers)
  - Pump dropdown
  - Active filter count badge
  - "Clear all" button to reset filters
  - Filters apply globally across all tabs
  - Client-side filtering for instant results
- **Data Table View** with @tanstack/react-table:
  - Columns: Employee, Station, Role, Time, Assigned By, Pump, Status
  - Row selection with checkboxes
  - Sortable columns (click header to sort)
  - Pagination with rows per page selector (5/10/20/50)
  - Actions menu (3-dot): End Shift, Delete
- **Add Shift Dialog** (modal form):
  - Station selection dropdown
  - Employee selection (both managers and pump boys, with role displayed)
  - Optional pump and nozzle assignment
  - Optional manager assignment (assigned_by)
  - Date picker for shift date
  - Start and end time inputs
  - Calculates total hours automatically
- **Tabbed Interface**:
  - **Current tab**: Ongoing shifts (no end_time or current time within shift period) with pulsing indicator
  - **Past tab**: Completed shifts (end_time in the past)
  - **Per-Station tabs**: Shows all shifts for each station with count badge
  - Summary stats showing active and completed counts
  - Tab counts update based on active filters
- Uses server action (`actions/shifts.ts` → `getClientShifts()`, `addShift()`, `deleteShift()`, `endShift()`)
- Components: `shifts-table/` (columns, data-table), `add-shift-dialog.tsx`, `shifts-filter-bar.tsx`, `employee-shifts-list.tsx`

### Employee Attendance (`/employee/attendance`)
- Track and manage daily employee attendance
- **Summary Stats Cards**: Present, Absent, Half Day, Leave counts for today
- **Two Table Views** with @tanstack/react-table:
  - **Individual Records View** (Today tab):
    - Columns: Employee (with photo), Station, Date, Status, Hours, Marked By
    - Actions menu (3-dot): Edit, Delete
    - Filtering by employee name and attendance status
  - **Aggregated View** (Week/Month/Station tabs):
    - One row per employee (no duplicates)
    - Columns: Employee (with photo), Station, Days (total count), Present, Absent, Half Day, Leave
    - Status columns show count badges (e.g., Present: 5, Absent: 1)
  - Both views have: Row selection, sortable columns, pagination
- **Mark Attendance Dialog** (modal form):
  - Station selection dropdown
  - Date picker for attendance date
  - Daily attendance sheet view showing all employees
  - Bulk status selection with "Mark all as" buttons (Present, Absent, Half Day, Leave)
  - Individual employee status and hours input
  - Manager selection for "Marked By" field
  - Edit mode for updating existing attendance records
- **Calendar View**:
  - Monthly calendar showing attendance patterns
  - Color-coded days based on attendance ratios (green = mostly present, red = mostly absent)
  - Tooltip showing breakdown (Present/Absent/Half Day/Leave counts)
  - Station filter dropdown
  - Month/year navigation
- **Tabbed Interface**:
  - **Today tab**: Individual attendance records with edit/delete actions
  - **This Week tab**: Aggregated by employee (one row per employee with days count)
  - **This Month tab**: Aggregated by employee for the month
  - **Per-Station tabs**: Aggregated by employee within each station
- Uses server action (`actions/attendance.ts` → `getClientAttendance()`, `getDailyAttendance()`, `markAttendance()`, `bulkMarkAttendance()`, `deleteAttendance()`, `getCalendarAttendance()`)
- Components: `attendance-table/` (columns with `getColumns()` and `getAggregatedColumns()`, data-table), `mark-attendance-dialog.tsx`, `attendance-calendar.tsx`, `attendance-list.tsx`

---

## Operations Module

### Daily Fuel Price (`/operations/daily-fuel-price`)
- Track and update daily fuel prices for all stations
- **Line Chart Visualization** (using shadcn/ui charts):
  - Price trends over time
  - Multiple fuel types displayed with different colors
  - Interactive tooltips showing price and date
  - Responsive chart container
- **Filters**:
  - Station dropdown (filter by specific station or all)
  - Fuel type dropdown (cascading based on station selection)
  - Date range picker (start and end date)
- **Current Prices Display**:
  - Cards showing current price per fuel type
  - Grouped by station
  - Shows price change indicators (up/down percentage)
  - Displays who updated the price and when
- **Update Price Dialog** (modal form):
  - Station selection dropdown
  - Fuel type selection (cascading from station)
  - New price input with validation
  - Effective date picker
  - Employee selection (who updated the price)
  - Shows price change preview (+/- amount)
- **Price History Table**:
  - Recent price changes (up to 100 records)
  - Columns: Date, Station, Fuel Type, Old Price, New Price, Change
  - Change shown as amount and percentage with color indicators
- Database uses UPSERT pattern (one active price per station+fuel type)
- Price changes automatically logged to `price_history_logs` via database trigger
- Uses server action (`actions/daily-fuel-price.ts` → `getCurrentFuelPrices()`, `getPriceHistory()`, `getPriceChartData()`, `getStationsWithFuelTypes()`, `getStationEmployeesForPrice()`, `updateDailyFuelPrice()`)
- Components: `daily-fuel-price-list.tsx`, `update-price-dialog.tsx`, `price-history-chart.tsx`

### Daily Sale Record (`/operations/daily-sale-record`)
- Record daily fuel sales with meter readings and payment breakdowns per nozzle
- **Filter Selection**:
  - Station dropdown (required)
  - Employee dropdown (who is recording the sales)
  - Date picker (defaults to today, can select past dates)
- **Role-Based Nozzle Access**:
  - **Manager**: Sees ALL nozzles for the station
  - **Pump Boy**: Sees only nozzles assigned to their active shifts on that date
- **Nozzle Entry Form** (per nozzle):
  - Opening reading (auto-filled from previous day's close reading)
  - Close reading (required for saving)
  - Testing quantity (deducted from total liters calculation)
  - Fuel price per liter (auto-filled from current price, editable)
  - Calculated fields: total liters, total amount (displayed, computed)
  - Payment breakdown: Cash, UPI, Card, Credit sales
  - Payment total with mismatch indicator (amber highlight if doesn't match calculated amount)
- **Visual Indicators**:
  - "First Record" badge for nozzles with no previous data
  - "Editing" badge when updating existing records
  - Red border on close reading if less than opening reading
- **Features**:
  - Auto-fill opening reading from previous close reading
  - Auto-fill fuel price from `daily_fuel_price` or `fuel_types.fueltype_price`
  - Edit mode: pre-fills form when record exists for nozzle+date
  - Bulk save: saves all nozzle records in single operation
  - Reset button to restore original values
- Database uses UPSERT pattern (unique constraint: `nozzle_id, sale_date`)
- Computed fields (`total_liters`, `total_amount`) calculated both client-side and by database trigger
- **Tank Stock Sync**: Database triggers auto-decrement tank.current_stock on sale INSERT, adjust on UPDATE, restore on DELETE
- Uses server action (`actions/daily-sale-record.ts` → `getStationEmployeesForSaleRecord()`, `getNozzlesForSaleEntry()`, `getPreviousCloseReadings()`, `getExistingSaleRecords()`, `saveDailySaleRecords()`)
- Component: `daily-sale-record-list.tsx`

### Credit Customers (`/credit/customers`)
- Manage credit customers and their registered vehicles
- **Summary Stats Cards**: Total Customers, Total Outstanding Balance, Average Balance
- **Data Table View** with @tanstack/react-table:
  - Columns: Customer (name + GST), Station, Phone, Credit Limit (type badge), Balance (color-coded), Discount, Vehicles count
  - Row selection with checkboxes
  - Sortable columns (click header to sort)
  - Pagination with rows per page selector
  - Actions menu (3-dot): View Details, Manage Vehicles, Edit, Delete
- **Add/Edit Credit Customer Dialog** (modal form):
  - Station selection dropdown
  - **Basic Information**: Customer name, GST number (optional), registration date
  - **Contact Information**: Phone (required), alternate phone, email
  - **Address**: Line 1, Line 2, City, State, Pincode
  - **Credit Settings**:
    - Limit Type: Amount (₹) or Quantity (Liters)
    - Credit Limit Value (must be > 0)
    - Discount Type: None, Amount per Liter (₹/L), or Percentage (%)
    - Discount Value (max 100 for percentage)
  - Form validation using `lib/validation/indian-formats.ts` validators
  - Edit mode for updating existing customers
- **Manage Vehicles Dialog** (modal):
  - Add new vehicles with vehicle number and optional type
  - Table of registered vehicles with delete action
  - Vehicle number normalized (uppercase, no spaces)
- **Tabbed Interface**:
  - **All Customers tab**: Shows all credit customers across stations
  - **Per-Station tabs**: Shows customers filtered by station with count badge
- **Delete Protection**: Cannot delete customers with outstanding balance
- Uses server action (`actions/credit-customers.ts` → `getClientCreditCustomers()`, `addCreditCustomer()`, `updateCreditCustomer()`, `deleteCreditCustomer()`, `addVehicle()`, `deleteVehicle()`)
- Components: `credit-customer-list.tsx`, `add-credit-customer-dialog.tsx`, `manage-vehicles-dialog.tsx`, `credit-customers-table/` (columns, data-table)

### Product Sales Entry (`/operations/product-sales`)
- Record non-fuel product sales (lubricants, coolants, accessories, etc.)
- **Filter Selection**:
  - Station dropdown (required)
  - Employee dropdown (who is recording the sale)
  - Date picker (defaults to today)
- **Dynamic Line Items Entry Form**:
  - Add multiple line items per submission
  - Each line item: product selection (from station's available products), quantity, unit price (auto-filled from product's selling_price, editable), payment method (cash/upi/card/bank_transfer/credit)
  - Shows available stock for each selected product
  - Auto-computes total amount (quantity x unit price) per line item
  - Add/remove line items dynamically
- **Stock Management**:
  - Database trigger auto-decrements `current_stock` on station_products after INSERT
  - Database trigger auto-restores `current_stock` on station_products after DELETE
- **History Table**:
  - View past product sale records with filtering by station and date range
  - Columns: Date, Product, Quantity, Unit Price, Total, Payment Method, Employee
  - Pagination with rows per page selector
  - Delete action per record (restores stock via trigger)
- React Query caching (`useProductSales()`) for instant navigation
- Uses server action (`actions/product-sales.ts` -> `getStationsForProductSales()`, `getStationEmployeesForProductSales()`, `getAvailableProducts()`, `saveProductSaleItems()`, `getProductSalesHistory()`, `deleteProductSaleItem()`)
- Component: `operations/product-sales-list.tsx`

---

### Daily Entry (`/operations/daily-entry`)
- Unified form for recording daily station operations in one place
- **Sections** (all in one form):
  - **Fuel Prices**: Update daily fuel prices per fuel type
  - **Nozzle Sales**: Record nozzle meter readings with opening/close/testing qty
  - **Expenses**: Add station expenses (10 categories, 5 payment methods)
  - **Credit Entries**: Record credit transactions for credit customers with vehicle selection
  - **Product Sales**: Record non-fuel product sales
- Station and date selection at top
- Uses server action (`actions/daily-sale-record.ts` → `saveDailyEntryRecords()`, `getCreditCustomersForDSR()`, `getVehiclesForDSR()`, `getExistingCreditEntriesForDSR()`)
- Components: `operations/daily-entry/` (daily-entry-form, fuel-price-section, nozzle-sale-section, nozzle-card, expense-section, credit-entry-row, product-sale-section)

### Credit Transactions (`/credit/transactions`)
- View and manage credit purchase transactions
- **Data Table View** with @tanstack/react-table:
  - Columns: Customer, Station, Vehicle, Fuel Type, Quantity, Amount, Payment Status, Date
  - Payment status badges: Unpaid (red), Partially Paid (amber), Paid (green)
  - Actions: Add Transaction, Delete
- **Add Credit Transaction Dialog**: Customer, station, vehicle, fuel type, quantity, unit price, date
- Filters by station and payment status
- Uses server action (`actions/credit-transactions.ts`)
- Components: `credit-transaction-list.tsx`, `add-credit-transaction-dialog.tsx`, `credit-transactions-table/`

### Credit Payments (`/credit/payments`)
- Record and track payments from credit customers
- **Data Table View** with @tanstack/react-table:
  - Columns: Customer, Station, Amount, Payment Mode, Reference, Balance Before/After, Date
  - Actions: Add Payment, Delete
- **Add Credit Payment Dialog**: Customer, station, transaction (optional link), amount, payment mode, reference number, date
- Auto-computes balance_before and balance_after via database triggers
- Uses server action (`actions/credit-payments.ts`)
- Components: `credit-payment-list.tsx`, `add-credit-payment-dialog.tsx`, `credit-payments-table/`

### Purchases (`/purchases`)
- Record incoming fuel and product purchases from suppliers
- **Two purchase types**: Fuel purchases (with tank allocation) and Product purchases (with stock updates)
- **Fuel Purchase Form**: Vendor, date, payment method, GST amount, fuel items (fuel type, price per liter, quantity), tank allocation per fuel item
- **Product Purchase Form**: Vendor, date, payment method, GST amount, product items (product, price, quantity)
- **Stock Triggers**: Fuel allocations auto-increment tank.current_stock; product purchases auto-increment station_products.current_stock
- **History Table**: View past purchases with delete action
- React Query caching (`usePurchases()`)
- Uses server action (`actions/purchases.ts`)
- Component: `operations/purchase-management.tsx`

### Expenses (`/operations/expenses`)
- Track station-level expenses across 10 categories
- **Categories**: maintenance, utilities, rent, insurance, marketing, office_supplies, transportation, professional_fees, taxes, other
- **Payment Methods**: cash, upi, card, credit, bank_transfer
- **Add Expense Form**: Station, approved by (employee), date, category, amount, payment method, vendor name, description
- **History Table**: View past expenses with filtering by station and date range, delete action
- React Query caching (`useExpenses()`)
- Uses server action (`actions/expenses.ts`)
- Component: `operations/expense-management.tsx`

### Stock View (`/stock`)
- Real-time view of fuel tank and product stock levels
- **Fuel Tanks Section**: Tank name, fuel type, station, capacity, current stock, fill percentage bar
- **Product Stock Section**: Product name, station, current stock, minimum stock, low-stock warning
- **Low-Stock Alerts**: Highlighted products below minimum stock threshold
- React Query caching (`useStock()` with 30s staleTime for fresher data)
- Uses server action (`actions/stock.ts`)
- Component: `operations/stock-view.tsx`

### Settlement (`/operations/settlement`)
- Records fund movements between payment methods (cash, UPI, card, bank)
- **Net Position Summary**: 3 summary cards (Cash, UPI, Card) showing inflow, outflow, and net position for selected station+date
  - Aggregates from: daily_sale_records, product_sale_items, credit_payments (inflows), station_expenses, purchases (outflows), and existing settlements
- **Settlement Form**: Dynamic line items — each row has From method, To method, bank account selectors (conditional), amount, reference, notes
  - Bank method links to registered accounts from `client_bank_accounts`
  - Auto-updates `client_bank_accounts.current_balance` via database triggers on INSERT/DELETE
- **Settlement History**: Filterable table with station, date range filters, client-side pagination (10/page)
  - Delete with AlertDialog confirmation (auto-reverses bank balance)
- React Query caching (`useSettlements()`)
- Uses server actions (`actions/settlement.ts`)
- Component: `operations/settlement-management.tsx`

---

## Ask Astra - AI Analytics Chatbot (`/ask-astra`)
- Natural language interface to query fuel station data
- **Chat Interface**:
  - Message bubbles for user and assistant
  - Loading states with animations
  - Suggested queries for new users
  - Auto-scroll to latest messages
  - Conversation history stored in localStorage
- **Backend (FastAPI + LangGraph)**:
  - SSE streaming for real-time responses
  - LangGraph workflow: understand → generate SQL → validate → execute → format response
  - Groq LLM (llama-3.3-70b-versatile) for SQL generation
  - 4-way query classification: `data_query`, `greeting`, `follow_up`, `meta`
- **Query Classification**:
  - `data_query`: Data questions → generates SQL, executes, shows results
  - `greeting`: Casual chat → conversational response only
  - `follow_up`: References prior context → rewrite to standalone, then SQL
  - `meta`: Capabilities or **how-to questions** (e.g., "How can I add an employee?") → text response with navigation buttons, no SQL
- **SQL Security**:
  - SELECT-only queries (blocks INSERT, UPDATE, DELETE, DROP, etc.)
  - Client-scoped queries (all queries filter by user's `client_id`)
  - Query validation with sqlparse
  - LIMIT 1000 enforced on all queries
  - 30-second query timeout
- **Concise Response Generation**:
  - Strict prompt rules for accurate, concise responses (2-3 sentences max)
  - Numbers must match data exactly - no guessing
  - Direct answers without filler phrases
  - For counts: states exact number (e.g., "You have 4 employees")
  - For lists: says "Here are your X [items]" without listing in text
- **Conditional Display** (visualization-based):
  - `text`: Text response only — no results table, no SQL toggle (greetings, meta/how-to)
  - `card`: Text + metric card — no SQL toggle (simple counts/aggregates)
  - `table`: Text + data table + SQL toggle (list queries)
  - `chart`: Text + chart + SQL toggle (trends, comparisons)
  - SQL and results are **not** shown for every response — only when relevant
- **Result Components**:
  - `TableResult`: Data table with scrolling, formatted values
  - `ChartResult`: shadcn/ui chart visualizations (Line, Bar, Pie)
  - `CardResult`: Single metric display
- **Navigation Buttons (Generative UI)**:
  - Context-aware navigation suggestions appear below responses
  - Keyword-based mapping to relevant dashboard pages
  - Up to 2 navigation buttons per response
  - Available on data query responses AND meta/how-to responses
  - 25 supported routes covering all application pages (see `navigation_mapper.py` for full list)
  - Backend utility: `app/utils/navigation_mapper.py`
  - Frontend component: `navigation-buttons.tsx`
- **Collapsible SQL View**: Shown only for `table` and `chart` visualizations
- Uses server action (`actions/ask-astra.ts` → `askQuestion()`, `getSuggestedQueries()`, `getStreamUrl()`)
- Components: `chat-interface.tsx`, `chat-message.tsx`, `chat-input.tsx`, `result-renderer.tsx`, `table-result.tsx`, `chart-result.tsx`, `card-result.tsx`, `suggested-queries.tsx`, `navigation-buttons.tsx`
- **Backend Status Indicator**: Shows real-time FastAPI backend connection status in top-right header

---

## Click Astra - OCR Document Processing (`/click-astra`)
- Upload images or PDFs and extract structured data using OCR
- **Upload Form**:
  - Document name input (auto-filled from filename, editable)
  - Date picker (defaults to today)
  - Image upload or camera capture with **switch camera button** (toggle front/back)
  - **PDF preview**: Shows actual PDF content in iframe (not just icon)
  - **Extraction Templates**: Save/load column configurations for reuse
    - Template dropdown to load saved configurations
    - "Save as Template" button to save current columns
    - Delete templates no longer needed
  - Extraction columns input (add fields to extract like "Invoice Number", "Amount")
  - LLM instructions text box (custom instructions for AI processing)
- **Document Records Table** (using @tanstack/react-table):
  - View all uploaded documents with status
  - **Row selection with checkboxes** (select individual or all)
  - Sortable columns (Name, Date, Status)
  - Pagination with rows per page selector (5/10/20/50)
  - Status badges: Pending, Processing, Completed, Verified, Failed
  - Actions dropdown: View details, Process OCR, Verify results, Delete
  - **Backend Status Indicator**: Shows FastAPI backend connection status near section title
- **Processing Workflow (Backend LangGraph)**:
  1. Fetch image from Supabase storage
  2. Call Mistral OCR API to extract text
  3. Pass OCR text + extraction columns + instructions to Groq LLM (llama-3.3-70b-versatile)
  4. Store structured response for human verification
- **Verification Dialog**:
  - View extracted image/PDF (PDF shown in iframe)
  - **Smart field display**:
    - Simple values: Input field
    - Arrays (e.g., Item names): Each item on separate line
    - Objects/nested data: Formatted JSON with indentation in textarea
  - Edit AI-extracted values before confirming
  - Mark as verified after review
- **Excel Export**:
  - **Export selected rows or all**: When rows selected, exports only those; otherwise exports all completed/verified records
  - Button text shows "Export Selected (N)" when rows selected, "Export All" otherwise
  - Exports **only user-specified extraction columns** (no metadata)
  - Properly handles nested objects/arrays (converts to JSON string)
  - Uses xlsx library (dynamically imported at usage point — only loaded when user clicks export)
- **Backend (FastAPI)**:
  - Endpoint: `/api/v1/click-astra/process`
  - Mistral OCR API for text extraction
  - Groq LLM (llama-3.3-70b-versatile) for structured data extraction
- Uses server action (`actions/click-astra.ts` → `getClickAstraRecords()`, `createClickAstraRecord()`, `processClickAstraOCR()`, `verifyClickAstraRecord()`, `deleteClickAstraRecord()`, `exportClickAstraRecords()`, `getClickAstraTemplates()`, `createClickAstraTemplate()`, `deleteClickAstraTemplate()`)
- Components: `click-astra/click-astra-form.tsx`, `click-astra/click-astra-records-table/` (columns, data-table)
