"use client"

import { useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Fuel, Edit3, Plus } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { CreditEntryRow, type CreditEntryData } from "./credit-entry-row"
import type { CreditCustomerForDSR, VehicleForDSR } from "@/actions/daily-sale-record"

export interface NozzleEntryData {
  nozzle_id: string
  pump_id: string
  nozzle_name: string
  pump_name: string
  fueltype_id: string
  fueltype_name: string
  fuel_price: number
  opening_reading: number
  close_reading: number
  testing_qty: number
  upi_sales: number
  card_sales: number
  credit_entries: CreditEntryData[]
  isEditing: boolean
  isFirstRecord: boolean
}

interface NozzleCardProps {
  data: NozzleEntryData
  creditCustomers: CreditCustomerForDSR[]
  vehiclesByCustomer: Map<string, VehicleForDSR[]>
  onFieldChange: (nozzleId: string, field: string, value: number) => void
  onCreditEntryUpdate: (nozzleId: string, entryId: string, updates: Partial<CreditEntryData>) => void
  onCreditEntryAdd: (nozzleId: string) => void
  onCreditEntryRemove: (nozzleId: string, entryId: string) => void
  onLoadVehicles: (customerId: string) => void
}

export function NozzleCard({
  data,
  creditCustomers,
  vehiclesByCustomer,
  onFieldChange,
  onCreditEntryUpdate,
  onCreditEntryAdd,
  onCreditEntryRemove,
  onLoadVehicles,
}: NozzleCardProps) {
  const totalLiters = useMemo(() => {
    return Math.max(0, data.close_reading - data.opening_reading - data.testing_qty)
  }, [data.close_reading, data.opening_reading, data.testing_qty])

  const totalAmount = useMemo(() => {
    return totalLiters * data.fuel_price
  }, [totalLiters, data.fuel_price])

  const creditSalesTotal = useMemo(() => {
    return data.credit_entries.reduce((sum, ce) => sum + ce.amount, 0)
  }, [data.credit_entries])

  const cashSales = useMemo(() => {
    return totalAmount - data.upi_sales - data.card_sales - creditSalesTotal
  }, [totalAmount, data.upi_sales, data.card_sales, creditSalesTotal])

  const cashNegative = cashSales < -0.01

  const handleChange = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(data.nozzle_id, field, parseFloat(e.target.value) || 0)
    },
    [data.nozzle_id, onFieldChange]
  )

  return (
    <Card className="overflow-hidden">
      {/* Card Header */}
      <CardHeader className="py-3 px-4 bg-muted/30 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Fuel className="size-4 text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm">{data.nozzle_name}</span>
              <span className="text-muted-foreground mx-2">|</span>
              <span className="text-sm text-muted-foreground">{data.pump_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.isFirstRecord && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                First Record
              </Badge>
            )}
            {data.isEditing && (
              <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px]">
                <Edit3 className="size-3 mr-1" />
                Editing
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Meter Readings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Opening Reading
            </Label>
            <Input
              type="number"
              step="0.001"
              value={data.opening_reading || ""}
              onChange={handleChange("opening_reading")}
              placeholder="0.000"
              className="h-9 font-mono text-sm"
              readOnly={!data.isFirstRecord}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Close Reading
            </Label>
            <Input
              type="number"
              step="0.001"
              value={data.close_reading || ""}
              onChange={handleChange("close_reading")}
              placeholder="0.000"
              className={cn(
                "h-9 font-mono text-sm",
                data.close_reading > 0 && data.close_reading < data.opening_reading && "border-red-500"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Testing QTY (L)
            </Label>
            <Input
              type="number"
              step="0.001"
              value={data.testing_qty || ""}
              onChange={handleChange("testing_qty")}
              placeholder="0.000"
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Calculated
            </Label>
            <div className="h-9 px-3 rounded-md border bg-muted/50 font-mono text-xs flex items-center justify-between">
              <span>{totalLiters.toFixed(3)} L</span>
              <span className="font-semibold">{formatCurrency(totalAmount, true)}</span>
            </div>
          </div>
        </div>

        {/* Payment Split */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              UPI (₹)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={data.upi_sales || ""}
              onChange={handleChange("upi_sales")}
              placeholder="0.00"
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Card (₹)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={data.card_sales || ""}
              onChange={handleChange("card_sales")}
              placeholder="0.00"
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Credit (₹)
            </Label>
            <div className="h-9 px-3 rounded-md border bg-muted/50 font-mono text-xs flex items-center">
              {formatCurrency(creditSalesTotal, true)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Cash (₹) <span className="normal-case text-muted-foreground">(auto)</span>
            </Label>
            <div
              className={cn(
                "h-9 px-3 rounded-md border font-mono text-xs flex items-center font-semibold",
                cashNegative
                  ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
              )}
            >
              {formatCurrency(cashSales, true)}
            </div>
          </div>
        </div>

        {/* Credit Entries Section */}
        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Credit Sales
              </span>
              {data.credit_entries.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {data.credit_entries.length}
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onCreditEntryAdd(data.nozzle_id)}
              className="h-7 text-xs"
            >
              <Plus className="size-3 mr-1" />
              Add Credit
            </Button>
          </div>

          {data.credit_entries.length > 0 && (
            <div className="space-y-2">
              {data.credit_entries.map((entry) => (
                <CreditEntryRow
                  key={entry.id}
                  entry={entry}
                  fuelPrice={data.fuel_price}
                  creditCustomers={creditCustomers}
                  vehicles={vehiclesByCustomer.get(entry.credit_customer_id) || []}
                  onUpdate={(id, updates) => onCreditEntryUpdate(data.nozzle_id, id, updates)}
                  onRemove={(id) => onCreditEntryRemove(data.nozzle_id, id)}
                  onLoadVehicles={onLoadVehicles}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
