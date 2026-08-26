"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import type { Client, ClientInsert } from "@/types/database"

export async function getClientProfile(): Promise<{
  success: boolean
  data?: Client
  error?: string
}> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or profile not found" }
    }

    return { success: true, data: client }
  } catch (error) {
    console.error("Error fetching client profile:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateClientProfile(
  updates: Partial<Omit<ClientInsert, "client_email">>
): Promise<{
  success: boolean
  data?: Client
  error?: string
}> {
  try {
    // Use cached auth context for faster auth resolution
    const { client: existingClient } = await getAuthContext()
    if (!existingClient) {
      return { success: false, error: "Not authenticated or profile not found" }
    }

    const supabase = await createClient()

    // Update the client profile
    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", existingClient.client_id)
      .select()
      .single()

    if (updateError) {
      console.error("Update error:", updateError)
      return { success: false, error: "Failed to update profile" }
    }

    return { success: true, data: updatedClient }
  } catch (error) {
    console.error("Error updating client profile:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
