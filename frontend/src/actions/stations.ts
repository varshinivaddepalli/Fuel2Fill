"use server"

import { getAuthContext, getCachedClientStations } from "@/lib/cache"
import type { Station } from "@/types/database"

export type GetStationsResult =
  | { success: true; stations: Station[] }
  | { success: false; error: string }

export async function getClientStations(): Promise<GetStationsResult> {
  try {
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    // Use cached stations lookup
    const stations = await getCachedClientStations(client.client_id)
    return { success: true, stations }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stations"
    }
  }
}
