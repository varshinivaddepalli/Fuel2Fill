"use client"

import { useState, useCallback } from "react"
import { Loader2, Building2, AlertCircle, Fuel, Container, Gauge, Droplet, Package, Network } from "lucide-react"
import { toast } from "sonner"
import { useStationsWithCounts, useInvalidateQueries } from "@/hooks/use-data"
import { deleteStation, updateStation } from "@/actions/station"
import { Button } from "@/components/ui/button"
import { StationCard } from "./station-card"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import { StationEditDialog } from "./station-edit-dialog"
import { TopologyDialog } from "./topology/topology-dialog"
import type { StationWithCounts } from "@/actions/station-detail"

export function ViewStationsList() {
  const { data: stations, isLoading, error } = useStationsWithCounts()
  const { invalidateAllStationData, invalidateDashboard } = useInvalidateQueries()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [stationToDelete, setStationToDelete] = useState<StationWithCounts | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [stationToEdit, setStationToEdit] = useState<StationWithCounts | null>(null)
  const [topologyOpen, setTopologyOpen] = useState(false)

  const handleEdit = useCallback((station: StationWithCounts) => {
    setStationToEdit(station)
    setEditDialogOpen(true)
  }, [])

  const handleDelete = useCallback((station: StationWithCounts) => {
    setStationToDelete(station)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!stationToDelete) return

    setIsDeleting(true)
    const result = await deleteStation(stationToDelete.station_id)

    if (result.success) {
      toast.success("Station deleted", {
        description: `${stationToDelete.station_name} has been deleted successfully.`,
      })
      invalidateAllStationData()
      invalidateDashboard()
      setDeleteDialogOpen(false)
      setStationToDelete(null)
    } else {
      toast.error("Failed to delete station", {
        description: result.error,
      })
    }
    setIsDeleting(false)
  }, [stationToDelete, invalidateAllStationData, invalidateDashboard])

  const handleEditSave = useCallback(
    async (stationId: string, data: Parameters<typeof updateStation>[1]) => {
      const result = await updateStation(stationId, data)

      if (result.success) {
        toast.success("Station updated", {
          description: "Station has been updated successfully.",
        })
        invalidateAllStationData()
        invalidateDashboard()
        setEditDialogOpen(false)
        setStationToEdit(null)
        return true
      } else {
        toast.error("Failed to update station", {
          description: result.error,
        })
        return false
      }
    },
    [invalidateAllStationData, invalidateDashboard]
  )

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
        <AlertCircle className="size-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium">Error Loading Stations</h3>
        <p className="text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
      </div>
    )
  }

  if (!stations || stations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Stations Found</h3>
        <p className="text-muted-foreground mt-1">
          You haven&apos;t added any stations yet. Add a station from the Registration menu.
        </p>
      </div>
    )
  }

  // Calculate totals for summary
  const totals = stations.reduce(
    (acc, station) => ({
      fuelTypes: acc.fuelTypes + station.fuel_type_count,
      tanks: acc.tanks + station.tank_count,
      pumps: acc.pumps + station.pump_count,
      nozzles: acc.nozzles + station.nozzle_count,
      products: acc.products + station.product_count,
    }),
    { fuelTypes: 0, tanks: 0, pumps: 0, nozzles: 0, products: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Building2 className="size-4" />
            <span>
              {stations.length} Station{stations.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <Fuel className="size-4 text-amber-500" />
            <span>{totals.fuelTypes} Fuel Types</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Container className="size-4 text-blue-500" />
            <span>{totals.tanks} Tanks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="size-4 text-emerald-500" />
            <span>{totals.pumps} Pumps</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplet className="size-4 text-purple-500" />
            <span>{totals.nozzles} Nozzles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="size-4 text-orange-500" />
            <span>{totals.products} Products</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTopologyOpen(true)}>
          <Network className="mr-2 size-4" />
          Topology Map
        </Button>
      </div>

      {/* Station cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stations.map((station) => (
          <StationCard
            key={station.station_id}
            station={station}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Station"
        description={
          stationToDelete
            ? `Are you sure you want to delete "${stationToDelete.station_name}"? This action cannot be undone.`
            : ""
        }
        warningMessage={
          stationToDelete &&
          (stationToDelete.tank_count > 0 ||
            stationToDelete.pump_count > 0 ||
            stationToDelete.nozzle_count > 0)
            ? `This station has ${stationToDelete.tank_count} tanks, ${stationToDelete.pump_count} pumps, and ${stationToDelete.nozzle_count} nozzles that will also be deleted.`
            : undefined
        }
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
      />

      {/* Edit dialog */}
      {stationToEdit && (
        <StationEditDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setStationToEdit(null)
          }}
          station={stationToEdit}
          onSave={handleEditSave}
        />
      )}

      {/* Topology Map dialog */}
      <TopologyDialog
        open={topologyOpen}
        onOpenChange={setTopologyOpen}
        stations={stations}
      />
    </div>
  )
}
