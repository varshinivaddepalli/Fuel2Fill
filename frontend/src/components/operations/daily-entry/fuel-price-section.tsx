"use client"

import { useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { IndianRupee } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export interface FuelPriceData {
  fueltype_id: string
  fueltype_name: string
  current_price: number
  new_price: number
  changed: boolean
}

interface FuelPriceSectionProps {
  fuelPrices: FuelPriceData[]
  onPriceChange: (fueltypeId: string, newPrice: number) => void
}

export function FuelPriceSection({ fuelPrices, onPriceChange }: FuelPriceSectionProps) {
  if (fuelPrices.length === 0) return null

  return (
    <Card>
      <CardHeader className="py-3 px-4 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <IndianRupee className="size-4 text-primary" />
          <CardTitle className="text-sm font-semibold uppercase tracking-wider">
            Fuel Price Entry
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_0.8fr_0.8fr_auto] gap-4 px-4 py-2 bg-muted/20 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            <span>Fuel Type</span>
            <span>Current Price (₹/L)</span>
            <span>New Price (₹/L)</span>
            <span className="w-16 text-center">Status</span>
          </div>

          {fuelPrices.map((fp) => (
            <FuelPriceRow key={fp.fueltype_id} data={fp} onPriceChange={onPriceChange} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function FuelPriceRow({
  data,
  onPriceChange,
}: {
  data: FuelPriceData
  onPriceChange: (fueltypeId: string, newPrice: number) => void
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onPriceChange(data.fueltype_id, parseFloat(e.target.value) || 0)
    },
    [data.fueltype_id, onPriceChange]
  )

  // Fuel type color indicator
  const fuelColor = data.fueltype_name.toLowerCase().includes("petrol")
    ? "bg-orange-500"
    : data.fueltype_name.toLowerCase().includes("diesel")
      ? "bg-blue-500"
      : "bg-gray-500"

  return (
    <div className="grid grid-cols-[1fr_0.8fr_0.8fr_auto] gap-4 px-4 py-3 items-center">
      <div className="flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${fuelColor}`} />
        <span className="font-medium text-sm">{data.fueltype_name}</span>
      </div>
      <div className="font-mono text-sm text-muted-foreground">
        {formatCurrency(data.current_price, true)}
      </div>
      <Input
        type="number"
        step="0.01"
        value={data.new_price || ""}
        onChange={handleChange}
        placeholder="0.00"
        className="h-8 font-mono text-sm max-w-[140px]"
      />
      <div className="w-16 flex justify-center">
        {data.changed ? (
          <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
            Changed
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground text-[10px]">
            Same
          </Badge>
        )}
      </div>
    </div>
  )
}
