"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import { invalidateShifts } from "@/lib/cache-invalidation"
import type { EmployeeShiftInsert, EmployeeShift } from "@/types/database"

// Types for shift data with related info
export interface ShiftWithDetails extends EmployeeShift {
  employee_name: string
  employee_role: string
  station_name: string
  pump_name: string | null
  nozzle_name: string | null
  assigned_by_name: string | null
}

export interface StationWithShifts {
  station_id: string
  station_name: string
  shifts: ShiftWithDetails[]
}

export interface ShiftsData {
  currentShifts: StationWithShifts[]  // Ongoing shifts (no end_time)
  pastShifts: StationWithShifts[]     // Completed shifts (has end_time)
}

export type GetShiftsResult =
  | { success: true; data: ShiftsData }
  | { success: false; error: string }

export async function getClientShifts(): Promise<GetShiftsResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return { success: true, data: { currentShifts: [], pastShifts: [] } }
    }

    const stationIds = stations.map((s) => s.station_id)
    const supabase = await createClient()

    // Get all shifts for these stations with related data
    const { data: shifts, error: shiftsError } = await supabase
      .from("employee_shifts")
      .select(`
        *,
        employees!employee_shifts_employee_id_fkey (
          employee_name,
          employee_role
        ),
        pumps (
          pump_name
        ),
        nozzles (
          nozzle_name
        ),
        assigned_employee:employees!employee_shifts_assigned_by_fkey (
          employee_name
        )
      `)
      .in("station_id", stationIds)
      .eq("status", "active")
      .order("start_time", { ascending: false })

    if (shiftsError) {
      return { success: false, error: shiftsError.message }
    }

    // Create station lookup map
    const stationMap = new Map(stations.map((s) => [s.station_id, s.station_name]))

    // Transform shifts with details
    const shiftsWithDetails: ShiftWithDetails[] = (shifts || []).map((shift) => {
      const employee = shift.employees as { employee_name: string; employee_role: string } | null
      const pump = shift.pumps as { pump_name: string } | null
      const nozzle = shift.nozzles as { nozzle_name: string } | null
      const assignedEmployee = shift.assigned_employee as { employee_name: string } | null

      return {
        shift_id: shift.shift_id,
        employee_id: shift.employee_id,
        station_id: shift.station_id,
        pump_id: shift.pump_id,
        nozzle_id: shift.nozzle_id,
        assigned_by: shift.assigned_by,
        start_time: shift.start_time,
        end_time: shift.end_time,
        total_hours: shift.total_hours,
        status: shift.status,
        created_at: shift.created_at,
        updated_at: shift.updated_at,
        employee_name: employee?.employee_name || "Unknown",
        employee_role: employee?.employee_role || "Unknown",
        station_name: stationMap.get(shift.station_id) || "Unknown",
        pump_name: pump?.pump_name || null,
        nozzle_name: nozzle?.nozzle_name || null,
        assigned_by_name: assignedEmployee?.employee_name || null,
      }
    })

    // Separate current and past shifts
    // Current: no end_time (ongoing) OR current time is within shift period
    // Past: has end_time AND current time is after end_time
    const now = new Date()

    const currentShiftsData = shiftsWithDetails.filter((shift) => {
      if (!shift.end_time) return true // Ongoing shift (no end time set)

      const endTime = new Date(shift.end_time)
      // Show in current if we're before the end time (includes in-progress and upcoming)
      return now <= endTime
    })

    const pastShiftsData = shiftsWithDetails.filter((shift) => {
      if (!shift.end_time) return false // Ongoing shifts are not past

      const endTime = new Date(shift.end_time)
      return now > endTime // Shift has ended
    })

    // Group current shifts by station
    const currentShifts: StationWithShifts[] = stations
      .map((station) => ({
        station_id: station.station_id,
        station_name: station.station_name,
        shifts: currentShiftsData.filter((shift) => shift.station_id === station.station_id),
      }))
      .filter((station) => station.shifts.length > 0)

    // Group past shifts by station
    const pastShifts: StationWithShifts[] = stations
      .map((station) => ({
        station_id: station.station_id,
        station_name: station.station_name,
        shifts: pastShiftsData.filter((shift) => shift.station_id === station.station_id),
      }))
      .filter((station) => station.shifts.length > 0)

    return { success: true, data: { currentShifts, pastShifts } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch shifts",
    }
  }
}

// Get all employees (managers and pump boys) for shift assignment
export interface StationEmployee {
  employee_id: string
  employee_name: string
  employee_role: string
}

export async function getStationEmployees(
  stationId: string
): Promise<{ success: true; employees: StationEmployee[] } | { success: false; error: string }> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify station belongs to client and get employees in parallel
    const [stationResult, employeesResult] = await Promise.all([
      supabase
        .from("stations")
        .select("station_id")
        .eq("station_id", stationId)
        .eq("client_id", client.client_id)
        .single(),
      supabase
        .from("employees")
        .select("employee_id, employee_name, employee_role")
        .eq("station_id", stationId)
        .eq("status", "active")
        .order("employee_role")
        .order("employee_name"),
    ])

    if (stationResult.error || !stationResult.data) {
      return { success: false, error: "Station not found or access denied" }
    }

    if (employeesResult.error) {
      return { success: false, error: employeesResult.error.message }
    }

    return { success: true, employees: employeesResult.data || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employees",
    }
  }
}

// Get managers for a station (for assigned_by dropdown)
export interface Manager {
  employee_id: string
  employee_name: string
}

export async function getStationManagers(
  stationId: string
): Promise<{ success: true; managers: Manager[] } | { success: false; error: string }> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify station belongs to client and get managers in parallel
    const [stationResult, managersResult] = await Promise.all([
      supabase
        .from("stations")
        .select("station_id")
        .eq("station_id", stationId)
        .eq("client_id", client.client_id)
        .single(),
      supabase
        .from("employees")
        .select("employee_id, employee_name")
        .eq("station_id", stationId)
        .eq("employee_role", "manager")
        .eq("status", "active")
        .order("employee_name"),
    ])

    if (stationResult.error || !stationResult.data) {
      return { success: false, error: "Station not found or access denied" }
    }

    if (managersResult.error) {
      return { success: false, error: managersResult.error.message }
    }

    return { success: true, managers: managersResult.data || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch managers",
    }
  }
}

// Add a new shift
export interface AddShiftData {
  station_id: string
  employee_id: string
  pump_id?: string | null
  nozzle_id?: string | null
  assigned_by?: string | null
  start_datetime: string // ISO 8601 datetime (constructed on client with correct timezone)
  end_datetime?: string | null // ISO 8601 datetime (constructed on client with correct timezone)
}

export type AddShiftResult =
  | { success: true; shiftId: string }
  | { success: false; error: string }

export async function addShift(data: AddShiftData): Promise<AddShiftResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Run all validation queries in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validationPromises: PromiseLike<{ data: any; error: any }>[] = [
      // Verify station belongs to client
      supabase
        .from("stations")
        .select("station_id")
        .eq("station_id", data.station_id)
        .eq("client_id", client.client_id)
        .single(),
      // Verify employee belongs to the station
      supabase
        .from("employees")
        .select("employee_id")
        .eq("employee_id", data.employee_id)
        .eq("station_id", data.station_id)
        .eq("status", "active")
        .single(),
    ]

    // Add optional validations
    if (data.pump_id) {
      validationPromises.push(
        supabase
          .from("pumps")
          .select("pump_id")
          .eq("pump_id", data.pump_id)
          .eq("station_id", data.station_id)
          .eq("status", "active")
          .single()
      )
    }

    if (data.nozzle_id) {
      validationPromises.push(
        supabase
          .from("nozzles")
          .select("nozzle_id")
          .eq("nozzle_id", data.nozzle_id)
          .eq("station_id", data.station_id)
          .eq("status", "active")
          .single()
      )
    }

    if (data.assigned_by) {
      validationPromises.push(
        supabase
          .from("employees")
          .select("employee_id")
          .eq("employee_id", data.assigned_by)
          .eq("station_id", data.station_id)
          .eq("employee_role", "manager")
          .eq("status", "active")
          .single()
      )
    }

    const results = await Promise.all(validationPromises)

    // Check station validation
    if (results[0].error || !results[0].data) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Check employee validation
    if (results[1].error || !results[1].data) {
      return { success: false, error: "Employee not found or does not belong to selected station" }
    }

    // Check optional validations
    let optionalIndex = 2
    if (data.pump_id && (results[optionalIndex]?.error || !results[optionalIndex]?.data)) {
      return { success: false, error: "Pump not found or does not belong to selected station" }
    }
    if (data.pump_id) optionalIndex++

    if (data.nozzle_id && (results[optionalIndex]?.error || !results[optionalIndex]?.data)) {
      return { success: false, error: "Nozzle not found or does not belong to selected station" }
    }
    if (data.nozzle_id) optionalIndex++

    if (data.assigned_by && (results[optionalIndex]?.error || !results[optionalIndex]?.data)) {
      return { success: false, error: "Manager not found or does not belong to selected station" }
    }

    // Use pre-constructed ISO datetime strings from client (correct timezone)
    const startDateTime = data.start_datetime
    let endDateTime: string | null = data.end_datetime || null
    let totalHours: number | null = null

    if (endDateTime) {
      const startDate = new Date(startDateTime)
      const endDate = new Date(endDateTime)

      // Calculate total hours
      totalHours = Number(((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)).toFixed(2))
    }

    const shiftData: EmployeeShiftInsert = {
      employee_id: data.employee_id,
      station_id: data.station_id,
      pump_id: data.pump_id || null,
      nozzle_id: data.nozzle_id || null,
      assigned_by: data.assigned_by || null,
      start_time: startDateTime,
      end_time: endDateTime,
      total_hours: totalHours,
    }

    const { data: insertedShift, error: insertError } = await supabase
      .from("employee_shifts")
      .insert(shiftData)
      .select("shift_id")
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    // Invalidate shifts cache
    await invalidateShifts()

    return { success: true, shiftId: insertedShift.shift_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add shift",
    }
  }
}

// Delete a shift
export type DeleteShiftResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteShift(shiftId: string): Promise<DeleteShiftResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Get the shift and verify ownership through station
    const { data: shift, error: shiftError } = await supabase
      .from("employee_shifts")
      .select(`
        shift_id,
        station_id,
        stations!inner (
          client_id
        )
      `)
      .eq("shift_id", shiftId)
      .single()

    if (shiftError || !shift) {
      return { success: false, error: "Shift not found" }
    }

    // Verify shift belongs to client's station
    const station = shift.stations as unknown as { client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to delete this shift" }
    }

    // Soft delete by setting status to 'deleted'
    const { error: deleteError } = await supabase
      .from("employee_shifts")
      .update({ status: "deleted" })
      .eq("shift_id", shiftId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    // Invalidate shifts cache
    await invalidateShifts()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete shift",
    }
  }
}

// End an ongoing shift (set end_time to now)
export type EndShiftResult =
  | { success: true }
  | { success: false; error: string }

export async function endShift(shiftId: string): Promise<EndShiftResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Get the shift and verify ownership through station
    const { data: shift, error: shiftError } = await supabase
      .from("employee_shifts")
      .select(`
        shift_id,
        start_time,
        end_time,
        station_id,
        stations!inner (
          client_id
        )
      `)
      .eq("shift_id", shiftId)
      .single()

    if (shiftError || !shift) {
      return { success: false, error: "Shift not found" }
    }

    // Verify shift belongs to client's station
    const station = shift.stations as unknown as { client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to end this shift" }
    }

    // Check if shift already has an end time
    if (shift.end_time) {
      return { success: false, error: "This shift has already ended" }
    }

    // Calculate total hours
    const startTime = new Date(shift.start_time)
    const endTime = new Date()
    const totalHours = Number(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2))

    // Update shift with end time
    const { error: updateError } = await supabase
      .from("employee_shifts")
      .update({
        end_time: endTime.toISOString(),
        total_hours: totalHours,
      })
      .eq("shift_id", shiftId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Invalidate shifts cache
    await invalidateShifts()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to end shift",
    }
  }
}
