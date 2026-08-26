"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import type { PumpInsert, Pump } from "@/types/database"

export type AddPumpResult =
  | { success: true; pumpId: string }
  | { success: false; error: string }

export async function addPump(
  formData: Omit<PumpInsert, "status">
): Promise<AddPumpResult> {
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

    const pumpData: PumpInsert = {
      station_id: formData.station_id,
      pump_name: formData.pump_name.trim(),
      nozzle_count: formData.nozzle_count,
    }

    const { data, error: insertError } = await supabase
      .from("pumps")
      .insert(pumpData)
      .select("pump_id")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "A pump with this name already exists for the selected station" }
      }
      return { success: false, error: insertError.message }
    }

    return { success: true, pumpId: data.pump_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add pump"
    }
  }
}

export interface AddMultiplePumpsInput {
  station_id: string
  pumps: Array<{
    pump_name: string
    nozzle_count: number
  }>
}

export type AddMultiplePumpsResult =
  | { success: true; pumpIds: string[]; count: number }
  | { success: false; error: string }

export async function addMultiplePumps(
  input: AddMultiplePumpsInput
): Promise<AddMultiplePumpsResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    if (input.pumps.length < 1 || input.pumps.length > 10) {
      return { success: false, error: "You can add between 1 and 10 pumps at a time" }
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

    // Validate nozzle counts
    for (const pump of input.pumps) {
      if (pump.nozzle_count < 1 || pump.nozzle_count > 10) {
        return { success: false, error: `Nozzle count must be between 1 and 10 for pump "${pump.pump_name}"` }
      }
    }

    // Check for duplicate names within the batch
    const names = input.pumps.map((p) => p.pump_name.trim().toLowerCase())
    const nameSet = new Set(names)
    if (nameSet.size !== names.length) {
      return { success: false, error: "Duplicate pump names found in the batch" }
    }

    // Prepare insert records
    const pumpRecords: PumpInsert[] = input.pumps.map((p) => ({
      station_id: input.station_id,
      pump_name: p.pump_name.trim(),
      nozzle_count: p.nozzle_count,
    }))

    const { data, error: insertError } = await supabase
      .from("pumps")
      .insert(pumpRecords)
      .select("pump_id")

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "A pump with one of these names already exists for the selected station" }
      }
      return { success: false, error: insertError.message }
    }

    return {
      success: true,
      pumpIds: (data || []).map((d) => d.pump_id),
      count: (data || []).length,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add pumps",
    }
  }
}

export async function getStationPumps(stationId: string): Promise<{ success: true; pumps: Pump[] } | { success: false; error: string }> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("pumps")
      .select("*")
      .eq("station_id", stationId)
      .eq("status", "active")
      .order("pump_name")

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, pumps: data || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch pumps"
    }
  }
}

export type UpdatePumpResult =
  | { success: true }
  | { success: false; error: string }

export async function updatePump(
  pumpId: string,
  stationId: string,
  formData: Partial<Omit<PumpInsert, "station_id" | "status">>
): Promise<UpdatePumpResult> {
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

    // Verify pump belongs to station
    const { data: existingPump, error: verifyError } = await supabase
      .from("pumps")
      .select("pump_id")
      .eq("pump_id", pumpId)
      .eq("station_id", stationId)
      .single()

    if (verifyError || !existingPump) {
      return { success: false, error: "Pump not found" }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (formData.pump_name !== undefined) updateData.pump_name = formData.pump_name.trim()
    if (formData.nozzle_count !== undefined) updateData.nozzle_count = formData.nozzle_count

    const { error: updateError } = await supabase
      .from("pumps")
      .update(updateData)
      .eq("pump_id", pumpId)

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, error: "A pump with this name already exists for the station" }
      }
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update pump"
    }
  }
}

export type DeletePumpResult =
  | { success: true }
  | { success: false; error: string }

export async function deletePump(pumpId: string, stationId: string): Promise<DeletePumpResult> {
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

    // Check if pump is used by any nozzles
    const { count: nozzleCount, error: nozzleCountError } = await supabase
      .from("nozzles")
      .select("*", { count: "exact", head: true })
      .eq("pump_id", pumpId)
      .eq("status", "active")

    if (nozzleCountError) {
      return { success: false, error: nozzleCountError.message }
    }

    if (nozzleCount && nozzleCount > 0) {
      return { success: false, error: `Cannot delete: ${nozzleCount} nozzle(s) are using this pump` }
    }

    // Soft delete by setting status to deleted
    const { error: deleteError } = await supabase
      .from("pumps")
      .update({ status: "deleted" })
      .eq("pump_id", pumpId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete pump"
    }
  }
}
