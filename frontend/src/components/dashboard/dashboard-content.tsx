"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useStations, useDashboardKpis, useDashboardOperational } from "@/hooks/use-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Fuel, ArrowRight, Loader2 } from "lucide-react"
import { DashboardHeader } from "./dashboard-header"
import { KpiRow } from "./kpi-row"
import { KpiRowSkeleton, ChartSkeleton, CardSkeleton } from "./dashboard-skeleton"
import { QuickActionsCard } from "./quick-actions-card"
import type { TimePeriod, DateRange } from "@/types/dashboard"

// Dynamic imports for heavy chart and card components (code-split with recharts)
const RevenueTrendChart = dynamic(
  () => import("./revenue-trend-chart").then(m => ({ default: m.RevenueTrendChart })),
  { loading: () => <ChartSkeleton /> }
)
const PaymentBreakdownChart = dynamic(
  () => import("./payment-breakdown-chart").then(m => ({ default: m.PaymentBreakdownChart })),
  { loading: () => <ChartSkeleton /> }
)
const StationComparisonChart = dynamic(
  () => import("./station-comparison-chart").then(m => ({ default: m.StationComparisonChart })),
  { loading: () => <ChartSkeleton /> }
)
const TankLevelsCard = dynamic(
  () => import("./tank-levels-card").then(m => ({ default: m.TankLevelsCard })),
  { loading: () => <CardSkeleton /> }
)
const StockAlertsCard = dynamic(
  () => import("./stock-alerts-card").then(m => ({ default: m.StockAlertsCard })),
  { loading: () => <CardSkeleton /> }
)
const CreditOverviewCard = dynamic(
  () => import("./credit-overview-card").then(m => ({ default: m.CreditOverviewCard })),
  { loading: () => <CardSkeleton /> }
)
const AlertsCard = dynamic(
  () => import("./alerts-card").then(m => ({ default: m.AlertsCard })),
  { loading: () => <CardSkeleton /> }
)
const WorkforceCard = dynamic(
  () => import("./workforce-card").then(m => ({ default: m.WorkforceCard })),
  { loading: () => <CardSkeleton /> }
)

export function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // State from URL params
  const [stationId, setStationId] = useState(searchParams.get("station") || "all")
  const [period, setPeriod] = useState<TimePeriod>(
    (searchParams.get("period") as TimePeriod) || "today"
  )
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    return from && to ? { from, to } : undefined
  })

  // Sync state to URL
  const updateUrl = useCallback(
    (newStation: string, newPeriod: TimePeriod, newRange?: DateRange) => {
      const params = new URLSearchParams()
      params.set("station", newStation)
      params.set("period", newPeriod)
      if (newPeriod === "custom" && newRange) {
        params.set("from", newRange.from)
        params.set("to", newRange.to)
      }
      router.replace(`/dashboard?${params.toString()}`, { scroll: false })
    },
    [router]
  )

  const handleStationChange = useCallback(
    (id: string) => {
      setStationId(id)
      updateUrl(id, period, customRange)
    },
    [period, customRange, updateUrl]
  )

  const handlePeriodChange = useCallback(
    (p: TimePeriod) => {
      setPeriod(p)
      updateUrl(stationId, p, p === "custom" ? customRange : undefined)
    },
    [stationId, customRange, updateUrl]
  )

  const handleCustomRangeChange = useCallback(
    (range: DateRange) => {
      setCustomRange(range)
      updateUrl(stationId, "custom", range)
    },
    [stationId, updateUrl]
  )

  // Data hooks
  const { data: stations, isLoading: stationsLoading, error: stationsError } = useStations()

  const validCustomRange =
    period === "custom" && customRange?.from && customRange?.to ? customRange : undefined

  const {
    data: kpis,
    isLoading: kpisLoading,
  } = useDashboardKpis(stationId, period, validCustomRange)

  const {
    data: ops,
    isLoading: opsLoading,
  } = useDashboardOperational(stationId)

  // Loading state
  if (stationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (stationsError) {
    const errorMessage = stationsError instanceof Error ? stationsError.message : "An error occurred"
    const isOnboardingError = errorMessage.includes("Client profile not found")
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">{errorMessage}</p>
        {isOnboardingError && (
          <Link href="/onboarding" className="text-primary hover:underline">
            Complete onboarding to get started
          </Link>
        )}
      </div>
    )
  }

  // Empty state - no stations
  if (!stations || stations.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to Petro Astra. Get started by adding your first station.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Set up your fuel station infrastructure to start managing operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/registration/add-station"
                className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
              >
                <Fuel className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Add Station</p>
                  <p className="text-sm text-muted-foreground">Register your first fuel station</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const showStationName = stationId === "all" && stations.length > 1

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Controls */}
      <DashboardHeader
        stations={stations}
        stationId={stationId}
        onStationChange={handleStationChange}
        period={period}
        onPeriodChange={handlePeriodChange}
        customRange={customRange}
        onCustomRangeChange={handleCustomRangeChange}
      />

      {/* KPI Row */}
      {kpisLoading ? (
        <KpiRowSkeleton />
      ) : kpis ? (
        <KpiRow data={kpis} />
      ) : null}

      {/* Charts Row */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {kpisLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : kpis ? (
          <>
            <RevenueTrendChart data={kpis.revenueTrend} />
            <PaymentBreakdownChart data={kpis.paymentBreakdown} />
          </>
        ) : null}
      </div>

      {/* Station Comparison - only when "All Stations" */}
      {stationId === "all" && stations.length > 1 && (
        kpisLoading ? (
          <ChartSkeleton />
        ) : kpis ? (
          <StationComparisonChart data={kpis.stationComparison} />
        ) : null
      )}

      {/* Inventory Row */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {opsLoading ? (
          <>
            <CardSkeleton lines={4} />
            <CardSkeleton lines={3} />
          </>
        ) : ops ? (
          <>
            <TankLevelsCard tanks={ops.tanks} showStationName={showStationName} />
            <StockAlertsCard products={ops.lowStockProducts} showStationName={showStationName} />
          </>
        ) : null}
      </div>

      {/* Credit & Alerts Row */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {opsLoading ? (
          <>
            <CardSkeleton lines={5} />
            <CardSkeleton lines={3} />
          </>
        ) : ops ? (
          <>
            <CreditOverviewCard data={ops.creditOverview} />
            <AlertsCard alerts={ops.alerts} />
          </>
        ) : null}
      </div>

      {/* Workforce & Quick Actions Row */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {opsLoading ? (
          <>
            <CardSkeleton lines={3} />
            <CardSkeleton lines={6} />
          </>
        ) : ops ? (
          <>
            <WorkforceCard data={ops.workforce} />
            <QuickActionsCard />
          </>
        ) : null}
      </div>
    </div>
  )
}
