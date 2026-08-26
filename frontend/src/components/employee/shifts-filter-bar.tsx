"use client"

import { X, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export interface ShiftFilters {
  employeeName: string
  stationId: string
  role: string
  dateFrom: string
  dateTo: string
  assignedById: string
  pumpId: string
  status: string
}

export const defaultFilters: ShiftFilters = {
  employeeName: "",
  stationId: "",
  role: "",
  dateFrom: "",
  dateTo: "",
  assignedById: "",
  pumpId: "",
  status: "",
}

interface FilterOption {
  value: string
  label: string
}

interface ShiftsFilterBarProps {
  filters: ShiftFilters
  onFiltersChange: (filters: ShiftFilters) => void
  stations: FilterOption[]
  employees: FilterOption[]
  pumps: FilterOption[]
  managers: FilterOption[]
}

export function ShiftsFilterBar({
  filters,
  onFiltersChange,
  stations,
  employees,
  pumps,
  managers,
}: ShiftsFilterBarProps) {
  const updateFilter = <K extends keyof ShiftFilters>(key: K, value: ShiftFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange(defaultFilters)
  }

  // Count active filters
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length

  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 size-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Employee Name Search */}
        <div className="space-y-1.5">
          <Label htmlFor="employeeName" className="text-xs text-muted-foreground">
            Employee Name
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="employeeName"
              placeholder="Search employee..."
              value={filters.employeeName}
              onChange={(e) => updateFilter("employeeName", e.target.value)}
              className="h-9 pl-8"
            />
          </div>
        </div>

        {/* Station Filter */}
        <div className="space-y-1.5">
          <Label htmlFor="stationId" className="text-xs text-muted-foreground">
            Station
          </Label>
          <Select
            value={filters.stationId}
            onValueChange={(value) => updateFilter("stationId", value === "all" ? "" : value)}
          >
            <SelectTrigger id="stationId" className="h-9">
              <SelectValue placeholder="All stations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stations</SelectItem>
              {stations.map((station) => (
                <SelectItem key={station.value} value={station.value}>
                  {station.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Role Filter */}
        <div className="space-y-1.5">
          <Label htmlFor="role" className="text-xs text-muted-foreground">
            Role
          </Label>
          <Select
            value={filters.role}
            onValueChange={(value) => updateFilter("role", value === "all" ? "" : value)}
          >
            <SelectTrigger id="role" className="h-9">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="pump_attendant">Pump Attendant</SelectItem>
              <SelectItem value="pump_boy">Pump Boy</SelectItem>
              <SelectItem value="cashier">Cashier</SelectItem>
              <SelectItem value="accountant">Accountant</SelectItem>
              <SelectItem value="tank_supervisor">Tank Supervisor</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="housekeeping">Housekeeping</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <Label htmlFor="status" className="text-xs text-muted-foreground">
            Status
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilter("status", value === "all" ? "" : value)}
          >
            <SelectTrigger id="status" className="h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1.5">
          <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
            From Date
          </Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            className="h-9"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1.5">
          <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
            To Date
          </Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            className="h-9"
          />
        </div>

        {/* Assigned By Filter */}
        <div className="space-y-1.5">
          <Label htmlFor="assignedById" className="text-xs text-muted-foreground">
            Assigned By
          </Label>
          <Select
            value={filters.assignedById}
            onValueChange={(value) => updateFilter("assignedById", value === "all" ? "" : value)}
          >
            <SelectTrigger id="assignedById" className="h-9">
              <SelectValue placeholder="All managers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All managers</SelectItem>
              {managers.map((manager) => (
                <SelectItem key={manager.value} value={manager.value}>
                  {manager.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pump Filter */}
        <div className="space-y-1.5">
          <Label htmlFor="pumpId" className="text-xs text-muted-foreground">
            Pump
          </Label>
          <Select
            value={filters.pumpId}
            onValueChange={(value) => updateFilter("pumpId", value === "all" ? "" : value)}
          >
            <SelectTrigger id="pumpId" className="h-9">
              <SelectValue placeholder="All pumps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pumps</SelectItem>
              {pumps.map((pump) => (
                <SelectItem key={pump.value} value={pump.value}>
                  {pump.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
