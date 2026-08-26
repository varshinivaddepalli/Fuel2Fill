"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import type { NozzleInsert, Nozzle } from "@/types/database"

// --- Pump nozzle capacity info ---

export interface PumpNozzleInfo {
  nozzle_count: number
  existingCount: number
  remainingSlots: number
}

export type GetPumpNozzleInfoResult =
  | { success: true; info: PumpNozzleInfo }
  | { success: false; error: string }

export async function getPumpNozzleInfo(
  pumpId: string,
  stationId: string
): Promise<GetPumpNozzleInfoResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Get pump's nozzle_count
    const { data: pump, error: pumpError } = await supabase
      .from("pumps")
      .select("nozzle_count")
      .eq("pump_id", pumpId)
      .eq("station_id", stationId)
      .eq("status", "active")
      .single()

    if (pumpError || !pump) {
      return { success: false, error: "Pump not found for this station" }
    }

    // Count existing active nozzles for this pump
    const { count, error: countError } = await supabase
      .from("nozzles")
      .select("*", { count: "exact", head: true })
      .eq("pump_id", pumpId)
      .eq("status", "active")

    if (countError) {
      return { success: false, error: countError.message }
    }

    const existingCount = count || 0

    return {
      success: true,
      info: {
        nozzle_count: pump.nozzle_count,
        existingCount,
        remainingSlots: pump.nozzle_count - existingCount,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get pump nozzle info",
    }
  }
}

// --- Batch add multiple nozzles ---

export interface AddMultipleNozzlesInput {
  station_id: string
  pump_id: string
  nozzles: Array<{
    nozzle_name: string
    tank_id: string
    fueltype_id: string
  }>
}

export type AddMultipleNozzlesResult =
  | { success: true; nozzleIds: string[]; count: number }
  | { success: false; error: string }

export async function addMultipleNozzles(
  input: AddMultipleNozzlesInput
): Promise<AddMultipleNozzlesResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    if (input.nozzles.length < 1 || input.nozzles.length > 10) {
      return { success: false, error: "You can add between 1 and 10 nozzles at a time" }
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

    // Verify pump belongs to station and get nozzle_count
    const { data: pump, error: pumpError } = await supabase
      .from("pumps")
      .select("pump_id, nozzle_count")
      .eq("pump_id", input.pump_id)
      .eq("station_id", input.station_id)
      .eq("status", "active")
      .single()

    if (pumpError || !pump) {
      return { success: false, error: "Pump not found for this station" }
    }

    // Count existing active nozzles to verify capacity
    const { count: existingCount, error: countError } = await supabase
      .from("nozzles")
      .select("*", { count: "exact", head: true })
      .eq("pump_id", input.pump_id)
      .eq("status", "active")

    if (countError) {
      return { success: false, error: countError.message }
    }

    if ((existingCount || 0) + input.nozzles.length > pump.nozzle_count) {
      return {
        success: false,
        error: `This pump supports ${pump.nozzle_count} nozzle(s) and already has ${existingCount || 0}. Cannot add ${input.nozzles.length} more.`,
      }
    }

    // Check for duplicate names within batch
    const names = input.nozzles.map((n) => n.nozzle_name.trim().toLowerCase())
    const nameSet = new Set(names)
    if (nameSet.size !== names.length) {
      return { success: false, error: "Duplicate nozzle names found in the batch" }
    }

    // Verify all tanks belong to station
    const tankIds = [...new Set(input.nozzles.map((n) => n.tank_id))]
    const { data: tanks, error: tanksError } = await supabase
      .from("tanks")
      .select("tank_id")
      .eq("station_id", input.station_id)
      .in("tank_id", tankIds)

    if (tanksError) {
      return { success: false, error: tanksError.message }
    }

    if (!tanks || tanks.length !== tankIds.length) {
      return { success: false, error: "One or more tanks not found for this station" }
    }

    // Verify all fuel types belong to station
    const fuelTypeIds = [...new Set(input.nozzles.map((n) => n.fueltype_id))]
    const { data: fuelTypes, error: ftError } = await supabase
      .from("fuel_types")
      .select("fueltype_id")
      .eq("station_id", input.station_id)
      .in("fueltype_id", fuelTypeIds)

    if (ftError) {
      return { success: false, error: ftError.message }
    }

    if (!fuelTypes || fuelTypes.length !== fuelTypeIds.length) {
      return { success: false, error: "One or more fuel types not found for this station" }
    }

    // Prepare insert records
    const nozzleRecords: NozzleInsert[] = input.nozzles.map((n) => ({
      station_id: input.station_id,
      pump_id: input.pump_id,
      nozzle_name: n.nozzle_name.trim(),
      tank_id: n.tank_id,
      fueltype_id: n.fueltype_id,
    }))

    const { data, error: insertError } = await supabase
      .from("nozzles")
      .insert(nozzleRecords)
      .select("nozzle_id")

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "A nozzle with one of these names already exists for the selected station" }
      }
      return { success: false, error: insertError.message }
    }

    return {
      success: true,
      nozzleIds: (data || []).map((d) => d.nozzle_id),
      count: (data || []).length,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add nozzles",
    }
  }
}

export type AddNozzleResult =
  | { success: true; nozzleId: string }
  | { success: false; error: string }

export async function addNozzle(
  formData: Omit<NozzleInsert, "status">
): Promise<AddNozzleResult> {
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

    // Verify pump belongs to station
    const { data: pump, error: pumpError } = await supabase
      .from("pumps")
      .select("pump_id")
      .eq("pump_id", formData.pump_id)
      .eq("station_id", formData.station_id)
      .single()

    if (pumpError || !pump) {
      return { success: false, error: "Pump not found for this station" }
    }

    // Verify tank belongs to station
    const { data: tank, error: tankError } = await supabase
      .from("tanks")
      .select("tank_id")
      .eq("tank_id", formData.tank_id)
      .eq("station_id", formData.station_id)
      .single()

    if (tankError || !tank) {
      return { success: false, error: "Tank not found for this station" }
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

    const nozzleData: NozzleInsert = {
      station_id: formData.station_id,
      pump_id: formData.pump_id,
      tank_id: formData.tank_id,
      fueltype_id: formData.fueltype_id,
      nozzle_name: formData.nozzle_name.trim(),
    }

    const { data, error: insertError } = await supabase
      .from("nozzles")
      .insert(nozzleData)
      .select("nozzle_id")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "A nozzle with this name already exists for the selected station" }
      }
      return { success: false, error: insertError.message }
    }

    return { success: true, nozzleId: data.nozzle_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add nozzle"
    }
  }
}

export async function getStationNozzles(stationId: string): Promise<{ success: true; nozzles: Nozzle[] } | { success: false; error: string }> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("nozzles")
      .select("*")
      .eq("station_id", stationId)
      .eq("status", "active")
      .order("nozzle_name")

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, nozzles: data || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch nozzles"
    }
  }
}

export type UpdateNozzleResult =
  | { success: true }
  | { success: false; error: string }

export async function updateNozzle(
  nozzleId: string,
  stationId: string,
  formData: Partial<Omit<NozzleInsert, "station_id" | "status">>
): Promise<UpdateNozzleResult> {
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

    // Verify nozzle belongs to station
    const { data: existingNozzle, error: verifyError } = await supabase
      .from("nozzles")
      .select("nozzle_id")
      .eq("nozzle_id", nozzleId)
      .eq("station_id", stationId)
      .single()

    if (verifyError || !existingNozzle) {
      return { success: false, error: "Nozzle not found" }
    }

    // Validate relationships if provided
    if (formData.pump_id) {
      const { data: pump, error: pumpError } = await supabase
        .from("pumps")
        .select("pump_id")
        .eq("pump_id", formData.pump_id)
        .eq("station_id", stationId)
        .single()

      if (pumpError || !pump) {
        return { success: false, error: "Pump not found for this station" }
      }
    }

    if (formData.tank_id) {
      const { data: tank, error: tankError } = await supabase
        .from("tanks")
        .select("tank_id")
        .eq("tank_id", formData.tank_id)
        .eq("station_id", stationId)
        .single()

      if (tankError || !tank) {
        return { success: false, error: "Tank not found for this station" }
      }
    }

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
    if (formData.nozzle_name !== undefined) updateData.nozzle_name = formData.nozzle_name.trim()
    if (formData.pump_id !== undefined) updateData.pump_id = formData.pump_id
    if (formData.tank_id !== undefined) updateData.tank_id = formData.tank_id
    if (formData.fueltype_id !== undefined) updateData.fueltype_id = formData.fueltype_id

    const { error: updateError } = await supabase
      .from("nozzles")
      .update(updateData)
      .eq("nozzle_id", nozzleId)

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, error: "A nozzle with this name already exists for the station" }
      }
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update nozzle"
    }
  }
}

export type DeleteNozzleResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteNozzle(nozzleId: string, stationId: string): Promise<DeleteNozzleResult> {
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

    // Nozzle is a leaf entity, so we can delete it directly
    // Soft delete by setting status to deleted
    const { error: deleteError } = await supabase
      .from("nozzles")
      .update({ status: "deleted" })
      .eq("nozzle_id", nozzleId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete nozzle"
    }
  }
}
