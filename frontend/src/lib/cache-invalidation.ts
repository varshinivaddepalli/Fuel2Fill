"use server"

import { revalidatePath } from "next/cache"

/**
 * Cache invalidation using revalidatePath
 *
 * Note: We use revalidatePath instead of revalidateTag because:
 * - React's cache() doesn't support tags (only unstable_cache does)
 * - revalidatePath invalidates the Next.js route cache, triggering re-render
 * - This ensures fresh data is fetched after mutations
 */

/**
 * Invalidate stations-related pages
 */
export async function invalidateStations() {
  revalidatePath("/dashboard", "layout")
  revalidatePath("/registration/add-station")
}

/**
 * Invalidate employees-related pages
 */
export async function invalidateEmployees() {
  revalidatePath("/employee", "layout")
  revalidatePath("/employee/add-employee")
}

/**
 * Invalidate shifts-related pages
 */
export async function invalidateShifts() {
  revalidatePath("/employee/shifts")
}

/**
 * Invalidate attendance-related pages
 */
export async function invalidateAttendance() {
  revalidatePath("/employee/attendance")
}

/**
 * Invalidate fuel prices-related pages
 */
export async function invalidateFuelPrices() {
  revalidatePath("/operations/daily-fuel-price")
}

/**
 * Invalidate credit customers-related pages
 */
export async function invalidateCreditCustomers() {
  revalidatePath("/credit/customers")
}

/**
 * Invalidate product sales-related pages
 */
export async function invalidateProductSales() {
  revalidatePath("/operations/product-sales")
}

/**
 * Invalidate expenses-related pages
 */
export async function invalidateExpenses() {
  revalidatePath("/operations/expenses")
}

/**
 * Invalidate purchases-related pages
 */
export async function invalidatePurchases() {
  revalidatePath("/purchases")
}

/**
 * Invalidate stock-related pages
 */
export async function invalidateStock() {
  revalidatePath("/stock")
}

/**
 * Invalidate daily entry page
 */
export async function invalidateDailyEntry() {
  revalidatePath("/operations/daily-entry")
}

/**
 * Invalidate settlement-related pages
 */
export async function invalidateSettlements() {
  revalidatePath("/operations/settlement")
}

/**
 * Invalidate bank accounts-related pages
 */
export async function invalidateBankAccounts() {
  revalidatePath("/registration/add-bank-account")
}
