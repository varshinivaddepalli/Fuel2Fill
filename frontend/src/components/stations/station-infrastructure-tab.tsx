"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Fuel,
  Container,
  Gauge,
  Droplet,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { updateFuelType, deleteFuelType } from "@/actions/fuel-type"
import { updateTank, deleteTank } from "@/actions/tank"
import { updatePump, deletePump } from "@/actions/pump"
import { updateNozzle, deleteNozzle } from "@/actions/nozzle"
import { useInvalidateQueries } from "@/hooks/use-data"
import { formatSnakeCase } from "@/lib/utils"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import type { FuelType, Pump } from "@/types/database"
import type { TankWithFuelType, NozzleWithRelations } from "@/actions/station-detail"

interface StationInfrastructureTabProps {
  stationId: string
  fuelTypes: FuelType[]
  tanks: TankWithFuelType[]
  pumps: Pump[]
  nozzles: NozzleWithRelations[]
}

type InfrastructureItemType = "fuel_type" | "tank" | "pump" | "nozzle"

type EditingItem = {
  type: InfrastructureItemType
  id: string
} | null

type DeleteItem = {
  type: InfrastructureItemType
  id: string
  name: string
  warningMessage?: string
} | null

export function StationInfrastructureTab({
  stationId,
  fuelTypes,
  tanks,
  pumps,
  nozzles,
}: StationInfrastructureTabProps) {
  const { invalidateAllStationData } = useInvalidateQueries()

  const [editingItem, setEditingItem] = useState<EditingItem>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [isSaving, setIsSaving] = useState(false)

  const [deleteItem, setDeleteItem] = useState<DeleteItem>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [openSections, setOpenSections] = useState({
    fuelTypes: true,
    tanks: true,
    pumps: true,
    nozzles: true,
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleEdit = useCallback(
    (type: InfrastructureItemType, id: string, data: Record<string, unknown>) => {
      setEditingItem({ type, id })
      setEditForm(data)
    },
    []
  )

  const handleCancelEdit = useCallback(() => {
    setEditingItem(null)
    setEditForm({})
  }, [])

  const handleSave = useCallback(async () => {
    if (!editingItem) return

    setIsSaving(true)
    let result: { success: boolean; error?: string }

    switch (editingItem.type) {
      case "fuel_type":
        result = await updateFuelType(editingItem.id, stationId, {
          fueltype_name: editForm.fueltype_name as string,
          unit_of_measure: editForm.unit_of_measure as string,
          hsn_code: editForm.hsn_code as string | undefined,
        })
        break
      case "tank":
        result = await updateTank(editingItem.id, stationId, {
          tank_name: editForm.tank_name as string,
          tank_capacity: editForm.tank_capacity as number,
          capacity_unit: editForm.capacity_unit as string,
          fueltype_id: editForm.fueltype_id as string,
        })
        break
      case "pump":
        result = await updatePump(editingItem.id, stationId, {
          pump_name: editForm.pump_name as string,
          nozzle_count: editForm.nozzle_count as number,
        })
        break
      case "nozzle":
        result = await updateNozzle(editingItem.id, stationId, {
          nozzle_name: editForm.nozzle_name as string,
          pump_id: editForm.pump_id as string,
          tank_id: editForm.tank_id as string,
          fueltype_id: editForm.fueltype_id as string,
        })
        break
      default:
        result = { success: false, error: "Unknown item type" }
    }

    if (result.success) {
      toast.success("Updated successfully")
      invalidateAllStationData(stationId)
      handleCancelEdit()
    } else {
      toast.error("Failed to update", { description: result.error })
    }

    setIsSaving(false)
  }, [editingItem, editForm, stationId, invalidateAllStationData, handleCancelEdit])

  const handleDelete = useCallback(
    (type: InfrastructureItemType, id: string, name: string, warningMessage?: string) => {
      setDeleteItem({ type, id, name, warningMessage })
    },
    []
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteItem) return

    setIsDeleting(true)
    let result: { success: boolean; error?: string }

    switch (deleteItem.type) {
      case "fuel_type":
        result = await deleteFuelType(deleteItem.id, stationId)
        break
      case "tank":
        result = await deleteTank(deleteItem.id, stationId)
        break
      case "pump":
        result = await deletePump(deleteItem.id, stationId)
        break
      case "nozzle":
        result = await deleteNozzle(deleteItem.id, stationId)
        break
      default:
        result = { success: false, error: "Unknown item type" }
    }

    if (result.success) {
      toast.success("Deleted successfully", {
        description: `${deleteItem.name} has been deleted.`,
      })
      invalidateAllStationData(stationId)
      setDeleteItem(null)
    } else {
      toast.error("Failed to delete", { description: result.error })
    }

    setIsDeleting(false)
  }, [deleteItem, stationId, invalidateAllStationData])

  const isEditing = (type: string, id: string) =>
    editingItem?.type === type && editingItem?.id === id

  return (
    <div className="space-y-4">
      {/* Fuel Types Section */}
      <Collapsible open={openSections.fuelTypes} onOpenChange={() => toggleSection("fuelTypes")}>
        <div className="border rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Fuel className="size-5 text-amber-500" />
              <span className="font-medium">Fuel Types</span>
              <span className="text-sm text-muted-foreground">({fuelTypes.length})</span>
            </div>
            {openSections.fuelTypes ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t divide-y">
              {fuelTypes.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No fuel types added yet.</p>
              ) : (
                fuelTypes.map((ft) => (
                  <div key={ft.fueltype_id} className="p-4">
                    {isEditing("fuel_type", ft.fueltype_id) ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          value={editForm.fueltype_name as string}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, fueltype_name: e.target.value }))
                          }
                          placeholder="Name"
                          className="max-w-[150px]"
                          disabled={isSaving}
                        />
                        <Select
                          value={editForm.unit_of_measure as string}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, unit_of_measure: value }))
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="max-w-[130px]">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="liters">Liters</SelectItem>
                            <SelectItem value="kg">Kilograms</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={(editForm.hsn_code as string) || ""}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, hsn_code: e.target.value }))
                          }
                          placeholder="HSN Code"
                          className="max-w-[120px]"
                          disabled={isSaving}
                        />
                        <div className="flex gap-1 ml-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="size-4" />
                          </Button>
                          <Button size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Save className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{ft.fueltype_name}</span>
                          <span className="text-muted-foreground">{ft.unit_of_measure}</span>
                          {ft.hsn_code && (
                            <span className="text-xs text-muted-foreground font-mono">
                              HSN: {ft.hsn_code}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() =>
                              handleEdit("fuel_type", ft.fueltype_id, {
                                fueltype_name: ft.fueltype_name,
                                unit_of_measure: ft.unit_of_measure,
                                hsn_code: ft.hsn_code || "",
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              const tankCount = tanks.filter(
                                (t) => t.fueltype_id === ft.fueltype_id
                              ).length
                              handleDelete(
                                "fuel_type",
                                ft.fueltype_id,
                                ft.fueltype_name,
                                tankCount > 0
                                  ? `${tankCount} tank(s) are using this fuel type`
                                  : undefined
                              )
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Tanks Section */}
      <Collapsible open={openSections.tanks} onOpenChange={() => toggleSection("tanks")}>
        <div className="border rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Container className="size-5 text-blue-500" />
              <span className="font-medium">Tanks</span>
              <span className="text-sm text-muted-foreground">({tanks.length})</span>
            </div>
            {openSections.tanks ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t divide-y">
              {tanks.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No tanks added yet.</p>
              ) : (
                tanks.map((tank) => (
                  <div key={tank.tank_id} className="p-4">
                    {isEditing("tank", tank.tank_id) ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          value={editForm.tank_name as string}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, tank_name: e.target.value }))
                          }
                          placeholder="Name"
                          className="max-w-[150px]"
                          disabled={isSaving}
                        />
                        <Select
                          value={editForm.fueltype_id as string}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, fueltype_id: value }))
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="max-w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fuelTypes.map((ft) => (
                              <SelectItem key={ft.fueltype_id} value={ft.fueltype_id}>
                                {ft.fueltype_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={editForm.tank_capacity as number}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              tank_capacity: parseFloat(e.target.value) || 0,
                            }))
                          }
                          placeholder="Capacity"
                          className="max-w-[100px]"
                          disabled={isSaving}
                        />
                        <Select
                          value={(editForm.capacity_unit as string) || "liters"}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, capacity_unit: value }))
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="max-w-[90px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="liters">L</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1 ml-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="size-4" />
                          </Button>
                          <Button size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Save className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{tank.tank_name}</span>
                          <span className="text-muted-foreground">{tank.fuel_type?.fueltype_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {tank.tank_capacity.toLocaleString()} {tank.capacity_unit === "kg" ? "kg" : "L"}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() =>
                              handleEdit("tank", tank.tank_id, {
                                tank_name: tank.tank_name,
                                fueltype_id: tank.fueltype_id,
                                tank_capacity: tank.tank_capacity,
                                capacity_unit: tank.capacity_unit,
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              const nozzleCount = nozzles.filter((n) => n.tank_id === tank.tank_id).length
                              handleDelete(
                                "tank",
                                tank.tank_id,
                                tank.tank_name,
                                nozzleCount > 0
                                  ? `${nozzleCount} nozzle(s) are using this tank`
                                  : undefined
                              )
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Pumps Section */}
      <Collapsible open={openSections.pumps} onOpenChange={() => toggleSection("pumps")}>
        <div className="border rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Gauge className="size-5 text-emerald-500" />
              <span className="font-medium">Pumps</span>
              <span className="text-sm text-muted-foreground">({pumps.length})</span>
            </div>
            {openSections.pumps ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t divide-y">
              {pumps.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No pumps added yet.</p>
              ) : (
                pumps.map((pump) => (
                  <div key={pump.pump_id} className="p-4">
                    {isEditing("pump", pump.pump_id) ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          value={editForm.pump_name as string}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, pump_name: e.target.value }))
                          }
                          placeholder="Name"
                          className="max-w-[150px]"
                          disabled={isSaving}
                        />
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={editForm.nozzle_count as number}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              nozzle_count: parseInt(e.target.value) || 1,
                            }))
                          }
                          placeholder="Nozzles"
                          className="max-w-[100px]"
                          disabled={isSaving}
                        />
                        <div className="flex gap-1 ml-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="size-4" />
                          </Button>
                          <Button size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Save className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{pump.pump_name}</span>
                          <span className="text-sm px-2 py-0.5 rounded bg-muted">
                            {pump.nozzle_count} nozzle{pump.nozzle_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() =>
                              handleEdit("pump", pump.pump_id, {
                                pump_name: pump.pump_name,
                                nozzle_count: pump.nozzle_count,
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              const nozzleCount = nozzles.filter((n) => n.pump_id === pump.pump_id).length
                              handleDelete(
                                "pump",
                                pump.pump_id,
                                pump.pump_name,
                                nozzleCount > 0
                                  ? `${nozzleCount} nozzle(s) are using this pump`
                                  : undefined
                              )
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Nozzles Section */}
      <Collapsible open={openSections.nozzles} onOpenChange={() => toggleSection("nozzles")}>
        <div className="border rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Droplet className="size-5 text-purple-500" />
              <span className="font-medium">Nozzles</span>
              <span className="text-sm text-muted-foreground">({nozzles.length})</span>
            </div>
            {openSections.nozzles ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t divide-y">
              {nozzles.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No nozzles added yet.</p>
              ) : (
                nozzles.map((nozzle) => (
                  <div key={nozzle.nozzle_id} className="p-4">
                    {isEditing("nozzle", nozzle.nozzle_id) ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          value={editForm.nozzle_name as string}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, nozzle_name: e.target.value }))
                          }
                          placeholder="Name"
                          className="max-w-[120px]"
                          disabled={isSaving}
                        />
                        <Select
                          value={editForm.pump_id as string}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, pump_id: value }))
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="max-w-[120px]">
                            <SelectValue placeholder="Pump" />
                          </SelectTrigger>
                          <SelectContent>
                            {pumps.map((p) => (
                              <SelectItem key={p.pump_id} value={p.pump_id}>
                                {p.pump_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={editForm.tank_id as string}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, tank_id: value }))
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="max-w-[120px]">
                            <SelectValue placeholder="Tank" />
                          </SelectTrigger>
                          <SelectContent>
                            {tanks.map((t) => (
                              <SelectItem key={t.tank_id} value={t.tank_id}>
                                {t.tank_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={editForm.fueltype_id as string}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, fueltype_id: value }))
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="max-w-[120px]">
                            <SelectValue placeholder="Fuel" />
                          </SelectTrigger>
                          <SelectContent>
                            {fuelTypes.map((ft) => (
                              <SelectItem key={ft.fueltype_id} value={ft.fueltype_id}>
                                {ft.fueltype_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1 ml-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="size-4" />
                          </Button>
                          <Button size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Save className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{nozzle.nozzle_name}</span>
                          <span className="text-muted-foreground text-sm flex items-center gap-1">
                            {nozzle.pump?.pump_name}
                            <ArrowRight className="size-3" />
                            {nozzle.tank?.tank_name}
                            <ArrowRight className="size-3" />
                            {nozzle.fuel_type?.fueltype_name}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() =>
                              handleEdit("nozzle", nozzle.nozzle_id, {
                                nozzle_name: nozzle.nozzle_name,
                                pump_id: nozzle.pump_id,
                                tank_id: nozzle.tank_id,
                                fueltype_id: nozzle.fueltype_id,
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete("nozzle", nozzle.nozzle_id, nozzle.nozzle_name)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title={`Delete ${deleteItem?.type ? formatSnakeCase(deleteItem.type) : ""}`}
        description={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        warningMessage={deleteItem?.warningMessage}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
