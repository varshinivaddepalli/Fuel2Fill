"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FormErrorBanner } from "@/components/registration/form-error-banner"
import { FormFooter } from "@/components/registration/form-footer"
import { StationRequiredGate } from "@/components/registration/station-required-gate"
import { Button } from "@/components/ui/button"
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
import { getStationTanks } from "@/actions/tank"
import { getStationPumps } from "@/actions/pump"
import { getPumpNozzleInfo, addMultipleNozzles } from "@/actions/nozzle"
import type { Station, FuelType, Tank, Pump } from "@/types/database"

interface NozzleEntry {
  id: string
  nozzle_name: string
  tank_id: string
  fueltype_id: string
}

function createNozzleEntry(): NozzleEntry {
  return {
    id: crypto.randomUUID(),
    nozzle_name: "",
    tank_id: "",
    fueltype_id: "",
  }
}

export function AddNozzleForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [pumps, setPumps] = useState<Pump[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [loadingStations, setLoadingStations] = useState(true)
  const [loadingDependencies, setLoadingDependencies] = useState(false)
  const [loadingNozzleInfo, setLoadingNozzleInfo] = useState(false)

  const [stationId, setStationId] = useState("")
  const [pumpId, setPumpId] = useState("")
  const [nozzles, setNozzles] = useState<NozzleEntry[]>([])
  const [nozzleErrors, setNozzleErrors] = useState<Map<string, string>>(new Map())
  const [remainingSlots, setRemainingSlots] = useState<number | null>(null)
  const [pumpNozzleCount, setPumpNozzleCount] = useState<number | null>(null)
  const [existingNozzleCount, setExistingNozzleCount] = useState<number | null>(null)

  // Load stations on mount
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

  // Load station dependencies when station changes
  useEffect(() => {
    if (!stationId) {
      setPumps([])
      setTanks([])
      setFuelTypes([])
      setPumpId("")
      setNozzles([])
      setRemainingSlots(null)
      setPumpNozzleCount(null)
      setExistingNozzleCount(null)
      return
    }

    async function fetchStationDependencies() {
      setLoadingDependencies(true)
      const [pumpsResult, tanksResult, fuelTypesResult] = await Promise.all([
        getStationPumps(stationId),
        getStationTanks(stationId),
        getStationFuelTypes(stationId),
      ])
      if (pumpsResult.success) setPumps(pumpsResult.pumps)
      if (tanksResult.success) setTanks(tanksResult.tanks)
      if (fuelTypesResult.success) setFuelTypes(fuelTypesResult.fuelTypes)
      setLoadingDependencies(false)
    }
    fetchStationDependencies()
  }, [stationId])

  // Fetch pump nozzle info when pump changes
  useEffect(() => {
    if (!pumpId || !stationId) {
      setNozzles([])
      setRemainingSlots(null)
      setPumpNozzleCount(null)
      setExistingNozzleCount(null)
      return
    }

    async function fetchNozzleInfo() {
      setLoadingNozzleInfo(true)
      setNozzleErrors(new Map())
      const result = await getPumpNozzleInfo(pumpId, stationId)
      if (result.success) {
        const { remainingSlots: slots, nozzle_count, existingCount } = result.info
        setRemainingSlots(slots)
        setPumpNozzleCount(nozzle_count)
        setExistingNozzleCount(existingCount)
        // Generate nozzle entry cards for remaining slots
        if (slots > 0) {
          setNozzles(Array.from({ length: slots }, () => createNozzleEntry()))
        } else {
          setNozzles([])
        }
      } else {
        setError(result.error)
        setNozzles([])
        setRemainingSlots(null)
      }
      setLoadingNozzleInfo(false)
    }
    fetchNozzleInfo()
  }, [pumpId, stationId])

  const handleStationChange = (value: string) => {
    setStationId(value)
    setPumpId("")
    setNozzles([])
    setError(null)
    setNozzleErrors(new Map())
  }

  const handlePumpChange = (value: string) => {
    setPumpId(value)
    setError(null)
    setNozzleErrors(new Map())
  }

  const updateNozzle = useCallback(
    (id: string, field: keyof NozzleEntry, value: string) => {
      setNozzles((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n
          if (field === "tank_id") {
            // Auto-select fuel type from tank
            const selectedTank = tanks.find((t) => t.tank_id === value)
            return {
              ...n,
              tank_id: value,
              fueltype_id: selectedTank?.fueltype_id || n.fueltype_id,
            }
          }
          return { ...n, [field]: value }
        })
      )
      // Clear per-card error when user edits
      setNozzleErrors((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
    },
    [tanks]
  )

  const validateForm = (): boolean => {
    const errors = new Map<string, string>()
    let hasError = false

    if (!stationId) {
      setError("Please select a station")
      return false
    }
    if (!pumpId) {
      setError("Please select a pump")
      return false
    }
    if (nozzles.length === 0) {
      setError("No nozzle slots available for this pump")
      return false
    }

    // Validate each nozzle entry
    for (const nozzle of nozzles) {
      if (!nozzle.nozzle_name.trim()) {
        errors.set(nozzle.id, "Nozzle name is required")
        hasError = true
      } else if (!nozzle.tank_id) {
        errors.set(nozzle.id, "Please select a tank")
        hasError = true
      } else if (!nozzle.fueltype_id) {
        errors.set(nozzle.id, "Fuel type is required")
        hasError = true
      }
    }

    // Check for duplicate names within batch
    const seen = new Set<string>()
    for (const nozzle of nozzles) {
      const name = nozzle.nozzle_name.trim().toLowerCase()
      if (name && seen.has(name)) {
        errors.set(nozzle.id, "Duplicate nozzle name in this batch")
        hasError = true
      }
      seen.add(name)
    }

    setNozzleErrors(errors)
    if (hasError) {
      setError("Please fix the errors below")
    }
    return !hasError
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
      const result = await addMultipleNozzles({
        station_id: stationId,
        pump_id: pumpId,
        nozzles: nozzles.map((n) => ({
          nozzle_name: n.nozzle_name,
          tank_id: n.tank_id,
          fueltype_id: n.fueltype_id,
        })),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      const count = result.count
      toast.success(
        count === 1
          ? "Nozzle added successfully!"
          : `${count} nozzles added successfully!`,
        {
          description:
            count === 1
              ? "The new nozzle has been registered."
              : `${count} new nozzles have been registered.`,
        }
      )

      // Reset pump selection to show updated state
      setPumpId("")
      setNozzles([])
      setRemainingSlots(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add nozzles")
    } finally {
      setIsLoading(false)
    }
  }

  // Get fuel type name for tank display
  const getTankLabel = (tank: Tank) => {
    const fuelType = fuelTypes.find((ft) => ft.fueltype_id === tank.fueltype_id)
    const ftName = fuelType?.fueltype_name || "Unknown"
    return `${tank.tank_name} — ${ftName} (${tank.tank_capacity}${tank.capacity_unit === "kg" ? "kg" : "L"})`
  }

  const getPumpLabel = (pump: Pump) =>
    `${pump.pump_name} (${pump.nozzle_count} nozzle${pump.nozzle_count !== 1 ? "s" : ""})`

  const hasMissingDependencies =
    stationId &&
    !loadingDependencies &&
    (pumps.length === 0 || tanks.length === 0 || fuelTypes.length === 0)

  const nozzleCount = nozzles.length

  return (
    <StationRequiredGate
      loadingStations={loadingStations}
      stationsCount={stations.length}
      entityName="nozzles"
    >
      <form onSubmit={handleSubmit}>
        <FormErrorBanner error={error} />

        <div className="space-y-6">
          {/* Station & Pump Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle>Select Pump</CardTitle>
              <CardDescription>
                Choose a station and pump to assign nozzles
              </CardDescription>
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
                      <SelectItem
                        key={station.station_id}
                        value={station.station_id}
                      >
                        {station.station_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasMissingDependencies && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 px-4 py-3 text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Missing dependencies for this station:
                  </p>
                  <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300 space-y-1">
                    {pumps.length === 0 && (
                      <li>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-yellow-700 dark:text-yellow-300"
                          onClick={() => router.push("/registration/add-pump")}
                        >
                          Add a pump
                        </Button>
                      </li>
                    )}
                    {fuelTypes.length === 0 && (
                      <li>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-yellow-700 dark:text-yellow-300"
                          onClick={() =>
                            router.push("/registration/add-fuel-type")
                          }
                        >
                          Add a fuel type
                        </Button>
                      </li>
                    )}
                    {tanks.length === 0 && fuelTypes.length > 0 && (
                      <li>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-yellow-700 dark:text-yellow-300"
                          onClick={() => router.push("/registration/add-tank")}
                        >
                          Add a tank
                        </Button>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="pump_id">
                  Pump <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={pumpId}
                  onValueChange={handlePumpChange}
                  disabled={
                    isLoading || !stationId || loadingDependencies
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingDependencies
                          ? "Loading..."
                          : !stationId
                            ? "Select a station first"
                            : pumps.length === 0
                              ? "No pumps available"
                              : "Select a pump"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pumps.map((pump) => (
                      <SelectItem key={pump.pump_id} value={pump.pump_id}>
                        {getPumpLabel(pump)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pump capacity info */}
              {pumpId && !loadingNozzleInfo && pumpNozzleCount !== null && (
                <div className="rounded-md bg-muted px-4 py-3 text-sm">
                  <p className="text-muted-foreground">
                    This pump supports <span className="font-medium text-foreground">{pumpNozzleCount}</span> nozzle{pumpNozzleCount !== 1 ? "s" : ""}.{" "}
                    {existingNozzleCount! > 0 && (
                      <>
                        <span className="font-medium text-foreground">{existingNozzleCount}</span> already assigned.{" "}
                      </>
                    )}
                    {remainingSlots! > 0 ? (
                      <>
                        <span className="font-medium text-foreground">{remainingSlots}</span> slot{remainingSlots !== 1 ? "s" : ""} remaining.
                      </>
                    ) : (
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        All nozzle slots are filled.
                      </span>
                    )}
                  </p>
                </div>
              )}

              {loadingNozzleInfo && (
                <p className="text-sm text-muted-foreground">
                  Loading nozzle info...
                </p>
              )}
            </CardContent>
          </Card>

          {/* All nozzles assigned message */}
          {pumpId && !loadingNozzleInfo && remainingSlots === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  This pump already has all nozzles assigned. Select a different pump or add more nozzle slots by editing the pump.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Nozzle Entry Cards */}
          {nozzles.map((nozzle, index) => (
            <Card key={nozzle.id}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
                <Badge variant="secondary">Nozzle {index + 1}</Badge>
                {nozzleErrors.has(nozzle.id) && (
                  <p className="text-sm text-destructive">
                    {nozzleErrors.get(nozzle.id)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor={`nozzle_name_${nozzle.id}`}>
                    Nozzle Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`nozzle_name_${nozzle.id}`}
                    placeholder="e.g., Nozzle 1, Diesel Nozzle A"
                    value={nozzle.nozzle_name}
                    onChange={(e) =>
                      updateNozzle(nozzle.id, "nozzle_name", e.target.value)
                    }
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`tank_id_${nozzle.id}`}>
                    Tank <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={nozzle.tank_id}
                    onValueChange={(value) =>
                      updateNozzle(nozzle.id, "tank_id", value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tank" />
                    </SelectTrigger>
                    <SelectContent>
                      {tanks.map((tank) => (
                        <SelectItem key={tank.tank_id} value={tank.tank_id}>
                          {getTankLabel(tank)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`fueltype_id_${nozzle.id}`}>
                    Fuel Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={nozzle.fueltype_id}
                    onValueChange={(value) =>
                      updateNozzle(nozzle.id, "fueltype_id", value)
                    }
                    disabled={isLoading || !!nozzle.tank_id}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          fuelTypes.length === 0
                            ? "No fuel types available"
                            : "Select a fuel type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((fuelType) => (
                        <SelectItem
                          key={fuelType.fueltype_id}
                          value={fuelType.fueltype_id}
                        >
                          {fuelType.fueltype_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {nozzle.tank_id && nozzle.fueltype_id && (
                    <p className="text-xs text-muted-foreground">
                      Auto-selected based on the tank&apos;s fuel type
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {nozzleCount > 0 && (
            <FormFooter
              isLoading={isLoading}
              submitLabel={
                nozzleCount === 1
                  ? "Add Nozzle"
                  : `Add ${nozzleCount} Nozzles`
              }
              loadingLabel={
                nozzleCount === 1
                  ? "Adding Nozzle..."
                  : `Adding ${nozzleCount} Nozzles...`
              }
              disabled={!pumpId}
            />
          )}
        </div>
      </form>
    </StationRequiredGate>
  )
}
