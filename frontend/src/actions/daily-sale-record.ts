"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import { invalidateStock, invalidateDailyEntry, invalidateCreditCustomers } from "@/lib/cache-invalidation"
import type { DailySaleRecordInsert } from "@/types/database"

// Types for sale record data
export interface StationEmployee {
  employee_id: string
  employee_name: string
  employee_role: string
}

export interface NozzleForSaleRecord {
  nozzle_id: string
  nozzle_name: string
  pump_id: string
  pump_name: string
  fueltype_id: string
  fueltype_name: string
  current_fuel_price: number
}

export interface SaleRecordInput {
  nozzle_id: string
  pump_id: string
  fuel_price: number
  opening_reading: number
  close_reading: number
  testing_qty?: number
  cash_sales: number
  upi_sales: number
  card_sales: number
  credit_sales: number
  credit_customer_id?: string | null
  vehicle_id?: string | null
}

// Types for credit customer dropdown in DSR
export interface CreditCustomerForDSR {
  credit_customer_id: string
  customer_name: string
  current_balance: number
}

export interface VehicleForDSR {
  vehicle_id: string
  vehicle_number: string
}

export interface ExistingSaleRecord {
  sale_record_id: string
  nozzle_id: string
  pump_id: string
  fuel_price: number
  opening_reading: number
  close_reading: number
  testing_qty: number
  total_liters: number
  total_amount: number
  cash_sales: number
  upi_sales: number
  card_sales: number
  credit_sales: number
}

export interface PreviousCloseReading {
  nozzle_id: string
  close_reading: number | null
}

// Get station employees for sale record entry
export type GetStationEmployeesResult =
  | { success: true; employees: StationEmployee[] }
  | { success: false; error: string }

export async function getStationEmployeesForSaleRecord(
  stationId: string
): Promise<GetStationEmployeesResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
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

// Get nozzles for sale entry based on employee role
// Manager: ALL nozzles for the station
// Pump Boy: Only nozzles from their active shift on that date
export type GetNozzlesResult =
  | { success: true; nozzles: NozzleForSaleRecord[]; isManager: boolean }
  | { success: false; error: string }

export async function getNozzlesForSaleEntry(
  stationId: string,
  employeeId: string,
  saleDate: string
): Promise<GetNozzlesResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
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

    // Get employee role
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id, employee_role")
      .eq("employee_id", employeeId)
      .eq("station_id", stationId)
      .eq("status", "active")
      .single()

    if (employeeError || !employee) {
      return { success: false, error: "Employee not found or does not belong to station" }
    }

    const isManager = employee.employee_role === "manager"

    let nozzleIds: string[] = []

    if (isManager) {
      // Manager: Get all nozzles for the station
      const { data: nozzles, error: nozzlesError } = await supabase
        .from("nozzles")
        .select("nozzle_id")
        .eq("station_id", stationId)
        .eq("status", "active")

      if (nozzlesError) {
        return { success: false, error: nozzlesError.message }
      }

      nozzleIds = (nozzles || []).map((n) => n.nozzle_id)
    } else {
      // Pump Boy: Get nozzles from their shifts on that date
      const { data: shifts, error: shiftsError } = await supabase
        .from("employee_shifts")
        .select("nozzle_id")
        .eq("employee_id", employeeId)
        .eq("station_id", stationId)
        .eq("status", "active")
        .gte("start_time", `${saleDate}T00:00:00`)
        .lte("start_time", `${saleDate}T23:59:59`)
        .not("nozzle_id", "is", null)

      if (shiftsError) {
        return { success: false, error: shiftsError.message }
      }

      // Get unique nozzle IDs
      nozzleIds = [...new Set((shifts || []).map((s) => s.nozzle_id!).filter(Boolean))]
    }

    if (nozzleIds.length === 0) {
      return { success: true, nozzles: [], isManager }
    }

    // Get nozzle details with pump, fuel type, and current price
    const { data: nozzleDetails, error: detailsError } = await supabase
      .from("nozzles")
      .select(`
        nozzle_id,
        nozzle_name,
        pump_id,
        fueltype_id,
        pumps (
          pump_name
        ),
        fuel_types (
          fueltype_name,
          fueltype_price
        )
      `)
      .in("nozzle_id", nozzleIds)
      .eq("status", "active")
      .order("nozzle_name")

    if (detailsError) {
      return { success: false, error: detailsError.message }
    }

    // Also try to get current price from daily_fuel_price if available
    const { data: dailyPrices } = await supabase
      .from("daily_fuel_price")
      .select("fueltype_id, new_price")
      .eq("station_id", stationId)
      .eq("status", "active")

    const dailyPriceMap = new Map<string, number>()
    if (dailyPrices) {
      dailyPrices.forEach((p) => {
        dailyPriceMap.set(p.fueltype_id, Number(p.new_price))
      })
    }

    const nozzles: NozzleForSaleRecord[] = (nozzleDetails || []).map((n) => {
      const pump = n.pumps as unknown as { pump_name: string } | null
      const fuelType = n.fuel_types as unknown as { fueltype_name: string; fueltype_price: number } | null

      // Prefer daily_fuel_price, fall back to fueltype_price
      const currentPrice = dailyPriceMap.get(n.fueltype_id) ?? Number(fuelType?.fueltype_price ?? 0)

      return {
        nozzle_id: n.nozzle_id,
        nozzle_name: n.nozzle_name,
        pump_id: n.pump_id,
        pump_name: pump?.pump_name || "Unknown",
        fueltype_id: n.fueltype_id,
        fueltype_name: fuelType?.fueltype_name || "Unknown",
        current_fuel_price: currentPrice,
      }
    })

    return { success: true, nozzles, isManager }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch nozzles",
    }
  }
}

// Get previous close readings for nozzles
export type GetPreviousReadingsResult =
  | { success: true; readings: PreviousCloseReading[] }
  | { success: false; error: string }

export async function getPreviousCloseReadings(
  stationId: string,
  nozzleIds: string[],
  saleDate: string
): Promise<GetPreviousReadingsResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
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

    // Get the most recent close_reading for each nozzle before the sale date
    // Use Promise.all to parallelize queries instead of sequential loop
    const readings = await Promise.all(
      nozzleIds.map(async (nozzleId) => {
        const { data: record } = await supabase
          .from("daily_sale_records")
          .select("close_reading")
          .eq("nozzle_id", nozzleId)
          .lt("sale_date", saleDate)
          .eq("status", "active")
          .order("sale_date", { ascending: false })
          .limit(1)
          .single()

        return {
          nozzle_id: nozzleId,
          close_reading: record ? Number(record.close_reading) : null,
        }
      })
    )

    return { success: true, readings }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch previous readings",
    }
  }
}

// Get existing sale records for a date (for edit mode)
export type GetExistingRecordsResult =
  | { success: true; records: ExistingSaleRecord[] }
  | { success: false; error: string }

export async function getExistingSaleRecords(
  stationId: string,
  saleDate: string
): Promise<GetExistingRecordsResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
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

    // Get existing records for the date
    const { data: records, error: recordsError } = await supabase
      .from("daily_sale_records")
      .select(`
        sale_record_id,
        nozzle_id,
        pump_id,
        fuel_price,
        opening_reading,
        close_reading,
        testing_qty,
        total_liters,
        total_amount,
        cash_sales,
        upi_sales,
        card_sales,
        credit_sales
      `)
      .eq("station_id", stationId)
      .eq("sale_date", saleDate)
      .eq("status", "active")

    if (recordsError) {
      return { success: false, error: recordsError.message }
    }

    const formattedRecords: ExistingSaleRecord[] = (records || []).map((r) => ({
      sale_record_id: r.sale_record_id,
      nozzle_id: r.nozzle_id,
      pump_id: r.pump_id,
      fuel_price: Number(r.fuel_price),
      opening_reading: Number(r.opening_reading),
      close_reading: Number(r.close_reading),
      testing_qty: Number(r.testing_qty),
      total_liters: Number(r.total_liters),
      total_amount: Number(r.total_amount),
      cash_sales: Number(r.cash_sales),
      upi_sales: Number(r.upi_sales),
      card_sales: Number(r.card_sales),
      credit_sales: Number(r.credit_sales),
    }))

    return { success: true, records: formattedRecords }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch existing records",
    }
  }
}

// Save daily sale records (bulk upsert)
export type SaveRecordsResult =
  | { success: true; savedCount: number }
  | { success: false; error: string }

export async function saveDailySaleRecords(
  stationId: string,
  employeeId: string,
  saleDate: string,
  records: SaleRecordInput[]
): Promise<SaveRecordsResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found. Please complete onboarding first." }
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

    // Filter records that have data (close_reading > 0)
    const validRecords = records.filter((r) => r.close_reading > 0)

    if (validRecords.length === 0) {
      return { success: false, error: "No valid records to save. Please enter close readings." }
    }

    // Validate records
    for (const record of validRecords) {
      if (record.close_reading < record.opening_reading) {
        return { success: false, error: `Close reading must be greater than or equal to opening reading` }
      }
      if (record.fuel_price <= 0) {
        return { success: false, error: "Fuel price must be greater than 0" }
      }
      const testingQty = record.testing_qty || 0
      if (testingQty < 0) {
        return { success: false, error: "Testing quantity cannot be negative" }
      }
      if (testingQty > record.close_reading - record.opening_reading) {
        return { success: false, error: "Testing quantity cannot exceed the reading difference" }
      }
      if (record.cash_sales < 0 || record.upi_sales < 0 || record.card_sales < 0 || record.credit_sales < 0) {
        return { success: false, error: "Payment amounts cannot be negative" }
      }
    }

    // Prepare records for upsert with computed fields
    const recordsToUpsert: DailySaleRecordInsert[] = validRecords.map((r) => {
      const testingQty = r.testing_qty || 0
      const totalLiters = r.close_reading - r.opening_reading - testingQty
      return {
        station_id: stationId,
        pump_id: r.pump_id,
        nozzle_id: r.nozzle_id,
        employee_id: employeeId,
        sale_date: saleDate,
        fuel_price: r.fuel_price,
        opening_reading: r.opening_reading,
        close_reading: r.close_reading,
        testing_qty: testingQty,
        total_liters: totalLiters,
        total_amount: totalLiters * r.fuel_price,
        cash_sales: r.cash_sales,
        upi_sales: r.upi_sales,
        card_sales: r.card_sales,
        credit_sales: r.credit_sales,
      }
    })

    // Perform upsert (on conflict: nozzle_id, sale_date)
    const { error: upsertError } = await supabase
      .from("daily_sale_records")
      .upsert(recordsToUpsert, {
        onConflict: "nozzle_id,sale_date",
        ignoreDuplicates: false,
      })

    if (upsertError) {
      return { success: false, error: upsertError.message }
    }

    // After saving sale records, create credit transactions for records with credit_customer_id
    const creditRecords = validRecords.filter((r) => r.credit_sales > 0 && r.credit_customer_id)

    if (creditRecords.length > 0) {
      // Get the inserted sale_record_ids for linking
      const { data: savedRecords } = await supabase
        .from("daily_sale_records")
        .select("sale_record_id, nozzle_id")
        .eq("station_id", stationId)
        .eq("sale_date", saleDate)
        .eq("status", "active")

      const saleRecordMap = new Map<string, string>()
      if (savedRecords) {
        savedRecords.forEach((r) => saleRecordMap.set(r.nozzle_id, r.sale_record_id))
      }

      // Get fuel type info for each nozzle
      const nozzleIds = creditRecords.map((r) => r.nozzle_id)
      const { data: nozzleData } = await supabase
        .from("nozzles")
        .select("nozzle_id, fueltype_id")
        .in("nozzle_id", nozzleIds)

      const nozzleFuelTypeMap = new Map<string, string>()
      if (nozzleData) {
        nozzleData.forEach((n) => nozzleFuelTypeMap.set(n.nozzle_id, n.fueltype_id))
      }

      // Create credit transactions
      for (const record of creditRecords) {
        const saleRecordId = saleRecordMap.get(record.nozzle_id)
        const fuelTypeId = nozzleFuelTypeMap.get(record.nozzle_id)

        if (fuelTypeId && record.credit_customer_id) {
          // Calculate fuel quantity from credit_sales amount and fuel_price
          const fuelQuantity = record.fuel_price > 0 ? record.credit_sales / record.fuel_price : 0

          await supabase.from("credit_transactions").insert({
            credit_customer_id: record.credit_customer_id,
            station_id: stationId,
            sale_record_id: saleRecordId || null,
            vehicle_id: record.vehicle_id || null,
            fueltype_id: fuelTypeId,
            employee_id: employeeId,
            transaction_date: saleDate,
            fuel_quantity: fuelQuantity,
            unit_price: record.fuel_price,
            notes: `Auto-created from DSR - ${saleDate}`,
          })
        }
      }
    }

    // Invalidate stock view cache (tank stock changed via DB trigger)
    await invalidateStock()

    return { success: true, savedCount: validRecords.length }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save sale records",
    }
  }
}

// Get credit customers for a station (for DSR dropdown)
export type GetCreditCustomersForDSRResult =
  | { success: true; customers: CreditCustomerForDSR[] }
  | { success: false; error: string }

export async function getCreditCustomersForDSR(
  stationId: string
): Promise<GetCreditCustomersForDSRResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
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

    // Get credit customers for the station
    const { data: customers, error: customersError } = await supabase
      .from("credit_customers")
      .select("credit_customer_id, customer_name, current_balance")
      .eq("station_id", stationId)
      .eq("status", "active")
      .order("customer_name")

    if (customersError) {
      return { success: false, error: customersError.message }
    }

    const formattedCustomers: CreditCustomerForDSR[] = (customers || []).map((c) => ({
      credit_customer_id: c.credit_customer_id,
      customer_name: c.customer_name,
      current_balance: Number(c.current_balance),
    }))

    return { success: true, customers: formattedCustomers }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch credit customers",
    }
  }
}

// === Daily Entry Page Types & Actions ===

export interface CreditEntryInput {
  credit_customer_id: string
  vehicle_id?: string | null
  entry_type: "qty" | "amt"
  fuel_quantity: number
  credit_amount: number
}

export interface DailyEntryRecordInput {
  nozzle_id: string
  pump_id: string
  fuel_price: number
  opening_reading: number
  close_reading: number
  testing_qty?: number
  upi_sales: number
  card_sales: number
  credit_entries: CreditEntryInput[]
}

// Save daily entry records with multiple credit entries per nozzle
export type SaveDailyEntryResult =
  | { success: true; savedCount: number }
  | { success: false; error: string }

export async function saveDailyEntryRecords(
  stationId: string,
  employeeId: string,
  saleDate: string,
  records: DailyEntryRecordInput[]
): Promise<SaveDailyEntryResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found. Please complete onboarding first." }
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

    // Filter records that have data (close_reading > 0)
    const validRecords = records.filter((r) => r.close_reading > 0)

    if (validRecords.length === 0) {
      return { success: false, error: "No valid records to save. Please enter close readings." }
    }

    // Validate records
    for (const record of validRecords) {
      if (record.close_reading < record.opening_reading) {
        return { success: false, error: "Close reading must be greater than or equal to opening reading" }
      }
      if (record.fuel_price <= 0) {
        return { success: false, error: "Fuel price must be greater than 0" }
      }
      const testingQty = record.testing_qty || 0
      if (testingQty < 0) {
        return { success: false, error: "Testing quantity cannot be negative" }
      }
      if (testingQty > record.close_reading - record.opening_reading) {
        return { success: false, error: "Testing quantity cannot exceed the reading difference" }
      }
      if (record.upi_sales < 0 || record.card_sales < 0) {
        return { success: false, error: "Payment amounts cannot be negative" }
      }
      // Validate credit entries
      for (const ce of record.credit_entries) {
        if (!ce.credit_customer_id) {
          return { success: false, error: "Each credit entry must have a customer selected" }
        }
        if (ce.fuel_quantity <= 0 && ce.credit_amount <= 0) {
          return { success: false, error: "Credit entry must have quantity or amount > 0" }
        }
      }
    }

    // Prepare records for upsert
    const recordsToUpsert: DailySaleRecordInsert[] = validRecords.map((r) => {
      const testingQty = r.testing_qty || 0
      const totalLiters = r.close_reading - r.opening_reading - testingQty
      const totalAmount = totalLiters * r.fuel_price
      const creditSales = r.credit_entries.reduce((sum, ce) => sum + ce.credit_amount, 0)
      const cashSales = Math.max(0, totalAmount - r.upi_sales - r.card_sales - creditSales)

      return {
        station_id: stationId,
        pump_id: r.pump_id,
        nozzle_id: r.nozzle_id,
        employee_id: employeeId,
        sale_date: saleDate,
        fuel_price: r.fuel_price,
        opening_reading: r.opening_reading,
        close_reading: r.close_reading,
        testing_qty: testingQty,
        total_liters: totalLiters,
        total_amount: totalAmount,
        cash_sales: cashSales,
        upi_sales: r.upi_sales,
        card_sales: r.card_sales,
        credit_sales: creditSales,
      }
    })

    // Upsert sale records
    const { error: upsertError } = await supabase
      .from("daily_sale_records")
      .upsert(recordsToUpsert, {
        onConflict: "nozzle_id,sale_date",
        ignoreDuplicates: false,
      })

    if (upsertError) {
      return { success: false, error: upsertError.message }
    }

    // Handle credit transactions
    // First, get saved sale_record_ids
    const { data: savedRecords } = await supabase
      .from("daily_sale_records")
      .select("sale_record_id, nozzle_id")
      .eq("station_id", stationId)
      .eq("sale_date", saleDate)
      .eq("status", "active")

    const saleRecordMap = new Map<string, string>()
    if (savedRecords) {
      savedRecords.forEach((r) => saleRecordMap.set(r.nozzle_id, r.sale_record_id))
    }

    // Get fuel type info for each nozzle
    const nozzleIds = validRecords.map((r) => r.nozzle_id)
    const { data: nozzleData } = await supabase
      .from("nozzles")
      .select("nozzle_id, fueltype_id")
      .in("nozzle_id", nozzleIds)

    const nozzleFuelTypeMap = new Map<string, string>()
    if (nozzleData) {
      nozzleData.forEach((n) => nozzleFuelTypeMap.set(n.nozzle_id, n.fueltype_id))
    }

    // Delete old auto-created credit transactions from Daily Entry
    const saleRecordIds = nozzleIds
      .map((nid) => saleRecordMap.get(nid))
      .filter((id): id is string => !!id)

    if (saleRecordIds.length > 0) {
      await supabase
        .from("credit_transactions")
        .delete()
        .in("sale_record_id", saleRecordIds)
        .like("notes", "Auto-created from Daily Entry%")
    }

    // Insert new credit transactions
    for (const record of validRecords) {
      const saleRecordId = saleRecordMap.get(record.nozzle_id)
      const fuelTypeId = nozzleFuelTypeMap.get(record.nozzle_id)

      if (!fuelTypeId) continue

      for (const ce of record.credit_entries) {
        if (!ce.credit_customer_id || (ce.fuel_quantity <= 0 && ce.credit_amount <= 0)) continue

        await supabase.from("credit_transactions").insert({
          credit_customer_id: ce.credit_customer_id,
          station_id: stationId,
          sale_record_id: saleRecordId || null,
          vehicle_id: ce.vehicle_id || null,
          fueltype_id: fuelTypeId,
          employee_id: employeeId,
          transaction_date: saleDate,
          fuel_quantity: ce.fuel_quantity,
          unit_price: record.fuel_price,
          notes: `Auto-created from Daily Entry - ${saleDate}`,
        })
      }
    }

    // Invalidate caches
    await invalidateStock()
    await invalidateDailyEntry()
    await invalidateCreditCustomers()

    return { success: true, savedCount: validRecords.length }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save daily entry records",
    }
  }
}

// Get existing credit entries for Daily Entry edit mode
export interface ExistingCreditEntry {
  transaction_id: string
  nozzle_id: string
  credit_customer_id: string
  customer_name: string
  vehicle_id: string | null
  vehicle_number: string | null
  fuel_quantity: number
  credit_amount: number
}

export type GetExistingCreditEntriesResult =
  | { success: true; entries: ExistingCreditEntry[] }
  | { success: false; error: string }

export async function getExistingCreditEntriesForDSR(
  stationId: string,
  saleDate: string
): Promise<GetExistingCreditEntriesResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
    }

    // Verify station
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", stationId)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Get sale records for the date to find nozzle mapping
    const { data: saleRecords, error: recordsError } = await supabase
      .from("daily_sale_records")
      .select("sale_record_id, nozzle_id")
      .eq("station_id", stationId)
      .eq("sale_date", saleDate)
      .eq("status", "active")

    if (recordsError || !saleRecords || saleRecords.length === 0) {
      return { success: true, entries: [] }
    }

    const saleRecordIds = saleRecords.map((r) => r.sale_record_id)
    const recordNozzleMap = new Map<string, string>()
    saleRecords.forEach((r) => recordNozzleMap.set(r.sale_record_id, r.nozzle_id))

    // Get credit transactions linked to these sale records (auto-created from Daily Entry)
    const { data: transactions, error: txError } = await supabase
      .from("credit_transactions")
      .select(`
        transaction_id,
        sale_record_id,
        credit_customer_id,
        vehicle_id,
        fuel_quantity,
        gross_amount,
        credit_customers (
          customer_name
        ),
        credit_customer_vehicles (
          vehicle_number
        )
      `)
      .in("sale_record_id", saleRecordIds)
      .like("notes", "Auto-created from Daily Entry%")

    if (txError) {
      return { success: false, error: txError.message }
    }

    const entries: ExistingCreditEntry[] = (transactions || []).map((t) => {
      const customer = t.credit_customers as unknown as { customer_name: string } | null
      const vehicle = t.credit_customer_vehicles as unknown as { vehicle_number: string } | null
      const nozzleId = recordNozzleMap.get(t.sale_record_id!) || ""

      return {
        transaction_id: t.transaction_id,
        nozzle_id: nozzleId,
        credit_customer_id: t.credit_customer_id,
        customer_name: customer?.customer_name || "Unknown",
        vehicle_id: t.vehicle_id,
        vehicle_number: vehicle?.vehicle_number || null,
        fuel_quantity: Number(t.fuel_quantity),
        credit_amount: Number(t.gross_amount),
      }
    })

    return { success: true, entries }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch credit entries",
    }
  }
}

// Get vehicles for a credit customer (for DSR dropdown)
export type GetVehiclesForDSRResult =
  | { success: true; vehicles: VehicleForDSR[] }
  | { success: false; error: string }

export async function getVehiclesForDSR(
  customerId: string
): Promise<GetVehiclesForDSRResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    // Get vehicles for the customer
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("credit_customer_vehicles")
      .select("vehicle_id, vehicle_number")
      .eq("credit_customer_id", customerId)
      .eq("status", "active")
      .order("vehicle_number")

    if (vehiclesError) {
      return { success: false, error: vehiclesError.message }
    }

    return { success: true, vehicles: vehicles || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch vehicles",
    }
  }
}
