"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import type { StationExpenseInsert, ExpenseCategory, ExpensePaymentMethod } from "@/types/database"

// Re-export types for use in components
export type { ExpenseCategory, ExpensePaymentMethod } from "@/types/database"

// Types for expense data
export interface StationForExpenses {
  station_id: string
  station_name: string
}

export interface StationEmployeeForExpenses {
  employee_id: string
  employee_name: string
  employee_role: string
}

export interface ExpenseLineItem {
  category: ExpenseCategory
  amount: number
  payment_method: ExpensePaymentMethod
  vendor_name?: string
  description?: string
}

export interface ExpenseHistoryItem {
  expense_id: string
  expense_date: string
  category: ExpenseCategory
  amount: number
  payment_method: ExpensePaymentMethod
  vendor_name: string | null
  description: string | null
  approved_by_name: string
  station_name: string
  station_id: string
  approved_by: string
  created_at: string
}

// ─── Get Stations ────────────────────────────────────────────

export type GetStationsForExpensesResult =
  | { success: true; stations: StationForExpenses[] }
  | { success: false; error: string }

export async function getStationsForExpenses(): Promise<GetStationsForExpensesResult> {
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

export type GetStationEmployeesForExpensesResult =
  | { success: true; employees: StationEmployeeForExpenses[] }
  | { success: false; error: string }

export async function getStationEmployeesForExpenses(
  stationId: string
): Promise<GetStationEmployeesForExpensesResult> {
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

// ─── Save Expenses ──────────────────────────────────────────

export type SaveExpensesResult =
  | { success: true; savedCount: number }
  | { success: false; error: string }

export async function saveExpenses(
  stationId: string,
  approvedBy: string,
  expenseDate: string,
  items: ExpenseLineItem[]
): Promise<SaveExpensesResult> {
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
      .eq("employee_id", approvedBy)
      .eq("station_id", stationId)
      .eq("status", "active")
      .single()

    if (employeeError || !employee) {
      return { success: false, error: "Employee not found or does not belong to station" }
    }

    if (items.length === 0) {
      return { success: false, error: "No items to save" }
    }

    // Validate each item
    for (const item of items) {
      if (item.amount <= 0) {
        return { success: false, error: "Amount must be greater than 0" }
      }
    }

    // Prepare records for insert
    const recordsToInsert: StationExpenseInsert[] = items.map((item) => ({
      station_id: stationId,
      approved_by: approvedBy,
      expense_date: expenseDate,
      category: item.category,
      amount: item.amount,
      payment_method: item.payment_method,
      vendor_name: item.vendor_name || null,
      description: item.description || null,
    }))

    const { error: insertError } = await supabase
      .from("station_expenses")
      .insert(recordsToInsert)

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    return { success: true, savedCount: items.length }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save expenses",
    }
  }
}

// ─── Get Expense History ────────────────────────────────────

export type GetExpenseHistoryResult =
  | { success: true; history: ExpenseHistoryItem[] }
  | { success: false; error: string }

export async function getExpenseHistory(): Promise<GetExpenseHistoryResult> {
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

    const { data, error } = await supabase
      .from("station_expenses")
      .select(`
        expense_id,
        expense_date,
        category,
        amount,
        payment_method,
        vendor_name,
        description,
        station_id,
        approved_by,
        created_at,
        employees (
          employee_name
        ),
        stations (
          station_name
        )
      `)
      .in("station_id", clientStationIds)
      .eq("status", "active")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return { success: false, error: error.message }
    }

    const history: ExpenseHistoryItem[] = (data || []).map((r) => {
      const emp = r.employees as unknown as { employee_name: string } | null
      const stn = r.stations as unknown as { station_name: string } | null

      return {
        expense_id: r.expense_id,
        expense_date: r.expense_date,
        category: r.category as ExpenseCategory,
        amount: Number(r.amount),
        payment_method: r.payment_method as ExpensePaymentMethod,
        vendor_name: r.vendor_name,
        description: r.description,
        approved_by_name: emp?.employee_name || "Unknown",
        station_name: stn?.station_name || "Unknown",
        station_id: r.station_id,
        approved_by: r.approved_by,
        created_at: r.created_at,
      }
    })

    return { success: true, history }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch expense history",
    }
  }
}

// ─── Update Expense ─────────────────────────────────────────

export type UpdateExpenseResult =
  | { success: true }
  | { success: false; error: string }

export async function updateExpense(
  expenseId: string,
  updates: {
    category?: ExpenseCategory
    amount?: number
    payment_method?: ExpensePaymentMethod
    vendor_name?: string | null
    description?: string | null
    approved_by?: string
    expense_date?: string
  }
): Promise<UpdateExpenseResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Get the expense to verify ownership chain
    const { data: expense, error: fetchError } = await supabase
      .from("station_expenses")
      .select("expense_id, station_id")
      .eq("expense_id", expenseId)
      .single()

    if (fetchError || !expense) {
      return { success: false, error: "Expense record not found" }
    }

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", expense.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Access denied" }
    }

    // Validate amount if provided
    if (updates.amount !== undefined && updates.amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" }
    }

    // If updating approved_by, verify employee belongs to station
    if (updates.approved_by) {
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("employee_id")
        .eq("employee_id", updates.approved_by)
        .eq("station_id", expense.station_id)
        .eq("status", "active")
        .single()

      if (employeeError || !employee) {
        return { success: false, error: "Employee not found or does not belong to station" }
      }
    }

    const { error: updateError } = await supabase
      .from("station_expenses")
      .update(updates)
      .eq("expense_id", expenseId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update expense",
    }
  }
}

// ─── Delete Expense ─────────────────────────────────────────

export type DeleteExpenseResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteExpense(
  expenseId: string
): Promise<DeleteExpenseResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Get the expense to verify ownership chain
    const { data: expense, error: fetchError } = await supabase
      .from("station_expenses")
      .select("expense_id, station_id")
      .eq("expense_id", expenseId)
      .single()

    if (fetchError || !expense) {
      return { success: false, error: "Expense record not found" }
    }

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", expense.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Access denied" }
    }

    const { error: deleteError } = await supabase
      .from("station_expenses")
      .delete()
      .eq("expense_id", expenseId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete expense",
    }
  }
}
