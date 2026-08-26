"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import type { CreditPaymentWithDetails } from "@/actions/credit-payments"
import type { PaymentMode } from "@/types/database"

interface ColumnsProps {
  onDelete: (paymentId: string) => void
  onViewDetails?: (payment: CreditPaymentWithDetails) => void
}

// Format payment mode for display
function formatPaymentMode(mode: PaymentMode): { label: string; className: string } {
  const modeStyles: Record<PaymentMode, { label: string; className: string }> = {
    cash: { label: "Cash", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    upi: { label: "UPI", className: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
    card: { label: "Card", className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    cheque: { label: "Cheque", className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
    bank_transfer: { label: "Bank Transfer", className: "bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300" },
  }
  return modeStyles[mode] || { label: mode, className: "bg-muted text-muted-foreground" }
}

export function getColumns({
  onDelete,
  onViewDetails,
}: ColumnsProps): ColumnDef<CreditPaymentWithDetails>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "payment_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Date
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatDateShort(row.getValue("payment_date"))}
        </span>
      ),
    },
    {
      accessorKey: "customer_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Customer
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("customer_name")}</span>
      ),
    },
    {
      accessorKey: "station_name",
      header: "Station",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("station_name")}</span>
      ),
    },
    {
      accessorKey: "payment_amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Amount
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
          +{formatCurrency(row.getValue("payment_amount"))}
        </span>
      ),
    },
    {
      accessorKey: "payment_mode",
      header: "Mode",
      cell: ({ row }) => {
        const mode = row.getValue("payment_mode") as PaymentMode
        const { label, className } = formatPaymentMode(mode)
        return (
          <span className={`text-xs px-2 py-1 rounded-full ${className}`}>
            {label}
          </span>
        )
      },
    },
    {
      accessorKey: "reference_number",
      header: "Reference",
      cell: ({ row }) => {
        const ref = row.getValue("reference_number") as string | null
        if (!ref) {
          return <span className="text-muted-foreground">—</span>
        }
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {ref}
          </span>
        )
      },
    },
    {
      accessorKey: "balance_before",
      header: "Before",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {formatCurrency(row.getValue("balance_before"))}
        </span>
      ),
    },
    {
      accessorKey: "balance_after",
      header: "After",
      cell: ({ row }) => {
        const balance = row.getValue("balance_after") as number
        return (
          <span className={`font-mono text-sm ${balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {formatCurrency(balance)}
          </span>
        )
      },
    },
    {
      accessorKey: "employee_name",
      header: "Received By",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.getValue("employee_name")}</span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const payment = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(payment)}>
                  <Eye className="mr-2 size-4" />
                  View Details
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(payment.payment_id)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
