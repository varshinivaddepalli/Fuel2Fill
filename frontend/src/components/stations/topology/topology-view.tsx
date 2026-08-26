"use client"

import { Loader2, AlertCircle } from "lucide-react"
import { useStationDetail } from "@/hooks/use-data"
import { StationTree } from "./station-tree"
import { Skeleton } from "@/components/ui/skeleton"

function StationPanel({ stationId }: { stationId: string }) {
  const { data, isLoading, error } = useStationDetail(stationId)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <Skeleton className="h-12 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="mb-3 size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load station"}
        </p>
      </div>
    )
  }

  return <StationTree data={data} />
}

interface TopologyViewProps {
  stationIds: string[]
}

export function TopologyView({ stationIds }: TopologyViewProps) {
  if (stationIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const gridCols =
    stationIds.length === 1
      ? ""
      : stationIds.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3"

  return (
    <div
      className={`grid grid-cols-1 ${gridCols} h-full gap-4 overflow-auto`}
    >
      {stationIds.map((id) => (
        <div
          key={id}
          className="overflow-auto rounded-lg border border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-950/50"
        >
          <StationPanel stationId={id} />
        </div>
      ))}
    </div>
  )
}
