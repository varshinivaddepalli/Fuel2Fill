"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import { formatDateShort } from "@/lib/utils"
import type {
  TimePeriod,
  DateRange,
  DashboardKpisData,
  DashboardOperationalData,
  RevenueTrendPoint,
  PaymentBreakdown,
  StationComparisonItem,
  TankLevel,
  ProductStockAlert,
  DashboardAlert,
} from "@/types/dashboard"

// ─── Helpers ───────────────────────────────────────────

function computeDateRange(
  todayDate: string,
  period: TimePeriod,
  customRange?: DateRange
): { currentFrom: string; currentTo: string; prevFrom: string; prevTo: string; trendFrom: string } {
  const today = new Date(todayDate + "T00:00:00")

  if (period === "custom" && customRange) {
    const from = new Date(customRange.from + "T00:00:00")
    const to = new Date(customRange.to + "T00:00:00")
    const durationMs = to.getTime() - from.getTime()
    const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24))
    const prevTo = new Date(from.getTime() - 1000 * 60 * 60 * 24)
    const prevFrom = new Date(prevTo.getTime() - durationDays * 1000 * 60 * 60 * 24)
    return {
      currentFrom: customRange.from,
      currentTo: customRange.to,
      prevFrom: toYMD(prevFrom),
      prevTo: toYMD(prevTo),
      trendFrom: customRange.from,
    }
  }

  if (period === "today") {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const trendFrom = new Date(today)
    trendFrom.setDate(trendFrom.getDate() - 6)
    return {
      currentFrom: todayDate,
      currentTo: todayDate,
      prevFrom: toYMD(yesterday),
      prevTo: toYMD(yesterday),
      trendFrom: toYMD(trendFrom),
    }
  }

  if (period === "7days") {
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    const prevTo = new Date(from)
    prevTo.setDate(prevTo.getDate() - 1)
    const prevFrom = new Date(prevTo)
    prevFrom.setDate(prevFrom.getDate() - 6)
    return {
      currentFrom: toYMD(from),
      currentTo: todayDate,
      prevFrom: toYMD(prevFrom),
      prevTo: toYMD(prevTo),
      trendFrom: toYMD(from),
    }
  }

  // 30days
  const from = new Date(today)
  from.setDate(from.getDate() - 29)
  const prevTo = new Date(from)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - 29)
  return {
    currentFrom: toYMD(from),
    currentTo: todayDate,
    prevFrom: toYMD(prevFrom),
    prevTo: toYMD(prevTo),
    trendFrom: toYMD(from),
  }
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// ─── KPIs ──────────────────────────────────────────────

export type GetDashboardKpisResult =
  | { success: true; data: DashboardKpisData }
  | { success: false; error: string }

export async function getDashboardKpis(
  stationId: string,
  period: TimePeriod,
  customRange: DateRange | undefined,
  todayDate: string
): Promise<GetDashboardKpisResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const stations = await getCachedClientStations(client.client_id)
    if (stations.length === 0) {
      return { success: true, data: emptyKpis() }
    }

    const sids =
      stationId === "all"
        ? stations.map((s) => s.station_id)
        : [stationId]

    const stationNameMap = new Map(stations.map((s) => [s.station_id, s.station_name]))
    const { currentFrom, currentTo, prevFrom, prevTo, trendFrom } = computeDateRange(todayDate, period, customRange)
    const supabase = await createClient()

    // Run 9 queries in parallel - inline .in() to avoid Supabase type depth issue
    const [
      currSalesRes,
      prevSalesRes,
      currExpensesRes,
      prevExpensesRes,
      currProductSalesRes,
      prevProductSalesRes,
      trendRes,
      creditRes,
    ] = await Promise.all([
      // 1. Current period daily_sale_records
      supabase
        .from("daily_sale_records")
        .select("station_id, total_amount, total_liters, cash_sales, upi_sales, card_sales, credit_sales")
        .in("station_id", sids)
        .gte("sale_date", currentFrom)
        .lte("sale_date", currentTo)
        .eq("status", "active"),
      // 2. Previous period daily_sale_records
      supabase
        .from("daily_sale_records")
        .select("total_amount, total_liters")
        .in("station_id", sids)
        .gte("sale_date", prevFrom)
        .lte("sale_date", prevTo)
        .eq("status", "active"),
      // 3. Current period expenses
      supabase
        .from("station_expenses")
        .select("amount")
        .in("station_id", sids)
        .gte("expense_date", currentFrom)
        .lte("expense_date", currentTo)
        .eq("status", "active"),
      // 4. Previous period expenses
      supabase
        .from("station_expenses")
        .select("amount")
        .in("station_id", sids)
        .gte("expense_date", prevFrom)
        .lte("expense_date", prevTo)
        .eq("status", "active"),
      // 5. Current period product sales
      supabase
        .from("product_sale_items")
        .select("total_amount")
        .in("station_id", sids)
        .gte("sale_date", currentFrom)
        .lte("sale_date", currentTo)
        .eq("status", "active"),
      // 6. Previous period product sales
      supabase
        .from("product_sale_items")
        .select("total_amount")
        .in("station_id", sids)
        .gte("sale_date", prevFrom)
        .lte("sale_date", prevTo)
        .eq("status", "active"),
      // 7. Trend data - daily grouped
      supabase
        .from("daily_sale_records")
        .select("sale_date, total_amount, total_liters")
        .in("station_id", sids)
        .gte("sale_date", trendFrom)
        .lte("sale_date", currentTo)
        .eq("status", "active")
        .order("sale_date"),
      // 8. Credit outstanding (current snapshot - no historical comparison available)
      supabase
        .from("credit_customers")
        .select("current_balance")
        .in("station_id", sids)
        .eq("status", "active"),
    ])

    // Aggregate current sales
    const currSales = currSalesRes.data || []
    const revenue = currSales.reduce((sum, r) => sum + (r.total_amount || 0), 0)
    const liters = currSales.reduce((sum, r) => sum + (r.total_liters || 0), 0)

    const paymentBreakdown: PaymentBreakdown = {
      cash: currSales.reduce((sum, r) => sum + (r.cash_sales || 0), 0),
      upi: currSales.reduce((sum, r) => sum + (r.upi_sales || 0), 0),
      card: currSales.reduce((sum, r) => sum + (r.card_sales || 0), 0),
      credit: currSales.reduce((sum, r) => sum + (r.credit_sales || 0), 0),
    }

    // Aggregate previous sales
    const prevSales = prevSalesRes.data || []
    const prevRevenue = prevSales.reduce((sum, r) => sum + (r.total_amount || 0), 0)
    const prevLiters = prevSales.reduce((sum, r) => sum + (r.total_liters || 0), 0)

    // Aggregate expenses
    const currExpenses = (currExpensesRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0)
    const prevExpenses = (prevExpensesRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0)

    // Aggregate product sales
    const currProductRevenue = (currProductSalesRes.data || []).reduce((sum, r) => sum + (r.total_amount || 0), 0)
    const prevProductRevenue = (prevProductSalesRes.data || []).reduce((sum, r) => sum + (r.total_amount || 0), 0)

    // Net profit = revenue + product revenue - expenses
    const netProfit = revenue + currProductRevenue - currExpenses
    const prevNetProfit = prevRevenue + prevProductRevenue - prevExpenses

    // Credit outstanding (snapshot - no historical comparison)
    const creditOutstanding = (creditRes.data || []).reduce((sum, r) => sum + (r.current_balance || 0), 0)
    const prevCreditOutstanding = creditOutstanding

    // Build trend data - group by sale_date
    const trendMap = new Map<string, { revenue: number; liters: number }>()
    for (const row of trendRes.data || []) {
      const existing = trendMap.get(row.sale_date) || { revenue: 0, liters: 0 }
      existing.revenue += row.total_amount || 0
      existing.liters += row.total_liters || 0
      trendMap.set(row.sale_date, existing)
    }
    const revenueTrend: RevenueTrendPoint[] = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: formatDateShort(date),
        rawDate: date,
        revenue: Math.round(vals.revenue),
        liters: Math.round(vals.liters * 100) / 100,
      }))

    // Station comparison - group current sales by station
    const stationMap = new Map<string, { revenue: number; liters: number }>()
    for (const row of currSales) {
      const existing = stationMap.get(row.station_id) || { revenue: 0, liters: 0 }
      existing.revenue += row.total_amount || 0
      existing.liters += row.total_liters || 0
      stationMap.set(row.station_id, existing)
    }
    const stationComparison: StationComparisonItem[] = Array.from(stationMap.entries()).map(
      ([sid, vals]) => ({
        stationId: sid,
        stationName: stationNameMap.get(sid) || "Unknown",
        revenue: Math.round(vals.revenue),
        liters: Math.round(vals.liters * 100) / 100,
      })
    )

    return {
      success: true,
      data: {
        revenue: { value: revenue, previousValue: prevRevenue, changePercent: pctChange(revenue, prevRevenue) },
        liters: { value: liters, previousValue: prevLiters, changePercent: pctChange(liters, prevLiters) },
        expenses: { value: currExpenses, previousValue: prevExpenses, changePercent: pctChange(currExpenses, prevExpenses) },
        netProfit: { value: netProfit, previousValue: prevNetProfit, changePercent: pctChange(netProfit, prevNetProfit) },
        creditOutstanding: { value: creditOutstanding, previousValue: prevCreditOutstanding, changePercent: pctChange(creditOutstanding, prevCreditOutstanding) },
        revenueTrend,
        paymentBreakdown,
        stationComparison,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch dashboard KPIs",
    }
  }
}

// ─── Operational Data ──────────────────────────────────

export type GetDashboardOperationalResult =
  | { success: true; data: DashboardOperationalData }
  | { success: false; error: string }

export async function getDashboardOperational(
  stationId: string,
  todayDate: string
): Promise<GetDashboardOperationalResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const stations = await getCachedClientStations(client.client_id)
    if (stations.length === 0) {
      return { success: true, data: emptyOperational() }
    }

    const sids =
      stationId === "all"
        ? stations.map((s) => s.station_id)
        : [stationId]

    const stationNameMap = new Map(stations.map((s) => [s.station_id, s.station_name]))
    const supabase = await createClient()

    const [tanksRes, productsRes, creditAllRes, creditTopRes, shiftsRes, attendanceRes, employeesRes] =
      await Promise.all([
        // 1. Tanks with fuel types
        supabase
          .from("tanks")
          .select("tank_id, tank_name, station_id, tank_capacity, current_stock, capacity_unit, fuel_types(fueltype_name)")
          .in("station_id", sids)
          .eq("status", "active"),
        // 2. Low stock products
        supabase
          .from("station_products")
          .select("station_product_id, product_name, station_id, current_stock, minimum_stock")
          .in("station_id", sids)
          .eq("available", true),
        // 3a. All credit customers (for total count and outstanding sum)
        supabase
          .from("credit_customers")
          .select("current_balance")
          .in("station_id", sids)
          .eq("status", "active"),
        // 3b. Top 5 credit customers (for display)
        supabase
          .from("credit_customers")
          .select("customer_name, current_balance, credit_limit_value")
          .in("station_id", sids)
          .eq("status", "active")
          .order("current_balance", { ascending: false })
          .limit(5),
        // 4. Active shifts
        supabase
          .from("employee_shifts")
          .select("shift_id, end_time")
          .in("station_id", sids)
          .eq("status", "active"),
        // 5. Today's attendance
        supabase
          .from("employee_attendance")
          .select("attendance_status")
          .in("station_id", sids)
          .eq("attendance_date", todayDate),
        // 6. Total active employees
        supabase
          .from("employees")
          .select("employee_id")
          .in("station_id", sids)
          .eq("status", "active"),
      ])

    // Process tanks
    const tanks: TankLevel[] = (tanksRes.data || []).map((t) => {
      const fuelData = t.fuel_types as unknown as { fueltype_name: string } | null
      const capacity = Number(t.tank_capacity) || 0
      const pct = capacity > 0 ? Math.round((t.current_stock / capacity) * 100) : 0
      return {
        tankId: t.tank_id,
        tankName: t.tank_name,
        stationName: stationNameMap.get(t.station_id) || "Unknown",
        fuelTypeName: fuelData?.fueltype_name || "Unknown",
        capacity,
        capacityUnit: t.capacity_unit || "liters",
        currentStock: t.current_stock,
        percentFull: pct,
      }
    })

    // Process low stock products
    const lowStockProducts: ProductStockAlert[] = (productsRes.data || [])
      .filter((p) => p.current_stock < p.minimum_stock)
      .map((p) => ({
        productId: p.station_product_id,
        productName: p.product_name,
        stationName: stationNameMap.get(p.station_id) || "Unknown",
        currentStock: p.current_stock,
        minimumStock: p.minimum_stock,
      }))

    // Credit overview
    const allCreditCustomers = creditAllRes.data || []
    const topCreditCustomers = creditTopRes.data || []
    const totalOutstanding = allCreditCustomers.reduce((sum, c) => sum + (c.current_balance || 0), 0)
    const creditOverview = {
      totalOutstanding,
      totalCustomers: allCreditCustomers.length,
      topCustomers: topCreditCustomers.map((c) => ({
        name: c.customer_name,
        outstanding: c.current_balance || 0,
        limit: c.credit_limit_value || 0,
        utilization:
          c.credit_limit_value > 0
            ? Math.round(((c.current_balance || 0) / c.credit_limit_value) * 100)
            : 0,
      })),
    }

    // Workforce
    const now = new Date()
    const activeShifts = (shiftsRes.data || []).filter((s) => {
      if (!s.end_time) return true
      return new Date(s.end_time) > now
    }).length

    const attendance = attendanceRes.data || []
    const workforce = {
      totalEmployees: (employeesRes.data || []).length,
      activeShifts,
      attendance: {
        present: attendance.filter((a) => a.attendance_status === "present").length,
        absent: attendance.filter((a) => a.attendance_status === "absent").length,
        halfDay: attendance.filter((a) => a.attendance_status === "half_day").length,
        leave: attendance.filter((a) => a.attendance_status === "leave").length,
        total: attendance.length,
      },
    }

    // Build alerts
    const alerts: DashboardAlert[] = []

    for (const tank of tanks) {
      if (tank.percentFull < 10) {
        alerts.push({
          id: `tank-${tank.tankId}`,
          type: "low_tank",
          severity: "critical",
          title: `${tank.tankName} critically low`,
          description: `${tank.fuelTypeName} at ${tank.percentFull}% (${tank.currentStock}${tank.capacityUnit === "kg" ? "kg" : "L"} / ${tank.capacity}${tank.capacityUnit === "kg" ? "kg" : "L"})`,
          link: "/registration/view-stations",
        })
      } else if (tank.percentFull < 20) {
        alerts.push({
          id: `tank-${tank.tankId}`,
          type: "low_tank",
          severity: "warning",
          title: `${tank.tankName} running low`,
          description: `${tank.fuelTypeName} at ${tank.percentFull}% (${tank.currentStock}${tank.capacityUnit === "kg" ? "kg" : "L"} / ${tank.capacity}${tank.capacityUnit === "kg" ? "kg" : "L"})`,
          link: "/registration/view-stations",
        })
      }
    }

    for (const product of lowStockProducts) {
      alerts.push({
        id: `stock-${product.productId}`,
        type: "low_stock",
        severity: product.currentStock === 0 ? "critical" : "warning",
        title: product.currentStock === 0 ? `${product.productName} out of stock` : `${product.productName} low stock`,
        description: `${product.currentStock} / ${product.minimumStock} minimum at ${product.stationName}`,
        link: "/stock",
      })
    }

    for (const cust of creditOverview.topCustomers) {
      if (cust.utilization >= 90) {
        alerts.push({
          id: `credit-${cust.name}`,
          type: "credit_limit",
          severity: cust.utilization >= 100 ? "critical" : "warning",
          title: `${cust.name} near credit limit`,
          description: `${cust.utilization}% utilized (${formatCurrencyShort(cust.outstanding)} / ${formatCurrencyShort(cust.limit)})`,
          link: "/credit/customers",
        })
      }
    }

    // Sort: critical first
    alerts.sort((a, b) => {
      if (a.severity === "critical" && b.severity !== "critical") return -1
      if (a.severity !== "critical" && b.severity === "critical") return 1
      return 0
    })

    return {
      success: true,
      data: { tanks, lowStockProducts, creditOverview, alerts, workforce },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch operational data",
    }
  }
}

// ─── Defaults ──────────────────────────────────────────

function emptyKpis(): DashboardKpisData {
  const zero = { value: 0, previousValue: 0, changePercent: 0 }
  return {
    revenue: zero,
    liters: zero,
    expenses: zero,
    netProfit: zero,
    creditOutstanding: zero,
    revenueTrend: [],
    paymentBreakdown: { cash: 0, upi: 0, card: 0, credit: 0 },
    stationComparison: [],
  }
}

function emptyOperational(): DashboardOperationalData {
  return {
    tanks: [],
    lowStockProducts: [],
    creditOverview: { totalOutstanding: 0, totalCustomers: 0, topCustomers: [] },
    alerts: [],
    workforce: {
      totalEmployees: 0,
      activeShifts: 0,
      attendance: { present: 0, absent: 0, halfDay: 0, leave: 0, total: 0 },
    },
  }
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}
