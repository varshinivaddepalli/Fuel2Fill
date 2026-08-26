"use client"

import { useState, useCallback, useMemo } from "react"
import { Loader2, CheckCircle2, XCircle, Clock, CalendarOff, Building2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { deleteAttendance, type AttendanceWithDetails } from "@/actions/attendance"
import { useAttendance, useInvalidateQueries } from "@/hooks/use-data"
import { DataTable, getColumns, getAggregatedColumns, type AggregatedAttendance } from "./attendance-table"
import { MarkAttendanceDialog } from "./mark-attendance-dialog"
import { AttendanceCalendar } from "./attendance-calendar"

export function AttendanceList() {
  const { data, isLoading, error } = useAttendance()
  const { invalidateAttendance, invalidateDashboard } = useInvalidateQueries()

  const [editAttendance, setEditAttendance] = useState<AttendanceWithDetails | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const todayAttendance = data?.todayAttendance ?? []
  const weekAttendance = data?.weekAttendance ?? []
  const monthAttendance = data?.monthAttendance ?? []
  const summary = data?.summary ?? { present: 0, absent: 0, half_day: 0, leave: 0, total: 0 }

  const handleAttendanceMarked = useCallback(() => {
    invalidateAttendance()
    invalidateDashboard()
  }, [invalidateAttendance, invalidateDashboard])

  const handleDelete = useCallback((attendanceId: string) => {
    setDeleteId(attendanceId)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return
    const result = await deleteAttendance(deleteId)
    if (result.success) {
      toast.success("Attendance deleted", {
        description: "The attendance record has been removed.",
      })
      invalidateAttendance()
      invalidateDashboard()
    } else {
      toast.error("Failed to delete attendance", {
        description: result.error,
      })
    }
    setDeleteId(null)
  }, [deleteId, invalidateAttendance, invalidateDashboard])

  const handleEdit = useCallback((attendance: AttendanceWithDetails) => {
    setEditAttendance(attendance)
  }, [])

  const handleEditClose = useCallback(() => {
    setEditAttendance(null)
  }, [])

  // Get columns with action handlers (for Today tab - individual records)
  const columns = useMemo(
    () => getColumns({ onDelete: handleDelete, onEdit: handleEdit }),
    [handleDelete, handleEdit]
  )

  // Get aggregated columns (for Week/Month/Station tabs)
  const aggregatedColumns = useMemo(() => getAggregatedColumns(), [])

  // Helper function to aggregate attendance by employee
  const aggregateByEmployee = useCallback((records: AttendanceWithDetails[]): AggregatedAttendance[] => {
    const employeeMap = new Map<string, AggregatedAttendance>()

    records.forEach((record) => {
      const existing = employeeMap.get(record.employee_id)
      if (existing) {
        existing.total_days++
        if (record.attendance_status === "present") existing.present_days++
        else if (record.attendance_status === "absent") existing.absent_days++
        else if (record.attendance_status === "half_day") existing.half_day_days++
        else if (record.attendance_status === "leave") existing.leave_days++
      } else {
        employeeMap.set(record.employee_id, {
          employee_id: record.employee_id,
          employee_name: record.employee_name,
          employee_role: record.employee_role,
          employee_photo: record.employee_photo,
          station_id: record.station_id,
          station_name: record.station_name,
          total_days: 1,
          present_days: record.attendance_status === "present" ? 1 : 0,
          absent_days: record.attendance_status === "absent" ? 1 : 0,
          half_day_days: record.attendance_status === "half_day" ? 1 : 0,
          leave_days: record.attendance_status === "leave" ? 1 : 0,
        })
      }
    })

    return Array.from(employeeMap.values())
  }, [])

  // Flatten attendance for Today tab (individual records)
  const todayAttendanceFlat = useMemo(
    () => todayAttendance.flatMap((station) => station.attendance),
    [todayAttendance]
  )

  // Aggregate attendance for Week/Month tabs (one row per employee)
  const weekAttendanceAggregated = useMemo(
    () => aggregateByEmployee(weekAttendance.flatMap((station) => station.attendance)),
    [weekAttendance, aggregateByEmployee]
  )

  const monthAttendanceAggregated = useMemo(
    () => aggregateByEmployee(monthAttendance.flatMap((station) => station.attendance)),
    [monthAttendance, aggregateByEmployee]
  )

  // Get unique stations with aggregated attendance for station tabs
  const allStations = useMemo(() => {
    return monthAttendance.map((station) => ({
      station_id: station.station_id,
      station_name: station.station_name,
      attendance: aggregateByEmployee(station.attendance),
    }))
  }, [monthAttendance, aggregateByEmployee])

  return (
    <div className="space-y-6">
      {/* Header with Mark Attendance button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Track and manage employee attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 size-4" />
                Calendar View
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Attendance Calendar</SheetTitle>
                <SheetDescription>
                  View monthly attendance overview with color-coded indicators
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <AttendanceCalendar />
              </div>
            </SheetContent>
          </Sheet>
          <MarkAttendanceDialog
            onAttendanceMarked={handleAttendanceMarked}
            editAttendance={editAttendance}
            onEditClose={handleEditClose}
          />
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
                  <CheckCircle2 className="size-4 sm:size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{summary.present}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Present</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-full bg-red-100 dark:bg-red-950">
                  <XCircle className="size-4 sm:size-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{summary.absent}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-full bg-amber-100 dark:bg-amber-950">
                  <Clock className="size-4 sm:size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{summary.half_day}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Half Day</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-full bg-blue-100 dark:bg-blue-950">
                  <CalendarOff className="size-4 sm:size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{summary.leave}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">On Leave</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
        <Tabs defaultValue="today" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="today" className="gap-2">
                <div className="flex items-center gap-2">
                  <span>Today</span>
                  {todayAttendanceFlat.length > 0 && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                      {todayAttendanceFlat.length}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2">
                <div className="flex items-center gap-2">
                  <span>This Week</span>
                  {weekAttendanceAggregated.length > 0 && (
                    <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-full">
                      {weekAttendanceAggregated.length}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-2">
                <div className="flex items-center gap-2">
                  <span>This Month</span>
                  {monthAttendanceAggregated.length > 0 && (
                    <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-full">
                      {monthAttendanceAggregated.length}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              {allStations.map((station) => (
                <TabsTrigger key={station.station_id} value={station.station_id} className="gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-3.5" />
                    <span className="max-w-[100px] truncate">{station.station_name}</span>
                    <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-full">
                      {station.attendance.length}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Today Tab */}
          <TabsContent value="today" className="mt-0">
            <DataTable
              columns={columns}
              data={todayAttendanceFlat}
              emptyMessage="No Attendance Marked Today"
              emptyDescription="Click 'Mark Attendance' to record today's attendance for your employees."
            />
          </TabsContent>

          {/* Week Tab - Aggregated by employee */}
          <TabsContent value="week" className="mt-0">
            <DataTable
              columns={aggregatedColumns}
              data={weekAttendanceAggregated}
              emptyMessage="No Attendance This Week"
              emptyDescription="Attendance records for this week will appear here."
              showFilters={false}
            />
          </TabsContent>

          {/* Month Tab - Aggregated by employee */}
          <TabsContent value="month" className="mt-0">
            <DataTable
              columns={aggregatedColumns}
              data={monthAttendanceAggregated}
              emptyMessage="No Attendance This Month"
              emptyDescription="Attendance records for this month will appear here."
              showFilters={false}
            />
          </TabsContent>

          {/* Station Tabs - Aggregated by employee */}
          {allStations.map((station) => (
            <TabsContent key={station.station_id} value={station.station_id} className="mt-0">
              <DataTable
                columns={aggregatedColumns}
                data={station.attendance}
                emptyMessage={`No Attendance at ${station.station_name}`}
                emptyDescription="No attendance records for this station."
                showFilters={false}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
