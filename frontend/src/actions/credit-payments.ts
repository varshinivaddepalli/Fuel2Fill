"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import type {
  CreditPayment,
  CreditPaymentInsert,
  PaymentMode,
} from "@/types/database"

// Types for credit payment data with related info
export interface CreditPaymentWithDetails extends CreditPayment {
  station_name: string
  customer_name: string
  employee_name: string
}

export interface CustomerWithBalance {
  credit_customer_id: string
  customer_name: string
  station_id: string
  station_name: string
  current_balance: number
  phone: string
}

export interface EmployeeForPayment {
  employee_id: string
  employee_name: string
  employee_role: string
}

export interface PaymentFilters {
  station_id?: string
  customer_id?: string
  start_date?: string
  end_date?: string
  payment_mode?: PaymentMode
}

// Get all credit payments for client's stations
export type GetPaymentsResult =
  | { success: true; payments: CreditPaymentWithDetails[] }
  | { success: false; error: string }

export async function getClientCreditPayments(
  filters?: PaymentFilters
): Promise<GetPaymentsResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return { success: true, payments: [] }
    }

    const stationIds = stations.map((s) => s.station_id)
    const stationMap = new Map(stations.map((s) => [s.station_id, s.station_name]))

    const supabase = await createClient()

    // Build query for credit payments
    let query = supabase
      .from("credit_payments")
      .select(`
        *,
        credit_customers (
          customer_name
        ),
        employees (
          employee_name
        )
      `)
      .in("station_id", stationIds)
      .eq("status", "active")
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })

    // Apply filters
    if (filters?.station_id) {
      query = query.eq("station_id", filters.station_id)
    }
    if (filters?.customer_id) {
      query = query.eq("credit_customer_id", filters.customer_id)
    }
    if (filters?.start_date) {
      query = query.gte("payment_date", filters.start_date)
    }
    if (filters?.end_date) {
      query = query.lte("payment_date", filters.end_date)
    }
    if (filters?.payment_mode) {
      query = query.eq("payment_mode", filters.payment_mode)
    }

    const { data: payments, error: paymentsError } = await query

    if (paymentsError) {
      return { success: false, error: paymentsError.message }
    }

    const paymentsWithDetails: CreditPaymentWithDetails[] = (payments || []).map((p) => {
      const customer = p.credit_customers as unknown as { customer_name: string } | null
      const employee = p.employees as unknown as { employee_name: string } | null

      return {
        payment_id: p.payment_id,
        credit_customer_id: p.credit_customer_id,
        station_id: p.station_id,
        transaction_id: p.transaction_id,
        employee_id: p.employee_id,
        payment_date: p.payment_date,
        payment_amount: Number(p.payment_amount),
        payment_mode: p.payment_mode,
        reference_number: p.reference_number,
        balance_before: Number(p.balance_before),
        balance_after: Number(p.balance_after),
        notes: p.notes,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        station_name: stationMap.get(p.station_id) || "Unknown",
        customer_name: customer?.customer_name || "Unknown",
        employee_name: employee?.employee_name || "Unknown",
      }
    })

    return { success: true, payments: paymentsWithDetails }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch credit payments",
    }
  }
}

// Get customers with outstanding balance for payment
export type GetCustomersWithBalanceResult =
  | { success: true; customers: CustomerWithBalance[] }
  | { success: false; error: string }

export async function getCustomersWithBalance(
  stationId?: string
): Promise<GetCustomersWithBalanceResult> {
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

    // Get credit customers - we allow all customers for payment, not just those with positive balance
    // since a customer might overpay or make advance payments
    const { data: customers, error: customersError } = await supabase
      .from("credit_customers")
      .select("credit_customer_id, customer_name, station_id, current_balance, phone")
      .in("station_id", stationIds)
      .eq("status", "active")
      .order("customer_name")

    if (customersError) {
      return { success: false, error: customersError.message }
    }

    const customersWithBalance: CustomerWithBalance[] = (customers || []).map((c) => ({
      credit_customer_id: c.credit_customer_id,
      customer_name: c.customer_name,
      station_id: c.station_id,
      station_name: stationMap.get(c.station_id) || "Unknown",
      current_balance: Number(c.current_balance),
      phone: c.phone,
    }))

    return { success: true, customers: customersWithBalance }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch customers",
    }
  }
}

// Get employees for payment (who received the payment)
export type GetEmployeesForPaymentResult =
  | { success: true; employees: EmployeeForPayment[] }
  | { success: false; error: string }

export async function getEmployeesForPayment(
  stationId: string
): Promise<GetEmployeesForPaymentResult> {
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

// Add a new credit payment
export interface AddCreditPaymentData {
  credit_customer_id: string
  transaction_id?: string | null
  employee_id: string
  payment_date: string
  payment_amount: number
  payment_mode: PaymentMode
  reference_number?: string | null
  notes?: string | null
}

export type AddCreditPaymentResult =
  | { success: true; payment_id: string }
  | { success: false; error: string }

export async function addCreditPayment(
  data: AddCreditPaymentData
): Promise<AddCreditPaymentResult> {
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
      return { success: false, error: "You don't have permission to add payments for this customer" }
    }

    // Validate payment amount
    if (data.payment_amount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0" }
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

    const paymentData: CreditPaymentInsert = {
      credit_customer_id: data.credit_customer_id,
      station_id: customer.station_id,
      transaction_id: data.transaction_id || null,
      employee_id: data.employee_id,
      payment_date: data.payment_date,
      payment_amount: data.payment_amount,
      payment_mode: data.payment_mode,
      reference_number: data.reference_number || null,
      notes: data.notes || null,
    }

    const { data: insertedPayment, error: insertError } = await supabase
      .from("credit_payments")
      .insert(paymentData)
      .select("payment_id")
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    return { success: true, payment_id: insertedPayment.payment_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add credit payment",
    }
  }
}

// Delete (soft delete) a credit payment
export type DeleteCreditPaymentResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteCreditPayment(
  paymentId: string
): Promise<DeleteCreditPaymentResult> {
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

    // Verify payment exists and belongs to client's station
    const { data: payment, error: paymentError } = await supabase
      .from("credit_payments")
      .select(`
        payment_id,
        stations!inner (
          client_id
        )
      `)
      .eq("payment_id", paymentId)
      .single()

    if (paymentError || !payment) {
      return { success: false, error: "Payment not found" }
    }

    const station = payment.stations as unknown as { client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to delete this payment" }
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from("credit_payments")
      .update({ status: "deleted" })
      .eq("payment_id", paymentId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete payment",
    }
  }
}

// Get unique stations from payments (for filter dropdown)
export interface StationForFilter {
  station_id: string
  station_name: string
}

export type GetStationsForFilterResult =
  | { success: true; stations: StationForFilter[] }
  | { success: false; error: string }

export async function getStationsForPaymentFilter(): Promise<GetStationsForFilterResult> {
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

// Get payment summary statistics
export interface PaymentSummary {
  total_payments: number
  total_amount: number
  by_mode: {
    cash: number
    upi: number
    card: number
    cheque: number
    bank_transfer: number
  }
}

export type GetPaymentSummaryResult =
  | { success: true; summary: PaymentSummary }
  | { success: false; error: string }

export async function getPaymentSummary(
  filters?: PaymentFilters
): Promise<GetPaymentSummaryResult> {
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
      .select("station_id")
      .eq("client_id", client.client_id)
      .eq("status", "active")

    if (stationsError) {
      return { success: false, error: stationsError.message }
    }

    if (!stations || stations.length === 0) {
      return {
        success: true,
        summary: {
          total_payments: 0,
          total_amount: 0,
          by_mode: { cash: 0, upi: 0, card: 0, cheque: 0, bank_transfer: 0 },
        },
      }
    }

    const stationIds = filters?.station_id
      ? [filters.station_id]
      : stations.map((s) => s.station_id)

    // Build query
    let query = supabase
      .from("credit_payments")
      .select("payment_amount, payment_mode")
      .in("station_id", stationIds)
      .eq("status", "active")

    if (filters?.customer_id) {
      query = query.eq("credit_customer_id", filters.customer_id)
    }
    if (filters?.start_date) {
      query = query.gte("payment_date", filters.start_date)
    }
    if (filters?.end_date) {
      query = query.lte("payment_date", filters.end_date)
    }
    if (filters?.payment_mode) {
      query = query.eq("payment_mode", filters.payment_mode)
    }

    const { data: payments, error: paymentsError } = await query

    if (paymentsError) {
      return { success: false, error: paymentsError.message }
    }

    const summary: PaymentSummary = {
      total_payments: payments?.length || 0,
      total_amount: 0,
      by_mode: { cash: 0, upi: 0, card: 0, cheque: 0, bank_transfer: 0 },
    }

    for (const p of payments || []) {
      const amount = Number(p.payment_amount)
      summary.total_amount += amount
      summary.by_mode[p.payment_mode as keyof typeof summary.by_mode] += amount
    }

    return { success: true, summary }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payment summary",
    }
  }
}
