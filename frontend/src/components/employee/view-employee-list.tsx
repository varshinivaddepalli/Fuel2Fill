"use client"

import { Loader2, Users, Building2 } from "lucide-react"
import { useEmployees } from "@/hooks/use-data"
import { EmployeeCard } from "./employee-card"

export function ViewEmployeeList() {
  const { data: stationsWithEmployees, isLoading, error } = useEmployees()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">{error instanceof Error ? error.message : "An error occurred"}</p>
      </div>
    )
  }

  if (!stationsWithEmployees || stationsWithEmployees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Employees Found</h3>
        <p className="text-muted-foreground mt-1">
          You haven&apos;t added any employees yet. Add employees from the Registration menu.
        </p>
      </div>
    )
  }

  const totalEmployees = stationsWithEmployees.reduce(
    (acc, station) => acc + station.employees.length,
    0
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building2 className="size-4" />
          <span>{stationsWithEmployees.length} Station{stationsWithEmployees.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-4" />
          <span>{totalEmployees} Employee{totalEmployees !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {stationsWithEmployees.map((station) => (
        <div key={station.station_id} className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">{station.station_name}</h2>
            <span className="text-sm text-muted-foreground">
              ({station.employees.length} employee{station.employees.length !== 1 ? "s" : ""})
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {station.employees.map((employee) => (
              <EmployeeCard key={employee.employee_id} employee={employee} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
