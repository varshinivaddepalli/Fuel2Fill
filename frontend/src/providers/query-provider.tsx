"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

// Create a singleton query client for SSR hydration consistency
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 60 seconds (increased from 30s)
        // This reduces unnecessary refetches for frequently accessed data
        staleTime: 60 * 1000,
        // Cache data for 10 minutes (increased from 5min)
        // Keeps more data available for instant back-navigation
        gcTime: 10 * 60 * 1000,
        // Retry failed requests once
        retry: 1,
        // Don't refetch on window focus - data stays stable
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect - reduces unnecessary requests
        refetchOnReconnect: false,
        // Respect staleTime — only refetch if data is stale
        // This makes navigation feel instant (cached data served within staleTime)
        refetchOnMount: true,
        // Network mode: prefer cache over network for faster perceived performance
        networkMode: "offlineFirst",
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        // Network mode for mutations
        networkMode: "online",
      },
    },
  })
}

// Singleton for browser, new instance for SSR
let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This helps with SSR hydration and avoids re-creating client on each render
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient)
  const pathname = usePathname()

  // Prefetch dashboard data only when user is on/near the dashboard
  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) return

    const kpiKey = ["dashboard-kpis", "all", "today", undefined, undefined]
    if (queryClient.getQueryData(kpiKey)) return

    ;(async () => {
      try {
        const [{ getDashboardKpis, getDashboardOperational }, { getTodayDateString }] =
          await Promise.all([
            import("@/actions/dashboard-v2"),
            import("@/lib/utils"),
          ])
        const todayDate = getTodayDateString()
        queryClient.prefetchQuery({
          queryKey: kpiKey,
          queryFn: async () => {
            const result = await getDashboardKpis("all", "today", undefined, todayDate)
            if (!result.success) throw new Error(result.error)
            return result.data
          },
          staleTime: 60 * 1000,
        })
        queryClient.prefetchQuery({
          queryKey: ["dashboard-ops", "all"],
          queryFn: async () => {
            const result = await getDashboardOperational("all", todayDate)
            if (!result.success) throw new Error(result.error)
            return result.data
          },
          staleTime: 30 * 1000,
        })
      } catch {
        // Prefetch failure is non-critical; dashboard will fetch on mount
      }
    })()
  }, [queryClient, pathname])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
