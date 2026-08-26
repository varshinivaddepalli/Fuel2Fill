"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations, getCachedEmployeesByStations } from "@/lib/cache"
import type { Employee } from "@/types/database"

export interface StationWithEmployees {
  station_id: string
  station_name: string
  employees: Employee[]
}

export type GetEmployeesResult =
  | { success: true; stationsWithEmployees: StationWithEmployees[] }
  | { success: false; error: string }

export async function getClientEmployees(): Promise<GetEmployeesResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return { success: true, stationsWithEmployees: [] }
    }

    // Use cached employees lookup
    const stationIds = stations.map((s) => s.station_id)
    const employees = await getCachedEmployeesByStations(stationIds)

    // Group employees by station
    const stationsWithEmployees: StationWithEmployees[] = stations.map((station) => ({
      station_id: station.station_id,
      station_name: station.station_name,
      employees: employees.filter((emp) => emp.station_id === station.station_id),
    }))

    // Filter out stations with no employees
    const stationsWithActiveEmployees = stationsWithEmployees.filter(
      (station) => station.employees.length > 0
    )

    return { success: true, stationsWithEmployees: stationsWithActiveEmployees }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employees",
    }
  }
}

export interface EmployeeWithStation extends Employee {
  station_name: string
}

export type GetEmployeeResult =
  | { success: true; employee: EmployeeWithStation }
  | { success: false; error: string }

export async function getEmployeeById(employeeId: string): Promise<GetEmployeeResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Get employee with station info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(`
        *,
        stations!inner (
          station_id,
          station_name,
          client_id
        )
      `)
      .eq("employee_id", employeeId)
      .single()

    if (employeeError || !employee) {
      return { success: false, error: "Employee not found" }
    }

    // Verify employee belongs to client's station
    const station = employee.stations as { station_id: string; station_name: string; client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to view this employee" }
    }

    const employeeWithStation: EmployeeWithStation = {
      ...employee,
      station_name: station.station_name,
    }

    return { success: true, employee: employeeWithStation }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee",
    }
  }
}
