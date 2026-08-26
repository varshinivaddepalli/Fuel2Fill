"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Loader2, CheckCircle2, XCircle, Clock, CalendarOff, Users } from "lucide-react"
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
import { getStationManagers, type Manager } from "@/actions/shifts"
import {
  getDailyAttendance,
  markAttendance,
  bulkMarkAttendance,
  type EmployeeAttendanceStatus,
  type AttendanceWithDetails,
} from "@/actions/attendance"
import { formatSnakeCase, getInitials, getTodayDateString } from "@/lib/utils"
import type { Station, AttendanceStatusType } from "@/types/database"

interface MarkAttendanceDialogProps {
  onAttendanceMarked: () => void
  editAttendance?: AttendanceWithDetails | null
  onEditClose?: () => void
}

const statusOptions: { value: AttendanceStatusType; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: "present", label: "Present", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "absent", label: "Absent", icon: XCircle, color: "text-red-600" },
  { value: "half_day", label: "Half Day", icon: Clock, color: "text-amber-600" },
  { value: "leave", label: "Leave", icon: CalendarOff, color: "text-blue-600" },
]

export function MarkAttendanceDialog({ onAttendanceMarked, editAttendance, onEditClose }: MarkAttendanceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"single" | "bulk">("bulk")

  // Data states
  const [stations, setStations] = useState<Station[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [employees, setEmployees] = useState<EmployeeAttendanceStatus[]>([])

  // Loading states
  const [loadingStations, setLoadingStations] = useState(true)
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Form state for single mode
  const [formData, setFormData] = useState({
    station_id: "",
    attendance_date: getTodayDateString(),
    marked_by: "",
  })

  // Bulk attendance state - employee_id -> status mapping
  const [bulkAttendance, setBulkAttendance] = useState<Map<string, { status: AttendanceStatusType; hours: number | null }>>(new Map())

  // Open dialog in edit mode when editAttendance is provided
  useEffect(() => {
    if (editAttendance) {
      setOpen(true)
      setMode("single")
      setFormData({
        station_id: editAttendance.station_id,
        attendance_date: editAttendance.attendance_date,
        marked_by: editAttendance.marked_by || "",
      })
      setBulkAttendance(new Map([
        [editAttendance.employee_id, { status: editAttendance.attendance_status, hours: editAttendance.hours_worked }]
      ]))
    }
  }, [editAttendance])

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

  // Load managers when station changes
  useEffect(() => {
    if (!formData.station_id) {
      setManagers([])
      return
    }

    async function loadManagers() {
      setLoadingManagers(true)
      const result = await getStationManagers(formData.station_id)
      if (result.success) {
        setManagers(result.managers)
      }
      setLoadingManagers(false)
    }

    loadManagers()
  }, [formData.station_id])

  // Load employees when station and date are set (for bulk mode)
  useEffect(() => {
    if (!formData.station_id || !formData.attendance_date || mode !== "bulk") {
      return
    }

    async function loadEmployees() {
      setLoadingEmployees(true)
      const result = await getDailyAttendance(formData.attendance_date, formData.station_id)
      if (result.success) {
        setEmployees(result.employees)
        // Initialize bulk attendance with existing data
        const initialAttendance = new Map<string, { status: AttendanceStatusType; hours: number | null }>()
        for (const emp of result.employees) {
          if (emp.attendance_status) {
            initialAttendance.set(emp.employee_id, {
              status: emp.attendance_status,
              hours: emp.hours_worked,
            })
          }
        }
        setBulkAttendance(initialAttendance)
      }
      setLoadingEmployees(false)
    }

    loadEmployees()
  }, [formData.station_id, formData.attendance_date, mode])

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "station_id" ? { marked_by: "" } : {}),
    }))
    if (name === "station_id") {
      setBulkAttendance(new Map())
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleStatusChange = (employeeId: string, status: AttendanceStatusType) => {
    setBulkAttendance((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(employeeId)
      newMap.set(employeeId, { status, hours: existing?.hours || null })
      return newMap
    })
  }

  const handleHoursChange = (employeeId: string, hours: string) => {
    setBulkAttendance((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(employeeId)
      if (existing) {
        newMap.set(employeeId, { ...existing, hours: hours ? parseFloat(hours) : null })
      }
      return newMap
    })
  }

  const markAllAs = (status: AttendanceStatusType) => {
    setBulkAttendance((prev) => {
      const newMap = new Map(prev)
      for (const emp of employees) {
        const existing = newMap.get(emp.employee_id)
        newMap.set(emp.employee_id, { status, hours: existing?.hours || null })
      }
      return newMap
    })
  }

  const validateForm = (): string | null => {
    if (!formData.station_id) return "Please select a station"
    if (!formData.attendance_date) return "Please select a date"
    if (bulkAttendance.size === 0) return "Please mark attendance for at least one employee"
    return null
  }

  const resetForm = () => {
    setFormData({
      station_id: "",
      attendance_date: getTodayDateString(),
      marked_by: "",
    })
    setBulkAttendance(new Map())
    setEmployees([])
    setError(null)
    setMode("bulk")
  }

  const handleClose = () => {
    setOpen(false)
    resetForm()
    if (onEditClose) {
      onEditClose()
    }
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
      if (editAttendance) {
        // Single edit mode
        const entry = bulkAttendance.get(editAttendance.employee_id)
        if (!entry) {
          setError("No attendance data to save")
          setIsLoading(false)
          return
        }

        const result = await markAttendance({
          employee_id: editAttendance.employee_id,
          station_id: formData.station_id,
          attendance_date: formData.attendance_date,
          attendance_status: entry.status,
          hours_worked: entry.hours,
          marked_by: formData.marked_by || null,
        })

        if (!result.success) {
          setError(result.error)
          setIsLoading(false)
          return
        }

        toast.success("Attendance updated!", {
          description: `Updated attendance for ${editAttendance.employee_name}`,
        })
      } else {
        // Bulk mark mode
        const entries = Array.from(bulkAttendance.entries()).map(([employee_id, data]) => {
          const emp = employees.find((e) => e.employee_id === employee_id)
          return {
            employee_id,
            station_id: emp?.station_id || formData.station_id,
            attendance_status: data.status,
            hours_worked: data.hours,
          }
        })

        const result = await bulkMarkAttendance(
          formData.attendance_date,
          entries,
          formData.marked_by || null
        )

        if (!result.success) {
          setError(result.error)
          setIsLoading(false)
          return
        }

        toast.success("Attendance marked!", {
          description: `Marked ${result.marked} new, updated ${result.updated} records`,
        })
      }

      handleClose()
      onAttendanceMarked()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark attendance")
    } finally {
      setIsLoading(false)
    }
  }

  const isEditMode = !!editAttendance

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose()
      } else {
        setOpen(true)
      }
    }}>
      {!isEditMode && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 size-4" />
            Mark Attendance
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Attendance" : "Mark Attendance"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Update attendance for ${editAttendance?.employee_name}`
              : "Mark daily attendance for employees at your station"
            }
          </DialogDescription>
        </DialogHeader>

        {loadingStations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>You need to add a station before marking attendance.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Station, Date, and Marked By */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="station_id">
                  Station <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.station_id}
                  onValueChange={(value) => handleSelectChange("station_id", value)}
                  disabled={isLoading || isEditMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
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
                <Label htmlFor="attendance_date">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="attendance_date"
                  name="attendance_date"
                  type="date"
                  value={formData.attendance_date}
                  onChange={handleInputChange}
                  disabled={isLoading || isEditMode}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="marked_by">Marked By</Label>
                <Select
                  value={formData.marked_by}
                  onValueChange={(value) => handleSelectChange("marked_by", value)}
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
                          ? "No managers"
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

            {/* Quick Actions */}
            {!isEditMode && formData.station_id && employees.length > 0 && (
              <div className="flex items-center gap-2 py-2 border-t border-b">
                <span className="text-sm text-muted-foreground mr-2">Mark all as:</span>
                {statusOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markAllAs(option.value)}
                      disabled={isLoading}
                    >
                      <Icon className={`mr-1 size-3 ${option.color}`} />
                      {option.label}
                    </Button>
                  )
                })}
              </div>
            )}

            {/* Employee List / Daily Sheet */}
            {!isEditMode && formData.station_id && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="size-4" />
                    Employees ({employees.length})
                  </Label>
                  {loadingEmployees && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {employees.length === 0 && !loadingEmployees ? (
                  <div className="text-center text-muted-foreground py-4 border rounded-md">
                    No employees found for this station
                  </div>
                ) : (
                  <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                    {employees.map((emp) => {
                      const attendance = bulkAttendance.get(emp.employee_id)
                      return (
                        <div key={emp.employee_id} className="flex items-center gap-3 p-3">
                          {/* Employee Info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {emp.employee_photo ? (
                              <img
                                src={emp.employee_photo}
                                alt={emp.employee_name}
                                className="size-9 rounded-full object-cover object-top shrink-0"
                              />
                            ) : (
                              <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                                {getInitials(emp.employee_name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate">{emp.employee_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatSnakeCase(emp.employee_role)}
                              </div>
                            </div>
                          </div>

                          {/* Status Selection */}
                          <div className="flex items-center gap-2">
                            <Select
                              value={attendance?.status || ""}
                              onValueChange={(value) => handleStatusChange(emp.employee_id, value as AttendanceStatusType)}
                              disabled={isLoading}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((option) => {
                                  const Icon = option.icon
                                  return (
                                    <SelectItem key={option.value} value={option.value}>
                                      <span className="flex items-center gap-1.5">
                                        <Icon className={`size-3.5 ${option.color}`} />
                                        {option.label}
                                      </span>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>

                            {/* Hours input (shown only if status is selected) */}
                            {attendance?.status && (
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                placeholder="Hours"
                                className="w-[80px]"
                                value={attendance.hours || ""}
                                onChange={(e) => handleHoursChange(emp.employee_id, e.target.value)}
                                disabled={isLoading}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode - Single Employee */}
            {isEditMode && editAttendance && (
              <div className="space-y-4 border rounded-md p-4">
                <div className="flex items-center gap-3">
                  {editAttendance.employee_photo ? (
                    <img
                      src={editAttendance.employee_photo}
                      alt={editAttendance.employee_name}
                      className="size-12 rounded-full object-cover object-top"
                    />
                  ) : (
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {getInitials(editAttendance.employee_name)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{editAttendance.employee_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatSnakeCase(editAttendance.employee_role)} at {editAttendance.station_name}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={bulkAttendance.get(editAttendance.employee_id)?.status || ""}
                      onValueChange={(value) => handleStatusChange(editAttendance.employee_id, value as AttendanceStatusType)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => {
                          const Icon = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <span className="flex items-center gap-1.5">
                                <Icon className={`size-3.5 ${option.color}`} />
                                {option.label}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Hours Worked</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder="Hours"
                      value={bulkAttendance.get(editAttendance.employee_id)?.hours || ""}
                      onChange={(e) => handleHoursChange(editAttendance.employee_id, e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || bulkAttendance.size === 0}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditMode ? (
                  "Update Attendance"
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 size-4" />
                    Save Attendance ({bulkAttendance.size})
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
