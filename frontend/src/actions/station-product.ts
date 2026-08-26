"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import type { StationProductInsert, StationProduct, Station } from "@/types/database"

export type AddStationProductResult =
  | { success: true; productId: string }
  | { success: false; error: string }

export type GetUserStationsResult =
  | { success: true; stations: Pick<Station, "station_id" | "station_name">[] }
  | { success: false; error: string }

export async function getUserStations(): Promise<GetUserStationsResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup - no additional DB call needed!
    const stations = await getCachedClientStations(client.client_id)

    return {
      success: true,
      stations: stations.map(s => ({ station_id: s.station_id, station_name: s.station_name }))
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stations"
    }
  }
}

export async function addStationProduct(
  formData: StationProductInsert
): Promise<AddStationProductResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify that the station belongs to the current user's client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id, client_id")
      .eq("station_id", formData.station_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found" }
    }

    if (station.client_id !== client.client_id) {
      return { success: false, error: "You do not have permission to add products to this station" }
    }

    // Prepare product data
    const productData: StationProductInsert = {
      station_id: formData.station_id,
      product_name: formData.product_name.trim(),
      hsn_code: formData.hsn_code ?? null,
      purchase_price: formData.purchase_price,
      selling_price: formData.selling_price,
      discount_amount: formData.discount_amount ?? 0,
      current_stock: formData.current_stock ?? 0,
      minimum_stock: formData.minimum_stock ?? 0,
      available: formData.available ?? true,
    }

    // Insert the station product
    const { data, error: insertError } = await supabase
      .from("station_products")
      .insert(productData)
      .select("station_product_id")
      .single()

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === "23505") {
        return { success: false, error: "This product already exists for the selected station" }
      }
      return { success: false, error: insertError.message }
    }

    return { success: true, productId: data.station_product_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add product"
    }
  }
}

export type GetStationProductsResult =
  | { success: true; products: StationProduct[] }
  | { success: false; error: string }

export async function getStationProducts(stationId: string): Promise<GetStationProductsResult> {
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

    const { data, error } = await supabase
      .from("station_products")
      .select("*")
      .eq("station_id", stationId)
      .order("product_name")

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, products: data || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch products"
    }
  }
}

export type UpdateStationProductResult =
  | { success: true }
  | { success: false; error: string }

export async function updateStationProduct(
  productId: string,
  stationId: string,
  formData: Partial<Omit<StationProductInsert, "station_id">>
): Promise<UpdateStationProductResult> {
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

    // Verify product belongs to station
    const { data: existingProduct, error: verifyError } = await supabase
      .from("station_products")
      .select("station_product_id")
      .eq("station_product_id", productId)
      .eq("station_id", stationId)
      .single()

    if (verifyError || !existingProduct) {
      return { success: false, error: "Product not found" }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (formData.product_name !== undefined) updateData.product_name = formData.product_name.trim()
    if (formData.purchase_price !== undefined) updateData.purchase_price = formData.purchase_price
    if (formData.selling_price !== undefined) updateData.selling_price = formData.selling_price
    if (formData.discount_amount !== undefined) updateData.discount_amount = formData.discount_amount
    if (formData.current_stock !== undefined) updateData.current_stock = formData.current_stock
    if (formData.minimum_stock !== undefined) updateData.minimum_stock = formData.minimum_stock
    if (formData.available !== undefined) updateData.available = formData.available
    if (formData.hsn_code !== undefined) updateData.hsn_code = formData.hsn_code

    const { error: updateError } = await supabase
      .from("station_products")
      .update(updateData)
      .eq("station_product_id", productId)

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, error: "This product already exists for the station" }
      }
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product"
    }
  }
}

export type AddMultipleStationProductsResult =
  | { success: true; count: number }
  | { success: false; error: string }

type ProductInput = {
  product_name: string
  hsn_code?: string
  current_stock?: number
  minimum_stock?: number
}

export async function addMultipleStationProducts(
  stationId: string,
  products: ProductInput[]
): Promise<AddMultipleStationProductsResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id, client_id")
      .eq("station_id", stationId)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found" }
    }

    if (station.client_id !== client.client_id) {
      return { success: false, error: "You do not have permission to add products to this station" }
    }

    // Build insert rows
    const rows: StationProductInsert[] = products.map((p) => ({
      station_id: stationId,
      product_name: p.product_name.trim(),
      hsn_code: p.hsn_code?.trim() || null,
      purchase_price: 0,
      selling_price: 0,
      discount_amount: 0,
      current_stock: p.current_stock ?? 0,
      minimum_stock: p.minimum_stock ?? 0,
      available: true,
    }))

    const { error: insertError } = await supabase
      .from("station_products")
      .insert(rows)

    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, error: "One or more products already exist for this station" }
      }
      return { success: false, error: insertError.message }
    }

    return { success: true, count: products.length }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add products",
    }
  }
}

export type DeleteStationProductResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteStationProduct(productId: string, stationId: string): Promise<DeleteStationProductResult> {
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

    // Products are leaf entities, hard delete is safe
    const { error: deleteError } = await supabase
      .from("station_products")
      .delete()
      .eq("station_product_id", productId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete product"
    }
  }
}
