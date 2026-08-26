"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import { invalidateFuelPrices } from "@/lib/cache-invalidation"
import type { DailyFuelPriceInsert } from "@/types/database"

// Types for price data with related info
export interface CurrentFuelPrice {
  price_update_id: string
  station_id: string
  station_name: string
  fueltype_id: string
  fueltype_name: string
  new_price: number
  effective_date: string
  employee_id: string
  employee_name: string
  status: string
  updated_at: string
}

export interface PriceHistoryRecord {
  history_id: string
  station_id: string
  station_name: string
  fueltype_id: string
  fueltype_name: string
  old_price: number | null
  new_price: number
  effective_date: string
  price_update_id: string
  created_at: string
}

export interface StationWithFuelTypes {
  station_id: string
  station_name: string
  fuel_types: {
    fueltype_id: string
    fueltype_name: string
    current_price: number
  }[]
}

export interface StationEmployee {
  employee_id: string
  employee_name: string
  employee_role: string
}

// Get current fuel prices for all stations
export type GetCurrentPricesResult =
  | { success: true; prices: CurrentFuelPrice[] }
  | { success: false; error: string }

export async function getCurrentFuelPrices(): Promise<GetCurrentPricesResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return { success: true, prices: [] }
    }

    const stationIds = stations.map((s) => s.station_id)

    const supabase = await createClient()

    // Get current prices with station, fuel type, and employee info
    const { data: prices, error: pricesError } = await supabase
      .from("daily_fuel_price")
      .select(`
        *,
        stations!daily_fuel_price_station_id_fkey (
          station_name
        ),
        fuel_types!daily_fuel_price_fueltype_id_fkey (
          fueltype_name
        ),
        employees!daily_fuel_price_employee_id_fkey (
          employee_name
        )
      `)
      .in("station_id", stationIds)
      .eq("status", "active")
      .order("updated_at", { ascending: false })

    if (pricesError) {
      return { success: false, error: pricesError.message }
    }

    const formattedPrices: CurrentFuelPrice[] = (prices || []).map((p) => {
      const station = p.stations as unknown as { station_name: string }
      const fuelType = p.fuel_types as unknown as { fueltype_name: string }
      const employee = p.employees as unknown as { employee_name: string }

      return {
        price_update_id: p.price_update_id,
        station_id: p.station_id,
        station_name: station?.station_name || "Unknown",
        fueltype_id: p.fueltype_id,
        fueltype_name: fuelType?.fueltype_name || "Unknown",
        new_price: Number(p.new_price),
        effective_date: p.effective_date,
        employee_id: p.employee_id,
        employee_name: employee?.employee_name || "Unknown",
        status: p.status,
        updated_at: p.updated_at,
      }
    })

    return { success: true, prices: formattedPrices }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch current prices",
    }
  }
}

// Get price history with filters
export interface PriceHistoryFilters {
  stationId?: string
  fuelTypeId?: string
  startDate?: string
  endDate?: string
}

export type GetPriceHistoryResult =
  | { success: true; history: PriceHistoryRecord[] }
  | { success: false; error: string }

export async function getPriceHistory(filters?: PriceHistoryFilters): Promise<GetPriceHistoryResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return { success: true, history: [] }
    }

    const stationIds = stations.map((s) => s.station_id)
    const stationMap = new Map(stations.map((s) => [s.station_id, s.station_name]))

    const supabase = await createClient()

    // Build query with filters
    let query = supabase
      .from("price_history_logs")
      .select(`
        *,
        fuel_types!price_history_logs_fueltype_id_fkey (
          fueltype_name
        )
      `)
      .in("station_id", stationIds)
      .order("created_at", { ascending: false })

    // Apply filters
    if (filters?.stationId) {
      query = query.eq("station_id", filters.stationId)
    }

    if (filters?.fuelTypeId) {
      query = query.eq("fueltype_id", filters.fuelTypeId)
    }

    if (filters?.startDate) {
      query = query.gte("effective_date", filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte("effective_date", filters.endDate)
    }

    // Limit to last 100 records to avoid loading too much data
    query = query.limit(100)

    const { data: history, error: historyError } = await query

    if (historyError) {
      return { success: false, error: historyError.message }
    }

    const formattedHistory: PriceHistoryRecord[] = (history || []).map((h) => {
      const fuelType = h.fuel_types as unknown as { fueltype_name: string }

      return {
        history_id: h.history_id,
        station_id: h.station_id,
        station_name: stationMap.get(h.station_id) || "Unknown",
        fueltype_id: h.fueltype_id,
        fueltype_name: fuelType?.fueltype_name || "Unknown",
        old_price: h.old_price !== null ? Number(h.old_price) : null,
        new_price: Number(h.new_price),
        effective_date: h.effective_date,
        price_update_id: h.price_update_id,
        created_at: h.created_at,
      }
    })

    return { success: true, history: formattedHistory }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch price history",
    }
  }
}

// Get stations with their fuel types (for dropdowns)
export type GetStationsWithFuelTypesResult =
  | { success: true; stations: StationWithFuelTypes[] }
  | { success: false; error: string }

export async function getStationsWithFuelTypes(): Promise<GetStationsWithFuelTypesResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Get all stations for this client with their fuel types
    const { data: stations, error: stationsError } = await supabase
      .from("stations")
      .select(`
        station_id,
        station_name,
        fuel_types (
          fueltype_id,
          fueltype_name,
          fueltype_price
        )
      `)
      .eq("client_id", client.client_id)
      .eq("status", "active")
      .order("station_name")

    if (stationsError) {
      return { success: false, error: stationsError.message }
    }

    const formattedStations: StationWithFuelTypes[] = (stations || []).map((s) => {
      const fuelTypes = (s.fuel_types as unknown as Array<{
        fueltype_id: string
        fueltype_name: string
        fueltype_price: number
      }>) || []

      return {
        station_id: s.station_id,
        station_name: s.station_name,
        fuel_types: fuelTypes.map((ft) => ({
          fueltype_id: ft.fueltype_id,
          fueltype_name: ft.fueltype_name,
          current_price: Number(ft.fueltype_price),
        })),
      }
    })

    return { success: true, stations: formattedStations }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stations with fuel types",
    }
  }
}

// Get station employees for selecting who updated the price
export type GetStationEmployeesResult =
  | { success: true; employees: StationEmployee[] }
  | { success: false; error: string }

export async function getStationEmployeesForPrice(stationId: string): Promise<GetStationEmployeesResult> {
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
      .eq("station_id", stationId)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Get all active employees for this station
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
      error: error instanceof Error ? error.message : "Failed to fetch station employees",
    }
  }
}

// Add or update daily fuel price (upsert)
export interface UpdatePriceData {
  station_id: string
  fueltype_id: string
  new_price: number
  effective_date: string
  employee_id: string
}

export type UpdatePriceResult =
  | { success: true; price_update_id: string; isUpdate: boolean }
  | { success: false; error: string }

export async function updateDailyFuelPrice(data: UpdatePriceData): Promise<UpdatePriceResult> {
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
      .eq("station_id", data.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Verify fuel type belongs to the station
    const { data: fuelType, error: fuelTypeError } = await supabase
      .from("fuel_types")
      .select("fueltype_id")
      .eq("fueltype_id", data.fueltype_id)
      .eq("station_id", data.station_id)
      .eq("status", "active")
      .single()

    if (fuelTypeError || !fuelType) {
      return { success: false, error: "Fuel type not found or does not belong to selected station" }
    }

    // Verify employee belongs to the station
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id")
      .eq("employee_id", data.employee_id)
      .eq("station_id", data.station_id)
      .eq("status", "active")
      .single()

    if (employeeError || !employee) {
      return { success: false, error: "Employee not found or does not belong to selected station" }
    }

    // Validate price
    if (data.new_price < 0) {
      return { success: false, error: "Price cannot be negative" }
    }

    // Check if price already exists for this station + fuel type
    const { data: existingPrice, error: existingError } = await supabase
      .from("daily_fuel_price")
      .select("price_update_id")
      .eq("station_id", data.station_id)
      .eq("fueltype_id", data.fueltype_id)
      .single()

    if (existingPrice) {
      // Update existing price
      const { error: updateError } = await supabase
        .from("daily_fuel_price")
        .update({
          new_price: data.new_price,
          effective_date: data.effective_date,
          employee_id: data.employee_id,
        })
        .eq("price_update_id", existingPrice.price_update_id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Sync price to fuel_types table for consistency
      await supabase
        .from("fuel_types")
        .update({ fueltype_price: data.new_price })
        .eq("fueltype_id", data.fueltype_id)

      // Invalidate fuel prices cache
      await invalidateFuelPrices()

      return { success: true, price_update_id: existingPrice.price_update_id, isUpdate: true }
    }

    // Insert new price
    const priceData: DailyFuelPriceInsert = {
      station_id: data.station_id,
      fueltype_id: data.fueltype_id,
      new_price: data.new_price,
      effective_date: data.effective_date,
      employee_id: data.employee_id,
    }

    const { data: insertedPrice, error: insertError } = await supabase
      .from("daily_fuel_price")
      .insert(priceData)
      .select("price_update_id")
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    // Sync price to fuel_types table for consistency
    await supabase
      .from("fuel_types")
      .update({ fueltype_price: data.new_price })
      .eq("fueltype_id", data.fueltype_id)

    // Invalidate fuel prices cache
    await invalidateFuelPrices()

    return { success: true, price_update_id: insertedPrice.price_update_id, isUpdate: false }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update fuel price",
    }
  }
}

// Get chart data for price trends
export interface PriceChartData {
  date: string
  displayDate: string
  [key: string]: string | number // fuel type names as keys with price values
}

export interface ChartDataWithLegend {
  chartData: PriceChartData[]
  fuelTypes: string[]
  colors: string[]
}

export type GetPriceChartDataResult =
  | { success: true; data: ChartDataWithLegend }
  | { success: false; error: string }

export async function getPriceChartData(
  stationId?: string,
  fuelTypeId?: string,
  startDate?: string,
  endDate?: string
): Promise<GetPriceChartDataResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return { success: true, data: { chartData: [], fuelTypes: [], colors: [] } }
    }

    const stationIds = stations.map((s) => s.station_id)

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from("price_history_logs")
      .select(`
        effective_date,
        new_price,
        fuel_types!price_history_logs_fueltype_id_fkey (
          fueltype_name
        )
      `)
      .in("station_id", stationIds)
      .order("effective_date", { ascending: true })

    // Apply filters
    if (stationId) {
      query = query.eq("station_id", stationId)
    }

    if (fuelTypeId) {
      query = query.eq("fueltype_id", fuelTypeId)
    }

    if (startDate) {
      query = query.gte("effective_date", startDate)
    }

    if (endDate) {
      query = query.lte("effective_date", endDate)
    }

    const { data: history, error: historyError } = await query

    if (historyError) {
      return { success: false, error: historyError.message }
    }

    if (!history || history.length === 0) {
      return { success: true, data: { chartData: [], fuelTypes: [], colors: [] } }
    }

    // Group by date and fuel type
    const dateMap = new Map<string, PriceChartData>()
    const fuelTypeSet = new Set<string>()

    for (const record of history) {
      const fuelType = record.fuel_types as unknown as { fueltype_name: string }
      const fuelTypeName = fuelType?.fueltype_name || "Unknown"
      fuelTypeSet.add(fuelTypeName)

      const date = record.effective_date
      const displayDate = formatDisplayDate(date)

      if (!dateMap.has(date)) {
        dateMap.set(date, { date, displayDate })
      }

      const existing = dateMap.get(date)!
      existing[fuelTypeName] = Number(record.new_price)
    }

    const chartData = Array.from(dateMap.values())
    const fuelTypes = Array.from(fuelTypeSet)

    // Generate colors for fuel types
    const colorPalette = [
      "hsl(217, 91%, 60%)",  // Blue
      "hsl(142, 76%, 36%)",  // Green
      "hsl(0, 84%, 60%)",    // Red
      "hsl(45, 93%, 47%)",   // Yellow/Orange
      "hsl(262, 83%, 58%)",  // Purple
      "hsl(180, 50%, 45%)",  // Teal
    ]

    const colors = fuelTypes.map((_, index) => colorPalette[index % colorPalette.length])

    return { success: true, data: { chartData, fuelTypes, colors } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch chart data",
    }
  }
}

// Helper function to format date for display
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}
