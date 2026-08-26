"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import type { SettlementMethod, SettlementInsert } from "@/types/database"

// ─── Types ─────────────────────────────────────────────────

export interface StationForSettlement {
  station_id: string
  station_name: string
}

export interface BankAccountForSettlement {
  bank_account_id: string
  account_name: string
  bank_name: string
  account_number_last4: string
  current_balance: number
}

export interface NetPositionSummary {
  cash: { inflow: number; outflow: number; net: number }
  upi: { inflow: number; outflow: number; net: number }
  card: { inflow: number; outflow: number; net: number }
}

export interface SettlementLineItem {
  from_method: SettlementMethod
  to_method: SettlementMethod
  from_bank_account_id?: string | null
  to_bank_account_id?: string | null
  amount: number
  reference_number?: string
  notes?: string
}

export interface SettlementHistoryItem {
  settlement_id: string
  settlement_date: string
  from_method: SettlementMethod
  to_method: SettlementMethod
  from_bank_name: string | null
  to_bank_name: string | null
  amount: number
  reference_number: string | null
  notes: string | null
  station_name: string
  station_id: string
  created_at: string
}

// ─── Get Stations ──────────────────────────────────────────

export type GetStationsForSettlementResult =
  | { success: true; stations: StationForSettlement[] }
  | { success: false; error: string }

export async function getStationsForSettlement(): Promise<GetStationsForSettlementResult> {
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

// ─── Get Client Bank Accounts ──────────────────────────────

export type GetClientBankAccountsResult =
  | { success: true; accounts: BankAccountForSettlement[] }
  | { success: false; error: string }

export async function getClientBankAccounts(): Promise<GetClientBankAccountsResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    const { data, error } = await supabase
      .from("client_bank_accounts")
      .select("bank_account_id, account_name, bank_name, account_number_last4, current_balance")
      .eq("client_id", client.client_id)
      .eq("status", "active")
      .order("account_name")

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      accounts: (data || []).map((a) => ({
        bank_account_id: a.bank_account_id,
        account_name: a.account_name,
        bank_name: a.bank_name,
        account_number_last4: a.account_number_last4,
        current_balance: Number(a.current_balance),
      })),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch bank accounts",
    }
  }
}

// ─── Get Net Position Summary ──────────────────────────────

export type GetNetPositionSummaryResult =
  | { success: true; summary: NetPositionSummary }
  | { success: false; error: string }

export async function getNetPositionSummary(
  stationId: string,
  date: string
): Promise<GetNetPositionSummaryResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Verify station belongs to client
    const clientStations = await getCachedClientStations(client.client_id)
    const stationIds = clientStations.map((s) => s.station_id)
    if (!stationIds.includes(stationId)) {
      return { success: false, error: "Station not found or access denied" }
    }

    // Run all 6 queries in parallel
    const [
      dailySalesResult,
      productSalesResult,
      creditPaymentsResult,
      expensesResult,
      purchasesResult,
      settlementsResult,
    ] = await Promise.all([
      // 1. daily_sale_records — fuel sales by payment method
      supabase
        .from("daily_sale_records")
        .select("cash_sales, upi_sales, card_sales")
        .eq("station_id", stationId)
        .eq("sale_date", date),

      // 2. product_sale_items — product sales by payment method
      supabase
        .from("product_sale_items")
        .select("amount, payment_method")
        .eq("station_id", stationId)
        .eq("sale_date", date)
        .in("payment_method", ["cash", "upi", "card"]),

      // 3. credit_payments — payments received from credit customers
      supabase
        .from("credit_payments")
        .select("amount, payment_mode")
        .eq("station_id", stationId)
        .eq("payment_date", date)
        .in("payment_mode", ["cash", "upi", "card"]),

      // 4. station_expenses — outflows
      supabase
        .from("station_expenses")
        .select("amount, payment_method")
        .eq("station_id", stationId)
        .eq("expense_date", date)
        .eq("status", "active")
        .in("payment_method", ["cash", "upi", "card"]),

      // 5. purchases — outflows
      supabase
        .from("purchases")
        .select("total_amount, payment_method")
        .eq("station_id", stationId)
        .eq("purchase_date", date)
        .eq("status", "active")
        .in("payment_method", ["cash", "upi"]),

      // 6. settlements — already settled amounts
      supabase
        .from("settlements")
        .select("from_method, to_method, amount")
        .eq("station_id", stationId)
        .eq("settlement_date", date)
        .eq("status", "active"),
    ])

    // Initialize accumulators
    const inflow = { cash: 0, upi: 0, card: 0 }
    const outflow = { cash: 0, upi: 0, card: 0 }

    // 1. Daily sale records (inflow)
    if (dailySalesResult.data) {
      for (const r of dailySalesResult.data) {
        inflow.cash += Number(r.cash_sales) || 0
        inflow.upi += Number(r.upi_sales) || 0
        inflow.card += Number(r.card_sales) || 0
      }
    }

    // 2. Product sales (inflow)
    if (productSalesResult.data) {
      for (const r of productSalesResult.data) {
        const method = r.payment_method as "cash" | "upi" | "card"
        inflow[method] += Number(r.amount) || 0
      }
    }

    // 3. Credit payments (inflow)
    if (creditPaymentsResult.data) {
      for (const r of creditPaymentsResult.data) {
        const mode = r.payment_mode as "cash" | "upi" | "card"
        inflow[mode] += Number(r.amount) || 0
      }
    }

    // 4. Expenses (outflow)
    if (expensesResult.data) {
      for (const r of expensesResult.data) {
        const method = r.payment_method as "cash" | "upi" | "card"
        outflow[method] += Number(r.amount) || 0
      }
    }

    // 5. Purchases (outflow)
    if (purchasesResult.data) {
      for (const r of purchasesResult.data) {
        const method = r.payment_method as "cash" | "upi"
        outflow[method] += Number(r.total_amount) || 0
      }
    }

    // 6. Settlements (from = outflow, to = inflow for that method)
    if (settlementsResult.data) {
      for (const r of settlementsResult.data) {
        const amt = Number(r.amount) || 0
        const from = r.from_method as string
        const to = r.to_method as string
        if (from === "cash" || from === "upi" || from === "card") {
          outflow[from] += amt
        }
        if (to === "cash" || to === "upi" || to === "card") {
          inflow[to] += amt
        }
      }
    }

    return {
      success: true,
      summary: {
        cash: { inflow: inflow.cash, outflow: outflow.cash, net: inflow.cash - outflow.cash },
        upi: { inflow: inflow.upi, outflow: outflow.upi, net: inflow.upi - outflow.upi },
        card: { inflow: inflow.card, outflow: outflow.card, net: inflow.card - outflow.card },
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch net position summary",
    }
  }
}

// ─── Save Settlements ──────────────────────────────────────

export type SaveSettlementsResult =
  | { success: true; savedCount: number }
  | { success: false; error: string }

export async function saveSettlements(
  stationId: string,
  settlementDate: string,
  items: SettlementLineItem[]
): Promise<SaveSettlementsResult> {
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

    if (items.length === 0) {
      return { success: false, error: "No items to save" }
    }

    // Validate each item
    for (const item of items) {
      if (item.amount <= 0) {
        return { success: false, error: "Amount must be greater than 0" }
      }
      if (item.from_method === item.to_method && item.from_method !== "bank") {
        return { success: false, error: "Source and destination cannot be the same" }
      }
      if (item.from_method === "bank" && item.to_method === "bank" && item.from_bank_account_id === item.to_bank_account_id) {
        return { success: false, error: "Source and destination bank accounts must be different" }
      }
      if (item.from_method === "bank" && !item.from_bank_account_id) {
        return { success: false, error: "Source bank account is required when method is bank" }
      }
      if (item.to_method === "bank" && !item.to_bank_account_id) {
        return { success: false, error: "Destination bank account is required when method is bank" }
      }
    }

    // Verify bank accounts belong to client
    const bankAccountIds = new Set<string>()
    for (const item of items) {
      if (item.from_bank_account_id) bankAccountIds.add(item.from_bank_account_id)
      if (item.to_bank_account_id) bankAccountIds.add(item.to_bank_account_id)
    }

    if (bankAccountIds.size > 0) {
      const { data: accounts, error: accountsError } = await supabase
        .from("client_bank_accounts")
        .select("bank_account_id")
        .eq("client_id", client.client_id)
        .in("bank_account_id", Array.from(bankAccountIds))

      if (accountsError) {
        return { success: false, error: accountsError.message }
      }

      const validIds = new Set((accounts || []).map((a) => a.bank_account_id))
      for (const id of bankAccountIds) {
        if (!validIds.has(id)) {
          return { success: false, error: "One or more bank accounts not found or access denied" }
        }
      }
    }

    // Prepare records for insert
    const recordsToInsert: SettlementInsert[] = items.map((item) => ({
      client_id: client.client_id,
      station_id: stationId,
      settlement_date: settlementDate,
      from_method: item.from_method,
      to_method: item.to_method,
      from_bank_account_id: item.from_bank_account_id || null,
      to_bank_account_id: item.to_bank_account_id || null,
      amount: item.amount,
      reference_number: item.reference_number || null,
      notes: item.notes || null,
    }))

    const { error: insertError } = await supabase
      .from("settlements")
      .insert(recordsToInsert)

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    return { success: true, savedCount: items.length }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save settlements",
    }
  }
}

// ─── Get Settlement History ────────────────────────────────

export type GetSettlementHistoryResult =
  | { success: true; history: SettlementHistoryItem[] }
  | { success: false; error: string }

export async function getSettlementHistory(): Promise<GetSettlementHistoryResult> {
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
      .from("settlements")
      .select(`
        settlement_id,
        settlement_date,
        from_method,
        to_method,
        from_bank_account_id,
        to_bank_account_id,
        amount,
        reference_number,
        notes,
        station_id,
        created_at,
        stations (
          station_name
        )
      `)
      .in("station_id", clientStationIds)
      .eq("status", "active")
      .order("settlement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return { success: false, error: error.message }
    }

    // Collect bank account IDs to resolve names
    const bankAccountIds = new Set<string>()
    for (const r of data || []) {
      if (r.from_bank_account_id) bankAccountIds.add(r.from_bank_account_id)
      if (r.to_bank_account_id) bankAccountIds.add(r.to_bank_account_id)
    }

    let bankAccountMap = new Map<string, string>()
    if (bankAccountIds.size > 0) {
      const { data: accounts } = await supabase
        .from("client_bank_accounts")
        .select("bank_account_id, account_name, bank_name, account_number_last4")
        .in("bank_account_id", Array.from(bankAccountIds))

      if (accounts) {
        for (const a of accounts) {
          bankAccountMap.set(
            a.bank_account_id,
            `${a.account_name} (${a.bank_name} ****${a.account_number_last4})`
          )
        }
      }
    }

    const history: SettlementHistoryItem[] = (data || []).map((r) => {
      const stn = r.stations as unknown as { station_name: string } | null

      return {
        settlement_id: r.settlement_id,
        settlement_date: r.settlement_date,
        from_method: r.from_method as SettlementMethod,
        to_method: r.to_method as SettlementMethod,
        from_bank_name: r.from_bank_account_id ? bankAccountMap.get(r.from_bank_account_id) || null : null,
        to_bank_name: r.to_bank_account_id ? bankAccountMap.get(r.to_bank_account_id) || null : null,
        amount: Number(r.amount),
        reference_number: r.reference_number,
        notes: r.notes,
        station_name: stn?.station_name || "Unknown",
        station_id: r.station_id,
        created_at: r.created_at,
      }
    })

    return { success: true, history }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch settlement history",
    }
  }
}

// ─── Delete Settlement ─────────────────────────────────────

export type DeleteSettlementResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteSettlement(
  settlementId: string
): Promise<DeleteSettlementResult> {
  try {
    const supabase = await createClient()
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated" }
    }

    // Get the settlement to verify ownership
    const { data: settlement, error: fetchError } = await supabase
      .from("settlements")
      .select("settlement_id, station_id")
      .eq("settlement_id", settlementId)
      .single()

    if (fetchError || !settlement) {
      return { success: false, error: "Settlement record not found" }
    }

    // Verify station belongs to client
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_id", settlement.station_id)
      .eq("client_id", client.client_id)
      .single()

    if (stationError || !station) {
      return { success: false, error: "Access denied" }
    }

    const { error: deleteError } = await supabase
      .from("settlements")
      .delete()
      .eq("settlement_id", settlementId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete settlement",
    }
  }
}
