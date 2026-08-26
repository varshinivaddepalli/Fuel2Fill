"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormErrorBanner } from "@/components/registration/form-error-banner"
import { FormFooter } from "@/components/registration/form-footer"
import { StationRequiredGate } from "@/components/registration/station-required-gate"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { getStationFuelTypes } from "@/actions/fuel-type"
import { getClientStations } from "@/actions/stations"
import { addMultipleTanks } from "@/actions/tank"
import type { Station, FuelType } from "@/types/database"

interface TankEntry {
  id: string
  tank_name: string
  fueltype_id: string
  tank_capacity: string
  capacity_unit: string
}

function createEmptyTankEntry(): TankEntry {
  return {
    id: crypto.randomUUID(),
    tank_name: "",
    fueltype_id: "",
    tank_capacity: "",
    capacity_unit: "liters",
  }
}

const TANK_COUNT_OPTIONS = [1, 2, 3, 4, 5]

export function AddTankForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [loadingStations, setLoadingStations] = useState(true)
  const [loadingFuelTypes, setLoadingFuelTypes] = useState(false)

  const [stationId, setStationId] = useState("")
  const [tankCount, setTankCount] = useState(1)
  const [tanks, setTanks] = useState<TankEntry[]>([createEmptyTankEntry()])
  const [tankErrors, setTankErrors] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    async function fetchStations() {
      const result = await getClientStations()
      if (result.success) {
        setStations(result.stations)
      } else {
        setError(result.error)
      }
      setLoadingStations(false)
    }
    fetchStations()
  }, [])

  useEffect(() => {
    async function fetchFuelTypes() {
      if (!stationId) {
        setFuelTypes([])
        return
      }
      setLoadingFuelTypes(true)
      const result = await getStationFuelTypes(stationId)
      if (result.success) {
        setFuelTypes(result.fuelTypes)
      } else {
        setError(result.error)
      }
      setLoadingFuelTypes(false)
    }
    fetchFuelTypes()
  }, [stationId])

  const handleStationChange = (value: string) => {
    setStationId(value)
    setTankCount(1)
    setTanks([createEmptyTankEntry()])
    setTankErrors(new Map())
    setError(null)
  }

  const handleTankCountChange = (value: string) => {
    const newCount = parseInt(value, 10)
    setTankCount(newCount)
    setTanks((prev) => {
      if (newCount > prev.length) {
        const additional = Array.from({ length: newCount - prev.length }, () => createEmptyTankEntry())
        return [...prev, ...additional]
      }
      return prev.slice(0, newCount)
    })
    setTankErrors(new Map())
    setError(null)
  }

  const updateTank = useCallback((id: string, field: keyof TankEntry, value: string) => {
    setTanks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
    setTankErrors((prev) => {
      if (prev.has(id)) {
        const next = new Map(prev)
        next.delete(id)
        return next
      }
      return prev
    })
  }, [])

  const validateForm = (): boolean => {
    const errors = new Map<string, string>()
    let hasGlobalError = false

    if (!stationId) {
      setError("Please select a station")
      return false
    }

    for (const tank of tanks) {
      if (!tank.tank_name.trim()) {
        errors.set(tank.id, "Tank name is required")
      } else if (!tank.fueltype_id) {
        errors.set(tank.id, "Please select a fuel type")
      } else if (!tank.tank_capacity || parseFloat(tank.tank_capacity) <= 0) {
        errors.set(tank.id, "Tank capacity must be greater than 0")
      }
    }

    // Check for duplicate names within the batch
    const nameMap = new Map<string, string[]>()
    for (const tank of tanks) {
      const name = tank.tank_name.trim().toLowerCase()
      if (!name) continue
      const existing = nameMap.get(name) || []
      existing.push(tank.id)
      nameMap.set(name, existing)
    }
    for (const [, ids] of nameMap) {
      if (ids.length > 1) {
        hasGlobalError = true
        for (const id of ids) {
          if (!errors.has(id)) {
            errors.set(id, "Duplicate tank name in this batch")
          }
        }
      }
    }

    setTankErrors(errors)
    if (errors.size > 0) {
      if (hasGlobalError) {
        setError("Please fix the errors below. Duplicate tank names are not allowed.")
      } else {
        setError("Please fill in all required fields for each tank.")
      }
      return false
    }

    return true
  }

  const resetForm = () => {
    setStationId("")
    setTankCount(1)
    setTanks([createEmptyTankEntry()])
    setTankErrors(new Map())
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured")
      return
    }

    setIsLoading(true)

    try {
      const result = await addMultipleTanks({
        station_id: stationId,
        tanks: tanks.map((t) => ({
          tank_name: t.tank_name,
          fueltype_id: t.fueltype_id,
          tank_capacity: parseFloat(t.tank_capacity),
          capacity_unit: t.capacity_unit,
        })),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      const msg = result.count === 1 ? "Tank added successfully!" : `${result.count} tanks added successfully!`
      toast.success(msg, {
        description: result.count === 1
          ? "The new tank has been registered."
          : `${result.count} new tanks have been registered.`,
      })
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tanks")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StationRequiredGate loadingStations={loadingStations} stationsCount={stations.length} entityName="tanks">
      <form onSubmit={handleSubmit}>
        <FormErrorBanner error={error} />

        <div className="space-y-6">
          {/* Station Selection + Tank Count */}
          <Card>
            <CardHeader>
              <CardTitle>Station & Count</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="station_id">
                  Station <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={stationId}
                  onValueChange={handleStationChange}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem key={station.station_id} value={station.station_id}>
                        {station.station_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tank_count">Number of Tanks</Label>
                <Select
                  value={String(tankCount)}
                  onValueChange={handleTankCountChange}
                  disabled={isLoading || !stationId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TANK_COUNT_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {stationId && fuelTypes.length === 0 && !loadingFuelTypes && (
                <p className="text-sm text-muted-foreground">
                  No fuel types found.{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => router.push("/registration/add-fuel-type")}
                  >
                    Add a fuel type first
                  </Button>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tank Entry Cards */}
          {tanks.map((tank, index) => (
            <Card key={tank.id}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
                <Badge variant="secondary">Tank {index + 1}</Badge>
                {tankErrors.has(tank.id) && (
                  <p className="text-sm text-destructive">{tankErrors.get(tank.id)}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor={`tank_name_${tank.id}`}>
                    Tank Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`tank_name_${tank.id}`}
                    placeholder="e.g., Tank 1, Diesel Tank A"
                    value={tank.tank_name}
                    onChange={(e) => updateTank(tank.id, "tank_name", e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`fueltype_${tank.id}`}>
                    Fuel Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={tank.fueltype_id}
                    onValueChange={(value) => updateTank(tank.id, "fueltype_id", value)}
                    disabled={isLoading || !stationId || loadingFuelTypes}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingFuelTypes
                            ? "Loading fuel types..."
                            : !stationId
                            ? "Select a station first"
                            : fuelTypes.length === 0
                            ? "No fuel types available"
                            : "Select a fuel type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((ft) => (
                        <SelectItem key={ft.fueltype_id} value={ft.fueltype_id}>
                          {ft.fueltype_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`tank_capacity_${tank.id}`}>
                    Tank Capacity <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`tank_capacity_${tank.id}`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g., 10000"
                      value={tank.tank_capacity}
                      onChange={(e) => updateTank(tank.id, "tank_capacity", e.target.value)}
                      disabled={isLoading}
                      required
                      className="flex-1"
                    />
                    <Select
                      value={tank.capacity_unit}
                      onValueChange={(value) => updateTank(tank.id, "capacity_unit", value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="liters">Liters (L)</SelectItem>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <FormFooter
            isLoading={isLoading}
            submitLabel={tankCount === 1 ? "Add Tank" : `Add ${tankCount} Tanks`}
            loadingLabel={tankCount === 1 ? "Adding Tank..." : `Adding ${tankCount} Tanks...`}
            disabled={!stationId || fuelTypes.length === 0}
          />
        </div>
      </form>
    </StationRequiredGate>
  )
}
