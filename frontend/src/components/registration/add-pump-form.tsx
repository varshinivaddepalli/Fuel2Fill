"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { getClientStations } from "@/actions/stations"
import { addMultiplePumps } from "@/actions/pump"
import type { Station } from "@/types/database"

interface PumpEntry {
  id: string
  pump_name: string
  nozzle_count: string
}

function createEmptyPumpEntry(): PumpEntry {
  return {
    id: crypto.randomUUID(),
    pump_name: "",
    nozzle_count: "1",
  }
}

const PUMP_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function AddPumpForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [loadingStations, setLoadingStations] = useState(true)

  const [stationId, setStationId] = useState("")
  const [pumpCount, setPumpCount] = useState(1)
  const [pumps, setPumps] = useState<PumpEntry[]>([createEmptyPumpEntry()])
  const [pumpErrors, setPumpErrors] = useState<Map<string, string>>(new Map())

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

  const handleStationChange = (value: string) => {
    setStationId(value)
    setPumpCount(1)
    setPumps([createEmptyPumpEntry()])
    setPumpErrors(new Map())
    setError(null)
  }

  const handlePumpCountChange = (value: string) => {
    const newCount = parseInt(value, 10)
    setPumpCount(newCount)
    setPumps((prev) => {
      if (newCount > prev.length) {
        const additional = Array.from({ length: newCount - prev.length }, () => createEmptyPumpEntry())
        return [...prev, ...additional]
      }
      return prev.slice(0, newCount)
    })
    setPumpErrors(new Map())
    setError(null)
  }

  const updatePump = useCallback((id: string, field: keyof PumpEntry, value: string) => {
    setPumps((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
    setPumpErrors((prev) => {
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

    for (const pump of pumps) {
      if (!pump.pump_name.trim()) {
        errors.set(pump.id, "Pump name is required")
      } else {
        const nozzleCount = parseInt(pump.nozzle_count, 10)
        if (isNaN(nozzleCount) || nozzleCount < 1 || nozzleCount > 10) {
          errors.set(pump.id, "Number of nozzles must be between 1 and 10")
        }
      }
    }

    // Check for duplicate names within the batch
    const nameMap = new Map<string, string[]>()
    for (const pump of pumps) {
      const name = pump.pump_name.trim().toLowerCase()
      if (!name) continue
      const existing = nameMap.get(name) || []
      existing.push(pump.id)
      nameMap.set(name, existing)
    }
    for (const [, ids] of nameMap) {
      if (ids.length > 1) {
        hasGlobalError = true
        for (const id of ids) {
          if (!errors.has(id)) {
            errors.set(id, "Duplicate pump name in this batch")
          }
        }
      }
    }

    setPumpErrors(errors)
    if (errors.size > 0) {
      if (hasGlobalError) {
        setError("Please fix the errors below. Duplicate pump names are not allowed.")
      } else {
        setError("Please fill in all required fields for each pump.")
      }
      return false
    }

    return true
  }

  const resetForm = () => {
    setStationId("")
    setPumpCount(1)
    setPumps([createEmptyPumpEntry()])
    setPumpErrors(new Map())
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
      const result = await addMultiplePumps({
        station_id: stationId,
        pumps: pumps.map((p) => ({
          pump_name: p.pump_name,
          nozzle_count: parseInt(p.nozzle_count, 10),
        })),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      const msg = result.count === 1 ? "Pump added successfully!" : `${result.count} pumps added successfully!`
      toast.success(msg, {
        description: result.count === 1
          ? "The new pump has been registered."
          : `${result.count} new pumps have been registered.`,
      })
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add pumps")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StationRequiredGate loadingStations={loadingStations} stationsCount={stations.length} entityName="pumps">
      <form onSubmit={handleSubmit}>
        <FormErrorBanner error={error} />

        <div className="space-y-6">
          {/* Station Selection + Pump Count */}
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
                <Label htmlFor="pump_count">Number of Pumps</Label>
                <Select
                  value={String(pumpCount)}
                  onValueChange={handlePumpCountChange}
                  disabled={isLoading || !stationId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUMP_COUNT_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pump Entry Cards */}
          {pumps.map((pump, index) => (
            <Card key={pump.id}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
                <Badge variant="secondary">Pump {index + 1}</Badge>
                {pumpErrors.has(pump.id) && (
                  <p className="text-sm text-destructive">{pumpErrors.get(pump.id)}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor={`pump_name_${pump.id}`}>
                    Pump Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`pump_name_${pump.id}`}
                    placeholder="e.g., Pump 1, Diesel Pump A"
                    value={pump.pump_name}
                    onChange={(e) => updatePump(pump.id, "pump_name", e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`nozzle_count_${pump.id}`}>
                    Number of Nozzles <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`nozzle_count_${pump.id}`}
                    type="number"
                    min={1}
                    max={10}
                    placeholder="e.g., 2"
                    value={pump.nozzle_count}
                    onChange={(e) => updatePump(pump.id, "nozzle_count", e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <FormFooter
            isLoading={isLoading}
            submitLabel={pumpCount === 1 ? "Add Pump" : `Add ${pumpCount} Pumps`}
            loadingLabel={pumpCount === 1 ? "Adding Pump..." : `Adding ${pumpCount} Pumps...`}
            disabled={!stationId}
          />
        </div>
      </form>
    </StationRequiredGate>
  )
}
