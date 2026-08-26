"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { TopologyView } from "./topology-view"
import type { StationWithCounts } from "@/actions/station-detail"

const MAX_STATIONS = 3

interface TopologyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stations: StationWithCounts[]
}

export function TopologyDialog({
  open,
  onOpenChange,
  stations,
}: TopologyDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Auto-select first station when dialog opens
  useEffect(() => {
    if (open && stations.length > 0 && selectedIds.length === 0) {
      setSelectedIds([stations[0].station_id])
    }
    if (!open) {
      setSelectedIds([])
    }
  }, [open, stations, selectedIds.length])

  const handleStationChange = useCallback(
    (index: number, stationId: string) => {
      setSelectedIds((prev) => {
        const next = [...prev]
        next[index] = stationId
        return next
      })
    },
    []
  )

  const addStation = useCallback(() => {
    if (selectedIds.length >= MAX_STATIONS) return
    // Auto-select the first unselected station
    const available = stations.find(
      (s) => !selectedIds.includes(s.station_id)
    )
    if (available) {
      setSelectedIds((prev) => [...prev, available.station_id])
    }
  }, [selectedIds, stations])

  const removeStation = useCallback(
    (index: number) => {
      if (selectedIds.length <= 1) return
      setSelectedIds((prev) => prev.filter((_, i) => i !== index))
    },
    [selectedIds.length]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[95vw] sm:max-w-[95vw] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <DialogTitle className="text-lg font-semibold">
              Infrastructure Topology
            </DialogTitle>

            {/* Station selector bar */}
            <div className="flex flex-wrap items-center gap-3">
              {selectedIds.map((stationId, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Select
                    value={stationId}
                    onValueChange={(val) => handleStationChange(index, val)}
                  >
                    <SelectTrigger className="w-[200px]" size="sm">
                      <SelectValue placeholder="Select station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((s) => (
                        <SelectItem
                          key={s.station_id}
                          value={s.station_id}
                          disabled={
                            selectedIds.includes(s.station_id) &&
                            s.station_id !== stationId
                          }
                        >
                          {s.station_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedIds.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => removeStation(index)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              {selectedIds.length < MAX_STATIONS &&
                selectedIds.length < stations.length && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addStation}
                    className="gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    Add Station
                  </Button>
                )}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 p-4">
          <TopologyView stationIds={selectedIds} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
