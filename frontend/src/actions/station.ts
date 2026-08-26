"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import { invalidateStations } from "@/lib/cache-invalidation"
import type { StationInsert } from "@/types/database"

export type AddStationResult =
  | { success: true; stationId: string }
  | { success: false; error: string }

export async function addStation(
  formData: Omit<StationInsert, "client_id">
): Promise<AddStationResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Prepare station data
    const stationData: StationInsert = {
      client_id: client.client_id,
      station_name: formData.station_name.trim(),
      address_line1: formData.address_line1.trim(),
      address_line2: formData.address_line2?.trim() || null,
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      latitude: formData.latitude ?? null,
      longitude: formData.longitude ?? null,
      station_phone: formData.station_phone.trim(),
      station_sap_code: formData.station_sap_code.trim(),
      station_gst_number: formData.station_gst_number.trim().toUpperCase(),
      opening_date: formData.opening_date,
    }

    // Insert the station
    const { data, error: insertError } = await supabase
      .from("stations")
      .insert(stationData)
      .select("station_id")
      .single()

    if (insertError) {
      // Handle specific constraint violations
      if (insertError.code === "23505") {
        if (insertError.message.includes("station_sap_code")) {
          return { success: false, error: "A station with this SAP code already exists" }
        }
        if (insertError.message.includes("station_gst_number")) {
          return { success: false, error: "A station with this GST number already exists" }
        }
      }
      return { success: false, error: insertError.message }
    }

    // Invalidate stations cache
    await invalidateStations()

    return { success: true, stationId: data.station_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add station"
    }
  }
}

export type UpdateStationResult =
  | { success: true }
  | { success: false; error: string }

export async function updateStation(
  stationId: string,
  formData: Partial<Omit<StationInsert, "client_id">>
): Promise<UpdateStationResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify station belongs to client
    const { data: existingStation, error: verifyError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", stationId)
      .eq("client_id", client.client_id)
      .single()

    if (verifyError || !existingStation) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Prepare update data (only include non-undefined values)
    const updateData: Record<string, unknown> = {}
    if (formData.station_name !== undefined) updateData.station_name = formData.station_name.trim()
    if (formData.address_line1 !== undefined) updateData.address_line1 = formData.address_line1.trim()
    if (formData.address_line2 !== undefined) updateData.address_line2 = formData.address_line2?.trim() || null
    if (formData.city !== undefined) updateData.city = formData.city.trim()
    if (formData.state !== undefined) updateData.state = formData.state.trim()
    if (formData.pincode !== undefined) updateData.pincode = formData.pincode.trim()
    if (formData.latitude !== undefined) updateData.latitude = formData.latitude
    if (formData.longitude !== undefined) updateData.longitude = formData.longitude
    if (formData.station_phone !== undefined) updateData.station_phone = formData.station_phone.trim()
    if (formData.station_sap_code !== undefined) updateData.station_sap_code = formData.station_sap_code.trim()
    if (formData.station_gst_number !== undefined) updateData.station_gst_number = formData.station_gst_number.trim().toUpperCase()
    if (formData.opening_date !== undefined) updateData.opening_date = formData.opening_date
    if (formData.status !== undefined) updateData.status = formData.status

    const { error: updateError } = await supabase
      .from("stations")
      .update(updateData)
      .eq("station_id", stationId)

    if (updateError) {
      if (updateError.code === "23505") {
        if (updateError.message.includes("station_sap_code")) {
          return { success: false, error: "A station with this SAP code already exists" }
        }
        if (updateError.message.includes("station_gst_number")) {
          return { success: false, error: "A station with this GST number already exists" }
        }
      }
      return { success: false, error: updateError.message }
    }

    await invalidateStations()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update station"
    }
  }
}

export type DeleteStationResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteStation(stationId: string): Promise<DeleteStationResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify station belongs to client
    const { data: existingStation, error: verifyError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", stationId)
      .eq("client_id", client.client_id)
      .single()

    if (verifyError || !existingStation) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Soft delete by setting status to deleted
    const { error: deleteError } = await supabase
      .from("stations")
      .update({ status: "deleted" })
      .eq("station_id", stationId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    await invalidateStations()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete station"
    }
  }
}
