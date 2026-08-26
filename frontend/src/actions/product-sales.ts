"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import { invalidateStock } from "@/lib/cache-invalidation"
import type { ProductSaleItemInsert } from "@/types/database"

// Types for product sales data
export interface StationForProductSales {
  station_id: string
  station_name: string
}

export interface StationEmployeeForProductSales {
  employee_id: string
  employee_name: string
  employee_role: string
}

export interface AvailableProduct {
  station_product_id: string
  product_name: string
  selling_price: number
  current_stock: number
}

export interface ProductSaleLineItem {
  product_id: string
  quantity: number
  unit_price: number
  payment_method: "cash" | "upi" | "card" | "bank_transfer" | "credit"
}

export interface ProductSaleHistoryItem {
  product_sale_id: string
  sale_date: string
  product_name: string
  quantity: number
  unit_price: number
  total_amount: number
  payment_method: string
  employee_name: string
  station_name: string
  station_id: string
  created_at: string
}

// ─── Get Stations ────────────────────────────────────────────

export type GetStationsForProductSalesResult =
  | { success: true; stations: StationForProductSales[] }
  | { success: false; error: string }

export async function getStationsForProductSales(): Promise<GetStationsForProductSalesResult> {
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

// ─── Get Station Employees ───────────────────────────────────

export type GetStationEmployeesForProductSalesResult =
  | { success: true; employees: StationEmployeeForProductSales[] }
  | { success: false; error: string }

export async function getStationEmployeesForProductSales(
  stationId: string
): Promise<GetStationEmployeesForProductSalesResult> {
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

    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("employee_id, employee_name, employee_role")
      .eq("station_id", stationId)
      .eq("status", "active")
      .order("employee_role")
      .order("employee_name")

    if (employeesError) {
      return { success: false, error: employeesError.message }
    }

    return { success: true, employees: employees || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employees",
    }
  }
}

// ─── Get Available Products ──────────────────────────────────

export type GetAvailableProductsResult =
  | { success: true; products: AvailableProduct[] }
  | { success: false; error: string }

export async function getAvailableProducts(
  stationId: string
): Promise<GetAvailableProductsResult> {
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

    const { data: products, error: productsError } = await supabase
      .from("station_products")
      .select("station_product_id, product_name, selling_price, current_stock")
      .eq("station_id", stationId)
      .eq("available", true)
      .order("product_name")

    if (productsError) {
      return { success: false, error: productsError.message }
    }

    const formattedProducts: AvailableProduct[] = (products || []).map((p) => ({
      station_product_id: p.station_product_id,
      product_name: p.product_name,
      selling_price: Number(p.selling_price),
      current_stock: Number(p.current_stock),
    }))

    return { success: true, products: formattedProducts }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch products",
    }
  }
}

// ─── Save Product Sale Items ─────────────────────────────────

export type SaveProductSaleItemsResult =
  | { success: true; savedCount: number }
  | { success: false; error: string }

export async function saveProductSaleItems(
  stationId: string,
  employeeId: string,
  saleDate: string,
  items: ProductSaleLineItem[]
): Promise<SaveProductSaleItemsResult> {
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

    // Verify employee belongs to station
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id")
      .eq("employee_id", employeeId)
      .eq("station_id", stationId)
      .eq("status", "active")
      .single()

    if (employeeError || !employee) {
      return { success: false, error: "Employee not found or does not belong to station" }
    }

    if (items.length === 0) {
      return { success: false, error: "No items to save" }
    }

    // Validate each item and check stock
    const productIds = items.map((item) => item.product_id)
    const { data: products, error: productsError } = await supabase
      .from("station_products")
      .select("station_product_id, product_name, current_stock")
      .in("station_product_id", productIds)
      .eq("station_id", stationId)
      .eq("available", true)

    if (productsError) {
      return { success: false, error: productsError.message }
    }

    const productMap = new Map(
      (products || []).map((p) => [p.station_product_id, p])
    )

    for (const item of items) {
      if (item.quantity <= 0) {
        return { success: false, error: "Quantity must be greater than 0" }
      }
      if (item.unit_price <= 0) {
        return { success: false, error: "Unit price must be greater than 0" }
      }

      const product = productMap.get(item.product_id)
      if (!product) {
        return { success: false, error: `Product not found or not available` }
      }

      if (Number(product.current_stock) < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.product_name}". Available: ${product.current_stock}, Requested: ${item.quantity}`,
        }
      }
    }

    // Prepare records for insert
    const recordsToInsert: ProductSaleItemInsert[] = items.map((item) => ({
      station_id: stationId,
      employee_id: employeeId,
      product_id: item.product_id,
      sale_date: saleDate,
      quantity: item.quantity,
      unit_price: item.unit_price,
      payment_method: item.payment_method,
    }))

    const { error: insertError } = await supabase
      .from("product_sale_items")
      .insert(recordsToInsert)

    if (insertError) {
      if (insertError.message.includes("current_stock") || insertError.message.includes("chk_")) {
        return { success: false, error: "Insufficient stock. Another sale may have been recorded. Please refresh and try again." }
      }
      return { success: false, error: insertError.message }
    }

    await invalidateStock()
    return { success: true, savedCount: items.length }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save product sales",
    }
  }
}

// ─── Get Product Sales History ───────────────────────────────

export type GetProductSalesHistoryResult =
  | { success: true; history: ProductSaleHistoryItem[] }
  | { success: false; error: string }

export async function getProductSalesHistory(
  stationId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<GetProductSalesHistoryResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Get client's station IDs for ownership filtering
    const clientStations = await getCachedClientStations(client.client_id)
    const clientStationIds = clientStations.map((s) => s.station_id)

    if (clientStationIds.length === 0) {
      return { success: true, history: [] }
    }

    // Build query
    let query = supabase
      .from("product_sale_items")
      .select(`
        product_sale_id,
        sale_date,
        quantity,
        unit_price,
        total_amount,
        payment_method,
        station_id,
        created_at,
        station_products (
          product_name
        ),
        employees (
          employee_name
        ),
        stations (
          station_name
        )
      `)
      .in("station_id", clientStationIds)
      .eq("status", "active")

    if (stationId) {
      query = query.eq("station_id", stationId)
    }
    if (dateFrom) {
      query = query.gte("sale_date", dateFrom)
    }
    if (dateTo) {
      query = query.lte("sale_date", dateTo)
    }

    const { data, error } = await query
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return { success: false, error: error.message }
    }

    const history: ProductSaleHistoryItem[] = (data || []).map((r) => {
      const product = r.station_products as unknown as { product_name: string } | null
      const emp = r.employees as unknown as { employee_name: string } | null
      const stn = r.stations as unknown as { station_name: string } | null

      return {
        product_sale_id: r.product_sale_id,
        sale_date: r.sale_date,
        product_name: product?.product_name || "Unknown",
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price),
        total_amount: Number(r.total_amount),
        payment_method: r.payment_method,
        employee_name: emp?.employee_name || "Unknown",
        station_name: stn?.station_name || "Unknown",
        station_id: r.station_id,
        created_at: r.created_at,
      }
    })

    return { success: true, history }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch product sales history",
    }
  }
}

// ─── Delete Product Sale Item ────────────────────────────────

export type DeleteProductSaleItemResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteProductSaleItem(
  saleId: string
): Promise<DeleteProductSaleItemResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Get the sale item to verify ownership
    const { data: saleItem, error: fetchError } = await supabase
      .from("product_sale_items")
      .select("product_sale_id, station_id")
      .eq("product_sale_id", saleId)
      .single()

    if (fetchError || !saleItem) {
      return { success: false, error: "Sale record not found" }
    }

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", saleItem.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Access denied" }
    }

    // Delete the record (trigger will restore stock)
    const { error: deleteError } = await supabase
      .from("product_sale_items")
      .delete()
      .eq("product_sale_id", saleId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    await invalidateStock()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete sale record",
    }
  }
}
