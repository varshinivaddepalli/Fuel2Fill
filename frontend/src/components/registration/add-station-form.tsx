"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormErrorBanner } from "@/components/registration/form-error-banner"
import { FormFooter } from "@/components/registration/form-footer"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { toNullIfEmpty } from "@/lib/utils"
import { addStation } from "@/actions/station"
import {
  validatePhone,
  validatePincode,
  validateGst,
  validateCoordinate,
} from "@/lib/validation/indian-formats"

const INITIAL_FORM_DATA = {
  station_name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  station_phone: "",
  station_sap_code: "",
  station_gst_number: "",
  opening_date: "",
}

export function AddStationForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const resetForm = () => setFormData(INITIAL_FORM_DATA)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.station_name.trim()) {
      return "Station name is required"
    }
    if (!formData.address_line1.trim()) {
      return "Address is required"
    }
    if (!formData.city.trim()) {
      return "City is required"
    }
    if (!formData.state.trim()) {
      return "State is required"
    }

    const pincodeError = validatePincode(formData.pincode, true)
    if (pincodeError) return pincodeError

    const phoneError = validatePhone(formData.station_phone)
    if (phoneError) return phoneError

    if (!formData.station_sap_code.trim()) {
      return "SAP code is required"
    }

    const gstError = validateGst(formData.station_gst_number)
    if (gstError) return gstError

    if (!formData.opening_date) {
      return "Opening date is required"
    }

    const latError = validateCoordinate(formData.latitude, "latitude")
    if (latError) return latError

    const lngError = validateCoordinate(formData.longitude, "longitude")
    if (lngError) return lngError

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
      const result = await addStation({
        station_name: formData.station_name,
        address_line1: formData.address_line1,
        address_line2: toNullIfEmpty(formData.address_line2),
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        station_phone: formData.station_phone,
        station_sap_code: formData.station_sap_code,
        station_gst_number: formData.station_gst_number,
        opening_date: formData.opening_date,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success("Station added successfully!", {
        description: "The new station has been registered.",
      })
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add station")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormErrorBanner error={error} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Station Details</CardTitle>
            <CardDescription>
              Basic information about the station
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="station_name">
                Station Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="station_name"
                name="station_name"
                placeholder="Enter station name"
                value={formData.station_name}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="station_sap_code">
                  SAP Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station_sap_code"
                  name="station_sap_code"
                  placeholder="Station SAP code"
                  value={formData.station_sap_code}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="station_gst_number">
                  GST Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station_gst_number"
                  name="station_gst_number"
                  placeholder="22AAAAA0000A1Z5"
                  value={formData.station_gst_number}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="uppercase"
                  maxLength={15}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="station_phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station_phone"
                  name="station_phone"
                  type="tel"
                  placeholder="10-digit phone number"
                  value={formData.station_phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setFormData((prev) => ({ ...prev, station_phone: digits }))
                  }}
                  disabled={isLoading}
                  maxLength={10}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="opening_date">
                  Opening Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="opening_date"
                  name="opening_date"
                  type="date"
                  value={formData.opening_date}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Station Address</CardTitle>
            <CardDescription>
              Location details of the station
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="address_line1">
                Address Line 1 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address_line1"
                name="address_line1"
                placeholder="Street address"
                value={formData.address_line1}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                name="address_line2"
                placeholder="Landmark, area, etc."
                value={formData.address_line2}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pincode">
                  Pincode <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pincode"
                  name="pincode"
                  placeholder="6 digits"
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={isLoading}
                  maxLength={6}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coordinates</CardTitle>
            <CardDescription>
              Optional - GPS coordinates for location mapping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 28.6139"
                  value={formData.latitude}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 77.2090"
                  value={formData.longitude}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <FormFooter isLoading={isLoading} submitLabel="Add Station" loadingLabel="Adding Station..." />
      </div>
    </form>
  )
}
