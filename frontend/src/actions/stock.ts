"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"

// Types for stock overview data
export interface TankStock {
  tank_id: string
  tank_name: string
  station_id: string
  station_name: string
  fueltype_name: string
  capacity: number
  capacity_unit: string
  current_stock: number
  percentage_full: number
}

export interface ProductStock {
  station_product_id: string
  product_name: string
  station_id: string
  station_name: string
  current_stock: number
  minimum_stock: number
  is_low_stock: boolean
}

export interface StockSummary {
  total_fuel_volume: number
  total_products: number
  low_stock_alerts: number
}

export interface StockOverviewData {
  tanks: TankStock[]
  products: ProductStock[]
  summary: StockSummary
}

export type GetStockOverviewResult =
  | { success: true; data: StockOverviewData }
  | { success: false; error: string }

export async function getStockOverview(): Promise<GetStockOverviewResult> {
  try {
    const supabase = await createClient()

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Get client's stations (cached)
    const clientStations = await getCachedClientStations(client.client_id)
    const clientStationIds = clientStations.map((s) => s.station_id)

    if (clientStationIds.length === 0) {
      return {
        success: true,
        data: {
          tanks: [],
          products: [],
          summary: { total_fuel_volume: 0, total_products: 0, low_stock_alerts: 0 },
        },
      }
    }

    // Build station name lookup
    const stationNameMap = new Map<string, string>()
    clientStations.forEach((s) => stationNameMap.set(s.station_id, s.station_name))

    // Fetch tanks with fuel type info, filtered by client's stations
    const { data: tanksData, error: tanksError } = await supabase
      .from("tanks")
      .select(`
        tank_id,
        tank_name,
        station_id,
        tank_capacity,
        current_stock,
        capacity_unit,
        fuel_types (
          fueltype_name
        )
      `)
      .in("station_id", clientStationIds)
      .eq("status", "active")

    if (tanksError) {
      return { success: false, error: tanksError.message }
    }

    const tanks: TankStock[] = (tanksData || []).map((t) => {
      const fuelType = t.fuel_types as unknown as { fueltype_name: string } | null
      const capacity = Number(t.tank_capacity)
      const currentStock = Number(t.current_stock)
      return {
        tank_id: t.tank_id,
        tank_name: t.tank_name,
        station_id: t.station_id,
        station_name: stationNameMap.get(t.station_id) || "Unknown",
        fueltype_name: fuelType?.fueltype_name || "Unknown",
        capacity,
        capacity_unit: t.capacity_unit || "liters",
        current_stock: currentStock,
        percentage_full: capacity > 0 ? (currentStock / capacity) * 100 : 0,
      }
    })

    // Fetch products filtered by client's stations
    const { data: productsData, error: productsError } = await supabase
      .from("station_products")
      .select(`
        station_product_id,
        product_name,
        station_id,
        current_stock,
        minimum_stock
      `)
      .in("station_id", clientStationIds)
      .eq("available", true)

    if (productsError) {
      return { success: false, error: productsError.message }
    }

    const products: ProductStock[] = (productsData || []).map((p) => {
      const currentStock = Number(p.current_stock)
      const minimumStock = Number(p.minimum_stock)
      return {
        station_product_id: p.station_product_id,
        product_name: p.product_name,
        station_id: p.station_id,
        station_name: stationNameMap.get(p.station_id) || "Unknown",
        current_stock: currentStock,
        minimum_stock: minimumStock,
        is_low_stock: currentStock < minimumStock,
      }
    })

    // Compute summary
    const totalFuelVolume = tanks.reduce((sum, t) => sum + t.current_stock, 0)
    const lowStockAlerts =
      tanks.filter((t) => t.percentage_full < 25).length +
      products.filter((p) => p.is_low_stock).length

    return {
      success: true,
      data: {
        tanks,
        products,
        summary: {
          total_fuel_volume: totalFuelVolume,
          total_products: products.length,
          low_stock_alerts: lowStockAlerts,
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stock overview",
    }
  }
}
