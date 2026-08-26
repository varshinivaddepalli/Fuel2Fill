export type TimePeriod = "today" | "7days" | "30days" | "custom"

export interface DateRange {
  from: string
  to: string
}

export interface KpiMetric {
  value: number
  previousValue: number
  changePercent: number
}

export interface DashboardKpisData {
  revenue: KpiMetric
  liters: KpiMetric
  expenses: KpiMetric
  netProfit: KpiMetric
  creditOutstanding: KpiMetric
  revenueTrend: RevenueTrendPoint[]
  paymentBreakdown: PaymentBreakdown
  stationComparison: StationComparisonItem[]
}

export interface RevenueTrendPoint {
  date: string
  rawDate: string
  revenue: number
  liters: number
}

export interface PaymentBreakdown {
  cash: number
  upi: number
  card: number
  credit: number
}

export interface StationComparisonItem {
  stationId: string
  stationName: string
  revenue: number
  liters: number
}

export interface DashboardOperationalData {
  tanks: TankLevel[]
  lowStockProducts: ProductStockAlert[]
  creditOverview: CreditOverview
  alerts: DashboardAlert[]
  workforce: WorkforceData
}

export interface TankLevel {
  tankId: string
  tankName: string
  stationName: string
  fuelTypeName: string
  capacity: number
  capacityUnit: string
  currentStock: number
  percentFull: number
}

export interface ProductStockAlert {
  productId: string
  productName: string
  stationName: string
  currentStock: number
  minimumStock: number
}

export interface CreditOverview {
  totalOutstanding: number
  totalCustomers: number
  topCustomers: {
    name: string
    outstanding: number
    limit: number
    utilization: number
  }[]
}

export type AlertSeverity = "warning" | "critical"
export type AlertType = "low_tank" | "low_stock" | "credit_limit"

export interface DashboardAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  link: string
}

export interface WorkforceData {
  totalEmployees: number
  activeShifts: number
  attendance: {
    present: number
    absent: number
    halfDay: number
    leave: number
    total: number
  }
}
