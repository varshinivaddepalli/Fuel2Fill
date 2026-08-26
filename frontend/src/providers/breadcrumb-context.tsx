"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface BreadcrumbContextType {
  dynamicLabels: Record<string, string>
  setDynamicLabel: (segment: string, label: string) => void
  clearDynamicLabel: (segment: string) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType | null>(null)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({})

  const setDynamicLabel = useCallback((segment: string, label: string) => {
    setDynamicLabels((prev) => ({ ...prev, [segment]: label }))
  }, [])

  const clearDynamicLabel = useCallback((segment: string) => {
    setDynamicLabels((prev) => {
      const newLabels = { ...prev }
      delete newLabels[segment]
      return newLabels
    })
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ dynamicLabels, setDynamicLabel, clearDynamicLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error("useBreadcrumb must be used within a BreadcrumbProvider")
  }
  return context
}
