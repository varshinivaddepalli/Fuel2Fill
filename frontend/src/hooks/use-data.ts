"use client"

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { getDashboardKpis, getDashboardOperational } from "@/actions/dashboard-v2"
import { getClientStations } from "@/actions/stations"
import { getClientEmployees } from "@/actions/employees"
import { getClientShifts } from "@/actions/shifts"
import { getClientAttendance } from "@/actions/attendance"
import { getClientCreditCustomers } from "@/actions/credit-customers"
import { getStationsWithCounts, getStationDetail } from "@/actions/station-detail"
import { getProductSalesHistory } from "@/actions/product-sales"
import { getExpenseHistory } from "@/actions/expenses"
import { getPurchaseHistory } from "@/actions/purchases"
import { getStockOverview } from "@/actions/stock"
import { getSettlementHistory } from "@/actions/settlement"
import type { TimePeriod, DateRange } from "@/types/dashboard"
import { getTodayDateString } from "@/lib/utils"

// Query Keys - centralized for consistency
export const queryKeys = {
  dashboardKpis: (stationId: string, period: string, from?: string, to?: string) =>
    ["dashboard-kpis", stationId, period, from, to] as const,
  dashboardOps: (stationId: string) =>
    ["dashboard-ops", stationId] as const,
  stations: ["stations"] as const,
  stationsWithCounts: ["stations-with-counts"] as const,
  stationDetail: (stationId: string) => ["station-detail", stationId] as const,
  employees: ["employees"] as const,
  shifts: ["shifts"] as const,
  attendance: ["attendance"] as const,
  creditCustomers: ["credit-customers"] as const,
  fuelPrices: ["fuel-prices"] as const,
  productSales: ["product-sales"] as const,
  expenses: ["expenses"] as const,
  purchases: ["purchases"] as const,
  stock: ["stock"] as const,
  settlements: ["settlements"] as const,
} as const

/**
 * Hook to fetch dashboard KPI data with time period controls
 */
export function useDashboardKpis(
  stationId: string,
  period: TimePeriod,
  customRange?: DateRange
) {
  return useQuery({
    queryKey: queryKeys.dashboardKpis(stationId, period, customRange?.from, customRange?.to),
    queryFn: async () => {
      const todayDate = getTodayDateString()
      const result = await getDashboardKpis(stationId, period, customRange, todayDate)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch dashboard operational data (tanks, stock, credit, workforce)
 */
export function useDashboardOperational(stationId: string) {
  return useQuery({
    queryKey: queryKeys.dashboardOps(stationId),
    queryFn: async () => {
      const todayDate = getTodayDateString()
      const result = await getDashboardOperational(stationId, todayDate)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to fetch client stations with caching
 * Data is stale after 60 seconds but cached for 10 minutes
 */
export function useStations() {
  return useQuery({
    queryKey: queryKeys.stations,
    queryFn: async () => {
      const result = await getClientStations()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.stations
    },
    // Stations rarely change, use longer stale time
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch client stations with counts (for View Stations list)
 * Returns stations with tank_count, pump_count, nozzle_count, product_count
 */
export function useStationsWithCounts() {
  return useQuery({
    queryKey: queryKeys.stationsWithCounts,
    queryFn: async () => {
      const result = await getStationsWithCounts()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.stations
    },
    // Stations rarely change, use longer stale time
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch station detail data (for View Stations detail page)
 * Returns station with all related entities: fuelTypes, tanks, pumps, nozzles, products
 */
export function useStationDetail(stationId: string) {
  return useQuery({
    queryKey: queryKeys.stationDetail(stationId),
    queryFn: async () => {
      const result = await getStationDetail(stationId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!stationId,
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch client employees with caching
 */
export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: async () => {
      const result = await getClientEmployees()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.stationsWithEmployees
    },
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch client shifts with caching
 */
export function useShifts() {
  return useQuery({
    queryKey: queryKeys.shifts,
    queryFn: async () => {
      const result = await getClientShifts()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch client attendance with caching
 */
export function useAttendance() {
  return useQuery({
    queryKey: queryKeys.attendance,
    queryFn: async () => {
      const result = await getClientAttendance()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch credit customers with caching
 */
export function useCreditCustomers() {
  return useQuery({
    queryKey: queryKeys.creditCustomers,
    queryFn: async () => {
      const result = await getClientCreditCustomers()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.customers
    },
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch product sales history with caching
 */
export function useProductSales() {
  return useQuery({
    queryKey: queryKeys.productSales,
    queryFn: async () => {
      const result = await getProductSalesHistory()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.history
    },
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch expense history with caching
 */
export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses,
    queryFn: async () => {
      const result = await getExpenseHistory()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.history
    },
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch purchase history with caching
 */
export function usePurchases() {
  return useQuery({
    queryKey: queryKeys.purchases,
    queryFn: async () => {
      const result = await getPurchaseHistory()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.history
    },
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch stock overview with caching
 * Uses shorter staleTime for fresher stock data
 */
export function useStock() {
  return useQuery({
    queryKey: queryKeys.stock,
    queryFn: async () => {
      const result = await getStockOverview()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    staleTime: 30 * 1000, // 30 seconds for fresher stock data
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to fetch settlement history with caching
 */
export function useSettlements() {
  return useQuery({
    queryKey: queryKeys.settlements,
    queryFn: async () => {
      const result = await getSettlementHistory()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.history
    },
    // Show previous data immediately while refetching
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to invalidate specific query caches
 * Use after mutations to ensure fresh data
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateDashboard: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-ops"] })
    },
    invalidateStations: () => queryClient.invalidateQueries({ queryKey: queryKeys.stations }),
    invalidateStationsWithCounts: () => queryClient.invalidateQueries({ queryKey: queryKeys.stationsWithCounts }),
    invalidateStationDetail: (stationId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.stationDetail(stationId) }),
    invalidateAllStationData: (stationId?: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stations })
      queryClient.invalidateQueries({ queryKey: queryKeys.stationsWithCounts })
      if (stationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.stationDetail(stationId) })
      }
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-ops"] })
    },
    invalidateEmployees: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees }),
    invalidateShifts: () => queryClient.invalidateQueries({ queryKey: queryKeys.shifts }),
    invalidateAttendance: () => queryClient.invalidateQueries({ queryKey: queryKeys.attendance }),
    invalidateCreditCustomers: () => queryClient.invalidateQueries({ queryKey: queryKeys.creditCustomers }),
    invalidateFuelPrices: () => queryClient.invalidateQueries({ queryKey: queryKeys.fuelPrices }),
    invalidateProductSales: () => queryClient.invalidateQueries({ queryKey: queryKeys.productSales }),
    invalidateExpenses: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
    invalidatePurchases: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchases }),
    invalidateStock: () => queryClient.invalidateQueries({ queryKey: queryKeys.stock }),
    invalidateSettlements: () => queryClient.invalidateQueries({ queryKey: queryKeys.settlements }),
    invalidateAll: () => queryClient.invalidateQueries(),
  }
}

/**
 * Hook to prefetch data for a route before navigation
 * Call this on hover or when you know the user will navigate soon
 */
export function usePrefetch() {
  const queryClient = useQueryClient()

  return {
    prefetchDashboard: () => {
      const todayDate = getTodayDateString()
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboardKpis("all", "today"),
        queryFn: async () => {
          const result = await getDashboardKpis("all", "today", undefined, todayDate)
          if (!result.success) throw new Error(result.error)
          return result.data
        },
        staleTime: 60 * 1000,
      })
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboardOps("all"),
        queryFn: async () => {
          const result = await getDashboardOperational("all", todayDate)
          if (!result.success) throw new Error(result.error)
          return result.data
        },
        staleTime: 30 * 1000,
      })
    },
    prefetchEmployees: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.employees,
        queryFn: async () => {
          const result = await getClientEmployees()
          if (!result.success) throw new Error(result.error)
          return result.stationsWithEmployees
        },
      }),
    prefetchShifts: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.shifts,
        queryFn: async () => {
          const result = await getClientShifts()
          if (!result.success) throw new Error(result.error)
          return result.data
        },
      }),
    prefetchAttendance: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.attendance,
        queryFn: async () => {
          const result = await getClientAttendance()
          if (!result.success) throw new Error(result.error)
          return result.data
        },
      }),
    prefetchCreditCustomers: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.creditCustomers,
        queryFn: async () => {
          const result = await getClientCreditCustomers()
          if (!result.success) throw new Error(result.error)
          return result.customers
        },
      }),
    prefetchStationsWithCounts: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.stationsWithCounts,
        queryFn: async () => {
          const result = await getStationsWithCounts()
          if (!result.success) throw new Error(result.error)
          return result.stations
        },
      }),
    prefetchStationDetail: (stationId: string) =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.stationDetail(stationId),
        queryFn: async () => {
          const result = await getStationDetail(stationId)
          if (!result.success) throw new Error(result.error)
          return result.data
        },
      }),
    prefetchExpenses: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.expenses,
        queryFn: async () => {
          const result = await getExpenseHistory()
          if (!result.success) throw new Error(result.error)
          return result.history
        },
      }),
    prefetchPurchases: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.purchases,
        queryFn: async () => {
          const result = await getPurchaseHistory()
          if (!result.success) throw new Error(result.error)
          return result.history
        },
      }),
    prefetchStock: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.stock,
        queryFn: async () => {
          const result = await getStockOverview()
          if (!result.success) throw new Error(result.error)
          return result.data
        },
      }),
    prefetchSettlements: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.settlements,
        queryFn: async () => {
          const result = await getSettlementHistory()
          if (!result.success) throw new Error(result.error)
          return result.history
        },
      }),
  }
}
