"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import type {
  CreditTransaction,
  CreditTransactionInsert,
  CreditLimitType,
  DiscountType,
  PaymentStatusType,
} from "@/types/database"

// Types for credit transaction data with related info
export interface CreditTransactionWithDetails extends CreditTransaction {
  station_name: string
  customer_name: string
  vehicle_number: string | null
  fueltype_name: string
  employee_name: string
}

export interface CustomerForTransaction {
  credit_customer_id: string
  customer_name: string
  station_id: string
  station_name: string
  current_balance: number
  credit_limit_type: CreditLimitType
  credit_limit_value: number
  discount_type: DiscountType | null
  discount_value: number | null
}

export interface VehicleForTransaction {
  vehicle_id: string
  vehicle_number: string
  vehicle_type: string | null
}

export interface FuelTypeForTransaction {
  fueltype_id: string
  fueltype_name: string
  current_price: number
}

export interface EmployeeForTransaction {
  employee_id: string
  employee_name: string
  employee_role: string
}

export interface TransactionFilters {
  station_id?: string
  customer_id?: string
  start_date?: string
  end_date?: string
}

// Get all credit transactions for client's stations
export type GetTransactionsResult =
  | { success: true; transactions: CreditTransactionWithDetails[] }
  | { success: false; error: string }

export async function getClientCreditTransactions(
  filters?: TransactionFilters
): Promise<GetTransactionsResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return { success: true, transactions: [] }
    }

    const stationIds = stations.map((s) => s.station_id)
    const stationMap = new Map(stations.map((s) => [s.station_id, s.station_name]))

    const supabase = await createClient()

    // Build query for credit transactions
    let query = supabase
      .from("credit_transactions")
      .select(`
        *,
        credit_customers (
          customer_name
        ),
        credit_customer_vehicles (
          vehicle_number
        ),
        fuel_types (
          fueltype_name
        ),
        employees (
          employee_name
        )
      `)
      .in("station_id", stationIds)
      .eq("status", "active")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })

    // Apply filters
    if (filters?.station_id) {
      query = query.eq("station_id", filters.station_id)
    }
    if (filters?.customer_id) {
      query = query.eq("credit_customer_id", filters.customer_id)
    }
    if (filters?.start_date) {
      query = query.gte("transaction_date", filters.start_date)
    }
    if (filters?.end_date) {
      query = query.lte("transaction_date", filters.end_date)
    }

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      return { success: false, error: transactionsError.message }
    }

    const transactionsWithDetails: CreditTransactionWithDetails[] = (transactions || []).map((t) => {
      const customer = t.credit_customers as unknown as { customer_name: string } | null
      const vehicle = t.credit_customer_vehicles as unknown as { vehicle_number: string } | null
      const fuelType = t.fuel_types as unknown as { fueltype_name: string } | null
      const employee = t.employees as unknown as { employee_name: string } | null

      return {
        transaction_id: t.transaction_id,
        credit_customer_id: t.credit_customer_id,
        station_id: t.station_id,
        sale_record_id: t.sale_record_id,
        vehicle_id: t.vehicle_id,
        fueltype_id: t.fueltype_id,
        employee_id: t.employee_id,
        transaction_date: t.transaction_date,
        fuel_quantity: Number(t.fuel_quantity),
        unit_price: Number(t.unit_price),
        discount_applied: Number(t.discount_applied),
        gross_amount: Number(t.gross_amount),
        net_amount: Number(t.net_amount),
        running_balance: Number(t.running_balance),
        payment_status: (t.payment_status || "unpaid") as PaymentStatusType,
        amount_paid: Number(t.amount_paid || 0),
        notes: t.notes,
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
        station_name: stationMap.get(t.station_id) || "Unknown",
        customer_name: customer?.customer_name || "Unknown",
        vehicle_number: vehicle?.vehicle_number || null,
        fueltype_name: fuelType?.fueltype_name || "Unknown",
        employee_name: employee?.employee_name || "Unknown",
      }
    })

    return { success: true, transactions: transactionsWithDetails }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch credit transactions",
    }
  }
}

// Get customers for transaction dropdown (with balance and limit info)
export type GetCustomersForTransactionResult =
  | { success: true; customers: CustomerForTransaction[] }
  | { success: false; error: string }

export async function getCustomersForTransaction(
  stationId?: string
): Promise<GetCustomersForTransactionResult> {
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

    // Get client's stations
    const { data: stations, error: stationsError } = await supabase
      .from("stations")
      .select("station_id, station_name")
      .eq("client_id", client.client_id)
      .eq("status", "active")

    if (stationsError) {
      return { success: false, error: stationsError.message }
    }

    if (!stations || stations.length === 0) {
      return { success: true, customers: [] }
    }

    const stationIds = stationId
      ? [stationId]
      : stations.map((s) => s.station_id)
    const stationMap = new Map(stations.map((s) => [s.station_id, s.station_name]))

    // Get credit customers
    const { data: customers, error: customersError } = await supabase
      .from("credit_customers")
      .select("*")
      .in("station_id", stationIds)
      .eq("status", "active")
      .order("customer_name")

    if (customersError) {
      return { success: false, error: customersError.message }
    }

    const customersForTransaction: CustomerForTransaction[] = (customers || []).map((c) => ({
      credit_customer_id: c.credit_customer_id,
      customer_name: c.customer_name,
      station_id: c.station_id,
      station_name: stationMap.get(c.station_id) || "Unknown",
      current_balance: Number(c.current_balance),
      credit_limit_type: c.credit_limit_type,
      credit_limit_value: Number(c.credit_limit_value),
      discount_type: c.discount_type,
      discount_value: c.discount_value !== null ? Number(c.discount_value) : null,
    }))

    return { success: true, customers: customersForTransaction }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch customers",
    }
  }
}

// Get vehicles for a specific customer
export type GetVehiclesForTransactionResult =
  | { success: true; vehicles: VehicleForTransaction[] }
  | { success: false; error: string }

export async function getVehiclesForTransaction(
  customerId: string
): Promise<GetVehiclesForTransactionResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    // Get vehicles for the customer
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("credit_customer_vehicles")
      .select("vehicle_id, vehicle_number, vehicle_type")
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

// Get fuel types for a station with current prices
export type GetFuelTypesForTransactionResult =
  | { success: true; fuelTypes: FuelTypeForTransaction[] }
  | { success: false; error: string }

export async function getFuelTypesForTransaction(
  stationId: string
): Promise<GetFuelTypesForTransactionResult> {
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

    // Get fuel types
    const { data: fuelTypes, error: fuelTypesError } = await supabase
      .from("fuel_types")
      .select("fueltype_id, fueltype_name, fueltype_price")
      .eq("station_id", stationId)
      .eq("status", "active")
      .order("fueltype_name")

    if (fuelTypesError) {
      return { success: false, error: fuelTypesError.message }
    }

    // Also get daily prices if available
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

    const fuelTypesForTransaction: FuelTypeForTransaction[] = (fuelTypes || []).map((ft) => ({
      fueltype_id: ft.fueltype_id,
      fueltype_name: ft.fueltype_name,
      current_price: dailyPriceMap.get(ft.fueltype_id) ?? Number(ft.fueltype_price),
    }))

    return { success: true, fuelTypes: fuelTypesForTransaction }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch fuel types",
    }
  }
}

// Get employees for a station
export type GetEmployeesForTransactionResult =
  | { success: true; employees: EmployeeForTransaction[] }
  | { success: false; error: string }

export async function getEmployeesForTransaction(
  stationId: string
): Promise<GetEmployeesForTransactionResult> {
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

    // Get employees
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

// Add a new credit transaction
export interface AddCreditTransactionData {
  credit_customer_id: string
  vehicle_id?: string | null
  fueltype_id: string
  employee_id: string
  transaction_date: string
  fuel_quantity: number
  unit_price: number
  notes?: string | null
  sale_record_id?: string | null
}

export type AddCreditTransactionResult =
  | { success: true; transaction_id: string }
  | { success: false; error: string }

export async function addCreditTransaction(
  data: AddCreditTransactionData
): Promise<AddCreditTransactionResult> {
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

    // Get customer to verify ownership and get station_id
    const { data: customer, error: customerError } = await supabase
      .from("credit_customers")
      .select(`
        credit_customer_id,
        station_id,
        stations!inner (
          client_id
        )
      `)
      .eq("credit_customer_id", data.credit_customer_id)
      .single()

    if (customerError || !customer) {
      return { success: false, error: "Credit customer not found" }
    }

    const station = customer.stations as unknown as { client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to add transactions for this customer" }
    }

    // Validate fuel quantity
    if (data.fuel_quantity <= 0) {
      return { success: false, error: "Fuel quantity must be greater than 0" }
    }

    // Validate unit price
    if (data.unit_price <= 0) {
      return { success: false, error: "Unit price must be greater than 0" }
    }

    // Verify fuel type belongs to station
    const { data: fuelType, error: fuelTypeError } = await supabase
      .from("fuel_types")
      .select("fueltype_id")
      .eq("fueltype_id", data.fueltype_id)
      .eq("station_id", customer.station_id)
      .eq("status", "active")
      .single()

    if (fuelTypeError || !fuelType) {
      return { success: false, error: "Fuel type not found at this station" }
    }

    // Verify employee belongs to station
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id")
      .eq("employee_id", data.employee_id)
      .eq("station_id", customer.station_id)
      .eq("status", "active")
      .single()

    if (employeeError || !employee) {
      return { success: false, error: "Employee not found at this station" }
    }

    // If vehicle provided, verify it belongs to customer
    if (data.vehicle_id) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from("credit_customer_vehicles")
        .select("vehicle_id")
        .eq("vehicle_id", data.vehicle_id)
        .eq("credit_customer_id", data.credit_customer_id)
        .eq("status", "active")
        .single()

      if (vehicleError || !vehicle) {
        return { success: false, error: "Vehicle not found for this customer" }
      }
    }

    const transactionData: CreditTransactionInsert = {
      credit_customer_id: data.credit_customer_id,
      station_id: customer.station_id,
      sale_record_id: data.sale_record_id || null,
      vehicle_id: data.vehicle_id || null,
      fueltype_id: data.fueltype_id,
      employee_id: data.employee_id,
      transaction_date: data.transaction_date,
      fuel_quantity: data.fuel_quantity,
      unit_price: data.unit_price,
      notes: data.notes || null,
    }

    const { data: insertedTransaction, error: insertError } = await supabase
      .from("credit_transactions")
      .insert(transactionData)
      .select("transaction_id")
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    return { success: true, transaction_id: insertedTransaction.transaction_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add credit transaction",
    }
  }
}

// Delete (soft delete) a credit transaction
export type DeleteCreditTransactionResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteCreditTransaction(
  transactionId: string
): Promise<DeleteCreditTransactionResult> {
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

    // Verify transaction exists and belongs to client's station
    const { data: transaction, error: transactionError } = await supabase
      .from("credit_transactions")
      .select(`
        transaction_id,
        stations!inner (
          client_id
        )
      `)
      .eq("transaction_id", transactionId)
      .single()

    if (transactionError || !transaction) {
      return { success: false, error: "Transaction not found" }
    }

    const station = transaction.stations as unknown as { client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to delete this transaction" }
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from("credit_transactions")
      .update({ status: "deleted" })
      .eq("transaction_id", transactionId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete transaction",
    }
  }
}

// Get unique stations from transactions (for filter dropdown)
export interface StationForFilter {
  station_id: string
  station_name: string
}

export type GetStationsForFilterResult =
  | { success: true; stations: StationForFilter[] }
  | { success: false; error: string }

export async function getStationsForTransactionFilter(): Promise<GetStationsForFilterResult> {
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

    const { data: stations, error: stationsError } = await supabase
      .from("stations")
      .select("station_id, station_name")
      .eq("client_id", client.client_id)
      .eq("status", "active")
      .order("station_name")

    if (stationsError) {
      return { success: false, error: stationsError.message }
    }

    return { success: true, stations: stations || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stations",
    }
  }
}
