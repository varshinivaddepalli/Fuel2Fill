"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TimePeriod, DateRange } from "@/types/dashboard"
import type { Station } from "@/types/database"

interface DashboardHeaderProps {
  stations: Station[]
  stationId: string
  onStationChange: (id: string) => void
  period: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
  customRange: DateRange | undefined
  onCustomRangeChange: (range: DateRange) => void
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7days", label: "7D" },
  { value: "30days", label: "30D" },
  { value: "custom", label: "Custom" },
]

export function DashboardHeader({
  stations,
  stationId,
  onStationChange,
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Overview of your fuel station operations
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={stationId} onValueChange={onStationChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select station" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stations</SelectItem>
            {stations.map((s) => (
              <SelectItem key={s.station_id} value={s.station_id}>
                {s.station_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs font-medium rounded-md",
                period === opt.value && "bg-background shadow-sm"
              )}
              onClick={() => onPeriodChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="date"
              value={customRange?.from || ""}
              onChange={(e) =>
                onCustomRangeChange({
                  from: e.target.value,
                  to: customRange?.to || e.target.value,
                })
              }
              className="h-8 flex-1 sm:flex-none rounded-md border bg-background px-2 text-xs"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="date"
              value={customRange?.to || ""}
              onChange={(e) =>
                onCustomRangeChange({
                  from: customRange?.from || e.target.value,
                  to: e.target.value,
                })
              }
              className="h-8 flex-1 sm:flex-none rounded-md border bg-background px-2 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  )
}
