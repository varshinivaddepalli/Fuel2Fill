"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Loader2, Trash2, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getCreditCustomerById,
  addVehicle,
  deleteVehicle,
  type CreditCustomerWithVehicles,
} from "@/actions/credit-customers"
import type { CreditCustomerVehicle } from "@/types/database"

interface ManageVehiclesDialogProps {
  customerId: string | null
  customerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onVehiclesChanged?: () => void
}

export function ManageVehiclesDialog({
  customerId,
  customerName,
  open,
  onOpenChange,
  onVehiclesChanged,
}: ManageVehiclesDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<CreditCustomerVehicle[]>([])

  // Form state for new vehicle
  const [newVehicle, setNewVehicle] = useState({
    vehicle_number: "",
    vehicle_type: "",
  })

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load customer with vehicles when dialog opens
  useEffect(() => {
    if (!open || !customerId) return

    async function loadVehicles() {
      setIsLoading(true)
      setError(null)
      const result = await getCreditCustomerById(customerId!)
      if (result.success) {
        setVehicles(result.customer.vehicles)
      } else {
        setError(result.error)
      }
      setIsLoading(false)
    }
    loadVehicles()
  }, [open, customerId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewVehicle((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddVehicle = async () => {
    if (!customerId) return

    const vehicleNumber = newVehicle.vehicle_number.trim().toUpperCase()
    if (!vehicleNumber) {
      setError("Vehicle number is required")
      return
    }

    // Basic format validation (alphanumeric, 4-15 chars)
    const normalizedNumber = vehicleNumber.replace(/[-\s]/g, "")
    if (!/^[A-Z0-9]{4,15}$/.test(normalizedNumber)) {
      setError("Invalid vehicle number format")
      return
    }

    setIsAdding(true)
    setError(null)

    const result = await addVehicle({
      credit_customer_id: customerId,
      vehicle_number: vehicleNumber,
      vehicle_type: newVehicle.vehicle_type.trim() || null,
    })

    if (result.success) {
      toast.success("Vehicle added successfully!", {
        description: vehicleNumber,
      })

      // Refresh vehicles list
      const refreshResult = await getCreditCustomerById(customerId)
      if (refreshResult.success) {
        setVehicles(refreshResult.customer.vehicles)
      }

      // Reset form
      setNewVehicle({ vehicle_number: "", vehicle_type: "" })
      onVehiclesChanged?.()
    } else {
      setError(result.error)
    }

    setIsAdding(false)
  }

  const handleDeleteClick = (vehicleId: string) => {
    setVehicleToDelete(vehicleId)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete || !customerId) return

    setIsDeleting(true)
    const result = await deleteVehicle(vehicleToDelete)

    if (result.success) {
      toast.success("Vehicle deleted successfully!")

      // Refresh vehicles list
      const refreshResult = await getCreditCustomerById(customerId)
      if (refreshResult.success) {
        setVehicles(refreshResult.customer.vehicles)
      }
      onVehiclesChanged?.()
    } else {
      toast.error(result.error)
    }

    setIsDeleting(false)
    setDeleteConfirmOpen(false)
    setVehicleToDelete(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="size-5" />
              Manage Vehicles
            </DialogTitle>
            <DialogDescription>
              Vehicles registered for <span className="font-medium">{customerName}</span>
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Add new vehicle form */}
              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium text-sm">Add New Vehicle</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="vehicle_number" className="text-xs">
                      Vehicle Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="vehicle_number"
                      name="vehicle_number"
                      placeholder="e.g., MH12AB1234"
                      value={newVehicle.vehicle_number}
                      onChange={handleInputChange}
                      disabled={isAdding}
                      className="uppercase"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="vehicle_type" className="text-xs">
                      Vehicle Type
                    </Label>
                    <Input
                      id="vehicle_type"
                      name="vehicle_type"
                      placeholder="e.g., Truck, Car, Bus"
                      value={newVehicle.vehicle_type}
                      onChange={handleInputChange}
                      disabled={isAdding}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddVehicle}
                  disabled={isAdding || !newVehicle.vehicle_number.trim()}
                  size="sm"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 size-4" />
                      Add Vehicle
                    </>
                  )}
                </Button>
              </div>

              {/* Vehicles list */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Registered Vehicles ({vehicles.length})
                </h4>
                {vehicles.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 border rounded-lg">
                    <Car className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No vehicles registered yet</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vehicle Number</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicles.map((vehicle) => (
                          <TableRow key={vehicle.vehicle_id}>
                            <TableCell className="font-mono font-medium">
                              {vehicle.vehicle_number}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {vehicle.vehicle_type || "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(vehicle.vehicle_id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
