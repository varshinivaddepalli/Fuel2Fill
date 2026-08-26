"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import { invalidateCreditCustomers } from "@/lib/cache-invalidation"
import type {
  CreditCustomer,
  CreditCustomerInsert,
  CreditCustomerVehicle,
  CreditCustomerVehicleInsert,
} from "@/types/database"

// Types for credit customer data with related info
export interface CreditCustomerWithStation extends CreditCustomer {
  station_name: string
  vehicles_count: number
}

export interface CreditCustomerWithVehicles extends CreditCustomer {
  station_name: string
  vehicles: CreditCustomerVehicle[]
}

export interface StationForDropdown {
  station_id: string
  station_name: string
}

// Get all credit customers for the client's stations
export type GetCreditCustomersResult =
  | { success: true; customers: CreditCustomerWithStation[] }
  | { success: false; error: string }

export async function getClientCreditCustomers(): Promise<GetCreditCustomersResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)

    if (stations.length === 0) {
      return { success: true, customers: [] }
    }

    const stationIds = stations.map((s) => s.station_id)
    const stationMap = new Map(stations.map((s) => [s.station_id, s.station_name]))

    const supabase = await createClient()

    // OPTIMIZED: Single query with vehicle count using nested select
    // This replaces 3 separate queries (stations, customers, vehicles)
    const { data: customers, error: customersError } = await supabase
      .from("credit_customers")
      .select(`
        credit_customer_id,
        station_id,
        customer_name,
        gst_number,
        phone,
        alt_phone,
        email,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        credit_limit_type,
        credit_limit_value,
        discount_type,
        discount_value,
        current_balance,
        registered_date,
        status,
        created_at,
        updated_at,
        credit_customer_vehicles (
          vehicle_id,
          status
        )
      `)
      .in("station_id", stationIds)
      .eq("status", "active")
      .order("customer_name")

    if (customersError) {
      return { success: false, error: customersError.message }
    }

    if (!customers || customers.length === 0) {
      return { success: true, customers: [] }
    }

    // Transform with vehicle count from nested join (filter active vehicles)
    const customersWithStation: CreditCustomerWithStation[] = customers.map((c) => {
      const vehicles = (c.credit_customer_vehicles || []) as { vehicle_id: string; status: string }[]
      const activeVehiclesCount = vehicles.filter(v => v.status === "active").length

      return {
        credit_customer_id: c.credit_customer_id,
        station_id: c.station_id,
        customer_name: c.customer_name,
        gst_number: c.gst_number,
        phone: c.phone,
        alt_phone: c.alt_phone,
        email: c.email,
        address_line1: c.address_line1,
        address_line2: c.address_line2,
        city: c.city,
        state: c.state,
        pincode: c.pincode,
        credit_limit_type: c.credit_limit_type,
        credit_limit_value: Number(c.credit_limit_value),
        discount_type: c.discount_type,
        discount_value: c.discount_value !== null ? Number(c.discount_value) : null,
        current_balance: Number(c.current_balance),
        registered_date: c.registered_date,
        status: c.status,
        created_at: c.created_at,
        updated_at: c.updated_at,
        station_name: stationMap.get(c.station_id) || "Unknown",
        vehicles_count: activeVehiclesCount,
      }
    })

    return { success: true, customers: customersWithStation }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch credit customers",
    }
  }
}

// Get a single credit customer with vehicles
export type GetCreditCustomerResult =
  | { success: true; customer: CreditCustomerWithVehicles }
  | { success: false; error: string }

export async function getCreditCustomerById(customerId: string): Promise<GetCreditCustomerResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // OPTIMIZED: Single query with vehicles included
    const { data: customer, error: customerError } = await supabase
      .from("credit_customers")
      .select(`
        *,
        stations!inner (
          station_id,
          station_name,
          client_id
        ),
        credit_customer_vehicles (
          vehicle_id,
          credit_customer_id,
          vehicle_number,
          vehicle_type,
          status,
          created_at,
          updated_at
        )
      `)
      .eq("credit_customer_id", customerId)
      .single()

    if (customerError || !customer) {
      return { success: false, error: "Credit customer not found" }
    }

    // Verify customer's station belongs to client
    const station = customer.stations as unknown as { station_id: string; station_name: string; client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to view this customer" }
    }

    // Filter active vehicles from the nested data
    const allVehicles = (customer.credit_customer_vehicles || []) as CreditCustomerVehicle[]
    const activeVehicles = allVehicles.filter(v => v.status === "active")
      .sort((a, b) => a.vehicle_number.localeCompare(b.vehicle_number))

    const customerWithVehicles: CreditCustomerWithVehicles = {
      ...customer,
      credit_limit_value: Number(customer.credit_limit_value),
      discount_value: customer.discount_value !== null ? Number(customer.discount_value) : null,
      current_balance: Number(customer.current_balance),
      station_name: station.station_name,
      vehicles: activeVehicles,
    }

    return { success: true, customer: customerWithVehicles }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch credit customer",
    }
  }
}

// Get client's stations for dropdown
export type GetStationsForDropdownResult =
  | { success: true; stations: StationForDropdown[] }
  | { success: false; error: string }

export async function getStationsForCreditCustomers(): Promise<GetStationsForDropdownResult> {
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
      error: error instanceof Error ? error.message : "Failed to fetch stations",
    }
  }
}

// Add a new credit customer
export interface AddCreditCustomerData {
  station_id: string
  customer_name: string
  gst_number?: string | null
  phone: string
  alt_phone?: string | null
  email?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  credit_limit_type: "amount" | "quantity"
  credit_limit_value: number
  discount_type?: "amount" | "percentage" | null
  discount_value?: number | null
  registered_date?: string
}

export type AddCreditCustomerResult =
  | { success: true; credit_customer_id: string }
  | { success: false; error: string }

export async function addCreditCustomer(data: AddCreditCustomerData): Promise<AddCreditCustomerResult> {
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

    // Validate credit limit
    if (data.credit_limit_value <= 0) {
      return { success: false, error: "Credit limit must be greater than 0" }
    }

    // Validate discount if provided
    if (data.discount_type && data.discount_value !== null && data.discount_value !== undefined) {
      if (data.discount_value < 0) {
        return { success: false, error: "Discount cannot be negative" }
      }
      if (data.discount_type === "percentage" && data.discount_value > 100) {
        return { success: false, error: "Percentage discount cannot exceed 100%" }
      }
    }

    const customerData: CreditCustomerInsert = {
      station_id: data.station_id,
      customer_name: data.customer_name,
      gst_number: data.gst_number || null,
      phone: data.phone,
      alt_phone: data.alt_phone || null,
      email: data.email || null,
      address_line1: data.address_line1 || null,
      address_line2: data.address_line2 || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      credit_limit_type: data.credit_limit_type,
      credit_limit_value: data.credit_limit_value,
      discount_type: data.discount_type || null,
      discount_value: data.discount_value ?? null,
      registered_date: data.registered_date,
    }

    const { data: insertedCustomer, error: insertError } = await supabase
      .from("credit_customers")
      .insert(customerData)
      .select("credit_customer_id")
      .single()

    if (insertError) {
      // Handle unique constraint violation for GST
      if (insertError.code === "23505" && insertError.message.includes("gst")) {
        return { success: false, error: "A customer with this GST number already exists at this station" }
      }
      return { success: false, error: insertError.message }
    }

    // Invalidate credit customers cache
    await invalidateCreditCustomers()

    return { success: true, credit_customer_id: insertedCustomer.credit_customer_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add credit customer",
    }
  }
}

// Update existing credit customer
export interface UpdateCreditCustomerData extends AddCreditCustomerData {
  credit_customer_id: string
}

export type UpdateCreditCustomerResult =
  | { success: true }
  | { success: false; error: string }

export async function updateCreditCustomer(data: UpdateCreditCustomerData): Promise<UpdateCreditCustomerResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify customer exists and belongs to client's station
    const { data: existingCustomer, error: customerError } = await supabase
      .from("credit_customers")
      .select(`
        credit_customer_id,
        stations!inner (
          client_id
        )
      `)
      .eq("credit_customer_id", data.credit_customer_id)
      .single()

    if (customerError || !existingCustomer) {
      return { success: false, error: "Credit customer not found" }
    }

    const station = existingCustomer.stations as unknown as { client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to update this customer" }
    }

    // Validate credit limit
    if (data.credit_limit_value <= 0) {
      return { success: false, error: "Credit limit must be greater than 0" }
    }

    // Validate discount if provided
    if (data.discount_type && data.discount_value !== null && data.discount_value !== undefined) {
      if (data.discount_value < 0) {
        return { success: false, error: "Discount cannot be negative" }
      }
      if (data.discount_type === "percentage" && data.discount_value > 100) {
        return { success: false, error: "Percentage discount cannot exceed 100%" }
      }
    }

    const { error: updateError } = await supabase
      .from("credit_customers")
      .update({
        customer_name: data.customer_name,
        gst_number: data.gst_number || null,
        phone: data.phone,
        alt_phone: data.alt_phone || null,
        email: data.email || null,
        address_line1: data.address_line1 || null,
        address_line2: data.address_line2 || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        credit_limit_type: data.credit_limit_type,
        credit_limit_value: data.credit_limit_value,
        discount_type: data.discount_type || null,
        discount_value: data.discount_value ?? null,
      })
      .eq("credit_customer_id", data.credit_customer_id)

    if (updateError) {
      if (updateError.code === "23505" && updateError.message.includes("gst")) {
        return { success: false, error: "A customer with this GST number already exists at this station" }
      }
      return { success: false, error: updateError.message }
    }

    // Invalidate credit customers cache
    await invalidateCreditCustomers()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update credit customer",
    }
  }
}

// Delete (deactivate) a credit customer
export type DeleteCreditCustomerResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteCreditCustomer(customerId: string): Promise<DeleteCreditCustomerResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify customer exists and belongs to client's station
    const { data: customer, error: customerError } = await supabase
      .from("credit_customers")
      .select(`
        credit_customer_id,
        current_balance,
        stations!inner (
          client_id
        )
      `)
      .eq("credit_customer_id", customerId)
      .single()

    if (customerError || !customer) {
      return { success: false, error: "Credit customer not found" }
    }

    const station = customer.stations as unknown as { client_id: string }
    if (station.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to delete this customer" }
    }

    // Check if customer has outstanding balance
    if (Number(customer.current_balance) > 0) {
      return { success: false, error: "Cannot delete customer with outstanding balance. Please clear the balance first." }
    }

    // Soft delete by setting status to 'deleted'
    const { error: deleteError } = await supabase
      .from("credit_customers")
      .update({ status: "deleted" })
      .eq("credit_customer_id", customerId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    // Invalidate credit customers cache
    await invalidateCreditCustomers()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete credit customer",
    }
  }
}

// Add a vehicle to a credit customer
export interface AddVehicleData {
  credit_customer_id: string
  vehicle_number: string
  vehicle_type?: string | null
}

export type AddVehicleResult =
  | { success: true; vehicle_id: string }
  | { success: false; error: string }

export async function addVehicle(data: AddVehicleData): Promise<AddVehicleResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify customer exists and belongs to client's station
    const { data: customer, error: customerError } = await supabase
      .from("credit_customers")
      .select(`
        credit_customer_id,
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
      return { success: false, error: "You don't have permission to add vehicles to this customer" }
    }

    // Normalize vehicle number (uppercase, remove spaces)
    const normalizedVehicleNumber = data.vehicle_number.toUpperCase().replace(/\s+/g, "")

    const vehicleData: CreditCustomerVehicleInsert = {
      credit_customer_id: data.credit_customer_id,
      vehicle_number: normalizedVehicleNumber,
      vehicle_type: data.vehicle_type || null,
    }

    const { data: insertedVehicle, error: insertError } = await supabase
      .from("credit_customer_vehicles")
      .insert(vehicleData)
      .select("vehicle_id")
      .single()

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === "23505") {
        return { success: false, error: "This vehicle is already registered for this customer" }
      }
      // Handle check constraint violation (vehicle number format)
      if (insertError.code === "23514") {
        return { success: false, error: "Invalid vehicle number format" }
      }
      return { success: false, error: insertError.message }
    }

    // Invalidate credit customers cache
    await invalidateCreditCustomers()

    return { success: true, vehicle_id: insertedVehicle.vehicle_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add vehicle",
    }
  }
}

// Delete a vehicle
export type DeleteVehicleResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteVehicle(vehicleId: string): Promise<DeleteVehicleResult> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    // Verify vehicle exists and belongs to client's customer
    const { data: vehicle, error: vehicleError } = await supabase
      .from("credit_customer_vehicles")
      .select(`
        vehicle_id,
        credit_customers!inner (
          credit_customer_id,
          stations!inner (
            client_id
          )
        )
      `)
      .eq("vehicle_id", vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return { success: false, error: "Vehicle not found" }
    }

    const customer = vehicle.credit_customers as unknown as { stations: { client_id: string } }
    if (customer.stations.client_id !== client.client_id) {
      return { success: false, error: "You don't have permission to delete this vehicle" }
    }

    // Soft delete by setting status to 'deleted'
    const { error: deleteError } = await supabase
      .from("credit_customer_vehicles")
      .update({ status: "deleted" })
      .eq("vehicle_id", vehicleId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    // Invalidate credit customers cache
    await invalidateCreditCustomers()

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete vehicle",
    }
  }
}
