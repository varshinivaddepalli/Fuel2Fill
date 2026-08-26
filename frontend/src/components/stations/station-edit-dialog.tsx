"use client"

import { useState, useEffect } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { validateStationForm } from "@/lib/validation/station"
import type { StationWithCounts } from "@/actions/station-detail"
import type { StationInsert } from "@/types/database"

interface StationEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  station: StationWithCounts
  onSave: (stationId: string, data: Partial<Omit<StationInsert, "client_id">>) => Promise<boolean>
}

export function StationEditDialog({
  open,
  onOpenChange,
  station,
  onSave,
}: StationEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    station_name: "",
    station_phone: "",
    station_sap_code: "",
    station_gst_number: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: "",
  })

  // Populate form when station changes
  useEffect(() => {
    if (station && open) {
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
    }
  }, [station, open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "station_phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    return validateStationForm(formData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

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

    const success = await onSave(station.station_id, updateData)
    setIsLoading(false)

    if (!success) {
      // Error will be shown by the parent via toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Station</DialogTitle>
          <DialogDescription>
            Update station details. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Basic Information</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="station_name">
                  Station Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station_name"
                  name="station_name"
                  value={formData.station_name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="station_phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station_phone"
                  name="station_phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.station_phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="station_sap_code">
                  SAP Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station_sap_code"
                  name="station_sap_code"
                  value={formData.station_sap_code}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="station_gst_number">
                  GST Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station_gst_number"
                  name="station_gst_number"
                  value={formData.station_gst_number}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="uppercase"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Address</h4>

            <div className="grid gap-2">
              <Label htmlFor="address_line1">
                Address Line 1 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address_line1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleInputChange}
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
                  value={formData.city}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pincode">
                  Pincode <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          {/* Coordinates */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Coordinates (Optional)</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 19.0760"
                  value={formData.latitude}
                  onChange={handleInputChange}
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
                  placeholder="e.g., 72.8777"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
