"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Package,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { updateStationProduct, deleteStationProduct } from "@/actions/station-product"
import { useInvalidateQueries } from "@/hooks/use-data"
import { formatCurrency } from "@/lib/utils"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import type { StationProduct } from "@/types/database"

interface StationProductsTabProps {
  stationId: string
  products: StationProduct[]
}

type EditingProduct = string | null

export function StationProductsTab({ stationId, products }: StationProductsTabProps) {
  const { invalidateAllStationData } = useInvalidateQueries()

  const [editingProduct, setEditingProduct] = useState<EditingProduct>(null)
  const [editForm, setEditForm] = useState<Partial<StationProduct>>({})
  const [isSaving, setIsSaving] = useState(false)

  const [deleteProduct, setDeleteProduct] = useState<StationProduct | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = useCallback((product: StationProduct) => {
    setEditingProduct(product.station_product_id)
    setEditForm({
      product_name: product.product_name,
      hsn_code: product.hsn_code,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      discount_amount: product.discount_amount,
      current_stock: product.current_stock,
      minimum_stock: product.minimum_stock,
      available: product.available,
    })
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingProduct(null)
    setEditForm({})
  }, [])

  const handleSave = useCallback(async () => {
    if (!editingProduct) return

    setIsSaving(true)

    const result = await updateStationProduct(editingProduct, stationId, {
      product_name: editForm.product_name,
      hsn_code: editForm.hsn_code,
      purchase_price: editForm.purchase_price,
      selling_price: editForm.selling_price,
      discount_amount: editForm.discount_amount,
      current_stock: editForm.current_stock,
      minimum_stock: editForm.minimum_stock,
      available: editForm.available,
    })

    if (result.success) {
      toast.success("Product updated")
      invalidateAllStationData(stationId)
      handleCancelEdit()
    } else {
      toast.error("Failed to update product", { description: result.error })
    }

    setIsSaving(false)
  }, [editingProduct, editForm, stationId, invalidateAllStationData, handleCancelEdit])

  const confirmDelete = useCallback(async () => {
    if (!deleteProduct) return

    setIsDeleting(true)

    const result = await deleteStationProduct(deleteProduct.station_product_id, stationId)

    if (result.success) {
      toast.success("Product deleted", {
        description: `${deleteProduct.product_name} has been deleted.`,
      })
      invalidateAllStationData(stationId)
      setDeleteProduct(null)
    } else {
      toast.error("Failed to delete product", { description: result.error })
    }

    setIsDeleting(false)
  }, [deleteProduct, stationId, invalidateAllStationData])

  const isEditing = (productId: string) => editingProduct === productId

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Products Found</h3>
        <p className="text-muted-foreground mt-1">
          Add products from the Registration menu to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="size-5 text-orange-500" />
        <span className="font-medium">Station Products</span>
        <span className="text-sm text-muted-foreground">({products.length})</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>HSN Code</TableHead>
              <TableHead className="text-right">Purchase</TableHead>
              <TableHead className="text-right">Selling</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-center">Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.station_product_id}>
                {isEditing(product.station_product_id) ? (
                  <>
                    <TableCell>
                      <Input
                        value={editForm.product_name || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, product_name: e.target.value }))
                        }
                        className="h-8 w-[150px]"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editForm.hsn_code || ""}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, hsn_code: e.target.value || null }))
                        }
                        className="h-8 w-[100px]"
                        placeholder="HSN"
                        maxLength={20}
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.purchase_price || 0}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            purchase_price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-8 w-[100px] text-right"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.selling_price || 0}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            selling_price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-8 w-[100px] text-right"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm.current_stock || 0}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            current_stock: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="h-8 w-[80px] text-right"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm.minimum_stock || 0}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            minimum_stock: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="h-8 w-[80px] text-right"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={editForm.available ?? true}
                        onCheckedChange={(checked) =>
                          setEditForm((prev) => ({ ...prev, available: checked }))
                        }
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                        >
                          <X className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="size-8"
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Save className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.hsn_code || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(product.purchase_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(product.selling_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono ${
                          product.current_stock <= product.minimum_stock
                            ? "text-amber-600 dark:text-amber-400"
                            : ""
                        }`}
                      >
                        {product.current_stock}
                        {product.current_stock <= product.minimum_stock && (
                          <AlertTriangle className="inline ml-1 size-3" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {product.minimum_stock}
                    </TableCell>
                    <TableCell className="text-center">
                      {product.available ? (
                        <Check className="size-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="size-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteProduct(product)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteProduct?.product_name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
