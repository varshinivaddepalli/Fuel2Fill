"use client"

import { useCallback, useMemo, useState } from "react"
import { Package, ChevronDown, Plus, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { formatCurrency } from "@/lib/utils"
import type { AvailableProduct } from "@/actions/product-sales"

export interface ProductSaleRowData {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  payment_method: "cash" | "upi" | "card" | "bank_transfer" | "credit" | ""
}

interface ProductSaleSectionProps {
  rows: ProductSaleRowData[]
  products: AvailableProduct[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<ProductSaleRowData>) => void
  onRemove: (id: string) => void
}

const PAYMENT_OPTIONS: { value: "cash" | "upi" | "card" | "bank_transfer" | "credit"; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit", label: "Credit" },
]

export function ProductSaleSection({ rows, products, onAdd, onUpdate, onRemove }: ProductSaleSectionProps) {
  const [isOpen, setIsOpen] = useState(rows.length > 0)

  const totals = useMemo(() => {
    const itemCount = rows.filter((r) => r.product_id && r.quantity > 0).length
    const totalAmount = rows.reduce((sum, r) => sum + (r.quantity * r.unit_price), 0)
    return { itemCount, totalAmount }
  }, [rows])

  return (
    <Collapsible open={isOpen} onOpenChange={(open) => {
      if (open && rows.length === 0) onAdd()
      setIsOpen(open)
    }}>
      <Card className="overflow-hidden border-t-3 border-t-[#8B7310]">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-muted/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-[#8B7310]" />
              <span className="text-sm font-semibold text-[#8B7310] uppercase tracking-wider">
                + Add Product Sale
              </span>
              {rows.length > 0 && (
                <span className="text-xs text-muted-foreground">({rows.length})</span>
              )}
            </div>
            <ChevronDown className="size-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-0">
            {/* Table header - hidden on mobile */}
            <div className="hidden md:grid md:grid-cols-[1.2fr_0.6fr_0.7fr_0.8fr_0.7fr_auto] gap-2 px-4 py-2 bg-[#8B7310]/5 text-[10px] uppercase tracking-wider font-medium text-muted-foreground border-t">
              <span>Product</span>
              <span>QTY</span>
              <span>Unit Price (₹)</span>
              <span>Payment Type</span>
              <span>Amount (₹)</span>
              <span className="w-8" />
            </div>

            {/* Rows */}
            {rows.map((row) => (
              <ProductSaleRow
                key={row.id}
                data={row}
                products={products}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}

            {/* Add Product button */}
            <div className="border-t px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAdd}
                className="text-[#8B7310] hover:text-[#8B7310]/80 text-xs"
              >
                <Plus className="size-3.5 mr-1" />
                Add Product
              </Button>
            </div>

            {/* Totals Summary */}
            {rows.length > 0 && (
              <div className="border-t bg-[#8B7310]/5 px-4 py-2 flex items-center justify-end gap-6 text-xs">
                <span className="text-muted-foreground">
                  Total Items: <span className="font-semibold text-foreground">{totals.itemCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Total Amount: <span className="font-semibold text-[#8B7310]">{formatCurrency(totals.totalAmount)}</span>
                </span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function ProductSaleRow({
  data,
  products,
  onUpdate,
  onRemove,
}: {
  data: ProductSaleRowData
  products: AvailableProduct[]
  onUpdate: (id: string, updates: Partial<ProductSaleRowData>) => void
  onRemove: (id: string) => void
}) {
  const handleProductChange = useCallback(
    (value: string) => {
      if (value === "placeholder") {
        onUpdate(data.id, { product_id: "", unit_price: 0 })
        return
      }
      const product = products.find((p) => p.station_product_id === value)
      onUpdate(data.id, {
        product_id: value,
        unit_price: product?.selling_price ?? 0,
      })
    },
    [data.id, products, onUpdate]
  )

  const handlePaymentChange = useCallback(
    (value: string) => {
      onUpdate(data.id, { payment_method: value === "placeholder" ? "" : value as ProductSaleRowData["payment_method"] })
    },
    [data.id, onUpdate]
  )

  const computedAmount = data.quantity * data.unit_price

  return (
    <div className="grid grid-cols-1 gap-2 px-4 py-3 items-start border-t rounded-lg border mx-2 my-2 md:mx-0 md:my-0 md:rounded-none md:border-x-0 md:border-b-0 md:grid-cols-[1.2fr_0.6fr_0.7fr_0.8fr_0.7fr_auto] md:items-center md:py-2">
      {/* Product */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Product</span>
        <Select value={data.product_id || "placeholder"} onValueChange={handleProductChange}>
          <SelectTrigger className="h-9 text-xs md:h-8">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="placeholder" disabled>Select product</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.station_product_id} value={p.station_product_id}>
                {p.product_name} (Stock: {p.current_stock})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Quantity</span>
        <Input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          value={data.quantity || ""}
          onChange={(e) => onUpdate(data.id, { quantity: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          className="h-9 text-xs font-mono md:h-8"
        />
      </div>

      {/* Unit Price */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Unit Price (₹)</span>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={data.unit_price || ""}
          onChange={(e) => onUpdate(data.id, { unit_price: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
          className="h-9 text-xs font-mono md:h-8"
        />
      </div>

      {/* Payment Method */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Payment Type</span>
        <Select value={data.payment_method || "placeholder"} onValueChange={handlePaymentChange}>
          <SelectTrigger className="h-9 text-xs md:h-8">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="placeholder" disabled>Select</SelectItem>
            {PAYMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount (computed) */}
      <div className="flex items-center justify-between md:justify-start">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Amount</span>
        <div className="h-9 flex items-center text-xs font-mono text-muted-foreground px-2 md:h-8">
          {computedAmount > 0 ? formatCurrency(computedAmount) : "—"}
        </div>
      </div>

      {/* Delete */}
      <div className="flex justify-end md:justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(data.id)}
          className="size-9 text-muted-foreground hover:text-destructive md:size-8"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
