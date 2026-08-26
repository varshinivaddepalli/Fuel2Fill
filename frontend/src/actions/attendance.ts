"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import { invalidateAttendance } from "@/lib/cache-invalidation"
import { formatDateForInput } from "@/lib/utils"
import type { EmployeeAttendanceInsert, AttendanceStatusType } from "@/types/database"

// Types for attendance data with related info
export interface AttendanceWithDetails {
  attendance_id: string
  employee_id: string
  station_id: string
  shift_id: string | null
  attendance_date: string
  hours_worked: number | null
  attendance_status: AttendanceStatusType
  marked_by: string | null
  created_at: string
  updated_at: string
  employee_name: string
  employee_role: string
  employee_photo: string | null
  station_name: string
  marked_by_name: string | null
}

export interface StationWithAttendance {
  station_id: string
  station_name: string
  attendance: AttendanceWithDetails[]
}

export interface AttendanceSummary {
  present: number
  absent: number
  half_day: number
  leave: number
  total: number
}

export interface AttendanceData {
  todayAttendance: StationWithAttendance[]
  weekAttendance: StationWithAttendance[]
  monthAttendance: StationWithAttendance[]
  summary: AttendanceSummary
}

export type GetAttendanceResult =
  | { success: true; data: AttendanceData }
  | { success: false; error: string }

// Helper to get date ranges (uses local timezone, not UTC)
function getDateRanges() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayStr = formatDateForInput(today)

  // Start of week (Monday)
  const weekStart = new Date(today)
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  weekStart.setDate(today.getDate() - diff)
  const weekStartStr = formatDateForInput(weekStart)

  // Start of month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStartStr = formatDateForInput(monthStart)

  return { todayStr, weekStartStr, monthStartStr }
}

export async function getClientAttendance(): Promise<GetAttendanceResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return {
        success: true,
        data: {
          todayAttendance: [],
          weekAttendance: [],
          monthAttendance: [],
          summary: { present: 0, absent: 0, half_day: 0, leave: 0, total: 0 },
        },
      }
    }

    const stationIds = stations.map((s) => s.station_id)
    const { todayStr, weekStartStr, monthStartStr } = getDateRanges()
    const supabase = await createClient()

    // Get all attendance for this month (includes today and week)
    const { data: attendance, error: attendanceError } = await supabase
      .from("employee_attendance")
      .select(`
        *,
        employees!employee_attendance_employee_id_fkey (
          employee_name,
          employee_role,
          employee_photo
        ),
        marked_employee:employees!employee_attendance_marked_by_fkey (
          employee_name
        )
      `)
      .in("station_id", stationIds)
      .gte("attendance_date", monthStartStr)
      .order("attendance_date", { ascending: false })

    if (attendanceError) {
      return { success: false, error: attendanceError.message }
    }

    // Create station lookup map
    const stationMap = new Map(stations.map((s) => [s.station_id, s.station_name]))

    // Transform attendance with details
    const attendanceWithDetails: AttendanceWithDetails[] = (attendance || []).map((record) => {
      const employee = record.employees as { employee_name: string; employee_role: string; employee_photo: string | null } | null
      const markedEmployee = record.marked_employee as { employee_name: string } | null

      return {
        attendance_id: record.attendance_id,
        employee_id: record.employee_id,
        station_id: record.station_id,
        shift_id: record.shift_id,
        attendance_date: record.attendance_date,
        hours_worked: record.hours_worked,
        attendance_status: record.attendance_status,
        marked_by: record.marked_by,
        created_at: record.created_at,
        updated_at: record.updated_at,
        employee_name: employee?.employee_name || "Unknown",
        employee_role: employee?.employee_role || "Unknown",
        employee_photo: employee?.employee_photo || null,
        station_name: stationMap.get(record.station_id) || "Unknown",
        marked_by_name: markedEmployee?.employee_name || null,
      }
    })

    // Filter by date ranges
    const todayData = attendanceWithDetails.filter((a) => a.attendance_date === todayStr)
    const weekData = attendanceWithDetails.filter((a) => a.attendance_date >= weekStartStr)
    const monthData = attendanceWithDetails

    // Group by station
    const groupByStation = (data: AttendanceWithDetails[]): StationWithAttendance[] => {
      return stations
        .map((station) => ({
          station_id: station.station_id,
          station_name: station.station_name,
          attendance: data.filter((a) => a.station_id === station.station_id),
        }))
        .filter((station) => station.attendance.length > 0)
    }

    // Calculate today's summary
    const summary: AttendanceSummary = {
      present: todayData.filter((a) => a.attendance_status === "present").length,
      absent: todayData.filter((a) => a.attendance_status === "absent").length,
      half_day: todayData.filter((a) => a.attendance_status === "half_day").length,
      leave: todayData.filter((a) => a.attendance_status === "leave").length,
      total: todayData.length,
    }

    return {
      success: true,
      data: {
        todayAttendance: groupByStation(todayData),
        weekAttendance: groupByStation(weekData),
        monthAttendance: groupByStation(monthData),
        summary,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch attendance",
    }
  }
}

// Get attendance for a specific date (for daily attendance sheet)
export interface EmployeeAttendanceStatus {
  employee_id: string
  employee_name: string
  employee_role: string
  employee_photo: string | null
  station_id: string
  station_name: string
  attendance_id: string | null
  attendance_status: AttendanceStatusType | null
  hours_worked: number | null
  marked_by_name: string | null
}

export type GetDailyAttendanceResult =
  | { success: true; employees: EmployeeAttendanceStatus[]; date: string }
  | { success: false; error: string }

export async function getDailyAttendance(date: string, stationId?: string): Promise<GetDailyAttendanceResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Get stations for this client
    let stationsQuery = supabase
      .from("stations")
      .select("station_id, station_name")
      .eq("client_id", client.client_id)
      .eq("status", "active")

    if (stationId) {
      stationsQuery = stationsQuery.eq("station_id", stationId)
    }

    const { data: stations, error: stationsError } = await stationsQuery

    if (stationsError) {
      return { success: false, error: stationsError.message }
    }

    if (!stations || stations.length === 0) {
      return { success: true, employees: [], date }
    }

    const stationIds = stations.map((s) => s.station_id)
    const stationMap = new Map(stations.map((s) => [s.station_id, s.station_name]))

    // Get all active employees for these stations
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("employee_id, employee_name, employee_role, employee_photo, station_id")
      .in("station_id", stationIds)
      .eq("status", "active")
      .order("employee_role")
      .order("employee_name")

    if (employeesError) {
      return { success: false, error: employeesError.message }
    }

    if (!employees || employees.length === 0) {
      return { success: true, employees: [], date }
    }

    // Get attendance records for these employees on the specified date
    const { data: attendance, error: attendanceError } = await supabase
      .from("employee_attendance")
      .select(`
        attendance_id,
        employee_id,
        attendance_status,
        hours_worked,
        marked_employee:employees!employee_attendance_marked_by_fkey (
          employee_name
        )
      `)
      .in("employee_id", employees.map((e) => e.employee_id))
      .eq("attendance_date", date)

    if (attendanceError) {
      return { success: false, error: attendanceError.message }
    }

    // Create attendance lookup map
    const attendanceMap = new Map(
      (attendance || []).map((a) => {
        const markedEmployee = a.marked_employee as unknown as { employee_name: string } | null
        return [
          a.employee_id,
          {
            attendance_id: a.attendance_id,
            attendance_status: a.attendance_status as AttendanceStatusType,
            hours_worked: a.hours_worked,
            marked_by_name: markedEmployee?.employee_name || null,
          },
        ]
      })
    )

    // Combine employee and attendance data
    const result: EmployeeAttendanceStatus[] = employees.map((emp) => {
      const att = attendanceMap.get(emp.employee_id)
      return {
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        employee_role: emp.employee_role,
        employee_photo: emp.employee_photo,
        station_id: emp.station_id,
        station_name: stationMap.get(emp.station_id) || "Unknown",
        attendance_id: att?.attendance_id || null,
        attendance_status: att?.attendance_status || null,
        hours_worked: att?.hours_worked || null,
        marked_by_name: att?.marked_by_name || null,
      }
    })

    return { success: true, employees: result, date }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch daily attendance",
    }
  }
}

// Mark or update attendance
export interface MarkAttendanceData {
  employee_id: string
  station_id: string
  attendance_date: string
  attendance_status: AttendanceStatusType
  hours_worked?: number | null
  marked_by?: string | null
  shift_id?: string | null
}

export type MarkAttendanceResult =
  | { success: true; attendanceId: string }
  | { success: false; error: string }

export async function markAttendance(data: MarkAttendanceData): Promise<MarkAttendanceResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", data.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Verify employee belongs to the station
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id")
      .eq("employee_id", data.employee_id)
      .eq("station_id", data.station_id)
      .eq("status", "active")
      .single()

    if (employeeError || !employee) {
      return { success: false, error: "Employee not found or does not belong to selected station" }
    }

    // Verify marked_by manager if provided
    if (data.marked_by) {
      const { data: manager, error: managerError } = await supabase
        .from("employees")
        .select("employee_id")
        .eq("employee_id", data.marked_by)
        .eq("station_id", data.station_id)
        .eq("employee_role", "manager")
        .eq("status", "active")
        .single()

      if (managerError || !manager) {
        return { success: false, error: "Manager not found or does not belong to selected station" }
      }
    }

    // Check if attendance already exists for this employee and date
    const { data: existingAttendance, error: existingError } = await supabase
      .from("employee_attendance")
      .select("attendance_id")
      .eq("employee_id", data.employee_id)
      .eq("attendance_date", data.attendance_date)
      .single()

    if (existingAttendance) {
      // Update existing attendance
      const { error: updateError } = await supabase
        .from("employee_attendance")
        .update({
          attendance_status: data.attendance_status,
          hours_worked: data.hours_worked || null,
          marked_by: data.marked_by || null,
          shift_id: data.shift_id || null,
        })
        .eq("attendance_id", existingAttendance.attendance_id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Invalidate attendance cache
      await invalidateAttendance()

      return { success: true, attendanceId: existingAttendance.attendance_id }
    }

    // Create new attendance record
    const attendanceData: EmployeeAttendanceInsert = {
      employee_id: data.employee_id,
      station_id: data.station_id,
      attendance_date: data.attendance_date,
      attendance_status: data.attendance_status,
      hours_worked: data.hours_worked || null,
      marked_by: data.marked_by || null,
      shift_id: data.shift_id || null,
    }

    const { data: insertedAttendance, error: insertError } = await supabase
      .from("employee_attendance")
      .insert(attendanceData)
      .select("attendance_id")
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    // Invalidate attendance cache
    await invalidateAttendance()

    return { success: true, attendanceId: insertedAttendance.attendance_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark attendance",
    }
  }
}

// Bulk mark attendance for multiple employees
export interface BulkAttendanceEntry {
  employee_id: string
  station_id: string
  attendance_status: AttendanceStatusType
  hours_worked?: number | null
}

export type BulkMarkAttendanceResult =
  | { success: true; marked: number; updated: number }
  | { success: false; error: string }

export async function bulkMarkAttendance(
  date: string,
  entries: BulkAttendanceEntry[],
  markedBy?: string | null
): Promise<BulkMarkAttendanceResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    if (entries.length === 0) {
      return { success: true, marked: 0, updated: 0 }
    }

    const supabase = await createClient()

    // Get existing attendance records for these employees on this date
    const employeeIds = entries.map((e) => e.employee_id)
    const { data: existingRecords, error: existingError } = await supabase
      .from("employee_attendance")
      .select("employee_id")
      .in("employee_id", employeeIds)
      .eq("attendance_date", date)

    if (existingError) {
      return { success: false, error: existingError.message }
    }

    const existingSet = new Set(existingRecords?.map((r) => r.employee_id) || [])

    // Prepare upsert data
    const upsertData = entries.map((entry) => ({
      employee_id: entry.employee_id,
      station_id: entry.station_id,
      attendance_date: date,
      attendance_status: entry.attendance_status,
      hours_worked: entry.hours_worked || null,
      marked_by: markedBy || null,
    }))

    // Use upsert with conflict on (employee_id, attendance_date)
    const { error: upsertError } = await supabase
      .from("employee_attendance")
      .upsert(upsertData, {
        onConflict: "employee_id,attendance_date",
      })

    if (upsertError) {
      return { success: false, error: upsertError.message }
    }

    // Count based on pre-existing records
    const marked = entries.filter((e) => !existingSet.has(e.employee_id)).length
    const updated = entries.filter((e) => existingSet.has(e.employee_id)).length

    // Invalidate attendance cache
    await invalidateAttendance()

    return { success: true, marked, updated }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to bulk mark attendance",
    }
  }
}

// Delete attendance
export type DeleteAttendanceResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteAttendance(attendanceId: string): Promise<DeleteAttendanceResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Get the attendance and verify ownership through station
    const { data: attendance, error: attendanceError } = await supabase
      .from("employee_attendance")
      .select(`
        attendance_id,
        station_id,
        stations!inner (
          client_id
        )
      `)
      .eq("attendance_id", attendanceId)
      .single()

    if (attendanceError || !attendance) {
      return { success: false, error: "Attendance record not found" }
    }

    // Verify attendance belongs to client's station
    const station = attendance.stations as unknown as { client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to delete this attendance record" }
    }

    // Hard delete attendance record
    const { error: deleteError } = await supabase
      .from("employee_attendance")
      .delete()
      .eq("attendance_id", attendanceId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    // Invalidate attendance cache
    await invalidateAttendance()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete attendance",
    }
  }
}

// Get attendance calendar data for a month
export interface CalendarAttendanceDay {
  date: string
  present: number
  absent: number
  half_day: number
  leave: number
  total: number
}

export type GetCalendarAttendanceResult =
  | { success: true; days: CalendarAttendanceDay[] }
  | { success: false; error: string }

export async function getCalendarAttendance(
  year: number,
  month: number,
  stationId?: string
): Promise<GetCalendarAttendanceResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Get stations for this client
    let stationsQuery = supabase
      .from("stations")
      .select("station_id")
      .eq("client_id", client.client_id)
      .eq("status", "active")

    if (stationId) {
      stationsQuery = stationsQuery.eq("station_id", stationId)
    }

    const { data: stations, error: stationsError } = await stationsQuery

    if (stationsError) {
      return { success: false, error: stationsError.message }
    }

    if (!stations || stations.length === 0) {
      return { success: true, days: [] }
    }

    const stationIds = stations.map((s) => s.station_id)

    // Calculate date range for the month (local timezone)
    const startDate = formatDateForInput(new Date(year, month - 1, 1))
    const endDate = formatDateForInput(new Date(year, month, 0))

    // Get all attendance for the month
    const { data: attendance, error: attendanceError } = await supabase
      .from("employee_attendance")
      .select("attendance_date, attendance_status")
      .in("station_id", stationIds)
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate)

    if (attendanceError) {
      return { success: false, error: attendanceError.message }
    }

    // Group by date
    const dateMap = new Map<string, CalendarAttendanceDay>()

    for (const record of attendance || []) {
      const existing = dateMap.get(record.attendance_date) || {
        date: record.attendance_date,
        present: 0,
        absent: 0,
        half_day: 0,
        leave: 0,
        total: 0,
      }

      switch (record.attendance_status) {
        case "present":
          existing.present++
          break
        case "absent":
          existing.absent++
          break
        case "half_day":
          existing.half_day++
          break
        case "leave":
          existing.leave++
          break
      }
      existing.total++

      dateMap.set(record.attendance_date, existing)
    }

    return { success: true, days: Array.from(dateMap.values()) }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch calendar attendance",
    }
  }
}
