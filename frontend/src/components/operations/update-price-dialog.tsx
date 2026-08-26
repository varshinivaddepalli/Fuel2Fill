"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getStationsWithFuelTypes,
  getStationEmployeesForPrice,
  updateDailyFuelPrice,
  type StationWithFuelTypes,
  type StationEmployee,
} from "@/actions/daily-fuel-price"
import { formatSnakeCase, getTodayDateString } from "@/lib/utils"

interface UpdatePriceDialogProps {
  onPriceUpdated: () => void
}

export function UpdatePriceDialog({ onPriceUpdated }: UpdatePriceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [stations, setStations] = useState<StationWithFuelTypes[]>([])
  const [employees, setEmployees] = useState<StationEmployee[]>([])
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<{ fueltype_id: string; fueltype_name: string; current_price: number }[]>([])

  // Loading states
  const [loadingStations, setLoadingStations] = useState(true)
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    station_id: "",
    fueltype_id: "",
    new_price: "",
    effective_date: getTodayDateString(),
    employee_id: "",
  })

  // Load stations when dialog opens
  useEffect(() => {
    if (!open) return

    async function loadStations() {
      setLoadingStations(true)
      const result = await getStationsWithFuelTypes()
      if (result.success) {
        setStations(result.stations)
      } else {
        setError(result.error)
      }
      setLoadingStations(false)
    }
    loadStations()
  }, [open])

  // Update fuel types when station changes
  useEffect(() => {
    if (!formData.station_id) {
      setSelectedFuelTypes([])
      setEmployees([])
      return
    }

    const station = stations.find((s) => s.station_id === formData.station_id)
    setSelectedFuelTypes(station?.fuel_types || [])

    // Reset dependent selections
    setFormData((prev) => ({
      ...prev,
      fueltype_id: "",
      employee_id: "",
      new_price: "",
    }))

    // Load employees for this station
    async function loadEmployees() {
      setLoadingEmployees(true)
      const result = await getStationEmployeesForPrice(formData.station_id)
      if (result.success) {
        setEmployees(result.employees)
      }
      setLoadingEmployees(false)
    }

    loadEmployees()
  }, [formData.station_id, stations])

  // Auto-fill current price when fuel type is selected
  useEffect(() => {
    if (!formData.fueltype_id) return

    const fuelType = selectedFuelTypes.find((ft) => ft.fueltype_id === formData.fueltype_id)
    if (fuelType) {
      setFormData((prev) => ({
        ...prev,
        new_price: fuelType.current_price.toString(),
      }))
    }
  }, [formData.fueltype_id, selectedFuelTypes])

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.station_id) return "Please select a station"
    if (!formData.fueltype_id) return "Please select a fuel type"
    if (!formData.new_price) return "Please enter a price"
    if (isNaN(parseFloat(formData.new_price)) || parseFloat(formData.new_price) < 0) {
      return "Please enter a valid positive price"
    }
    if (!formData.effective_date) return "Please select an effective date"
    if (!formData.employee_id) return "Please select the employee who updated the price"
    return null
  }

  const resetForm = () => {
    setFormData({
      station_id: "",
      fueltype_id: "",
      new_price: "",
      effective_date: getTodayDateString(),
      employee_id: "",
    })
    setError(null)
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

    try {
      const result = await updateDailyFuelPrice({
        station_id: formData.station_id,
        fueltype_id: formData.fueltype_id,
        new_price: parseFloat(formData.new_price),
        effective_date: formData.effective_date,
        employee_id: formData.employee_id,
      })

      if (!result.success) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      const fuelType = selectedFuelTypes.find((ft) => ft.fueltype_id === formData.fueltype_id)
      const actionWord = result.isUpdate ? "updated" : "set"

      toast.success(`Price ${actionWord} successfully!`, {
        description: `${fuelType?.fueltype_name || "Fuel"} price ${actionWord} to ₹${parseFloat(formData.new_price).toFixed(2)}`,
      })

      resetForm()
      setOpen(false)
      onPriceUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update price")
    } finally {
      setIsLoading(false)
    }
  }

  const currentFuelType = selectedFuelTypes.find((ft) => ft.fueltype_id === formData.fueltype_id)
  const priceChanged = currentFuelType && formData.new_price &&
    parseFloat(formData.new_price) !== currentFuelType.current_price

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Update Price
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Fuel Price</DialogTitle>
          <DialogDescription>
            Set or update the daily fuel price for a station
          </DialogDescription>
        </DialogHeader>

        {loadingStations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>You need to add a station with fuel types first.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Station */}
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

            {/* Fuel Type */}
            <div className="grid gap-2">
              <Label htmlFor="fueltype_id">
                Fuel Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.fueltype_id}
                onValueChange={(value) => handleSelectChange("fueltype_id", value)}
                disabled={isLoading || !formData.station_id || selectedFuelTypes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !formData.station_id
                        ? "Select station first"
                        : selectedFuelTypes.length === 0
                        ? "No fuel types found"
                        : "Select a fuel type"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectedFuelTypes.map((fuelType) => (
                    <SelectItem key={fuelType.fueltype_id} value={fuelType.fueltype_id}>
                      {fuelType.fueltype_name} (Current: ₹{fuelType.current_price.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price and Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="new_price">
                  New Price (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new_price"
                  name="new_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.new_price}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {priceChanged && currentFuelType && (
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(formData.new_price) > currentFuelType.current_price ? (
                      <span className="text-red-500">
                        +₹{(parseFloat(formData.new_price) - currentFuelType.current_price).toFixed(2)} increase
                      </span>
                    ) : (
                      <span className="text-green-500">
                        -₹{(currentFuelType.current_price - parseFloat(formData.new_price)).toFixed(2)} decrease
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="effective_date">
                  Effective Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="effective_date"
                  name="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Updated By */}
            <div className="grid gap-2">
              <Label htmlFor="employee_id">
                Updated By <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => handleSelectChange("employee_id", value)}
                disabled={isLoading || !formData.station_id || loadingEmployees}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingEmployees
                        ? "Loading..."
                        : !formData.station_id
                        ? "Select station first"
                        : employees.length === 0
                        ? "No employees found"
                        : "Select who updated the price"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.employee_id} value={employee.employee_id}>
                      {employee.employee_name} ({formatSnakeCase(employee.employee_role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 size-4" />
                    Update Price
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
