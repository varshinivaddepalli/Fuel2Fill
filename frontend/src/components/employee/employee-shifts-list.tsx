"use client"

import { useMemo, useCallback, useState } from "react"
import { Loader2, CheckCircle2, PlayCircle, Building2 } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deleteShift, endShift, type ShiftWithDetails } from "@/actions/shifts"
import { useShifts, useInvalidateQueries } from "@/hooks/use-data"
import { DataTable, getColumns } from "./shifts-table"
import { AddShiftDialog } from "./add-shift-dialog"
import { ShiftsFilterBar, defaultFilters, type ShiftFilters } from "./shifts-filter-bar"
import { formatDateForInput } from "@/lib/utils"

export function EmployeeShiftsList() {
  const { data, isLoading, error } = useShifts()
  const { invalidateShifts, invalidateDashboard } = useInvalidateQueries()
  const [filters, setFilters] = useState<ShiftFilters>(defaultFilters)

  const currentShifts = data?.currentShifts ?? []
  const pastShifts = data?.pastShifts ?? []

  const handleShiftAdded = useCallback(() => {
    invalidateShifts()
    invalidateDashboard()
  }, [invalidateShifts, invalidateDashboard])

  const handleDelete = useCallback(async (shiftId: string) => {
    const result = await deleteShift(shiftId)
    if (result.success) {
      toast.success("Shift deleted", {
        description: "The shift has been removed.",
      })
      invalidateShifts()
      invalidateDashboard()
    } else {
      toast.error("Failed to delete shift", {
        description: result.error,
      })
    }
  }, [invalidateShifts, invalidateDashboard])

  const handleEndShift = useCallback(async (shiftId: string) => {
    const result = await endShift(shiftId)
    if (result.success) {
      toast.success("Shift ended", {
        description: "The shift has been marked as complete.",
      })
      invalidateShifts()
      invalidateDashboard()
    } else {
      toast.error("Failed to end shift", {
        description: result.error,
      })
    }
  }, [invalidateShifts, invalidateDashboard])

  // Get columns with action handlers
  const columns = useMemo(
    () => getColumns({ onDelete: handleDelete, onEndShift: handleEndShift }),
    [handleDelete, handleEndShift]
  )

  // Flatten shifts for table display
  const currentShiftsFlat = useMemo(
    () => currentShifts.flatMap((station) => station.shifts),
    [currentShifts]
  )

  const pastShiftsFlat = useMemo(
    () => pastShifts.flatMap((station) => station.shifts),
    [pastShifts]
  )

  // Get unique stations for station tabs
  const allStations = useMemo(() => {
    const stationMap = new Map<string, { station_id: string; station_name: string; shifts: ShiftWithDetails[] }>()

    // Combine current and past shifts by station
    ;[...currentShifts, ...pastShifts].forEach((station) => {
      if (stationMap.has(station.station_id)) {
        const existing = stationMap.get(station.station_id)!
        existing.shifts = [...existing.shifts, ...station.shifts]
      } else {
        stationMap.set(station.station_id, {
          station_id: station.station_id,
          station_name: station.station_name,
          shifts: [...station.shifts],
        })
      }
    })

    return Array.from(stationMap.values())
  }, [currentShifts, pastShifts])

  // Combine all shifts for extracting filter options
  const allShiftsFlat = useMemo(
    () => [...currentShiftsFlat, ...pastShiftsFlat],
    [currentShiftsFlat, pastShiftsFlat]
  )

  // Extract unique filter options from shifts data
  const filterOptions = useMemo(() => {
    const stations = new Map<string, string>()
    const employees = new Map<string, string>()
    const pumps = new Map<string, string>()
    const managers = new Map<string, string>()

    allShiftsFlat.forEach((shift) => {
      // Stations
      if (shift.station_id && shift.station_name) {
        stations.set(shift.station_id, shift.station_name)
      }
      // Employees
      if (shift.employee_id && shift.employee_name) {
        employees.set(shift.employee_id, shift.employee_name)
      }
      // Pumps
      if (shift.pump_id && shift.pump_name) {
        pumps.set(shift.pump_id, shift.pump_name)
      }
      // Managers (assigned_by)
      if (shift.assigned_by && shift.assigned_by_name) {
        managers.set(shift.assigned_by, shift.assigned_by_name)
      }
    })

    return {
      stations: Array.from(stations, ([value, label]) => ({ value, label })),
      employees: Array.from(employees, ([value, label]) => ({ value, label })),
      pumps: Array.from(pumps, ([value, label]) => ({ value, label })),
      managers: Array.from(managers, ([value, label]) => ({ value, label })),
    }
  }, [allShiftsFlat])

  // Filter function
  const applyFilters = useCallback((shifts: ShiftWithDetails[]) => {
    return shifts.filter((shift) => {
      // Employee name search (case-insensitive partial match)
      if (filters.employeeName) {
        const searchTerm = filters.employeeName.toLowerCase()
        if (!shift.employee_name.toLowerCase().includes(searchTerm)) {
          return false
        }
      }

      // Station filter
      if (filters.stationId && shift.station_id !== filters.stationId) {
        return false
      }

      // Role filter
      if (filters.role && shift.employee_role !== filters.role) {
        return false
      }

      // Status filter (ongoing = no end_time or end_time in future, completed = end_time in past)
      if (filters.status) {
        const now = new Date()
        const hasEnded = shift.end_time && new Date(shift.end_time) < now
        if (filters.status === "ongoing" && hasEnded) {
          return false
        }
        if (filters.status === "completed" && !hasEnded) {
          return false
        }
      }

      // Date range filter (based on start_time)
      if (filters.dateFrom || filters.dateTo) {
        const shiftDate = formatDateForInput(new Date(shift.start_time))
        if (filters.dateFrom && shiftDate < filters.dateFrom) {
          return false
        }
        if (filters.dateTo && shiftDate > filters.dateTo) {
          return false
        }
      }

      // Assigned by filter
      if (filters.assignedById && shift.assigned_by !== filters.assignedById) {
        return false
      }

      // Pump filter
      if (filters.pumpId && shift.pump_id !== filters.pumpId) {
        return false
      }

      return true
    })
  }, [filters])

  // Check if any filters are active
  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v !== ""),
    [filters]
  )

  // Apply filters to all data
  const filteredCurrentShifts = useMemo(
    () => applyFilters(currentShiftsFlat),
    [applyFilters, currentShiftsFlat]
  )

  const filteredPastShifts = useMemo(
    () => applyFilters(pastShiftsFlat),
    [applyFilters, pastShiftsFlat]
  )

  // Filter station tabs data
  const filteredStations = useMemo(() => {
    return allStations.map((station) => ({
      ...station,
      shifts: applyFilters(station.shifts),
    })).filter((station) => station.shifts.length > 0 || !hasActiveFilters)
  }, [allStations, applyFilters, hasActiveFilters])

  // Calculate totals (from filtered data)
  const totalCurrentShifts = filteredCurrentShifts.length
  const totalPastShifts = filteredPastShifts.length

  return (
    <div className="space-y-6">
      {/* Header with Add Shift button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Employee Shifts</h2>
          <p className="text-muted-foreground">
            Manage and assign shifts to your employees
          </p>
        </div>
        <AddShiftDialog onShiftAdded={handleShiftAdded} />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive">{error instanceof Error ? error.message : "An error occurred"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <ShiftsFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            stations={filterOptions.stations}
            employees={filterOptions.employees}
            pumps={filterOptions.pumps}
            managers={filterOptions.managers}
          />

          <Tabs defaultValue="current" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="current" className="gap-2">
                <div className="relative flex items-center gap-2">
                  {totalCurrentShifts > 0 && (
                    <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  <span>Current</span>
                  {totalCurrentShifts > 0 && (
                    <span className="ml-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                      {totalCurrentShifts}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2">
                <div className="flex items-center gap-2">
                  <span>Past</span>
                  {totalPastShifts > 0 && (
                    <span className="ml-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-full">
                      {totalPastShifts}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              {filteredStations.map((station) => (
                <TabsTrigger key={station.station_id} value={station.station_id} className="gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-3.5" />
                    <span className="max-w-[100px] truncate">{station.station_name}</span>
                    <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-full">
                      {station.shifts.length}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              {totalCurrentShifts > 0 && (
                <div className="flex items-center gap-1.5">
                  <PlayCircle className="size-4 text-amber-500" />
                  <span>{totalCurrentShifts} Active</span>
                </div>
              )}
              {totalPastShifts > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span>{totalPastShifts} Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Current Shifts Tab */}
          <TabsContent value="current" className="mt-0">
            <DataTable
              columns={columns}
              data={filteredCurrentShifts}
              emptyMessage={hasActiveFilters ? "No Matching Shifts" : "No Current Shifts"}
              emptyDescription={hasActiveFilters ? "No shifts match your filter criteria. Try adjusting the filters." : "There are no ongoing shifts at the moment. Click 'Add Shift' to assign new shifts."}
            />
          </TabsContent>

          {/* Past Shifts Tab */}
          <TabsContent value="past" className="mt-0">
            <DataTable
              columns={columns}
              data={filteredPastShifts}
              emptyMessage={hasActiveFilters ? "No Matching Shifts" : "No Past Shifts"}
              emptyDescription={hasActiveFilters ? "No shifts match your filter criteria. Try adjusting the filters." : "Completed shifts will appear here once employees finish their shifts."}
            />
          </TabsContent>

          {/* Station Tabs */}
          {filteredStations.map((station) => (
            <TabsContent key={station.station_id} value={station.station_id} className="mt-0">
              <DataTable
                columns={columns}
                data={station.shifts}
                emptyMessage={hasActiveFilters ? "No Matching Shifts" : `No Shifts at ${station.station_name}`}
                emptyDescription={hasActiveFilters ? "No shifts match your filter criteria. Try adjusting the filters." : "There are no shifts assigned to this station."}
              />
            </TabsContent>
          ))}
        </Tabs>
        </div>
      )}
    </div>
  )
}
