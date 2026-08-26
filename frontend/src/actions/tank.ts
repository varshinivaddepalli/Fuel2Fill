"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import type { TankInsert, Tank } from "@/types/database"

export type AddTankResult =
  | { success: true; tankId: string }
  | { success: false; error: string }

export async function addTank(
  formData: Omit<TankInsert, "status">
): Promise<AddTankResult> {
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

    // Verify fuel type belongs to station
    const { data: fuelType, error: fuelTypeError } = await supabase
      .from("fuel_types")
      .select("fueltype_id")
      .eq("fueltype_id", formData.fueltype_id)
      .eq("station_id", formData.station_id)
      .single()

    if (fuelTypeError || !fuelType) {
      return { success: false, error: "Fuel type not found for this station" }
    }

    const tankData: TankInsert = {
      station_id: formData.station_id,
      fueltype_id: formData.fueltype_id,
      tank_name: formData.tank_name.trim(),
      tank_capacity: formData.tank_capacity,
      capacity_unit: formData.capacity_unit,
    }

    const { data, error: insertError } = await supabase
      .from("tanks")
      .insert(tankData)
      .select("tank_id")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "A tank with this name already exists for the selected station" }
      }
      return { success: false, error: insertError.message }
    }

    return { success: true, tankId: data.tank_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add tank"
    }
  }
}

export interface AddMultipleTanksInput {
  station_id: string
  tanks: Array<{
    tank_name: string
    fueltype_id: string
    tank_capacity: number
    capacity_unit?: string
  }>
}

export type AddMultipleTanksResult =
  | { success: true; tankIds: string[]; count: number }
  | { success: false; error: string }

export async function addMultipleTanks(
  input: AddMultipleTanksInput
): Promise<AddMultipleTanksResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    if (input.tanks.length < 1 || input.tanks.length > 5) {
      return { success: false, error: "You can add between 1 and 5 tanks at a time" }
    }

    const supabase = await createClient()

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", input.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Collect unique fuel type IDs and verify all belong to station
    const uniqueFuelTypeIds = [...new Set(input.tanks.map((t) => t.fueltype_id))]
    const { data: validFuelTypes, error: ftError } = await supabase
      .from("fuel_types")
      .select("fueltype_id")
      .eq("station_id", input.station_id)
      .in("fueltype_id", uniqueFuelTypeIds)

    if (ftError) {
      return { success: false, error: ftError.message }
    }

    if (!validFuelTypes || validFuelTypes.length !== uniqueFuelTypeIds.length) {
      return { success: false, error: "One or more fuel types are invalid for this station" }
    }

    // Check for duplicate names within the batch
    const names = input.tanks.map((t) => t.tank_name.trim().toLowerCase())
    const nameSet = new Set(names)
    if (nameSet.size !== names.length) {
      return { success: false, error: "Duplicate tank names found in the batch" }
    }

    // Prepare insert records
    const tankRecords: TankInsert[] = input.tanks.map((t) => ({
      station_id: input.station_id,
      fueltype_id: t.fueltype_id,
      tank_name: t.tank_name.trim(),
      tank_capacity: t.tank_capacity,
      capacity_unit: t.capacity_unit,
    }))

    const { data, error: insertError } = await supabase
      .from("tanks")
      .insert(tankRecords)
      .select("tank_id")

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "A tank with one of these names already exists for the selected station" }
      }
      return { success: false, error: insertError.message }
    }

    return {
      success: true,
      tankIds: (data || []).map((d) => d.tank_id),
      count: (data || []).length,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add tanks",
    }
  }
}

export async function getStationTanks(stationId: string): Promise<{ success: true; tanks: Tank[] } | { success: false; error: string }> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("tanks")
      .select("*")
      .eq("station_id", stationId)
      .eq("status", "active")
      .order("tank_name")

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, tanks: data || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tanks"
    }
  }
}

export type UpdateTankResult =
  | { success: true }
  | { success: false; error: string }

export async function updateTank(
  tankId: string,
  stationId: string,
  formData: Partial<Omit<TankInsert, "station_id" | "status">>
): Promise<UpdateTankResult> {
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

    // Verify tank belongs to station
    const { data: existingTank, error: verifyError } = await supabase
      .from("tanks")
      .select("tank_id")
      .eq("tank_id", tankId)
      .eq("station_id", stationId)
      .single()

    if (verifyError || !existingTank) {
      return { success: false, error: "Tank not found" }
    }

    // If changing fuel type, verify it belongs to station
    if (formData.fueltype_id) {
      const { data: fuelType, error: fuelTypeError } = await supabase
        .from("fuel_types")
        .select("fueltype_id")
        .eq("fueltype_id", formData.fueltype_id)
        .eq("station_id", stationId)
        .single()

      if (fuelTypeError || !fuelType) {
        return { success: false, error: "Fuel type not found for this station" }
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (formData.tank_name !== undefined) updateData.tank_name = formData.tank_name.trim()
    if (formData.tank_capacity !== undefined) updateData.tank_capacity = formData.tank_capacity
    if (formData.capacity_unit !== undefined) updateData.capacity_unit = formData.capacity_unit
    if (formData.fueltype_id !== undefined) updateData.fueltype_id = formData.fueltype_id

    const { error: updateError } = await supabase
      .from("tanks")
      .update(updateData)
      .eq("tank_id", tankId)

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, error: "A tank with this name already exists for the station" }
      }
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tank"
    }
  }
}

export type DeleteTankResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteTank(tankId: string, stationId: string): Promise<DeleteTankResult> {
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

    // Check if tank is used by any nozzles
    const { count: nozzleCount, error: nozzleCountError } = await supabase
      .from("nozzles")
      .select("*", { count: "exact", head: true })
      .eq("tank_id", tankId)
      .eq("status", "active")

    if (nozzleCountError) {
      return { success: false, error: nozzleCountError.message }
    }

    if (nozzleCount && nozzleCount > 0) {
      return { success: false, error: `Cannot delete: ${nozzleCount} nozzle(s) are using this tank` }
    }

    // Soft delete by setting status to deleted
    const { error: deleteError } = await supabase
      .from("tanks")
      .update({ status: "deleted" })
      .eq("tank_id", tankId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete tank"
    }
  }
}
