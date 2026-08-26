"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import type {
  Station,
  FuelType,
  Tank,
  Pump,
  Nozzle,
  StationProduct,
} from "@/types/database"

// Types for station with counts (list page)
export type StationWithCounts = Station & {
  fuel_type_count: number
  tank_count: number
  pump_count: number
  nozzle_count: number
  product_count: number
}

// Types for detailed station data (detail page)
export type TankWithFuelType = Tank & {
  fuel_type: FuelType
}

export type NozzleWithRelations = Nozzle & {
  pump: Pump
  tank: Tank
  fuel_type: FuelType
}

export type StationDetailData = {
  station: Station
  fuelTypes: FuelType[]
  tanks: TankWithFuelType[]
  pumps: Pump[]
  nozzles: NozzleWithRelations[]
  products: StationProduct[]
}

export type GetStationsWithCountsResult =
  | { success: true; stations: StationWithCounts[] }
  | { success: false; error: string }

export type GetStationDetailResult =
  | { success: true; data: StationDetailData }
  | { success: false; error: string }

/**
 * Get all stations for the current client with counts of related entities
 * Used for the View Stations list page
 */
export async function getStationsWithCounts(): Promise<GetStationsWithCountsResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Fetch stations with counts using Supabase's aggregation
    const { data: stations, error } = await supabase
      .from("stations")
      .select(`
        *,
        fuel_types(count),
        tanks(count),
        pumps(count),
        nozzles(count),
        station_products(count)
      `)
      .eq("client_id", client.client_id)
      .eq("status", "active")
      .order("station_name")

    if (error) {
      return { success: false, error: error.message }
    }

    // Transform the data to include counts as flat properties
    const stationsWithCounts: StationWithCounts[] = (stations || []).map((station) => {
      // Supabase returns counts as array with single object containing count
      const fuelTypeCount = Array.isArray(station.fuel_types)
        ? station.fuel_types[0]?.count ?? 0
        : 0
      const tankCount = Array.isArray(station.tanks)
        ? station.tanks[0]?.count ?? 0
        : 0
      const pumpCount = Array.isArray(station.pumps)
        ? station.pumps[0]?.count ?? 0
        : 0
      const nozzleCount = Array.isArray(station.nozzles)
        ? station.nozzles[0]?.count ?? 0
        : 0
      const productCount = Array.isArray(station.station_products)
        ? station.station_products[0]?.count ?? 0
        : 0

      // Remove the nested arrays and add flat counts
      const { fuel_types: _ft, tanks: _t, pumps: _p, nozzles: _n, station_products: _sp, ...stationData } = station

      return {
        ...stationData,
        fuel_type_count: fuelTypeCount,
        tank_count: tankCount,
        pump_count: pumpCount,
        nozzle_count: nozzleCount,
        product_count: productCount,
      } as StationWithCounts
    })

    return { success: true, stations: stationsWithCounts }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stations",
    }
  }
}

/**
 * Get detailed station data including all related entities
 * Used for the station detail page
 */
export async function getStationDetail(stationId: string): Promise<GetStationDetailResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("*")
      .eq("station_id", stationId)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Fetch all related data in parallel
    const [fuelTypesResult, tanksResult, pumpsResult, nozzlesResult, productsResult] = await Promise.all([
      // Fuel types
      supabase
        .from("fuel_types")
        .select("*")
        .eq("station_id", stationId)
        .eq("status", "active")
        .order("fueltype_name"),

      // Tanks with fuel type info
      supabase
        .from("tanks")
        .select(`
          *,
          fuel_type:fuel_types(*)
        `)
        .eq("station_id", stationId)
        .eq("status", "active")
        .order("tank_name"),

      // Pumps
      supabase
        .from("pumps")
        .select("*")
        .eq("station_id", stationId)
        .eq("status", "active")
        .order("pump_name"),

      // Nozzles with related pump, tank, and fuel type
      supabase
        .from("nozzles")
        .select(`
          *,
          pump:pumps(*),
          tank:tanks(*),
          fuel_type:fuel_types(*)
        `)
        .eq("station_id", stationId)
        .eq("status", "active")
        .order("nozzle_name"),

      // Products
      supabase
        .from("station_products")
        .select("*")
        .eq("station_id", stationId)
        .order("product_name"),
    ])

    // Check for errors
    if (fuelTypesResult.error) {
      return { success: false, error: `Failed to fetch fuel types: ${fuelTypesResult.error.message}` }
    }
    if (tanksResult.error) {
      return { success: false, error: `Failed to fetch tanks: ${tanksResult.error.message}` }
    }
    if (pumpsResult.error) {
      return { success: false, error: `Failed to fetch pumps: ${pumpsResult.error.message}` }
    }
    if (nozzlesResult.error) {
      return { success: false, error: `Failed to fetch nozzles: ${nozzlesResult.error.message}` }
    }
    if (productsResult.error) {
      return { success: false, error: `Failed to fetch products: ${productsResult.error.message}` }
    }

    return {
      success: true,
      data: {
        station: station as Station,
        fuelTypes: (fuelTypesResult.data || []) as FuelType[],
        tanks: (tanksResult.data || []) as TankWithFuelType[],
        pumps: (pumpsResult.data || []) as Pump[],
        nozzles: (nozzlesResult.data || []) as NozzleWithRelations[],
        products: (productsResult.data || []) as StationProduct[],
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch station details",
    }
  }
}
