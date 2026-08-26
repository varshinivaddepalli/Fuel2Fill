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
import { getClientStations } from "@/actions/stations"
import { getStationPumps } from "@/actions/pump"
import { getStationNozzles } from "@/actions/nozzle"
import {
  addShift,
  getStationEmployees,
  getStationManagers,
  type StationEmployee,
  type Manager,
} from "@/actions/shifts"
import { formatSnakeCase, getTodayDateString } from "@/lib/utils"
import type { Station, Pump, Nozzle } from "@/types/database"

interface AddShiftDialogProps {
  onShiftAdded: () => void
}

export function AddShiftDialog({ onShiftAdded }: AddShiftDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [stations, setStations] = useState<Station[]>([])
  const [employees, setEmployees] = useState<StationEmployee[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [pumps, setPumps] = useState<Pump[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])

  // Loading states
  const [loadingStations, setLoadingStations] = useState(true)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [loadingPumps, setLoadingPumps] = useState(false)
  const [loadingNozzles, setLoadingNozzles] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    station_id: "",
    employee_id: "",
    pump_id: "",
    nozzle_id: "",
    assigned_by: "",
    shift_date: getTodayDateString(),
    start_time: "09:00",
    end_time: "",
  })

  // Load stations when dialog opens
  useEffect(() => {
    if (!open) return

    async function loadStations() {
      setLoadingStations(true)
      const result = await getClientStations()
      if (result.success) {
        setStations(result.stations)
      } else {
        setError(result.error)
      }
      setLoadingStations(false)
    }
    loadStations()
  }, [open])

  // Load dependent data when station changes
  useEffect(() => {
    if (!formData.station_id) {
      setEmployees([])
      setManagers([])
      setPumps([])
      setNozzles([])
      return
    }

    // Reset dependent selections
    setFormData((prev) => ({
      ...prev,
      employee_id: "",
      pump_id: "",
      nozzle_id: "",
      assigned_by: "",
    }))

    async function loadEmployees() {
      setLoadingEmployees(true)
      const result = await getStationEmployees(formData.station_id)
      if (result.success) {
        setEmployees(result.employees)
      }
      setLoadingEmployees(false)
    }

    async function loadManagers() {
      setLoadingManagers(true)
      const result = await getStationManagers(formData.station_id)
      if (result.success) {
        setManagers(result.managers)
      }
      setLoadingManagers(false)
    }

    async function loadPumps() {
      setLoadingPumps(true)
      const result = await getStationPumps(formData.station_id)
      if (result.success) {
        setPumps(result.pumps)
      }
      setLoadingPumps(false)
    }

    async function loadNozzles() {
      setLoadingNozzles(true)
      const result = await getStationNozzles(formData.station_id)
      if (result.success) {
        setNozzles(result.nozzles)
      }
      setLoadingNozzles(false)
    }

    loadEmployees()
    loadManagers()
    loadPumps()
    loadNozzles()
  }, [formData.station_id])

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.station_id) return "Please select a station"
    if (!formData.employee_id) return "Please select an employee"
    if (!formData.shift_date) return "Please select a shift date"
    if (!formData.start_time) return "Please enter a start time"
    return null
  }

  const resetForm = () => {
    setFormData({
      station_id: "",
      employee_id: "",
      pump_id: "",
      nozzle_id: "",
      assigned_by: "",
      shift_date: getTodayDateString(),
      start_time: "09:00",
      end_time: "",
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
      // Construct ISO datetime strings on client (correct local timezone)
      const startDate = new Date(`${formData.shift_date}T${formData.start_time}:00`)
      const startDatetime = startDate.toISOString()

      let endDatetime: string | null = null
      if (formData.end_time) {
        let endDate = new Date(`${formData.shift_date}T${formData.end_time}:00`)

        // Handle overnight shifts (e.g., 9 PM to 6 AM should end next day)
        if (endDate <= startDate) {
          endDate.setDate(endDate.getDate() + 1)
        }

        endDatetime = endDate.toISOString()
      }

      const result = await addShift({
        station_id: formData.station_id,
        employee_id: formData.employee_id,
        pump_id: formData.pump_id || null,
        nozzle_id: formData.nozzle_id || null,
        assigned_by: formData.assigned_by || null,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
      })

      if (!result.success) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      toast.success("Shift added successfully!", {
        description: "The shift has been assigned to the employee.",
      })

      resetForm()
      setOpen(false)
      onShiftAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add shift")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Shift
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign New Shift</DialogTitle>
          <DialogDescription>
            Assign a shift to an employee (manager or pump boy) at your station
          </DialogDescription>
        </DialogHeader>

        {loadingStations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>You need to add a station before assigning shifts.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Station and Employee */}
            <div className="grid gap-4 sm:grid-cols-2">
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
                        {station.station_name} - {station.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="employee_id">
                  Employee <span className="text-destructive">*</span>
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
                          : "Select an employee"
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
            </div>

            {/* Date and Time */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="shift_date">
                  Shift Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="shift_date"
                  name="shift_date"
                  type="date"
                  value={formData.shift_date}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="start_time">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Optional Assignments */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="pump_id">Pump</Label>
                <Select
                  value={formData.pump_id}
                  onValueChange={(value) => handleSelectChange("pump_id", value)}
                  disabled={isLoading || !formData.station_id || loadingPumps}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingPumps
                          ? "Loading..."
                          : !formData.station_id
                          ? "Select station first"
                          : "Select pump"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pumps.map((pump) => (
                      <SelectItem key={pump.pump_id} value={pump.pump_id}>
                        {pump.pump_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nozzle_id">Nozzle</Label>
                <Select
                  value={formData.nozzle_id}
                  onValueChange={(value) => handleSelectChange("nozzle_id", value)}
                  disabled={isLoading || !formData.station_id || loadingNozzles}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingNozzles
                          ? "Loading..."
                          : !formData.station_id
                          ? "Select station first"
                          : "Select nozzle"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {nozzles.map((nozzle) => (
                      <SelectItem key={nozzle.nozzle_id} value={nozzle.nozzle_id}>
                        {nozzle.nozzle_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assigned_by">Assigned By</Label>
                <Select
                  value={formData.assigned_by}
                  onValueChange={(value) => handleSelectChange("assigned_by", value)}
                  disabled={isLoading || !formData.station_id || loadingManagers}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingManagers
                          ? "Loading..."
                          : !formData.station_id
                          ? "Select station first"
                          : managers.length === 0
                          ? "No managers found"
                          : "Select manager"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.employee_id} value={manager.employee_id}>
                        {manager.employee_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 size-4" />
                    Add Shift
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
