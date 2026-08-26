"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import { getTodayDateString } from "@/lib/utils"
import type { EmployeeInsert } from "@/types/database"

export type AddEmployeeResult =
  | { success: true; employeeId: string }
  | { success: false; error: string }

export async function addEmployee(
  formData: EmployeeInsert
): Promise<AddEmployeeResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify the station belongs to this client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id, client_id")
      .eq("station_id", formData.station_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found" }
    }

    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to add employees to this station" }
    }

    // Prepare employee data
    const employeeData = {
      station_id: formData.station_id,
      employee_name: formData.employee_name.trim(),
      employee_role: formData.employee_role,
      employee_phone: formData.employee_phone.trim(),
      employee_address: formData.employee_address?.trim() || null,
      aadhaar_number: formData.aadhaar_number?.trim() || null,
      employment_type: formData.employment_type || "full_time",
      joining_date: formData.joining_date || getTodayDateString(),
      salary: formData.salary,
      employee_photo: formData.employee_photo || null,
    }

    // Insert the employee
    const { data, error: insertError } = await supabase
      .from("employees")
      .insert(employeeData)
      .select("employee_id")
      .single()

    if (insertError) {
      // Handle specific constraint violations
      if (insertError.code === "23505") {
        if (insertError.message.includes("aadhaar_number")) {
          return { success: false, error: "An employee with this Aadhaar number already exists" }
        }
      }
      return { success: false, error: insertError.message }
    }

    return { success: true, employeeId: data.employee_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add employee"
    }
  }
}
