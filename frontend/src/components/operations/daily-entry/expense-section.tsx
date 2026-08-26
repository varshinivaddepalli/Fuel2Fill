"use client"

import { useCallback, useMemo, useState } from "react"
import { Receipt, ChevronDown, Plus, Trash2 } from "lucide-react"
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
import type { ExpenseCategory, ExpensePaymentMethod } from "@/actions/expenses"

export interface ExpenseRowData {
  id: string
  category: ExpenseCategory | ""
  amount: number
  payment_method: ExpensePaymentMethod | ""
  vendor_name: string
  description: string
}

interface ExpenseSectionProps {
  rows: ExpenseRowData[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<ExpenseRowData>) => void
  onRemove: (id: string) => void
}

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "utilities", label: "Utilities" },
  { value: "rent", label: "Rent" },
  { value: "insurance", label: "Insurance" },
  { value: "marketing", label: "Marketing" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "transportation", label: "Transportation" },
  { value: "professional_fees", label: "Professional Fees" },
  { value: "taxes", label: "Taxes" },
  { value: "other", label: "Other" },
]

const PAYMENT_OPTIONS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "credit", label: "Credit" },
  { value: "bank_transfer", label: "Bank Transfer" },
]

export function ExpenseSection({ rows, onAdd, onUpdate, onRemove }: ExpenseSectionProps) {
  const [isOpen, setIsOpen] = useState(rows.length > 0)

  const totals = useMemo(() => {
    const itemCount = rows.filter((r) => r.amount > 0).length
    const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0)
    return { itemCount, totalAmount }
  }, [rows])

  return (
    <Collapsible open={isOpen} onOpenChange={(open) => {
      if (open && rows.length === 0) onAdd()
      setIsOpen(open)
    }}>
      <Card className="overflow-hidden border-t-3 border-t-primary">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-muted/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                + Add Expense
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
            <div className="hidden md:grid md:grid-cols-[1fr_0.7fr_0.8fr_0.8fr_1fr_auto] gap-2 px-4 py-2 bg-muted/20 text-[10px] uppercase tracking-wider font-medium text-muted-foreground border-t">
              <span>Category</span>
              <span>Amount (₹)</span>
              <span>Payment Type</span>
              <span>Vendor Name</span>
              <span>Description</span>
              <span className="w-8" />
            </div>

            {/* Rows */}
            {rows.map((row) => (
              <ExpenseRow
                key={row.id}
                data={row}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}

            {/* Add Another button */}
            <div className="border-t px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAdd}
                className="text-primary hover:text-primary/80 text-xs"
              >
                <Plus className="size-3.5 mr-1" />
                Add Another
              </Button>
            </div>

            {/* Totals Summary */}
            {rows.length > 0 && (
              <div className="border-t bg-primary/5 px-4 py-2 flex items-center justify-end gap-6 text-xs">
                <span className="text-muted-foreground">
                  Total Items: <span className="font-semibold text-foreground">{totals.itemCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Total Amount: <span className="font-semibold text-primary">{formatCurrency(totals.totalAmount)}</span>
                </span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function ExpenseRow({
  data,
  onUpdate,
  onRemove,
}: {
  data: ExpenseRowData
  onUpdate: (id: string, updates: Partial<ExpenseRowData>) => void
  onRemove: (id: string) => void
}) {
  const handleCategoryChange = useCallback(
    (value: string) => onUpdate(data.id, { category: value as ExpenseCategory }),
    [data.id, onUpdate]
  )

  const handlePaymentChange = useCallback(
    (value: string) => onUpdate(data.id, { payment_method: value as ExpensePaymentMethod }),
    [data.id, onUpdate]
  )

  return (
    <div className="grid grid-cols-1 gap-2 px-4 py-3 items-start border-t rounded-lg border mx-2 my-2 md:mx-0 md:my-0 md:rounded-none md:border-x-0 md:border-b-0 md:grid-cols-[1fr_0.7fr_0.8fr_0.8fr_1fr_auto] md:items-center md:py-2">
      {/* Category */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Category</span>
        <Select value={data.category || "placeholder"} onValueChange={(v) => handleCategoryChange(v === "placeholder" ? "" : v)}>
          <SelectTrigger className="h-9 text-xs md:h-8">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="placeholder" disabled>Select</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Amount (₹)</span>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={data.amount || ""}
          onChange={(e) => onUpdate(data.id, { amount: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
          className="h-9 text-xs font-mono md:h-8"
        />
      </div>

      {/* Payment Method */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Payment Type</span>
        <Select value={data.payment_method || "placeholder"} onValueChange={(v) => handlePaymentChange(v === "placeholder" ? "" : v)}>
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

      {/* Vendor Name */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Vendor Name</span>
        <Input
          type="text"
          value={data.vendor_name}
          onChange={(e) => onUpdate(data.id, { vendor_name: e.target.value })}
          placeholder="Optional"
          className="h-9 text-xs md:h-8"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium md:hidden">Description</span>
        <Input
          type="text"
          value={data.description}
          onChange={(e) => onUpdate(data.id, { description: e.target.value })}
          placeholder="Optional"
          className="h-9 text-xs md:h-8"
        />
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
