"use client"

import { useMemo, useState } from "react"
import { Loader2, AlertCircle, Fuel, Package, AlertTriangle, Warehouse } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useStock } from "@/hooks/use-data"
import { cn } from "@/lib/utils"
import type { TankStock, ProductStock } from "@/actions/stock"

function getFillColor(percentage: number) {
  if (percentage >= 50) return "text-green-600"
  if (percentage >= 25) return "text-amber-600"
  return "text-red-600"
}

function getFillBadge(percentage: number) {
  if (percentage >= 50) return { label: "Good", variant: "default" as const, className: "bg-green-100 text-green-700 border-green-200" }
  if (percentage >= 25) return { label: "Medium", variant: "outline" as const, className: "text-amber-700 border-amber-300 bg-amber-50" }
  return { label: "Low", variant: "outline" as const, className: "text-red-700 border-red-300 bg-red-50" }
}

function getProgressColor(percentage: number) {
  if (percentage >= 50) return "[&_[data-slot=progress-indicator]]:bg-green-500"
  if (percentage >= 25) return "[&_[data-slot=progress-indicator]]:bg-amber-500"
  return "[&_[data-slot=progress-indicator]]:bg-red-500"
}

export function StockView() {
  const { data, isLoading, error } = useStock()
  const [selectedStation, setSelectedStation] = useState("all")

  // Extract unique stations from data
  const stationOptions = useMemo(() => {
    if (!data) return []
    const stationMap = new Map<string, string>()
    data.tanks.forEach((t) => stationMap.set(t.station_id, t.station_name))
    data.products.forEach((p) => stationMap.set(p.station_id, p.station_name))
    return Array.from(stationMap, ([value, label]) => ({ value, label }))
  }, [data])

  // Filter data by station
  const filteredTanks = useMemo(() => {
    if (!data) return []
    if (selectedStation === "all") return data.tanks
    return data.tanks.filter((t) => t.station_id === selectedStation)
  }, [data, selectedStation])

  const filteredProducts = useMemo(() => {
    if (!data) return []
    if (selectedStation === "all") return data.products
    return data.products.filter((p) => p.station_id === selectedStation)
  }, [data, selectedStation])

  // Recompute summary based on filtered data
  const filteredSummary = useMemo(() => {
    const totalFuelVolume = filteredTanks.reduce((sum, t) => sum + t.current_stock, 0)
    const lowStockAlerts =
      filteredTanks.filter((t) => t.percentage_full < 25).length +
      filteredProducts.filter((p) => p.is_low_stock).length
    return {
      total_fuel_volume: totalFuelVolume,
      total_products: filteredProducts.length,
      low_stock_alerts: lowStockAlerts,
    }
  }, [filteredTanks, filteredProducts])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Stock View</h2>
          <p className="text-muted-foreground">Current fuel tank and product stock levels</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Stock View</h2>
          <p className="text-muted-foreground">Current fuel tank and product stock levels</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="size-12 text-destructive/70 mb-4" />
            <p className="text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Stock View</h2>
          <p className="text-muted-foreground">Current fuel tank and product stock levels</p>
        </div>
        {/* Station Filter */}
        <div className="w-full sm:w-[220px]">
          <Select value={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger>
              <SelectValue placeholder="All Stations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              {stationOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fuel Volume</CardTitle>
            <Fuel className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredSummary.total_fuel_volume.toLocaleString("en-IN", { maximumFractionDigits: 0 })} L
            </div>
            <p className="text-xs text-muted-foreground">
              Across {filteredTanks.length} tank{filteredTanks.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSummary.total_products}</div>
            <p className="text-xs text-muted-foreground">Available products tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", filteredSummary.low_stock_alerts > 0 && "text-red-600")}>
              {filteredSummary.low_stock_alerts}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredSummary.low_stock_alerts === 0 ? "All stock levels healthy" : "Items need attention"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fuel Tank Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fuel Tank Stock</CardTitle>
          <CardDescription>Current fuel levels across all tanks</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTanks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Warehouse className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No fuel tanks found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tank</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  {selectedStation === "all" && <TableHead>Station</TableHead>}
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Current (L)</TableHead>
                  <TableHead className="w-[200px]">Fill Level</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTanks.map((tank) => (
                  <TankRow key={tank.tank_id} tank={tank} showStation={selectedStation === "all"} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product Stock</CardTitle>
          <CardDescription>Current stock levels for non-fuel products</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  {selectedStation === "all" && <TableHead>Station</TableHead>}
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <ProductRow key={product.station_product_id} product={product} showStation={selectedStation === "all"} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TankRow({ tank, showStation }: { tank: TankStock; showStation: boolean }) {
  const fill = getFillBadge(tank.percentage_full)
  const clampedPercentage = Math.min(100, Math.max(0, tank.percentage_full))

  return (
    <TableRow>
      <TableCell className="font-medium">{tank.tank_name}</TableCell>
      <TableCell>
        <Badge variant="secondary">{tank.fueltype_name}</Badge>
      </TableCell>
      {showStation && <TableCell>{tank.station_name}</TableCell>}
      <TableCell className="text-right font-mono">
        {tank.capacity.toLocaleString("en-IN")} {tank.capacity_unit === "kg" ? "kg" : "L"}
      </TableCell>
      <TableCell className={cn("text-right font-mono font-medium", getFillColor(tank.percentage_full))}>
        {tank.current_stock.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress
            value={clampedPercentage}
            className={cn("h-2 flex-1", getProgressColor(tank.percentage_full))}
          />
          <span className={cn("text-xs font-medium w-10 text-right", getFillColor(tank.percentage_full))}>
            {clampedPercentage.toFixed(0)}%
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className={fill.className}>
          {fill.label}
        </Badge>
      </TableCell>
    </TableRow>
  )
}

function ProductRow({ product, showStation }: { product: ProductStock; showStation: boolean }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{product.product_name}</TableCell>
      {showStation && <TableCell>{product.station_name}</TableCell>}
      <TableCell className={cn("text-right font-mono font-medium", product.is_low_stock && "text-red-600")}>
        {product.current_stock}
      </TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">
        {product.minimum_stock}
      </TableCell>
      <TableCell className="text-center">
        {product.is_low_stock ? (
          <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
            Low Stock
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            In Stock
          </Badge>
        )}
      </TableCell>
    </TableRow>
  )
}
