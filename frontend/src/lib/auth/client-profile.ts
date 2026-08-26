import { createClient } from "@/lib/supabase/server"
import type { Client } from "@/types/database"

export async function getClientByEmail(email: string): Promise<Client | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("client_email", email)
      .single()

    if (error || !data) {
      return null
    }
    return data as Client
  } catch {
    return null
  }
}

export async function clientExistsByEmail(email: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("clients")
      .select("client_id")
      .eq("client_email", email)
      .single()

    return !error && !!data
  } catch {
    return false
  }
}
