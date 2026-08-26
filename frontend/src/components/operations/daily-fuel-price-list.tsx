"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Loader2, TrendingUp, TrendingDown, Minus, IndianRupee, Building2, Droplets, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCurrentFuelPrices,
  getPriceHistory,
  getPriceChartData,
  getStationsWithFuelTypes,
  type CurrentFuelPrice,
  type PriceHistoryRecord,
  type StationWithFuelTypes,
  type ChartDataWithLegend,
} from "@/actions/daily-fuel-price"
import dynamic from "next/dynamic"
import { UpdatePriceDialog } from "./update-price-dialog"
import { formatDateShort } from "@/lib/utils"

const PriceHistoryChart = dynamic(
  () => import("./price-history-chart").then(m => ({ default: m.PriceHistoryChart })),
  { loading: () => <div className="h-[300px] animate-pulse bg-accent rounded-md" /> }
)

export function DailyFuelPriceList() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [currentPrices, setCurrentPrices] = useState<CurrentFuelPrice[]>([])
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([])
  const [chartData, setChartData] = useState<ChartDataWithLegend>({ chartData: [], fuelTypes: [], colors: [] })
  const [stations, setStations] = useState<StationWithFuelTypes[]>([])

  // Filter states
  const [selectedStation, setSelectedStation] = useState<string>("")
  const [selectedFuelType, setSelectedFuelType] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // Loading state for chart
  const [chartLoading, setChartLoading] = useState(false)

  // Available fuel types based on selected station
  const availableFuelTypes = useMemo(() => {
    if (!selectedStation) {
      // Get all unique fuel types across all stations
      const fuelTypeMap = new Map<string, { fueltype_id: string; fueltype_name: string }>()
      stations.forEach((station) => {
        station.fuel_types.forEach((ft) => {
          if (!fuelTypeMap.has(ft.fueltype_id)) {
            fuelTypeMap.set(ft.fueltype_id, ft)
          }
        })
      })
      return Array.from(fuelTypeMap.values())
    }

    const station = stations.find((s) => s.station_id === selectedStation)
    return station?.fuel_types || []
  }, [selectedStation, stations])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Fetch all data in parallel
    const [pricesResult, stationsResult] = await Promise.all([
      getCurrentFuelPrices(),
      getStationsWithFuelTypes(),
    ])

    if (pricesResult.success) {
      setCurrentPrices(pricesResult.prices)
    } else {
      setError(pricesResult.error)
    }

    if (stationsResult.success) {
      setStations(stationsResult.stations)
    }

    setLoading(false)
  }, [])

  // Fetch chart data when filters change
  const fetchChartData = useCallback(async () => {
    setChartLoading(true)

    const [chartResult, historyResult] = await Promise.all([
      getPriceChartData(
        selectedStation || undefined,
        selectedFuelType || undefined,
        startDate || undefined,
        endDate || undefined
      ),
      getPriceHistory({
        stationId: selectedStation || undefined,
        fuelTypeId: selectedFuelType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    ])

    if (chartResult.success) {
      setChartData(chartResult.data)
    }

    if (historyResult.success) {
      setPriceHistory(historyResult.history)
    }

    setChartLoading(false)
  }, [selectedStation, selectedFuelType, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch chart data on initial load and when filters change
  useEffect(() => {
    if (!loading) {
      fetchChartData()
    }
  }, [fetchChartData, loading])

  const handlePriceUpdated = useCallback(() => {
    fetchData()
    fetchChartData()
  }, [fetchData, fetchChartData])

  const handleStationChange = (value: string) => {
    setSelectedStation(value === "all" ? "" : value)
    setSelectedFuelType("") // Reset fuel type when station changes
  }

  const handleFuelTypeChange = (value: string) => {
    setSelectedFuelType(value === "all" ? "" : value)
  }

  // Filter current prices based on selected filters
  const filteredPrices = useMemo(() => {
    let filtered = currentPrices

    if (selectedStation) {
      filtered = filtered.filter((p) => p.station_id === selectedStation)
    }

    if (selectedFuelType) {
      filtered = filtered.filter((p) => p.fueltype_id === selectedFuelType)
    }

    return filtered
  }, [currentPrices, selectedStation, selectedFuelType])

  // Group prices by station
  const pricesByStation = useMemo(() => {
    const grouped = new Map<string, CurrentFuelPrice[]>()

    filteredPrices.forEach((price) => {
      const existing = grouped.get(price.station_id) || []
      existing.push(price)
      grouped.set(price.station_id, existing)
    })

    return Array.from(grouped.entries()).map(([stationId, prices]) => ({
      station_id: stationId,
      station_name: prices[0]?.station_name || "Unknown",
      prices,
    }))
  }, [filteredPrices])

  // Calculate price change from history for a fuel type
  const getPriceChange = useCallback((fuelTypeId: string, stationId: string): { change: number; percentage: number } | null => {
    const historyForFuel = priceHistory.filter(
      (h) => h.fueltype_id === fuelTypeId && h.station_id === stationId
    )

    if (historyForFuel.length < 2) return null

    // Sort by created_at descending to get most recent first
    const sorted = [...historyForFuel].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const current = sorted[0]
    const previous = sorted[1]

    if (!previous || previous.new_price === 0) return null

    const change = current.new_price - previous.new_price
    const percentage = (change / previous.new_price) * 100

    return { change, percentage }
  }, [priceHistory])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Daily Fuel Price</h2>
          <p className="text-muted-foreground">
            Track and update daily fuel prices across your stations
          </p>
        </div>
        <UpdatePriceDialog onPriceUpdated={handlePriceUpdated} />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter price history by station, fuel type, and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Station Filter */}
            <div className="grid gap-2">
              <Label htmlFor="station-filter">Station</Label>
              <Select value={selectedStation || "all"} onValueChange={handleStationChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station.station_id} value={station.station_id}>
                      {station.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fuel Type Filter */}
            <div className="grid gap-2">
              <Label htmlFor="fueltype-filter">Fuel Type</Label>
              <Select
                value={selectedFuelType || "all"}
                onValueChange={handleFuelTypeChange}
                disabled={availableFuelTypes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Fuel Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fuel Types</SelectItem>
                  {availableFuelTypes.map((ft) => (
                    <SelectItem key={ft.fueltype_id} value={ft.fueltype_id}>
                      {ft.fueltype_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      ) : (
        <>
          {/* Price Trend Chart */}
          <PriceHistoryChart
            chartData={chartData.chartData}
            fuelTypes={chartData.fuelTypes}
            colors={chartData.colors}
            isLoading={chartLoading}
          />

          {/* Current Prices */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Prices</h3>

            {pricesByStation.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <IndianRupee className="size-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No fuel prices have been set yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click &quot;Update Price&quot; to set your first fuel price.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {pricesByStation.map((stationGroup) => (
                  <div key={stationGroup.station_id} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="size-4" />
                      <span>{stationGroup.station_name}</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {stationGroup.prices.map((price) => {
                        const priceChange = getPriceChange(price.fueltype_id, price.station_id)

                        return (
                          <Card key={price.price_update_id} className="relative overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-full bg-primary/10">
                                    <Droplets className="size-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-semibold">{price.fueltype_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Updated: {formatDateShort(price.effective_date)}
                                    </p>
                                  </div>
                                </div>

                                {priceChange && (
                                  <div className="flex items-center gap-1">
                                    {priceChange.change > 0 ? (
                                      <TrendingUp className="size-4 text-red-500" />
                                    ) : priceChange.change < 0 ? (
                                      <TrendingDown className="size-4 text-green-500" />
                                    ) : (
                                      <Minus className="size-4 text-muted-foreground" />
                                    )}
                                    <span
                                      className={`text-xs font-medium ${
                                        priceChange.change > 0
                                          ? "text-red-500"
                                          : priceChange.change < 0
                                          ? "text-green-500"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {priceChange.percentage > 0 ? "+" : ""}
                                      {priceChange.percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4">
                                <p className="text-3xl font-bold tabular-nums">
                                  ₹{price.new_price.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Updated by {price.employee_name}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price History Table */}
          {priceHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Price History</CardTitle>
                <CardDescription>
                  Recent price changes ({priceHistory.length} records)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Station</th>
                          <th className="px-4 py-3 text-left font-medium">Fuel Type</th>
                          <th className="px-4 py-3 text-right font-medium">Old Price</th>
                          <th className="px-4 py-3 text-right font-medium">New Price</th>
                          <th className="px-4 py-3 text-right font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {priceHistory.map((record) => {
                          const change = record.old_price !== null
                            ? record.new_price - record.old_price
                            : null
                          const changePercent = record.old_price !== null && record.old_price > 0
                            ? (change! / record.old_price) * 100
                            : null

                          return (
                            <tr key={record.history_id} className="hover:bg-muted/30">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Calendar className="size-4 text-muted-foreground" />
                                  <span className="font-mono text-xs">
                                    {formatDateShort(record.effective_date)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">{record.station_name}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Droplets className="size-4 text-primary" />
                                  {record.fueltype_name}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {record.old_price !== null
                                  ? `₹${record.old_price.toFixed(2)}`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-medium">
                                ₹{record.new_price.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {change !== null ? (
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono text-xs ${
                                      change > 0
                                        ? "text-red-500"
                                        : change < 0
                                        ? "text-green-500"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {change > 0 ? (
                                      <TrendingUp className="size-3" />
                                    ) : change < 0 ? (
                                      <TrendingDown className="size-3" />
                                    ) : null}
                                    {change > 0 ? "+" : ""}
                                    {change.toFixed(2)}
                                    {changePercent !== null && (
                                      <span className="text-muted-foreground">
                                        ({changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Initial</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
