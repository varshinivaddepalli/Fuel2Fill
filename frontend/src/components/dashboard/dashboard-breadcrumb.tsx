"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useBreadcrumb } from "@/providers/breadcrumb-context"

// Route segment to display name mapping
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  registration: "Registration",
  employee: "Employee",
  operations: "Operations",
  credit: "Credit",
  "view-employee": "View Employee",
  "add-station": "Add Station",
  "add-fuel-type": "Add Fuel Type",
  "add-tank": "Add Tank",
  "add-pump": "Add Pump",
  "add-nozzle": "Add Nozzle",
  "add-product": "Add Product",
  "add-employee": "Add Employee",
  "daily-fuel-price": "Daily Fuel Price",
  stock: "Stock View",
}

// Routes that are category-only (no page.tsx) - should not be clickable
const nonNavigableRoutes = new Set(["registration", "employee", "operations", "credit"])

// Helper function to convert route segment to display name
function getLabel(segment: string, dynamicLabels: Record<string, string>): string {
  // Check dynamic labels first (for UUIDs like employee IDs)
  if (dynamicLabels[segment]) {
    return dynamicLabels[segment]
  }
  // Check static route labels
  if (routeLabels[segment]) {
    return routeLabels[segment]
  }
  // Convert segment to Title Case
  return segment.split("-").map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ")
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const { dynamicLabels } = useBreadcrumb()

  // Split pathname into segments, filter out empty strings
  const segments = pathname.split("/").filter(Boolean)

  // Build breadcrumb items with cumulative paths
  const breadcrumbItems = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/")
    const label = getLabel(segment, dynamicLabels)
    const isLast = index === segments.length - 1

    return {
      segment,
      path,
      label,
      isLast,
    }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home link - always shown */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map(({ segment, path, label, isLast }) => {
          const isNavigable = !nonNavigableRoutes.has(segment)

          return (
            <span key={path} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : isNavigable ? (
                  <BreadcrumbLink asChild>
                    <Link href={path}>{label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="text-muted-foreground">{label}</span>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
