"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import { invalidateBankAccounts } from "@/lib/cache-invalidation"
import type { ClientBankAccountInsert } from "@/types/database"

export type AddBankAccountResult =
  | { success: true; bankAccountId: string }
  | { success: false; error: string }

export async function addBankAccount(
  formData: Omit<ClientBankAccountInsert, "client_id">
): Promise<AddBankAccountResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    const bankAccountData: ClientBankAccountInsert = {
      client_id: client.client_id,
      account_type: formData.account_type,
      account_name: formData.account_name.trim(),
      account_holder_name: formData.account_holder_name.trim(),
      account_number_last4: formData.account_number_last4,
      bank_name: formData.bank_name,
      branch: formData.branch?.trim() || null,
      current_balance: formData.current_balance ?? 0,
      company_name: formData.company_name?.trim() || null,
    }

    const { data, error: insertError } = await supabase
      .from("client_bank_accounts")
      .insert(bankAccountData)
      .select("bank_account_id")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        if (insertError.message.includes("uq_client_account_name")) {
          return { success: false, error: "An account with this name already exists" }
        }
      }
      return { success: false, error: insertError.message }
    }

    await invalidateBankAccounts()

    return { success: true, bankAccountId: data.bank_account_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add bank account",
    }
  }
}
