"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { toNullIfEmpty } from "@/lib/utils"
import { addFuelType } from "@/actions/fuel-type"
import { getClientStations } from "@/actions/stations"
import type { Station } from "@/types/database"

const INITIAL_FORM_DATA = {
  station_id: "",
  fueltype_name: "",
  unit_of_measure: "liters",
  hsn_code: "",
}

export function AddFuelTypeForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [loadingStations, setLoadingStations] = useState(true)

  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const resetForm = () => setFormData(INITIAL_FORM_DATA)

  

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.station_id) {
      return "Please select a station"
    }
    if (!formData.fueltype_name.trim()) {
      return "Fuel type name is required"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured")
      return
    }

    setIsLoading(true)

    try {
      const result = await addFuelType({
        station_id: formData.station_id,
        fueltype_name: formData.fueltype_name,
        unit_of_measure: formData.unit_of_measure || "liters",
        fueltype_price: 0,
        hsn_code: toNullIfEmpty(formData.hsn_code),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success("Fuel type added successfully!", {
        description: "The new fuel type has been registered.",
      })
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add fuel type")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StationRequiredGate loadingStations={loadingStations} stationsCount={stations.length} entityName="fuel types">
      <form onSubmit={handleSubmit}>
      <FormErrorBanner error={error} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fuel Type Details</CardTitle>
            <CardDescription>
              Add a new fuel type to a station
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="station_id">
                Station <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.station_id}
                onValueChange={(value) => handleSelectChange("station_id", value)}
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
              <Label htmlFor="fueltype_name">
                Fuel Type Name <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.fueltype_name}
                onValueChange={(value) => handleSelectChange("fueltype_name", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="fueltype_name">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Premium Petrol">Premium Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Premium Diesel">Premium Diesel</SelectItem>
                  <SelectItem value="CNG">CNG</SelectItem>
                  <SelectItem value="LPG">LPG</SelectItem>
                  <SelectItem value="EV Charging">EV Charging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unit_of_measure">Unit of Measure</Label>
              <Select
                value={formData.unit_of_measure}
                onValueChange={(value) => handleSelectChange("unit_of_measure", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liters">Liters</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="kWh">KWH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hsn_code">HSN Code</Label>
              <Input
                id="hsn_code"
                name="hsn_code"
                placeholder="Optional HSN code"
                value={formData.hsn_code}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <FormFooter isLoading={isLoading} submitLabel="Add Fuel Type" loadingLabel="Adding Fuel Type..." />
      </div>
      </form>
    </StationRequiredGate>
  )
}
