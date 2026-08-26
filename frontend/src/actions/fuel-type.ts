"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import type { FuelTypeInsert, FuelType } from "@/types/database"

export type AddFuelTypeResult =
  | { success: true; fuelTypeId: string }
  | { success: false; error: string }

export async function addFuelType(
  formData: Omit<FuelTypeInsert, "status">
): Promise<AddFuelTypeResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", formData.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    const fuelTypeData: FuelTypeInsert = {
      station_id: formData.station_id,
      fueltype_name: formData.fueltype_name.trim(),
      unit_of_measure: formData.unit_of_measure || "liters",
      fueltype_price: formData.fueltype_price,
      hsn_code: formData.hsn_code?.trim() || null,
    }

    const { data, error: insertError } = await supabase
      .from("fuel_types")
      .insert(fuelTypeData)
      .select("fueltype_id")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "This fuel type already exists for the selected station" }
      }
      return { success: false, error: insertError.message }
    }

    return { success: true, fuelTypeId: data.fueltype_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add fuel type"
    }
  }
}

export async function getStationFuelTypes(stationId: string): Promise<{ success: true; fuelTypes: FuelType[] } | { success: false; error: string }> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("fuel_types")
      .select("*")
      .eq("station_id", stationId)
      .eq("status", "active")
      .order("fueltype_name")

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, fuelTypes: data || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch fuel types"
    }
  }
}

export type UpdateFuelTypeResult =
  | { success: true }
  | { success: false; error: string }

export async function updateFuelType(
  fuelTypeId: string,
  stationId: string,
  formData: Partial<Omit<FuelTypeInsert, "station_id" | "status">>
): Promise<UpdateFuelTypeResult> {
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
      .eq("station_id", stationId)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Verify fuel type belongs to station
    const { data: existingFuelType, error: verifyError } = await supabase
      .from("fuel_types")
      .select("fueltype_id")
      .eq("fueltype_id", fuelTypeId)
      .eq("station_id", stationId)
      .single()

    if (verifyError || !existingFuelType) {
      return { success: false, error: "Fuel type not found" }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (formData.fueltype_name !== undefined) updateData.fueltype_name = formData.fueltype_name.trim()
    if (formData.unit_of_measure !== undefined) updateData.unit_of_measure = formData.unit_of_measure
    if (formData.fueltype_price !== undefined) updateData.fueltype_price = formData.fueltype_price
    if (formData.hsn_code !== undefined) updateData.hsn_code = formData.hsn_code?.trim() || null

    const { error: updateError } = await supabase
      .from("fuel_types")
      .update(updateData)
      .eq("fueltype_id", fuelTypeId)

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, error: "This fuel type already exists for the station" }
      }
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update fuel type"
    }
  }
}

export type DeleteFuelTypeResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteFuelType(fuelTypeId: string, stationId: string): Promise<DeleteFuelTypeResult> {
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
      .eq("station_id", stationId)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Check if fuel type is used by any tanks
    const { count: tankCount, error: tankCountError } = await supabase
      .from("tanks")
      .select("*", { count: "exact", head: true })
      .eq("fueltype_id", fuelTypeId)
      .eq("status", "active")

    if (tankCountError) {
      return { success: false, error: tankCountError.message }
    }

    if (tankCount && tankCount > 0) {
      return { success: false, error: `Cannot delete: ${tankCount} tank(s) are using this fuel type` }
    }

    // Soft delete by setting status to deleted
    const { error: deleteError } = await supabase
      .from("fuel_types")
      .update({ status: "deleted" })
      .eq("fueltype_id", fuelTypeId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete fuel type"
    }
  }
}
