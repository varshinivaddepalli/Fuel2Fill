"use client"

import { useMemo } from "react"
import { Fuel, ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { formatCurrency } from "@/lib/utils"
import { NozzleCard, type NozzleEntryData } from "./nozzle-card"
import type { CreditEntryData } from "./credit-entry-row"
import type { CreditCustomerForDSR, VehicleForDSR } from "@/actions/daily-sale-record"

interface FuelTypeGroup {
  fueltype_id: string
  fueltype_name: string
  fuel_price: number
  nozzles: NozzleEntryData[]
}

interface NozzleSaleSectionProps {
  nozzleData: Map<string, NozzleEntryData>
  creditCustomers: CreditCustomerForDSR[]
  vehiclesByCustomer: Map<string, VehicleForDSR[]>
  onFieldChange: (nozzleId: string, field: string, value: number) => void
  onCreditEntryUpdate: (nozzleId: string, entryId: string, updates: Partial<CreditEntryData>) => void
  onCreditEntryAdd: (nozzleId: string) => void
  onCreditEntryRemove: (nozzleId: string, entryId: string) => void
  onLoadVehicles: (customerId: string) => void
}

export function NozzleSaleSection({
  nozzleData,
  creditCustomers,
  vehiclesByCustomer,
  onFieldChange,
  onCreditEntryUpdate,
  onCreditEntryAdd,
  onCreditEntryRemove,
  onLoadVehicles,
}: NozzleSaleSectionProps) {
  // Group nozzles by fuel type
  const fuelTypeGroups = useMemo(() => {
    const groups = new Map<string, FuelTypeGroup>()

    nozzleData.forEach((nozzle) => {
      const existing = groups.get(nozzle.fueltype_id)
      if (existing) {
        existing.nozzles.push(nozzle)
        // Update price to latest
        existing.fuel_price = nozzle.fuel_price
      } else {
        groups.set(nozzle.fueltype_id, {
          fueltype_id: nozzle.fueltype_id,
          fueltype_name: nozzle.fueltype_name,
          fuel_price: nozzle.fuel_price,
          nozzles: [nozzle],
        })
      }
    })

    return Array.from(groups.values())
  }, [nozzleData])

  if (fuelTypeGroups.length === 0) return null

  return (
    <Collapsible defaultOpen={true} className="space-y-6">
      {/* Section Header */}
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between py-2 px-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Fuel className="size-4 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider">Nozzle Sale Entry</span>
          </div>
          <ChevronDown className="size-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
      <div className="space-y-6">
      {fuelTypeGroups.map((group) => {
        const fuelColor = group.fueltype_name.toLowerCase().includes("petrol")
          ? "bg-orange-500"
          : group.fueltype_name.toLowerCase().includes("diesel")
            ? "bg-blue-500"
            : "bg-gray-500"

        return (
          <div key={group.fueltype_id} className="space-y-3">
            {/* Fuel Type Group Header */}
            <div className="flex items-center gap-2 px-1">
              <span className={`size-3 rounded-full ${fuelColor}`} />
              <span className="font-semibold text-sm">{group.fueltype_name}</span>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(group.fuel_price, true)}/L
              </span>
            </div>

            {/* Nozzle Cards */}
            <div className="space-y-3 pl-0 sm:pl-2">
              {group.nozzles.map((nozzle) => (
                <NozzleCard
                  key={nozzle.nozzle_id}
                  data={nozzle}
                  creditCustomers={creditCustomers}
                  vehiclesByCustomer={vehiclesByCustomer}
                  onFieldChange={onFieldChange}
                  onCreditEntryUpdate={onCreditEntryUpdate}
                  onCreditEntryAdd={onCreditEntryAdd}
                  onCreditEntryRemove={onCreditEntryRemove}
                  onLoadVehicles={onLoadVehicles}
                />
              ))}
            </div>
          </div>
        )
      })}
      </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
