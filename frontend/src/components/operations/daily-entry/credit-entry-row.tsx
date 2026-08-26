"use client"

import { useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CreditCustomerForDSR, VehicleForDSR } from "@/actions/daily-sale-record"

export interface CreditEntryData {
  id: string
  credit_customer_id: string
  vehicle_id: string
  entry_type: "qty" | "amt"
  quantity: number
  amount: number
}

interface CreditEntryRowProps {
  entry: CreditEntryData
  fuelPrice: number
  creditCustomers: CreditCustomerForDSR[]
  vehicles: VehicleForDSR[]
  onUpdate: (id: string, updates: Partial<CreditEntryData>) => void
  onRemove: (id: string) => void
  onLoadVehicles: (customerId: string) => void
}

export function CreditEntryRow({
  entry,
  fuelPrice,
  creditCustomers,
  vehicles,
  onUpdate,
  onRemove,
  onLoadVehicles,
}: CreditEntryRowProps) {
  const handleCustomerChange = useCallback(
    (value: string) => {
      const customerId = value === "none" ? "" : value
      onUpdate(entry.id, { credit_customer_id: customerId, vehicle_id: "" })
      if (customerId) {
        onLoadVehicles(customerId)
      }
    },
    [entry.id, onUpdate, onLoadVehicles]
  )

  const handleVehicleChange = useCallback(
    (value: string) => {
      onUpdate(entry.id, { vehicle_id: value === "none" ? "" : value })
    },
    [entry.id, onUpdate]
  )

  const handleToggleType = useCallback(() => {
    const newType = entry.entry_type === "qty" ? "amt" : "qty"
    onUpdate(entry.id, { entry_type: newType })
  }, [entry.id, entry.entry_type, onUpdate])

  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const qty = parseFloat(e.target.value) || 0
      onUpdate(entry.id, {
        quantity: qty,
        amount: Math.round(qty * fuelPrice * 100) / 100,
      })
    },
    [entry.id, fuelPrice, onUpdate]
  )

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const amt = parseFloat(e.target.value) || 0
      onUpdate(entry.id, {
        amount: amt,
        quantity: fuelPrice > 0 ? Math.round((amt / fuelPrice) * 1000) / 1000 : 0,
      })
    },
    [entry.id, fuelPrice, onUpdate]
  )

  const selectedCustomerName = useMemo(() => {
    if (!entry.credit_customer_id) return null
    return creditCustomers.find((c) => c.credit_customer_id === entry.credit_customer_id)?.customer_name
  }, [entry.credit_customer_id, creditCustomers])

  return (
    <div className="grid grid-cols-2 gap-2 items-end rounded-lg border p-3 md:border-0 md:p-0 md:rounded-none md:grid-cols-[1fr_1fr_auto_0.6fr_0.6fr_auto]">
      {/* Customer */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Customer</span>
        <Select
          value={entry.credit_customer_id || "none"}
          onValueChange={handleCustomerChange}
        >
          <SelectTrigger className="h-9 text-xs md:h-8">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select customer</SelectItem>
            {creditCustomers.map((c) => (
              <SelectItem key={c.credit_customer_id} value={c.credit_customer_id}>
                {c.customer_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehicle */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Vehicle</span>
        <Select
          value={entry.vehicle_id || "none"}
          onValueChange={handleVehicleChange}
          disabled={!entry.credit_customer_id}
        >
          <SelectTrigger className="h-9 text-xs md:h-8">
            <SelectValue placeholder={entry.credit_customer_id ? "Select vehicle" : "Select customer first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No vehicle</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.vehicle_id} value={v.vehicle_id}>
                {v.vehicle_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* QTY/AMT Toggle */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Mode</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleToggleType}
          className={cn(
            "h-9 w-full text-[10px] font-bold tracking-wider md:h-8 md:w-14",
            entry.entry_type === "qty"
              ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
          )}
        >
          {entry.entry_type === "qty" ? "QTY" : "AMT"}
        </Button>
      </div>

      {/* Quantity */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Litres</span>
        <Input
          type="number"
          inputMode="decimal"
          step="0.001"
          value={entry.quantity || ""}
          onChange={handleQuantityChange}
          disabled={entry.entry_type === "amt"}
          placeholder="0.000"
          className={cn(
            "h-9 text-xs font-mono md:h-8",
            entry.entry_type === "amt" && "bg-muted/50"
          )}
        />
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Amount (₹)</span>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={entry.amount || ""}
          onChange={handleAmountChange}
          disabled={entry.entry_type === "qty"}
          placeholder="0.00"
          className={cn(
            "h-9 text-xs font-mono md:h-8",
            entry.entry_type === "qty" && "bg-muted/50"
          )}
        />
      </div>

      {/* Remove */}
      <div className="space-y-1 flex flex-col items-end md:items-start">
        <span className="text-[10px] invisible">X</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(entry.id)}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive md:h-8 md:w-8"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
