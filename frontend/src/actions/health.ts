"use server";

/**
 * Health Check Server Action
 *
 * Checks if the FastAPI backend is running and responsive.
 * Uses server action to avoid CORS issues with direct browser requests.
 */

const API_URL = process.env.ASK_ASTRA_INTERNAL_URL || process.env.NEXT_PUBLIC_ASK_ASTRA_API_URL || "http://localhost:8000";

export async function checkBackendHealth(): Promise<{
  healthy: boolean;
  service?: string;
  version?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/api/v1/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Short timeout to avoid long waits if backend is down
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        healthy: true,
        service: data.service,
        version: data.version,
      };
    }

    return {
      healthy: false,
      error: `Backend returned status ${response.status}`,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unable to reach backend",
    };
  }
}
