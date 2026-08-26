import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { Client, Station, Employee } from "@/types/database"

/**
 * Get authenticated user from Supabase
 * Uses React's cache() for request-level deduplication
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) {
    return null
  }
  return user
})

/**
 * Get client profile by email
 * Uses React's cache() for request-level deduplication
 * This prevents multiple DB calls for the same email within a single request
 */
export const getClientByEmailCached = cache(async (email: string): Promise<Client | null> => {
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
})

/**
 * Get stations for a client
 * Uses React's cache() for request-level deduplication
 */
export const getCachedClientStations = cache(async (clientId: string): Promise<Station[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stations")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("station_name")

  if (error || !data) {
    return []
  }
  return data as Station[]
})

/**
 * Get employees for multiple stations
 * Uses React's cache() for request-level deduplication
 */
export const getCachedEmployeesByStations = cache(async (stationIds: string[]): Promise<Employee[]> => {
  if (stationIds.length === 0) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .in("station_id", stationIds)
    .eq("status", "active")
    .order("employee_name")

  if (error || !data) {
    return []
  }
  return data as Employee[]
})

/**
 * Helper to get authenticated user and client profile in one call
 * Combines auth check with cached profile lookup
 * Both calls are deduplicated within the same request
 */
export async function getAuthContext(): Promise<{
  user: { email: string; id: string } | null
  client: Client | null
}> {
  const user = await getAuthenticatedUser()
  if (!user?.email) {
    return { user: null, client: null }
  }

  const client = await getClientByEmailCached(user.email)
  return { user: { email: user.email, id: user.id }, client }
}
