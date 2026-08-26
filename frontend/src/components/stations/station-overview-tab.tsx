"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Pencil, X, Save, Loader2, MapPin, Phone, Building2, FileText, Calendar, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateStation } from "@/actions/station"
import { useInvalidateQueries } from "@/hooks/use-data"
import { validateStationForm } from "@/lib/validation/station"
import { formatDateShort } from "@/lib/utils"
import type { Station } from "@/types/database"
import type { StationInsert } from "@/types/database"

interface StationOverviewTabProps {
  station: Station
}

export function StationOverviewTab({ station }: StationOverviewTabProps) {
  const { invalidateAllStationData, invalidateDashboard } = useInvalidateQueries()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    station_name: station.station_name,
    station_phone: station.station_phone,
    station_sap_code: station.station_sap_code,
    station_gst_number: station.station_gst_number,
    address_line1: station.address_line1,
    address_line2: station.address_line2 || "",
    city: station.city,
    state: station.state,
    pincode: station.pincode,
    latitude: station.latitude?.toString() || "",
    longitude: station.longitude?.toString() || "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "station_phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCancel = useCallback(() => {
    setFormData({
      station_name: station.station_name,
      station_phone: station.station_phone,
      station_sap_code: station.station_sap_code,
      station_gst_number: station.station_gst_number,
      address_line1: station.address_line1,
      address_line2: station.address_line2 || "",
      city: station.city,
      state: station.state,
      pincode: station.pincode,
      latitude: station.latitude?.toString() || "",
      longitude: station.longitude?.toString() || "",
    })
    setError(null)
    setIsEditing(false)
  }, [station])

  const validateForm = (): string | null => {
    return validateStationForm(formData)
  }

  const handleSave = useCallback(async () => {
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)

    const updateData: Partial<Omit<StationInsert, "client_id">> = {
      station_name: formData.station_name.trim(),
      station_phone: formData.station_phone.trim(),
      station_sap_code: formData.station_sap_code.trim(),
      station_gst_number: formData.station_gst_number.trim().toUpperCase(),
      address_line1: formData.address_line1.trim(),
      address_line2: formData.address_line2.trim() || null,
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    }

    const result = await updateStation(station.station_id, updateData)

    if (result.success) {
      toast.success("Station updated", {
        description: "Station details have been updated successfully.",
      })
      invalidateAllStationData(station.station_id)
      invalidateDashboard()
      setIsEditing(false)
    } else {
      toast.error("Failed to update station", {
        description: result.error,
      })
      setError(result.error)
    }

    setIsSaving(false)
  }, [formData, station.station_id, invalidateAllStationData, invalidateDashboard])

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Station Details Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="size-4" />
              Station Details
            </CardTitle>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                  <X className="mr-2 size-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="station_name">Station Name</Label>
                  <Input
                    id="station_name"
                    name="station_name"
                    value={formData.station_name}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="station_sap_code">SAP Code</Label>
                  <Input
                    id="station_sap_code"
                    name="station_sap_code"
                    value={formData.station_sap_code}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="station_gst_number">GST Number</Label>
                  <Input
                    id="station_gst_number"
                    name="station_gst_number"
                    value={formData.station_gst_number}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    className="uppercase"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Station Name</span>
                  <span className="font-medium">{station.station_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">SAP Code</span>
                  <span className="font-mono text-sm">{station.station_sap_code}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">GST Number</span>
                  <span className="font-mono text-sm">{station.station_gst_number}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-4" />
                    Opening Date
                  </span>
                  <span>{formatDateShort(station.opening_date)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Location Info Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <MapPin className="size-4" />
              Location Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="station_phone">Phone</Label>
                  <Input
                    id="station_phone"
                    name="station_phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.station_phone}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="size-4" />
                    Phone
                  </span>
                  <span className="font-mono">{station.station_phone}</span>
                </div>
                <div className="py-2 border-b">
                  <span className="text-muted-foreground block mb-1">Address</span>
                  <span className="text-sm">
                    {station.address_line1}
                    {station.address_line2 && <>, {station.address_line2}</>}
                    <br />
                    {station.city}, {station.state} - {station.pincode}
                  </span>
                </div>
                {(station.latitude || station.longitude) && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Globe className="size-4" />
                      Coordinates
                    </span>
                    <span className="font-mono text-sm">
                      {station.latitude?.toFixed(6)}, {station.longitude?.toFixed(6)}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
