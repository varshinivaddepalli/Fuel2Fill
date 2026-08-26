# Astraveda - Petrol Bunk ERP System
## Product Features Document v2.0

**Document Status:** Draft for Internal Review
**Last Updated:** 2026-02-06
**Source:** Features_v1.pdf (raw notes) — refined and restructured

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Access Control](#2-user-roles--access-control)
3. [Module 1 — Registration / Master Data](#3-module-1--registration--master-data)
4. [Module 2 — Daily Operations](#4-module-2--daily-operations)
5. [Module 3 — Stock Management1](#5-module-3--stock-management)
6. [Module 4 — Purchase Management](#6-module-4--purchase-management)
7. [Module 5 — Financial Management](#7-module-5--financial-management)
8. [Module 6 — Credit Management](#8-module-6--credit-management)
9. [Business Logic & Formulas](#9-business-logic--formulas)
10. [Open Questions & Decisions Needed](#10-open-questions--decisions-needed)
11. [Future Scope (Deferred)](#11-future-scope-deferred)

---

## 1. System Overview

Astraveda is an ERP platform purpose-built for petrol bunk (fuel station) operations in India. The system manages the complete lifecycle of a fuel station — from station setup and infrastructure registration, through daily sales operations, inventory tracking, employee management, credit customer handling, and financial reconciliation.

### Core Concept: Multi-Station Architecture

A single **Owner** can own and operate **multiple stations**. All data is scoped to a station, meaning every transaction, employee, tank, pump, and report is tied to a specific station. The Owner has a unified view across all their stations.

### Entity Hierarchy

```
Owner (User)
 └── Station 1
 │    ├── Fuel Types (e.g., Petrol, Diesel, Premium)
 │    ├── Tanks (each linked to one Fuel Type)
 │    ├── Pumps (physical dispensing units)
 │    │    └── Nozzles (each linked to one Pump + one Tank)
 │    ├── Products (Lubricants, Coolants, etc.)
 │    ├── Employees (Managers, Pump Boys)
 │    ├── Credit Customers
 │    └── Bank Accounts / UPI IDs
 └── Station 2
      └── ... (same structure)
```

---

## 2. User Roles & Access Control

| Role | Description | Access Level |
|------|-------------|--------------|
| **Owner** | Business owner, can have multiple stations | Full access to everything across all stations |
| **Manager** | Station-level manager, runs day-to-day ops | Full access within their assigned station(s). Cannot register new stations. |
| **Employee (Pump Boy)** | Field staff operating pumps | Limited access — can only see assigned nozzles/pumps, enter daily readings |

### Access Matrix

| Feature | Owner | Manager | Employee |
|---------|:-----:|:-------:|:--------:|
| Station Registration | Yes | No | No |
| Fuel Type Registration | Yes | Yes | No |
| Tank Registration | Yes | Yes | No |
| Pump Registration | Yes | Yes | No |
| Nozzle Registration | Yes | Yes | No |
| Product Registration | Yes | Yes | No |
| Employee Registration | Yes | Yes | No |
| Credit Customer Registration | Yes | Yes | No |
| Daily Fuel Price Entry | Yes | Yes | Yes |
| Daily Fuel Sale Entry | Yes | Yes | Yes |
| Product Sales Entry | Yes | Yes | Yes |
| Employee Shift Assignment | Yes | Yes | No |
| Attendance | Yes | Yes | No |
| Credit Sales | Yes | Yes | No |
| Expense Management | Yes | Yes | No |
| Purchase Management | Yes | Yes | No |
| Bank Account / UPI Management | Yes | Yes | No |
| Credit Payments | Yes | Yes | No |

---

## 3. Module 1 — Registration / Master Data

All registration modules are the foundational "setup" layer. These define the station's physical infrastructure, products, employees, and credit customers. Data entered here is referenced across all operational modules.

---

### 3.1 Station Registration

**Access:** Owner only

Registers a new fuel station under the owner's account.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Text | Yes | Unique name for identification |
| SAP Code | Text | Yes | Oil company's SAP dealer code |
| GST Number | Text | Yes | 15-digit GSTIN, validated format |
| Phone Number | Text | Yes | Primary contact for the station |
| Opening Date | Date | Yes | Date the station became operational |
| Address Line 1 | Text | Yes | |
| Address Line 2 | Text | No | |
| City | Text | Yes | |
| State | Dropdown | Yes | Indian states list |
| Pin Code | Text (6 digits) | Yes | Validated 6-digit Indian pincode |
| Coordinates (Lat/Lng) | Decimal | No | For map integration (future) |

**Validation Rules:**
- GST Number must follow the `XX-XXXXX-XXXXX-X-XX` pattern
- Phone number must be 10 digits (Indian mobile)
- Pin code must be exactly 6 digits

---

### 3.2 Fuel Type Registration

**Access:** Manager / Owner

Registers fuel types available at a station. Fuel price is NOT stored here — it is managed via the daily fuel price operation (since prices change daily).

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | From registered stations |
| Fuel Type | Text | Yes | e.g., MS (Petrol), HSD (Diesel), Premium Petrol |
| HSN Code | Text | Yes | Harmonized System Nomenclature code for GST |
| Unit of Measure | Dropdown | Yes | Litres (default for fuel) |

**Removed fields (per v1 revision):** ~~Price per Unit~~ — managed in Daily Fuel Price instead.

---

### 3.3 Tank Registration

**Access:** Manager / Owner

Registers physical storage tanks at a station. Each tank stores exactly one fuel type.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Tank Name | Text | Yes | e.g., "Tank-1", "Underground Tank A" |
| Station Name | Dropdown | Yes | From registered stations |
| Fuel Type | Dropdown | Yes | From fuel types registered at that station |
| Capacity | Number (Litres) | Yes | Maximum capacity of the tank |

**Business Rule:** Multiple tanks can store the same fuel type (common in large stations).

---

### 3.4 Pump Registration

**Access:** Manager / Owner

Registers physical pump machines (dispensing units). Each pump has one or more nozzles.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Pump Name | Text | Yes | e.g., "Pump-1", "Island A Pump" |
| Station Name | Dropdown | Yes | From registered stations |
| Number of Nozzles | Dropdown (1-10) | Yes | Numeric dropdown: 1, 2, 3, ... |

**Note:** The nozzle count here is informational. Actual nozzles are registered separately in Nozzle Registration (3.5) and linked back to this pump.

---

### 3.5 Nozzle Registration

**Access:** Manager / Owner

Registers individual nozzles. A nozzle is the lowest physical unit — it dispenses fuel from a specific tank, mounted on a specific pump.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | From registered stations |
| Nozzle Name | Text | Yes | e.g., "Nozzle-1A", "P1-N1" |
| Pump Name | Dropdown | Yes | From pumps registered at that station |
| Tank Name | Dropdown | Yes | From tanks registered at that station |

**Removed fields (per v1 revision):** ~~Fuel Type~~ — derived automatically from the linked Tank's fuel type.

**Derived Data:**
- `Fuel Type` = the fuel type of the selected Tank (read-only, auto-populated)

---

### 3.6 Product Registration

**Access:** Manager / Owner

Registers non-fuel products sold at the station (lubricants, coolants, additives, accessories, etc.).

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | From registered stations |
| Product Name | Text | Yes | e.g., "Engine Oil 1L", "Coolant 500ml" |
| Selling Price | Number | Yes | Current selling price (INR) |
| Current Stock | Number | Yes | Opening stock quantity |
| Minimum Stock | Number | Yes | Threshold for low-stock alerts |

**Removed fields (per v1 revision):** ~~Purchase Price~~, ~~Discount Amount~~ — purchase price is captured at the time of purchase (Module 4). Discounts not applicable at product registration level.

---

### 3.7 Employee Registration

**Access:** Manager / Owner

Registers staff members working at a station.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | From registered stations |
| Employee Photo | Image Upload | Yes | Profile photo for identification |
| Employee Name | Text | Yes | Full name |
| Employee Role | Dropdown | Yes | Manager / Pump Boy / Cashier / Other |
| Employee Type | Dropdown | Yes | Full Time / Part Time |
| Phone Number | Text | Yes | 10-digit Indian mobile |
| Aadhar Number | Text | Yes | 12-digit Aadhaar, validated format |
| Address | Text | Yes | Full postal address |
| Joining Date | Date | Yes | Date of joining |
| Monthly Salary | Number | Conditional | **Visible only if Employee Type = "Full Time"**. Hidden for Part Time. |

**Conditional Logic:**
- If `Employee Type = Full Time` → show `Monthly Salary` field
- If `Employee Type = Part Time` → hide `Monthly Salary` field

---

### 3.8 Credit Customer Registration

**Access:** Manager / Owner

Registers businesses or individuals who buy fuel/products on credit (to be billed later). This must be accessible from the main Registration navigation page.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | From registered stations |
| Customer Name | Text | Yes | Business or individual name |
| GST Number | Text | No | For B2B customers |
| Registration Date | Date | Yes | Date of onboarding |
| Phone | Text | Yes | Primary contact |
| Alternative Phone | Text | No | Secondary contact |
| Email | Email | No | For invoice delivery |
| Address | Text | Yes | |
| City | Text | Yes | |
| State | Dropdown | Yes | |
| Pincode | Text (6 digits) | Yes | |
| Limit Type | Radio/Toggle | Yes | **Amount** or **Quantity** |
| Credit Limit | Number | Yes | Max outstanding amount (INR) or quantity (Litres) depending on Limit Type |
| Discount Type | Dropdown | Yes | Percentage / Flat Amount / None |
| Discount Value | Number | Conditional | Required if Discount Type is not "None" |

**Business Rules:**
- If `Limit Type = Amount` → Credit Limit is in INR (e.g., Rs. 50,000)
- If `Limit Type = Quantity` → Credit Limit is in Litres (e.g., 5,000 L)
- System should prevent credit sales that would exceed the customer's credit limit

---

## 4. Module 2 — Daily Operations

These are the day-to-day transactional features used by station staff every day.

---

### 4.1 Daily Fuel Price Entry

**Access:** Manager / Employee

Fuel prices change daily (set by oil marketing companies). This module captures the current day's price for each fuel type at a station.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Date | Date | Yes | Defaults to today |
| Station Name | Dropdown | Yes | |

**Dynamic Row (one per fuel type at the station):**

| Fuel Type | Fuel Price (INR/Litre) |
|-----------|----------------------|
| Auto-populated from station's registered fuel types | Manual entry |

**Removed fields (per v1 revision):** ~~Updated By~~ — can be tracked via audit log instead.

**Business Rules:**
- Only one price entry per fuel type per station per day
- Price is referenced by Daily Fuel Sale Entry and Credit Sales for calculations
- Historical prices must be retained (no overwrite — or if editable, maintain audit trail)

---

### 4.2 Daily Fuel Sale Entry

**Access:** Manager / Employee

This is the **core daily workflow**. At the end of a shift or day, each employee (pump boy) records the meter readings for their assigned nozzles. The system calculates sales volume, amounts, and cash reconciliation.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | |
| Date | Date | Yes | Defaults to today |
| Employee Name | Dropdown | Yes | If logged-in user is Manager, show all pump boys. If pump boy, pre-filled. |

**Nozzle Visibility Rule:**
- **Manager:** Sees all nozzles at the station
- **Pump Boy:** Sees only nozzles assigned to them via Shift Assignment (4.4)

**Per-Nozzle Entry Table:**

| Nozzle | Open Reading | Closed Reading | Testing QTY |
|--------|:------------:|:--------------:|:-----------:|
| Nozzle 1 | Auto-filled (previous day's closed reading) — **Not Editable** | Manual entry | Manual entry (litres used for calibration testing) |
| Nozzle 2 | Auto-filled — **Not Editable** | Manual entry | Manual entry |
| ... | ... | ... | ... |

**Payment Breakdown:**

| UPI Amount | Card Amount (Default) | Credit Amount |
|:----------:|:---------------------:|:-------------:|
| Manual entry | Manual entry | Manual entry |

**Calculated Fields (Background — Not Editable):**

| Metric | Formula |
|--------|---------|
| **Per-Nozzle Sales Qty** | `Closed Reading - Open Reading - Testing QTY` |
| **Per-Nozzle Sales Amount** | `(Closed Reading - Open Reading - Testing QTY) * Fuel Price` |
| **Total Fuel Sales Amount** | Sum of all nozzle sales amounts |
| **Fuel Cash Sales** | `Total Fuel Sales Amount - (UPI + Cards + Credit)` |

**Non-Editable Fields:** Open Reading, Fuel Price (auto-fetched from Daily Fuel Price Entry).

**Open Design Decision:** See [Question Q1](#10-open-questions--decisions-needed) — Should UPI, Card, and Credit amounts be entered **per nozzle** or as a **single aggregate** for the entire employee's shift?

---

### 4.3 Product Sales Entry

**Access:** Manager / Employee

Records non-fuel product sales (lubricants, accessories, etc.).

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | |
| Date | Date | Yes | Defaults to today |
| Employee Name | Dropdown | Yes | |

**Line Items (repeatable rows with "+" button to add more):**

| Product Name | Quantity | Payment Method |
|:------------:|:--------:|:--------------:|
| Dropdown (from registered products) | Number | UPI / Cash / Card |

**Calculated Fields (Background):**
- `Per-Line Amount = Quantity * Selling Price` (selling price from Product Registration)
- `Total Product Sales Amount = Sum of all line amounts`

---

### 4.4 Employee Shift Assignment

**Access:** Manager only

Assigns employees to specific pumps/nozzles/products for a given shift. This controls what nozzles a pump boy can see in Daily Fuel Sale Entry.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | |
| Employee Name | Dropdown | Yes | From employees at that station |
| Shift Date | Date | Yes | |
| Start Time | Time | Yes | |
| End Time | Time | Yes | |
| Assignment Type | Radio | Yes | **Pump** OR **Nozzle** (mutually exclusive) |
| Pump(s) Assigned | Multi-select Dropdown | Conditional | If Assignment Type = Pump |
| Nozzle(s) Assigned | Multi-select Dropdown | Conditional | If Assignment Type = Nozzle |
| Products Assigned | Multi-select Dropdown | No | Optional: products the employee can sell |

**Business Rules:**
- A shift assignment is either **Pump-based** or **Nozzle-based** — not both
- If **Pump** is selected → the employee is responsible for ALL nozzles under that pump
- **No restrictions** on how many employees can be assigned to one nozzle
- **No restrictions** on how many nozzles/pumps one employee can be assigned to
- These assignments drive the nozzle visibility filter in Daily Fuel Sale Entry

**Removed fields (per v1 revision):** ~~Assigned By~~ — can be tracked via audit log.

---

### 4.5 Attendance

**Access:** Manager only

Tracks daily attendance of employees.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | |
| Employee Name | Dropdown | Yes | |
| Date | Date | Yes | |
| Status | Dropdown | Yes | Present / Absent / Half-Day / Leave |
| Hours Worked | Number | No | Can be auto-derived from Shift Assignment (optional integration) |

**Optional Enhancement:** If Employee Shift Assignment data exists for the date, `Status` and `Hours Worked` can be pre-populated (Manager can override).

---

### 4.6 Credit Sales

**Access:** Manager / Employee

Records fuel sold on credit to registered credit customers.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Credit Customer Name | Dropdown | Yes | From registered credit customers at that station |
| Sale Type | Radio | Yes | **Amount** or **Quantity** |
| Total Amount / Quantity | Number | Yes | Overall credit sale value for this transaction |

**Outstanding Display:** The customer's current outstanding amount/quantity and their credit limit should be **visible by default** on this screen for reference.

**Fuel Line Items (dynamic rows):**

| Fuel Type | Amount / Quantity | Nozzle Number |
|:---------:|:-----------------:|:-------------:|
| Dropdown | Number | Dropdown |

**Auto-Row Logic:** If the sum of line-item amounts/quantities does not equal the entered Total, a new empty row is automatically added for the user to fill.

**Calculated Fields:**
- `Amount = Quantity * Fuel Price on that date` (from Daily Fuel Price Entry)

**Open Design Decision:** See [Question Q2](#10-open-questions--decisions-needed) — Should products (non-fuel items) also be sellable on credit?

---

### 4.7 Expense Management

**Access:** Manager / Owner

Records all station-level expenses.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | |
| Approved By | Dropdown | Yes | Manager / Owner name |
| Date | Date | Yes | |
| Category | Dropdown | Yes | See categories below |
| Amount | Number (INR) | Yes | |
| Payment Method | Dropdown | Yes | UPI / Cash / Card / Credit / Bank Transfer |
| Vendor / Supplier Name | Text | No | |
| Description | Text Area | No | Free-text notes |

**Expense Categories:**
1. Maintenance
2. Utilities
3. Rent
4. Insurance
5. Marketing
6. Office Supplies
7. Transportation
8. Professional Fees
9. Taxes
10. Other

**Future Enhancement:** OCR-based auto-fill from scanned receipts/bills (flagged in v1 notes).

---

## 5. Module 3 — Stock Management

### 5.1 Current Stock View

Provides a real-time view of fuel and product inventory at a station.

| Field | Type | Notes |
|-------|------|-------|
| Station Name | Dropdown | |
| Date | Date | Defaults to today |

**Fuel Stock (per Tank):**

| Tank Name | Fuel Type | Current Stock (Litres) |
|-----------|-----------|:----------------------:|
| Auto-populated | Derived from tank | Calculated |

**Formula:**
```
Current Stock of Tank = Previous Stock
                        - Total sales from all nozzles connected to this tank
                        + Purchases received into this tank
```

**Product Stock:**

| Product Name | Current Stock (Units) |
|--------------|:---------------------:|
| Auto-populated | Calculated |

**Formula:**
```
Current Stock of Product = Previous Stock
                           - Total sales quantity of that product
                           + Purchases of that product
```

**Alerts:** When stock falls below `Minimum Stock` (set in Product Registration), flag a low-stock warning.

---

## 6. Module 4 — Purchase Management

Records all incoming fuel and product purchases (from oil companies and product suppliers).

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Date | Date | Yes | Purchase/delivery date |
| Station Name | Dropdown | Yes | |
| Payment Method | Dropdown | Yes | Bank Transfer / Cash / UPI / Credit |

**Purchase Type Toggle:** `Fuel` or `Product` (radio/tab selection)

**If Fuel Purchase — Line Items:**

| Fuel Type | Purchase Price/Ltr | Total Quantity | Tank Allocation |
|:---------:|:------------------:|:--------------:|:---------------:|
| Dropdown | Number | Number (Litres) | See below |

**Tank Allocation Sub-Table (per fuel line):**

| Tank Name | Quantity (Litres) |
|:---------:|:-----------------:|
| Dropdown (tanks of matching fuel type) | Number |

The sum of tank-wise quantities must equal the Total Quantity for that fuel line.

**If Product Purchase — Line Items:**

| Product Name | Purchase Price | Quantity |
|:------------:|:--------------:|:--------:|
| Dropdown | Number | Number |

**Additional Fields:**

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| GST Amount | Number | Yes | GST charged on the invoice |

**Calculated Fields:**
```
Total Invoice Amount = Sum(Purchase Price per Ltr * Total Qty for each fuel line)
                     + Sum(Purchase Price * Qty for each product line)
                     + GST
```

**Future Enhancement:** Auto-generate purchase invoices.

---

## 7. Module 5 — Financial Management

### 7.1 Bank Account Registration

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | |
| Account Number | Text | Yes | |
| Account Holder Name | Text | Yes | |
| Bank Name | Text | Yes | |
| Is Primary Account? | Toggle (Yes/No) | Yes | Only one primary per station |
| Opening Balance | Number (INR) | Yes | Starting balance |

### 7.2 UPI ID Registration

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Registered Mobile Number | Text | Yes | 10-digit mobile |
| UPI Registered Name | Text | Yes | |
| UPI ID(s) | Text (multiple) | Yes | e.g., `name@upi`, allow adding multiple IDs |
| Linked Bank Account | Dropdown | Yes | From registered bank accounts |

### 7.3 Cash Reconciliation (Derived)

This is a **calculated view**, not a manual entry screen. It shows cash physically present at the station.

```
Cash Present at Station = Fuel Cash Sales
                        + Product Cash Sales
                        + Previous Cash at Station
                        - Expenses (where Payment Method = Cash)
                        - Cash Purchases
                        - Deposits into Bank Account
```

### 7.4 Total Sales Summary (Derived)

```
Total Sales = Total Fuel Sales Amount + Total Product Sales Amount
```

---

## 8. Module 6 — Credit Management

### 8.1 Credit Payments (Collections)

Records payments received from credit customers against their outstanding balance.

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Station Name | Dropdown | Yes | |
| Credit Customer Name | Dropdown | Yes | From registered credit customers |
| Amount Received | Number (INR) | Yes | |
| Payment Mode | Dropdown | Yes | Cash / Bank Transfer / UPI |
| Sales Return / Credit Note Amount | Number (INR) | No | If any goods returned or credit note issued |

### 8.2 Outstanding Calculation

```
Outstanding Amount (Receivable) = Total Credit Sale Invoices
                                 - Payments Received
                                 - Credit Notes / Returns
```

This should be visible on the Credit Customer's profile and on the Credit Sales entry screen.

---

## 9. Business Logic & Formulas

### 9.1 Fuel Sales Calculations

| Metric | Formula |
|--------|---------|
| Nozzle Sales Quantity | `Closed Reading - Open Reading - Testing QTY` |
| Nozzle Sales Amount | `Nozzle Sales Quantity * Fuel Price (of that day)` |
| Total Fuel Sales Amount | `Sum of all Nozzle Sales Amounts` |
| Fuel Cash Sales | `Total Fuel Sales Amount - UPI - Cards - Credit` |

### 9.2 Product Sales Calculations

| Metric | Formula |
|--------|---------|
| Line Item Amount | `Quantity * Selling Price` |
| Total Product Sales Amount | `Sum of all line item amounts` |

### 9.3 Stock Calculations

| Metric | Formula |
|--------|---------|
| Tank Current Stock | `Previous Stock - Total Nozzle Sales (from connected nozzles) + Purchases into this tank` |
| Product Current Stock | `Previous Stock - Total Product Sales Qty + Purchases` |

### 9.4 Financial Calculations

| Metric | Formula |
|--------|---------|
| Cash at Station | `Fuel Cash Sales + Product Cash Sales + Previous Cash - Cash Expenses - Cash Purchases - Bank Deposits` |
| Total Sales | `Total Fuel Sales Amount + Total Product Sales Amount` |
| Credit Outstanding | `Total Credit Invoices - Payments Received - Credit Notes/Returns` |

### 9.5 Purchase Calculations

| Metric | Formula |
|--------|---------|
| Total Invoice Amount | `Sum(Fuel Price/Ltr * Qty) + Sum(Product Price * Qty) + GST` |

---

## 10. Open Questions & Decisions Needed

These are unresolved items identified in the v1 notes that need a product decision before development.

### Q1: UPI / Card / Credit — Nozzle-wise or Aggregate?

**Context:** In Daily Fuel Sale Entry, should the employee enter UPI, Card, and Credit amounts **per nozzle** or as a **single total** for their entire shift?

| Option | Pros | Cons |
|--------|------|------|
| **Per Nozzle** | More granular tracking, easier to reconcile per fuel type | More data entry burden on pump boys |
| **Aggregate (per employee per day)** | Simpler and faster data entry | Cannot attribute payment methods to specific fuel types |

**Recommendation:** Start with **Aggregate** (simpler UX for pump boys), with the option to add per-nozzle breakdown later.

---

### Q2: Can Products be Sold on Credit?

**Context:** The Credit Sales module currently only covers fuel. Should non-fuel products (lubricants, accessories) also be allowed as credit sales?

| Option | Impact |
|--------|--------|
| **Yes** | Credit Sales needs a "Product" tab alongside "Fuel", and credit limit checks need to account for product amounts too |
| **No (Fuel only)** | Simpler implementation. Products are always cash/UPI/card. |

**Recommendation:** Yes — many fleet customers purchase both fuel and lubricants on credit. This should be supported.

---

### Q3: Deposit into Account Tracking

**Context:** The Cash Reconciliation formula references "Deposit into Account" but there is no dedicated module for recording cash deposits from the station to the bank. How should this be tracked?

| Option | Impact |
|--------|--------|
| Add a **Cash Deposit** entry screen | New simple module: Station, Date, Amount, Bank Account, Deposited By |
| Track via **Expense Management** with a "Bank Deposit" category | Reuses existing module but semantically incorrect (a deposit is not an expense) |

**Recommendation:** Add a dedicated **Cash Deposit / Bank Transfer** entry — it's a common daily activity and deserves its own clean workflow.

---

### Q4: Multi-Shift Support Per Day

**Context:** Many stations operate in 2-3 shifts. Can the same employee have multiple shift entries on the same day? Can different employees enter fuel sales for different shifts on the same nozzle?

**Recommendation:** Yes — the system should support multiple shifts per day per nozzle, each linked to a different employee and shift time.

---

### Q5: Dip Stock / Physical Stock Entry

**Context:** Petrol bunks typically do a daily "dip reading" to physically measure fuel in tanks. This is compared against the calculated book stock to identify gains/losses. There is no module for this in v1.

**Recommendation:** Add a **Dip Stock Entry** module where the manager enters the physical dip reading per tank daily. The system then shows `Variance = Book Stock - Dip Stock`.

---

## 11. Future Scope (Deferred)

The following were flagged in the v1 notes as future enhancements. They are **NOT in scope** for the initial release but should be architecturally considered.

### 11.1 Employee Payments & Payroll

| Feature | Description |
|---------|-------------|
| Salary Disbursement | Monthly salary payout tracking for full-time employees |
| Payment History | Record of all payments made to each employee with date, amount, mode |
| Advance / Deduction Handling | Track salary advances given and deduct from future payouts |
| Payslip Generation | Auto-generate monthly payslips with breakdown |

---

### 11.2 Dip Reading / Physical Stock Verification

| Feature | Description |
|---------|-------------|
| Daily Dip Entry | Manager enters physical dip reading (in cm/litres) per tank daily |
| Book vs Physical Comparison | System auto-calculates `Variance = Book Stock - Dip Stock` |
| Gain/Loss Tracking | Flag tanks with consistent shortages or gains over time |
| Dip Chart Integration | Convert dip (cm) to litres using tank-specific calibration charts |

---

### 11.3 Station Document Storage (Digital Vault)

| Feature | Description |
|---------|-------------|
| Document Upload | Upload and store station-level documents (licenses, NOCs, rental deeds, insurance, etc.) |
| Category Tagging | Categorize documents: License, Agreement, Insurance, Tax, Legal, Other |
| Expiry Tracking | Set expiry dates on documents; system sends renewal reminders |
| Secure Access | Only Owner and Manager can view/download documents |

---

### 11.4 Complete Accounting Module

| Feature | Description |
|---------|-------------|
| Ledger Management | Maintain ledgers for all parties — suppliers, credit customers, bank accounts, cash |
| Journal Entries | Record manual accounting adjustments |
| Day Book | Auto-generated daily transaction summary across all heads |
| Trial Balance | System-generated trial balance from all recorded transactions |
| Balance Sheet | Auto-generated balance sheet for the station/owner |
| Cash Flow Statement | Track money in vs money out across all channels |

---

### 11.5 Invoice Generation

| Feature | Description |
|---------|-------------|
| Credit Sales Invoices | Auto-generate GST-compliant tax invoices for credit customers |
| Purchase Invoices | Record and store purchase invoices from suppliers |
| Consolidated Monthly Statements | Generate monthly credit statements per customer |
| Invoice Numbering | Auto-incrementing, station-wise invoice series |
| PDF / Print / Email | Export invoices as PDF, print directly, or email to customer |

---

### 11.6 Reports & P&L Statements

| Feature | Description |
|---------|-------------|
| Daily Sales Report (DSR) | Station-wise daily summary — fuel sales, product sales, collections, expenses |
| Monthly Sales Report | Aggregated monthly view with trends |
| Profit & Loss Statement | Revenue - COGS - Expenses = Net Profit, per station and consolidated |
| Fuel-wise Sales Report | Sales volume and revenue breakdown by fuel type |
| Employee Performance Report | Sales per employee, shift-wise productivity |
| Credit Customer Ageing Report | Outstanding amounts bucketed by 30/60/90/120+ days |
| Stock Report | Current stock, consumption trends, variance (book vs dip) |
| Bank Reconciliation Report | Match bank deposits against recorded collections |
| Custom Date Range Filtering | All reports filterable by station, date range, fuel type, employee |

---

### 11.7 GST Return Support

| Feature | Description |
|---------|-------------|
| GSTR-1 Data Preparation | Auto-compile outward supply data (credit sales invoices) for GSTR-1 filing |
| GSTR-3B Summary | Summary of tax liability and input tax credit for GSTR-3B |
| HSN-wise Summary | Aggregate sales by HSN code for GST return schedules |
| Input Tax Credit Tracking | Track GST paid on purchases for ITC claims |
| Export to Tally / JSON | Export GST data in formats compatible with Tally or GST portal upload |

---

### 11.8 Issue Tracker / Maintenance Log

| Feature | Description |
|---------|-------------|
| Raise Issue | Log equipment issues — pump malfunction, tank leak, nozzle error, electrical, etc. |
| Priority & Status | Mark priority (High/Medium/Low) and status (Open/In Progress/Resolved) |
| Assign To | Assign issue to an employee or external vendor |
| Resolution Tracking | Record resolution notes, date, and cost |
| History Log | Full timeline of all issues per station for audit |

---

### 11.9 Other Future Enhancements

| Feature | Notes |
|---------|-------|
| **OCR for Expense Entry** | Scan receipts/bills to auto-fill expense fields |
| **Map Integration** | Use station coordinates for a multi-station map view |
| **Notifications & Alerts** | Low stock alerts, credit limit breach warnings, price change reminders |
| **Audit Trail** | Track who changed what and when across all modules |
| **Mobile App** | Field-level data entry for pump boys via mobile |

---

## Appendix: Data Relationships

```
Station ──┬── has many ── Fuel Types
          ├── has many ── Tanks ────── each has one Fuel Type
          ├── has many ── Pumps ────── each has many Nozzles
          │                              └── each Nozzle links to one Pump + one Tank
          ├── has many ── Products
          ├── has many ── Employees
          ├── has many ── Credit Customers
          ├── has many ── Bank Accounts
          ├── has many ── UPI IDs ──── each links to one Bank Account
          └── has many ── Daily Entries (Prices, Sales, Expenses, Purchases, etc.)
```

---

*End of Document*
