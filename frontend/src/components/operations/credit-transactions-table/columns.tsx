"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Trash2, Car, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import type { CreditTransactionWithDetails } from "@/actions/credit-transactions"

interface ColumnsProps {
  onDelete: (transactionId: string) => void
  onPay?: (transaction: CreditTransactionWithDetails) => void
}

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return (
        <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          Paid
        </Badge>
      )
    case "partially_paid":
      return (
        <Badge variant="default" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          Partial
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Unpaid
        </Badge>
      )
  }
}

export function getColumns({
  onDelete,
  onPay,
}: ColumnsProps): ColumnDef<CreditTransactionWithDetails>[] {
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
      accessorKey: "transaction_date",
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
          {formatDateShort(row.getValue("transaction_date"))}
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
      cell: ({ row }) => {
        const transaction = row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{transaction.customer_name}</span>
            {transaction.vehicle_number && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Car className="size-3" />
                {transaction.vehicle_number}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "station_name",
      header: "Station",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("station_name")}</span>
      ),
    },
    {
      accessorKey: "fueltype_name",
      header: "Fuel",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("fueltype_name")}</span>
      ),
    },
    {
      accessorKey: "fuel_quantity",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Quantity
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const quantity = row.getValue("fuel_quantity") as number
        return (
          <span className="font-mono">
            {quantity.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} L
          </span>
        )
      },
    },
    {
      accessorKey: "unit_price",
      header: "Rate",
      cell: ({ row }) => {
        const price = row.getValue("unit_price") as number
        return (
          <span className="font-mono text-sm text-muted-foreground">
            {formatCurrency(price)}/L
          </span>
        )
      },
    },
    {
      accessorKey: "gross_amount",
      header: "Gross",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {formatCurrency(row.getValue("gross_amount"))}
        </span>
      ),
    },
    {
      accessorKey: "discount_applied",
      header: "Discount",
      cell: ({ row }) => {
        const discount = row.getValue("discount_applied") as number
        if (discount === 0) {
          return <span className="text-muted-foreground">—</span>
        }
        return (
          <span className="font-mono text-emerald-600 dark:text-emerald-400">
            -{formatCurrency(discount)}
          </span>
        )
      },
    },
    {
      accessorKey: "net_amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Net Amount
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {formatCurrency(row.getValue("net_amount"))}
        </span>
      ),
    },
    {
      accessorKey: "running_balance",
      header: "Balance",
      cell: ({ row }) => {
        const balance = row.getValue("running_balance") as number
        return (
          <span className={`font-mono ${balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            {formatCurrency(balance)}
          </span>
        )
      },
    },
    {
      accessorKey: "payment_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("payment_status") as string
        return getPaymentStatusBadge(status)
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const transaction = row.original
        const isPaid = transaction.payment_status === "paid"
        const amountRemaining = transaction.net_amount - transaction.amount_paid

        return (
          <div className="flex items-center gap-2">
            {/* Pay button - shown only if not fully paid */}
            {onPay && !isPaid && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onPay(transaction)}
              >
                <Wallet className="mr-1 size-3" />
                Pay
              </Button>
            )}

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
                {onPay && !isPaid && (
                  <>
                    <DropdownMenuItem onClick={() => onPay(transaction)}>
                      <Wallet className="mr-2 size-4" />
                      Pay ({formatCurrency(amountRemaining)})
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(transaction.transaction_id)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}
