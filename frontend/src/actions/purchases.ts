"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import { invalidateStock } from "@/lib/cache-invalidation"
import type {
  PurchaseType,
  PurchasePaymentMethod,
  PurchaseInsert,
  PurchaseFuelItemInsert,
  PurchaseFuelTankAllocationInsert,
  PurchaseProductItemInsert,
} from "@/types/database"

export type { PurchaseType, PurchasePaymentMethod } from "@/types/database"

// ─── Shared Types ──────────────────────────────────────────

export interface StationForPurchases {
  station_id: string
  station_name: string
}

export interface FuelTypeForPurchases {
  fueltype_id: string
  fueltype_name: string
}

export interface TankForPurchases {
  tank_id: string
  tank_name: string
  tank_capacity: number
  capacity_unit: string
  current_stock: number
}

export interface ProductForPurchases {
  station_product_id: string
  product_name: string
  current_stock: number
}

// Input types for saving
export interface FuelTankAllocationInput {
  tank_id: string
  quantity: number
}

export interface FuelLineItemInput {
  fuel_type_id: string
  purchase_price_per_liter: number
  total_quantity: number
  tank_allocations: FuelTankAllocationInput[]
}

export interface ProductLineItemInput {
  product_id: string
  purchase_price: number
  quantity: number
}

// History types
export interface PurchaseHistoryItem {
  purchase_id: string
  station_id: string
  station_name: string
  purchase_date: string
  purchase_type: PurchaseType
  payment_method: PurchasePaymentMethod
  gst_amount: number
  total_amount: number
  vendor_name: string | null
  notes: string | null
  created_at: string
  fuel_items?: {
    fuel_item_id: string
    fuel_type_name: string
    purchase_price_per_liter: number
    total_quantity: number
    total_amount: number
    allocations: {
      tank_name: string
      quantity: number
    }[]
  }[]
  product_items?: {
    product_item_id: string
    product_name: string
    purchase_price: number
    quantity: number
    total_amount: number
  }[]
}

// ─── Get Stations ──────────────────────────────────────────

export type GetStationsForPurchasesResult =
  | { success: true; stations: StationForPurchases[] }
  | { success: false; error: string }

export async function getStationsForPurchases(): Promise<GetStationsForPurchasesResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    const stations = await getCachedClientStations(client.client_id)
    return {
      success: true,
      stations: stations.map((s) => ({
        station_id: s.station_id,
        station_name: s.station_name,
      })),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stations",
    }
  }
}

// ─── Get Station Fuel Types ────────────────────────────────

export type GetStationFuelTypesResult =
  | { success: true; fuelTypes: FuelTypeForPurchases[] }
  | { success: false; error: string }

export async function getStationFuelTypesForPurchases(
  stationId: string
): Promise<GetStationFuelTypesResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

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
      .from("fuel_types")
      .select("fueltype_id, fueltype_name")
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
      error: error instanceof Error ? error.message : "Failed to fetch fuel types",
    }
  }
}

// ─── Get Station Tanks (by fuel type) ──────────────────────

export type GetStationTanksResult =
  | { success: true; tanks: TankForPurchases[] }
  | { success: false; error: string }

export async function getStationTanksForPurchases(
  stationId: string,
  fuelTypeId: string
): Promise<GetStationTanksResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

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
      .from("tanks")
      .select("tank_id, tank_name, tank_capacity, current_stock, capacity_unit")
      .eq("station_id", stationId)
      .eq("fueltype_id", fuelTypeId)
      .eq("status", "active")
      .order("tank_name")

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      tanks: (data || []).map((t) => ({
        tank_id: t.tank_id,
        tank_name: t.tank_name,
        tank_capacity: Number(t.tank_capacity),
        capacity_unit: t.capacity_unit || "liters",
        current_stock: Number(t.current_stock),
      })),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tanks",
    }
  }
}

// ─── Get Station Products ──────────────────────────────────

export type GetStationProductsResult =
  | { success: true; products: ProductForPurchases[] }
  | { success: false; error: string }

export async function getStationProductsForPurchases(
  stationId: string
): Promise<GetStationProductsResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

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
      .select("station_product_id, product_name, current_stock")
      .eq("station_id", stationId)
      .eq("available", true)
      .order("product_name")

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      products: (data || []).map((p) => ({
        station_product_id: p.station_product_id,
        product_name: p.product_name,
        current_stock: Number(p.current_stock),
      })),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch products",
    }
  }
}

// ─── Save Fuel Purchase ────────────────────────────────────

export type SaveFuelPurchaseResult =
  | { success: true }
  | { success: false; error: string }

export async function saveFuelPurchase(data: {
  stationId: string
  purchaseDate: string
  paymentMethod: PurchasePaymentMethod
  vendorName?: string
  notes?: string
  gstAmount: number
  fuelItems: FuelLineItemInput[]
}): Promise<SaveFuelPurchaseResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", data.stationId)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    if (data.fuelItems.length === 0) {
      return { success: false, error: "No fuel items to save" }
    }

    // Validate each fuel item
    for (const item of data.fuelItems) {
      if (item.purchase_price_per_liter <= 0) {
        return { success: false, error: "Purchase price must be greater than 0" }
      }
      if (item.total_quantity <= 0) {
        return { success: false, error: "Quantity must be greater than 0" }
      }
      if (item.tank_allocations.length === 0) {
        return { success: false, error: "Each fuel item must have at least one tank allocation" }
      }

      // Validate allocation sum matches total quantity
      const allocationSum = item.tank_allocations.reduce((sum, a) => sum + a.quantity, 0)
      if (Math.abs(allocationSum - item.total_quantity) > 0.01) {
        return {
          success: false,
          error: `Tank allocation total (${allocationSum}) must match fuel quantity (${item.total_quantity})`,
        }
      }
    }

    // Calculate total from line items
    const lineItemsTotal = data.fuelItems.reduce(
      (sum, item) => sum + item.purchase_price_per_liter * item.total_quantity,
      0
    )
    const totalAmount = lineItemsTotal + data.gstAmount

    // 1. Create purchase header
    const purchaseInsert: PurchaseInsert = {
      station_id: data.stationId,
      purchase_date: data.purchaseDate,
      purchase_type: "fuel",
      payment_method: data.paymentMethod,
      gst_amount: data.gstAmount,
      total_amount: Math.round(totalAmount * 100) / 100,
      vendor_name: data.vendorName || null,
      notes: data.notes || null,
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert(purchaseInsert)
      .select("purchase_id")
      .single()

    if (purchaseError || !purchase) {
      return { success: false, error: purchaseError?.message || "Failed to create purchase" }
    }

    // 2. Create fuel items and their tank allocations
    for (const item of data.fuelItems) {
      const fuelItemInsert: PurchaseFuelItemInsert = {
        purchase_id: purchase.purchase_id,
        fuel_type_id: item.fuel_type_id,
        purchase_price_per_liter: item.purchase_price_per_liter,
        total_quantity: item.total_quantity,
      }

      const { data: fuelItem, error: fuelItemError } = await supabase
        .from("purchase_fuel_items")
        .insert(fuelItemInsert)
        .select("fuel_item_id")
        .single()

      if (fuelItemError || !fuelItem) {
        return { success: false, error: fuelItemError?.message || "Failed to create fuel item" }
      }

      // Create tank allocations
      const allocations: PurchaseFuelTankAllocationInsert[] = item.tank_allocations.map((a) => ({
        fuel_item_id: fuelItem.fuel_item_id,
        tank_id: a.tank_id,
        quantity: a.quantity,
      }))

      const { error: allocError } = await supabase
        .from("purchase_fuel_tank_allocations")
        .insert(allocations)

      if (allocError) {
        return { success: false, error: allocError.message }
      }
    }

    await invalidateStock()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save fuel purchase",
    }
  }
}

// ─── Save Product Purchase ─────────────────────────────────

export type SaveProductPurchaseResult =
  | { success: true }
  | { success: false; error: string }

export async function saveProductPurchase(data: {
  stationId: string
  purchaseDate: string
  paymentMethod: PurchasePaymentMethod
  vendorName?: string
  notes?: string
  gstAmount: number
  productItems: ProductLineItemInput[]
}): Promise<SaveProductPurchaseResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", data.stationId)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    if (data.productItems.length === 0) {
      return { success: false, error: "No product items to save" }
    }

    // Validate each product item
    for (const item of data.productItems) {
      if (item.purchase_price <= 0) {
        return { success: false, error: "Purchase price must be greater than 0" }
      }
      if (item.quantity <= 0) {
        return { success: false, error: "Quantity must be greater than 0" }
      }
    }

    // Calculate total from line items
    const lineItemsTotal = data.productItems.reduce(
      (sum, item) => sum + item.purchase_price * item.quantity,
      0
    )
    const totalAmount = lineItemsTotal + data.gstAmount

    // 1. Create purchase header
    const purchaseInsert: PurchaseInsert = {
      station_id: data.stationId,
      purchase_date: data.purchaseDate,
      purchase_type: "product",
      payment_method: data.paymentMethod,
      gst_amount: data.gstAmount,
      total_amount: Math.round(totalAmount * 100) / 100,
      vendor_name: data.vendorName || null,
      notes: data.notes || null,
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert(purchaseInsert)
      .select("purchase_id")
      .single()

    if (purchaseError || !purchase) {
      return { success: false, error: purchaseError?.message || "Failed to create purchase" }
    }

    // 2. Create product items
    const productItemInserts: PurchaseProductItemInsert[] = data.productItems.map((item) => ({
      purchase_id: purchase.purchase_id,
      product_id: item.product_id,
      purchase_price: item.purchase_price,
      quantity: item.quantity,
    }))

    const { error: productError } = await supabase
      .from("purchase_product_items")
      .insert(productItemInserts)

    if (productError) {
      return { success: false, error: productError.message }
    }

    await invalidateStock()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save product purchase",
    }
  }
}

// ─── Get Purchase History ──────────────────────────────────

export type GetPurchaseHistoryResult =
  | { success: true; history: PurchaseHistoryItem[] }
  | { success: false; error: string }

export async function getPurchaseHistory(): Promise<GetPurchaseHistoryResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    const clientStations = await getCachedClientStations(client.client_id)
    const clientStationIds = clientStations.map((s) => s.station_id)

    if (clientStationIds.length === 0) {
      return { success: true, history: [] }
    }

    const { data, error } = await supabase
      .from("purchases")
      .select(`
        purchase_id,
        station_id,
        purchase_date,
        purchase_type,
        payment_method,
        gst_amount,
        total_amount,
        vendor_name,
        notes,
        created_at,
        stations (
          station_name
        ),
        purchase_fuel_items (
          fuel_item_id,
          purchase_price_per_liter,
          total_quantity,
          total_amount,
          fuel_types:fuel_type_id (
            fueltype_name
          ),
          purchase_fuel_tank_allocations (
            quantity,
            tanks:tank_id (
              tank_name
            )
          )
        ),
        purchase_product_items (
          product_item_id,
          purchase_price,
          quantity,
          total_amount,
          station_products:product_id (
            product_name
          )
        )
      `)
      .in("station_id", clientStationIds)
      .eq("status", "active")
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return { success: false, error: error.message }
    }

    const history: PurchaseHistoryItem[] = (data || []).map((r) => {
      const stn = r.stations as unknown as { station_name: string } | null

      // Map fuel items
      const fuelItems = (r.purchase_fuel_items as unknown as Array<{
        fuel_item_id: string
        purchase_price_per_liter: number
        total_quantity: number
        total_amount: number
        fuel_types: { fueltype_name: string } | null
        purchase_fuel_tank_allocations: Array<{
          quantity: number
          tanks: { tank_name: string } | null
        }>
      }>) || []

      // Map product items
      const productItems = (r.purchase_product_items as unknown as Array<{
        product_item_id: string
        purchase_price: number
        quantity: number
        total_amount: number
        station_products: { product_name: string } | null
      }>) || []

      return {
        purchase_id: r.purchase_id,
        station_id: r.station_id,
        station_name: stn?.station_name || "Unknown",
        purchase_date: r.purchase_date,
        purchase_type: r.purchase_type as PurchaseType,
        payment_method: r.payment_method as PurchasePaymentMethod,
        gst_amount: Number(r.gst_amount),
        total_amount: Number(r.total_amount),
        vendor_name: r.vendor_name,
        notes: r.notes,
        created_at: r.created_at,
        fuel_items: fuelItems.length > 0
          ? fuelItems.map((fi) => ({
              fuel_item_id: fi.fuel_item_id,
              fuel_type_name: fi.fuel_types?.fueltype_name || "Unknown",
              purchase_price_per_liter: Number(fi.purchase_price_per_liter),
              total_quantity: Number(fi.total_quantity),
              total_amount: Number(fi.total_amount),
              allocations: (fi.purchase_fuel_tank_allocations || []).map((a) => ({
                tank_name: a.tanks?.tank_name || "Unknown",
                quantity: Number(a.quantity),
              })),
            }))
          : undefined,
        product_items: productItems.length > 0
          ? productItems.map((pi) => ({
              product_item_id: pi.product_item_id,
              product_name: pi.station_products?.product_name || "Unknown",
              purchase_price: Number(pi.purchase_price),
              quantity: Number(pi.quantity),
              total_amount: Number(pi.total_amount),
            }))
          : undefined,
      }
    })

    return { success: true, history }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch purchase history",
    }
  }
}

// ─── Delete Purchase ───────────────────────────────────────

export type DeletePurchaseResult =
  | { success: true }
  | { success: false; error: string }

export async function deletePurchase(
  purchaseId: string
): Promise<DeletePurchaseResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Get the purchase to verify ownership
    const { data: purchase, error: fetchError } = await supabase
      .from("purchases")
      .select("purchase_id, station_id")
      .eq("purchase_id", purchaseId)
      .single()

    if (fetchError || !purchase) {
      return { success: false, error: "Purchase record not found" }
    }

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", purchase.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Access denied" }
    }

    // Delete purchase - CASCADE will delete items and allocations,
    // triggers will auto-restore stock
    const { error: deleteError } = await supabase
      .from("purchases")
      .delete()
      .eq("purchase_id", purchaseId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    await invalidateStock()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete purchase",
    }
  }
}
