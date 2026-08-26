# Frontend Architecture

This document details the frontend structure for Petro Astra V1.

## Directory Structure (`/frontend/src`)

### App Router (`app/`)
- `(auth)/` - Auth route group (login, forgot-password)
- `(dashboard)/` - Protected routes with sidebar layout
  - `layout.tsx` - Dashboard layout with sidebar, auth check, onboarding redirect, and breadcrumb navigation
  - `dashboard/page.tsx` - Main dashboard page
  - `ask-astra/` - AI analytics chatbot page
  - `click-astra/` - OCR document processing page
  - `registration/` - Registration routes (add-station, view-stations, view-stations/[station_id], add-fuel-type, add-tank, add-pump, add-nozzle, add-product, add-bank-account)
  - `employee/` - Employee management routes (add-employee, view-employee, shifts, attendance, [id] profile)
  - `operations/` - Operations routes (daily-entry, daily-fuel-price, daily-sale-record, product-sales, purchases, expenses, stock, settlement)
  - `credit/` - Credit routes (customers, transactions, payments)
  - `profile/` - User profile page (view/edit client info)
- `onboarding/` - First-time user onboarding (outside dashboard group)
- `auth/callback/` - Supabase auth callback
- Placeholder routes (not yet implemented): `admin/`, `analytics/`, `projects/`, `reports/`, `settings/`, `teams/`, `users/`

### Components (`components/`)
- `ui/` - shadcn/ui components (button, input, label, card, sidebar, sonner, collapsible, breadcrumb, select, popover, calendar, table, checkbox, dialog, pagination, dropdown-menu, tabs, textarea, scroll-area, badge, backend-status-indicator, switch, etc.)
- `auth/` - Authentication components (login-form, forgot-password-form)
- `dashboard/` - Dashboard components (app-sidebar, nav-user, dashboard-breadcrumb, dashboard-content, dashboard-skeleton, dashboard-header, kpi-card, kpi-row, revenue-trend-chart, station-comparison-chart, payment-breakdown-chart, credit-overview-card, workforce-card, alerts-card, stock-alerts-card, tank-levels-card, quick-actions-card)
- `onboarding/` - Onboarding components (onboarding-form)
- `registration/` - Registration components (add-station-form, add-fuel-type-form, add-tank-form, add-pump-form, add-nozzle-form, add-product-form, add-employee-form, add-bank-account-form, form-error-banner, form-footer, station-required-gate)
- `stations/` - Station management components (view-stations-list, station-card, station-detail, station-overview-tab, station-infrastructure-tab, station-products-tab, station-edit-dialog, delete-confirm-dialog, topology/ [topology-view, topology-dialog, station-tree, tree-node])
- `employee/` - Employee management components (employee-card, view-employee-list, employee-profile, employee-shifts-list, add-shift-dialog, shifts-filter-bar, shifts-table/, attendance-list, mark-attendance-dialog, attendance-calendar, attendance-table/)
- `operations/` - Operations components (daily-fuel-price-list, update-price-dialog, price-history-chart, daily-sale-record-list, product-sales-list, credit-customer-list, add-credit-customer-dialog, manage-vehicles-dialog, credit-customers-table/, daily-entry/ [daily-entry-form, fuel-price-section, nozzle-sale-section, nozzle-card, expense-section, credit-entry-row, product-sale-section], credit-transaction-list, add-credit-transaction-dialog, credit-transactions-table/, credit-payment-list, add-credit-payment-dialog, credit-payments-table/, expense-management, purchase-management, settlement-management, stock-view)
- `ask-astra/` - AI chatbot components (chat-interface, chat-message, chat-input, chat-welcome, chat-history-sidebar, result-renderer, table-result, chart-result, card-result, suggested-queries, navigation-buttons)
- `click-astra/` - OCR document processing components (click-astra-form)
- `profile/` - User profile components (profile-form)
- `shared/` - Shared components (logo)

### Libraries (`lib/`)
- `supabase/` - Supabase clients (client.ts, server.ts)
- `auth/` - Auth utilities (client-profile.ts):
  - `isSupabaseConfigured()` - Check if Supabase env vars are set
  - `clientExistsByEmail()` - Check if user has client profile
  - `getClientByEmail()` - Get full client profile
- `validation/` - Shared validation utilities (indian-formats.ts)
- `utils.ts` - General utilities:
  - `cn()` - Class name merging (clsx + tailwind-merge)
  - `formatSnakeCase()` - Convert snake_case to Title Case
  - `getInitials()` - Get initials from name
  - `formatDateShort()` - Format date as "01 Jan 2024"
  - `formatDateLong()` - Format date as "1 January 2024"
  - `formatTime()` - Format time display
  - `formatShiftDateTime()` - Format shift datetime as "15 Jan 2024, 09:00 AM"
  - `formatDateForInput()` - Format Date to YYYY-MM-DD in local timezone
  - `getTodayDateString()` - Get today's date as YYYY-MM-DD in local timezone
  - `toNullIfEmpty()` - Convert empty string to null
  - `formatCurrency()` - Format amount as Indian Rupee currency

### Other Directories
- `hooks/` - Custom React hooks:
  - `use-mobile.ts` - Mobile detection hook
  - `use-data.ts` - React Query data fetching hooks with client-side caching
- `providers/` - Context providers:
  - `breadcrumb-context.tsx` - Dynamic breadcrumb management
  - `query-provider.tsx` - TanStack Query provider with cache settings
- `store/` - State management
- `types/` - TypeScript types (database.ts, ask-astra.ts, dashboard.ts)
- `config/` - App configuration
- `lib/cache.ts` - Server-side request deduplication using React's `cache()`
- `lib/cache-invalidation.ts` - Server-side cache invalidation using `revalidatePath()`

---

## Server Actions (`actions/`)

| File | Functions | Purpose |
|------|-----------|---------|
| `station.ts` | `addStation()`, `updateStation()`, `deleteStation()` | Station CRUD operations |
| `stations.ts` | `getClientStations()` | Get all client's stations |
| `station-detail.ts` | `getStationsWithCounts()`, `getStationDetail()` | Station list with counts and detail page data |
| `fuel-type.ts` | `addFuelType()`, `getStationFuelTypes()` | Fuel type CRUD |
| `tank.ts` | `addTank()`, `getStationTanks()` | Tank CRUD |
| `pump.ts` | `addPump()`, `getStationPumps()` | Pump CRUD |
| `nozzle.ts` | `addNozzle()`, `getStationNozzles()` | Nozzle CRUD |
| `station-product.ts` | `addStationProduct()`, `getUserStations()` | Product CRUD |
| `employee.ts` | `addEmployee()` | Create employee |
| `employees.ts` | `getClientEmployees()`, `getEmployeeById()` | Employee listing and profile |
| `shifts.ts` | `getClientShifts()`, `addShift()` (accepts ISO datetime strings), `deleteShift()`, `endShift()`, `getStationEmployees()`, `getStationManagers()` | Shift management |
| `attendance.ts` | `getClientAttendance()`, `getDailyAttendance()`, `markAttendance()`, `bulkMarkAttendance()`, `deleteAttendance()`, `getCalendarAttendance()` | Attendance management |
| `profile.ts` | `getClientProfile()`, `updateClientProfile()` | User profile management |
| `daily-fuel-price.ts` | `getCurrentFuelPrices()`, `getPriceHistory()`, `getPriceChartData()`, `getStationsWithFuelTypes()`, `getStationEmployeesForPrice()`, `updateDailyFuelPrice()` | Daily fuel price management |
| `daily-sale-record.ts` | `getStationEmployeesForSaleRecord()`, `getNozzlesForSaleEntry()`, `getPreviousCloseReadings()`, `getExistingSaleRecords()`, `saveDailySaleRecords()`, `getCreditCustomersForDSR()`, `getVehiclesForDSR()`, `getExistingCreditEntriesForDSR()`, `saveDailyEntryRecords()` | Daily sale record and daily entry management |
| `product-sales.ts` | `getStationsForProductSales()`, `getStationEmployeesForProductSales()`, `getAvailableProducts()`, `saveProductSaleItems()`, `getProductSalesHistory()`, `deleteProductSaleItem()` | Product sales entry and history |
| `credit-customers.ts` | `getClientCreditCustomers()`, `getCreditCustomerById()`, `getStationsForCreditCustomers()`, `addCreditCustomer()`, `updateCreditCustomer()`, `deleteCreditCustomer()`, `addVehicle()`, `deleteVehicle()` | Credit customer and vehicle management |
| `credit-transactions.ts` | `getCreditTransactions()`, `addCreditTransaction()`, `deleteCreditTransaction()` | Credit transaction management |
| `credit-payments.ts` | `getCreditPayments()`, `addCreditPayment()`, `deleteCreditPayment()` | Credit payment management |
| `expenses.ts` | `getExpenseHistory()`, `addExpense()`, `deleteExpense()`, `getStationsForExpenses()`, `getStationEmployeesForExpenses()` | Station expense management |
| `purchases.ts` | `getPurchaseHistory()`, `addPurchase()`, `deletePurchase()`, `getStationsForPurchases()`, `getStationFuelTypesForPurchases()`, `getStationTanksForPurchases()`, `getStationProductsForPurchases()` | Purchase management |
| `stock.ts` | `getStockOverview()` | Fuel tank and product stock levels |
| `settlement.ts` | `getStationsForSettlement()`, `getClientBankAccounts()`, `getNetPositionSummary()`, `saveSettlements()`, `getSettlementHistory()`, `deleteSettlement()` | Settlement management |
| `dashboard-v2.ts` | `getDashboardKpis()`, `getDashboardOperational()` | Dashboard V2 KPIs and operational data |
| `bank-account.ts` | `addBankAccount()`, `getClientBankAccounts()` | Client bank account management |
| `ask-astra.ts` | `askQuestion()`, `getSuggestedQueries()`, `getStreamUrl()` | AI chatbot communication |
| `click-astra.ts` | `getClickAstraRecords()`, `createClickAstraRecord()`, `processClickAstraOCR()`, `updateClickAstraRecord()`, `verifyClickAstraRecord()`, `deleteClickAstraRecord()`, `exportClickAstraRecords()`, `getClickAstraTemplates()`, `createClickAstraTemplate()`, `deleteClickAstraTemplate()` | OCR document processing and templates |
| `health.ts` | `checkBackendHealth()` | Check FastAPI backend health status |

All server actions include:
- User authentication verification
- Client profile existence check
- Data ownership validation (station belongs to client)
- Relationship integrity checks

---

## Sidebar Navigation Structure

The sidebar includes:
- **Dashboard** (LayoutDashboard icon) - Main dashboard
- **Ask Astra** (Sparkles icon) - AI analytics chatbot
- **Click Astra** (ScanLine icon) - OCR document processing
- **Registration** (collapsible dropdown with 8 items):
  - View Stations (Eye icon) - List all stations with detail page
  - Add Station (Fuel icon)
  - Add Fuel Type (Droplets icon)
  - Add Tank (Container icon)
  - Add Pump (GaugeCircle icon)
  - Add Nozzle (Pipette icon)
  - Add Product (Package icon)
  - Add Bank Account (Landmark icon)
- **Employee** (collapsible dropdown with 4 items):
  - Add Employee (Users icon)
  - View Employee (Eye icon)
  - Employee Shifts (CalendarClock icon)
  - Attendance (ClipboardCheck icon)
- **Operations** (collapsible dropdown with 11 items):
  - Daily Entry (FilePenLine icon)
  - Daily Fuel Price (IndianRupee icon)
  - Daily Sale Record (Receipt icon)
  - Product Sales (ShoppingCart icon)
  - Credit Customers (UserCheck icon)
  - Credit Transactions (ArrowRightLeft icon)
  - Credit Payments (Wallet icon)
  - Purchases (Truck icon)
  - Expenses (HandCoins icon)
  - Stock View (Warehouse icon)
  - Settlement (Banknote icon)
- Menus auto-expand when on their respective routes

---

## Validation Utilities (`lib/validation/indian-formats.ts`)

Available validators:
- `validatePhone()` - 10-15 digit phone numbers
- `validatePincode()` - 6-digit Indian pincode
- `validatePAN()` - Format: ABCDE1234F
- `validateAadhaar()` - 12-digit number
- `validateGST()` - Complex GST format validation
- `validateLatitude()`, `validateLongitude()` - GPS coordinate bounds

---

## Caching Architecture

The application uses a multi-layer caching strategy for optimal performance:

### Layer 1: Server-Side Request Deduplication (`lib/cache.ts`)

Uses React's `cache()` function to deduplicate database calls within a single request:

```typescript
import { cache } from "react"

export const getAuthenticatedUser = cache(async () => { ... })
export const getClientByEmailCached = cache(async (email: string) => { ... })
export const getCachedClientStations = cache(async (clientId: string) => { ... })
export const getCachedEmployeesByStations = cache(async (stationIds: string[]) => { ... })
export async function getAuthContext() { ... } // Combines auth + client lookup
```

**IMPORTANT**: All server actions MUST use `getAuthContext()` from `@/lib/cache` for auth resolution:
```typescript
// ✅ CORRECT - Uses cached auth context
import { getAuthContext } from "@/lib/cache"
const { client } = await getAuthContext()
if (!client) {
  return { success: false, error: "Not authenticated or client profile not found" }
}

// ❌ WRONG - Direct auth calls (bypasses cache deduplication)
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
const client = await getClientByEmail(user.email)
```

### Layer 2: Supabase Client Optimization (`lib/supabase/`)

**Browser Client** (`client.ts`):
- Singleton pattern to reuse client across components
- Auth optimizations: `persistSession`, `autoRefreshToken`
- Uses localStorage for faster initial session retrieval
- Disabled `detectSessionInUrl` to reduce overhead

**Server Client** (`server.ts`):
- Session persistence and auto-refresh enabled
- Optimized for server component usage

### Layer 3: Client-Side Caching (`hooks/use-data.ts`)

Uses TanStack Query for client-side caching with instant navigation:

| Hook | Data | Used By |
|------|------|---------|
| `useDashboardKpis(stationId, period, customRange?)` | Dashboard KPIs + chart data | `dashboard-content.tsx` |
| `useDashboardOperational(stationId)` | Tanks, stock, credit, workforce, alerts | `dashboard-content.tsx` |
| `useStations()` | Stations list | Registration forms |
| `useStationsWithCounts()` | Stations with entity counts | `view-stations-list.tsx` |
| `useStationDetail(stationId)` | Station with all related entities | `station-detail.tsx` |
| `useEmployees()` | Employees by station | `view-employee-list.tsx` |
| `useShifts()` | Current/past shifts | `employee-shifts-list.tsx` (with client-side filtering) |
| `useAttendance()` | Today/week/month attendance | `attendance-list.tsx` |
| `useCreditCustomers()` | Credit customers | `credit-customer-list.tsx` |
| `useProductSales()` | Product sales history | `product-sales-list.tsx` |
| `useExpenses()` | Expense history | `expense-management.tsx` |
| `usePurchases()` | Purchase history | `purchase-management.tsx` |
| `useStock()` | Stock overview (30s staleTime) | `stock-view.tsx` |
| `useSettlements()` | Settlement history | `settlement-management.tsx` |
| `usePrefetch()` | Proactive data loading | Navigation components |

**Cache Settings** (`providers/query-provider.tsx`):
- `staleTime: 60 * 1000` (60 seconds) - Increased for less refetching
- `gcTime: 10 * 60 * 1000` (10 minutes) - Longer cache retention
- `retry: 1`
- `refetchOnWindowFocus: false`
- `refetchOnReconnect: false`
- `networkMode: "offlineFirst"` - Show cached data immediately
- `placeholderData` - Shows previous data while fetching

### Layer 4: Cache Invalidation

**Client-side** (`hooks/use-data.ts`):
```typescript
const { invalidateShifts, invalidateDashboard, invalidateFuelPrices, invalidateProductSales, invalidateExpenses, invalidatePurchases, invalidateStock, invalidateSettlements, invalidateAll } = useInvalidateQueries()
// Call after mutations to refetch data
```

**Server-side** (`lib/cache-invalidation.ts`):
```typescript
await invalidateStations()        // Invalidates dashboard and add-station pages
await invalidateEmployees()       // Invalidates employee pages
await invalidateShifts()          // Invalidates shifts page
await invalidateAttendance()      // Invalidates attendance page
await invalidateCreditCustomers() // Invalidates credit customer pages
await invalidateFuelPrices()      // Invalidates fuel price pages
await invalidateProductSales()    // Invalidates product sales page
await invalidateExpenses()        // Invalidates expenses page
await invalidatePurchases()       // Invalidates purchases page
await invalidateStock()           // Invalidates stock page
await invalidateSettlements()    // Invalidates settlement page
await invalidateDailyEntry()      // Invalidates daily entry page
await invalidateBankAccounts()    // Invalidates bank account page
```

### Data Flow

1. **First page load**: Server fetches data, React Query caches result
2. **Navigate away**: Data stays in React Query cache
3. **Navigate back**: Shows cached data instantly (no loading spinner)
4. **After 60 seconds**: Data marked stale, background refetch on next visit
5. **After mutation**: Cache invalidated, fresh data fetched
6. **Prefetching**: `usePrefetch()` hook preloads data before navigation

---

## Database Performance Indexes

The application uses comprehensive database indexes for faster queries (see `supabase/migrations/016_comprehensive_performance_indexes.sql`):

| Table | Index | Optimizes |
|-------|-------|-----------|
| `employee_attendance` | `(station_id, attendance_date)` | Attendance queries |
| `employee_attendance` | `(employee_id, attendance_date)` | Daily attendance |
| `employee_shifts` | `(station_id, status)` | Shift listing |
| `credit_customers` | `(station_id, status)` | Credit customer queries |
| `credit_customer_vehicles` | `(credit_customer_id, status)` | Vehicle counts |
| `credit_transactions` | `(credit_customer_id, transaction_date)` | Transaction history |
| `daily_fuel_price` | `(station_id, fueltype_id)` | Price lookups |
| `daily_sale_records` | `(nozzle_id, sale_date)` | Sale record queries |
| `pumps`, `nozzles`, `tanks`, `fuel_types` | `(station_id, status)` | Infrastructure queries |
