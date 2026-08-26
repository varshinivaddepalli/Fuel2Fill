# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Petro Astra V1** - Internal Dashboard application (Analytics + CRUD) for fuel station management.

### Purpose
- Manage fuel station infrastructure (stations, tanks, pumps, nozzles)
- Track employees, shifts, and attendance
- Record daily fuel sales and prices
- Manage credit customers and their transactions
- AI-powered analytics via natural language queries (Ask Astra)
- OCR document processing for invoices and receipts (Click Astra)

### Tech Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Client-side Caching**: TanStack Query (React Query) for instant navigation
- **Auth**: Supabase (@supabase/supabase-js, @supabase/ssr)
- **Backend**: FastAPI + Python 3.11+ + LangChain + LangGraph
- **AI**: Groq (llama-3.3-70b-versatile for both Ask Astra SQL and Click Astra OCR)
- **Database**: Supabase with RLS policies

---

## Detailed Context

For detailed information, refer to the `/context` folder:

| File | Contents |
|------|----------|
| `context/database-schema.md` | All database tables, Supabase storage buckets, TypeScript types |
| `context/frontend-architecture.md` | Frontend structure, components, server actions, sidebar navigation |
| `context/backend-architecture.md` | Backend structure, API endpoints, LangGraph agents |
| `context/features.md` | Detailed documentation of all implemented features |
| `context/aws-monitoring.md` | AWS monitoring guide: Amplify, Lambda, CloudWatch, Cost Explorer, Budgets |

---

## Environment Variables

### Frontend (`/frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_ASK_ASTRA_API_URL=http://localhost:8000
```

### Backend (`/backend/.env`)
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
CLICK_ASTRA_MODEL=llama-3.3-70b-versatile
MISTRAL_API_KEY=your-mistral-api-key
LANGSMITH_API_KEY=your-langsmith-api-key
LANGSMITH_TRACING=true
CORS_ORIGINS=http://localhost:3000
```

---

## Development Commands

### Frontend (`/frontend`)
```bash
npm install              # Install dependencies
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # Run ESLint
```

### Backend (`/backend`)
```bash
pip install -r requirements.txt    # Install dependencies
python -m uvicorn app.main:app --reload    # Start dev server (localhost:8000)
```

---

## Conventions

### File Organization
- Route groups: `(auth)` for public auth pages, `(dashboard)` for protected routes
- Route-level loading: `loading.tsx` files in `(dashboard)/`, `(dashboard)/operations/`, `(dashboard)/employee/`, `(dashboard)/credit/` for Suspense boundaries
- shadcn/ui components → `components/ui/`
- Feature components → `components/{feature}/` (auth, dashboard, registration, employee, operations, etc.)
- Database types → `types/database.ts`
- Validation utilities → `lib/validation/`
- Server actions → `actions/` directory

### Form Pattern (Registration Forms)
All forms follow this pattern:
1. Client-side validation before submission
2. Server action for database operations with ownership verification
3. Comprehensive error handling with user feedback
4. Toast notifications via `sonner` for success/error
5. Loading states during async operations
6. Auto-redirect to dashboard on success

### Data Fetching in Forms
- Use `useEffect` to load available options on mount
- Load dependent data when parent selections change (cascading dropdowns)
- Show conditional messages when prerequisites aren't met

### Client-Side Caching (React Query)
For list/dashboard pages, use React Query hooks from `hooks/use-data.ts` for instant navigation:

**Available Hooks:**
- `useDashboardKpis(stationId, period, customRange?)` - Dashboard KPIs + chart data
- `useDashboardOperational(stationId)` - Tanks, stock, credit, workforce, alerts
- `useStations()` - Client stations list
- `useStationsWithCounts()` - Stations with infrastructure counts (for View Stations)
- `useStationDetail(stationId)` - Station with all related entities (for station detail page)
- `useEmployees()` - Employees grouped by station
- `useShifts()` - Current and past shifts
- `useAttendance()` - Attendance data (today, week, month)
- `useCreditCustomers()` - Credit customers list
- `useProductSales()` - Product sales history
- `useExpenses()` - Expense history
- `usePurchases()` - Purchase history
- `useStock()` - Stock overview (30s staleTime for fresher data)
- `useSettlements()` - Settlement history

**Cache Invalidation:**
```typescript
const { invalidateShifts, invalidateDashboard, invalidateProductSales, invalidateExpenses, invalidatePurchases, invalidateStock, invalidateSettlements, invalidateAll } = useInvalidateQueries()

// After mutations, invalidate relevant caches
const handleDelete = useCallback(async (id: string) => {
  const result = await deleteItem(id)
  if (result.success) {
    invalidateShifts()
    invalidateDashboard() // Also refresh dashboard stats
  }
}, [invalidateShifts, invalidateDashboard])
```

**Cache Settings (configured in `providers/query-provider.tsx`):**
- `staleTime: 60s` - Data considered fresh for 60 seconds
- `gcTime: 10min` - Cache kept for 10 minutes after component unmounts
- `refetchOnWindowFocus: false` - No refetch when tab regains focus
- `networkMode: "offlineFirst"` - Show cached data immediately
- **QueryProvider is scoped to `(dashboard)/layout.tsx` only** — auth/onboarding pages do not mount QueryClient
- Dashboard data prefetch only fires when `pathname.startsWith("/dashboard")` (not on every page)

**When to use React Query vs useEffect:**
- **React Query**: List pages where navigation back should be instant (Dashboard, Employees, Shifts, Attendance)
- **useEffect**: Dialogs/forms that fetch on-demand data, cascading dropdowns

### Code Splitting (Dynamic Imports)
All page-level components use `next/dynamic` for route-based code splitting. This ensures each page only downloads the JS it needs.

**Pattern for page files:**
```typescript
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const PurchaseManagement = dynamic(
  () => import("@/components/operations/purchase-management").then(m => ({ default: m.PurchaseManagement })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)
```

**Pages using dynamic imports:**
- All 6 operation pages (expenses, settlement, daily-entry, daily-sale-record, product-sales, daily-fuel-price)
- Standalone pages: purchases, stock
- All 3 credit pages (credit customers, credit transactions, credit payments)
- All employee list/detail pages (shifts, attendance, view-employee, employee profile)
- Ask Astra (`ChatInterface`), Click Astra (`ClickAstraForm`)
- Profile (`ProfileForm`), View Stations (`ViewStationsList`), Station Detail (`StationDetail`)
- Dashboard chart components (all 8 chart/card imports in `dashboard-content.tsx` use `ChartSkeleton`/`CardSkeleton` as fallbacks)

**Pages with static imports (exceptions):**
- Registration forms (add-station, add-tank, add-pump, etc.) — small destination forms, rarely navigated back to
- `dashboard/page.tsx` — wraps `DashboardContent` in `Suspense` (charts are lazy inside it)

**Heavy library lazy-loading:**
- `xlsx` — dynamically imported at usage point in `click-astra-form.tsx` (`const XLSX = await import("xlsx")`)
- `recharts` — lazy via dynamic `ChartResult` in `result-renderer.tsx` and `PriceHistoryChart` in `daily-fuel-price-list.tsx`

### Client-Side Filtering Pattern
For pages with complex filtering needs (multiple filter criteria applied globally across tabs):

```typescript
// 1. Define filter state
interface Filters {
  employeeName: string
  stationId: string
  status: string
  dateFrom: string
  dateTo: string
}
const [filters, setFilters] = useState<Filters>(defaultFilters)

// 2. Extract filter options from UNFILTERED data (so all options always visible)
const filterOptions = useMemo(() => {
  const stations = new Map<string, string>()
  allData.forEach((item) => {
    if (item.station_id) stations.set(item.station_id, item.station_name)
  })
  return { stations: Array.from(stations, ([value, label]) => ({ value, label })) }
}, [allData])

// 3. Apply filters using useCallback
const applyFilters = useCallback((data: DataType[]) => {
  return data.filter((item) => {
    if (filters.stationId && item.station_id !== filters.stationId) return false
    if (filters.employeeName && !item.name.toLowerCase().includes(filters.employeeName.toLowerCase())) return false
    return true
  })
}, [filters])

// 4. Create filtered datasets
const filteredData = useMemo(() => applyFilters(allData), [applyFilters, allData])
```

- **Use for**: Shifts page (filters across Current/Past/Station tabs), future report pages
- **Pattern**: Separate filter bar component (`*-filter-bar.tsx`) + filtering logic in parent component

### Date Handling
- **Always use local timezone** for DATE columns (attendance_date, joining_date, etc.)
- **Never use** `new Date().toISOString().split("T")[0]` - this returns UTC which shows "yesterday" in IST
- **Use** `getTodayDateString()` for today's date in forms
- **Use** `formatDateForInput(date)` to convert Date objects to YYYY-MM-DD

### DateTime Handling for Server Actions
- **IMPORTANT**: Server actions run on the server (UTC timezone), so datetime construction must happen on the client
- **Client-side datetime construction**: Create `Date` object and call `toISOString()` on the client before passing to server action
- **Example pattern** (for shifts, appointments, etc.):
```typescript
// CLIENT COMPONENT - Construct ISO string here (correct local timezone)
const startDate = new Date(`${formData.date}T${formData.time}:00`)
const startDatetime = startDate.toISOString()

// Handle overnight shifts (e.g., 9 PM to 6 AM)
if (endDate <= startDate) {
  endDate.setDate(endDate.getDate() + 1)
}

// Send ISO strings to server action
const result = await addShift({
  start_datetime: startDatetime,  // Already in correct UTC format
  end_datetime: endDatetime,
})
```
- **Server action**: Just use the pre-converted ISO strings directly, no Date manipulation needed

### Key Utilities (`lib/utils.ts`)
- `cn()` - Class name merging
- `formatSnakeCase()` - Convert snake_case to Title Case
- `getInitials()` - Get initials from name (e.g., "John Doe" → "JD")
- `formatDateShort()` - Format date as "01 Jan 2024"
- `formatDateLong()` - Format date as "1 January 2024"
- `formatTime()` - Format time display
- `formatShiftDateTime()` - Format shift datetime as "15 Jan 2024, 09:00 AM"
- `formatDateForInput()` - Format Date to YYYY-MM-DD in local timezone
- `getTodayDateString()` - Get today's date as YYYY-MM-DD in local timezone
- `toNullIfEmpty()` - Convert empty string to null (for optional form fields)
- `formatCurrency()` - Format amount as Indian Rupee currency (e.g., 50000 → "₹50,000")

### Auth Utilities (`lib/auth/client-profile.ts`)
- `isSupabaseConfigured()` - Check if Supabase env vars are set before use
- `clientExistsByEmail()` - Check if user has client profile
- `getClientByEmail()` - Get full client profile

### Other Utilities
- `toast` from `sonner` - Success/error notifications
- `useBreadcrumb()` from `providers/breadcrumb-context` - Set dynamic breadcrumb labels:
  - `setDynamicLabel(segment, label)` - Set label for a route segment (e.g., station ID → station name)
  - `clearDynamicLabel(segment)` - Clear the dynamic label on unmount
- `ScrollProgressBar` from `components/ui/scroll-progress-bar.tsx` - Horizontal scroll progress indicator in dashboard header (passive scroll listener, ref-based updates)

### Backend Status Indicator (`components/ui/backend-status-indicator.tsx`)
- Reusable component showing FastAPI backend connection status
- Uses server action (`actions/health.ts`) to check `/api/v1/health` endpoint
- Shows: green (connected), yellow (connecting), red (disconnected)
- Auto-refreshes every 30 seconds, click to manually refresh
- Used in: Ask Astra (top-right header), Click Astra (near Document Records)

### Ask Astra Query Classification
- 4-way classification in `prompts.py`: `data_query`, `greeting`, `follow_up`, `meta`
- `meta` includes **how-to questions** (e.g., "How can I add an employee?") — no SQL generated
- How-to questions get text response + navigation buttons to the relevant app page

### Ask Astra Conditional Display
- SQL toggle and results table are **not** shown for every response
- Visibility is determined by the `visualization_hint` from the backend:
  - `text`: No results, no SQL (greetings, meta/how-to)
  - `card`: Show card, no SQL (simple counts)
  - `table`: Show table + SQL toggle (list data)
  - `chart`: Show chart + SQL toggle (trends, comparisons)
- Frontend logic in `chat-message.tsx` and `result-renderer.tsx`

### Ask Astra Navigation Buttons (`backend/app/utils/navigation_mapper.py`)
- Generative UI feature: navigation buttons appear below chat responses
- Keyword-based route detection (no LLM call for efficiency)
- Up to 2 navigation suggestions per response
- Available on data query responses AND meta/how-to responses
- Routes must match frontend sidebar exactly (see `app-sidebar.tsx`)
- **Adding new routes**: Update both `NAVIGATION_ROUTES` and `KEYWORD_MAPPINGS` dicts
- Frontend component: `components/ask-astra/navigation-buttons.tsx`

**Current routes (26 total):** See `navigation_mapper.py` for the full list. Add Bank Account is in the sidebar but not yet in the nav mapper.
- Dashboard, View Stations, Add Station/Fuel Type/Tank/Pump/Nozzle/Product/Employee
- View Employee, Shifts, Attendance
- Daily Entry, Daily Fuel Price, Daily Sale Record, Product Sales
- Stock View, Purchases (standalone)
- Credit Customers/Transactions/Payments, Expenses, Settlement
- Ask Astra, Click Astra, Profile

**Matching priority:** Longer keyword phrases match first (e.g., "add employee" → Add Employee page, not View Employee).

### Validation Utilities (`lib/validation/indian-formats.ts`)
- `validatePhone()` - 10-15 digit phone numbers
- `validatePincode()` - 6-digit Indian pincode
- `validatePAN()` - Format: ABCDE1234F
- `validateAadhaar()` - 12-digit number
- `validateGST()` - Complex GST format validation
- `validateLatitude()`, `validateLongitude()` - GPS coordinate bounds

### Navigation
- When creating new page components, add link to sidebar navigation
- Operations items → "Operations" dropdown (6 items: Daily Entry, Daily Fuel Price, Daily Sale Record, Product Sales, Expenses, Settlement)
- Purchases (`/purchases`) — standalone item below Operations
- Credit items → "Credit" dropdown (3 items: Credit Customers, Credit Transactions, Credit Payments)
- Employee-related items → "Employee" dropdown (4 items: Add Employee, View Employee, Shifts, Attendance)
- Stock View (`/stock`) — standalone item below Employee
- Registration items → "Registration" dropdown (4 items: View Stations, Station Master, Add Product, Add Bank Account). Station Master consolidates Add Station/Fuel Type/Tank/Pump/Nozzle into a single tabbed page.
