"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil, Eye, Car } from "lucide-react"
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
import { formatCurrency } from "@/lib/utils"
import type { CreditCustomerWithStation } from "@/actions/credit-customers"

interface ColumnsProps {
  onEdit: (customer: CreditCustomerWithStation) => void
  onDelete: (customerId: string) => void
  onViewDetails: (customer: CreditCustomerWithStation) => void
  onManageVehicles: (customer: CreditCustomerWithStation) => void
}

// Format credit limit with type
function formatCreditLimit(type: string, value: number): string {
  if (type === "amount") {
    return formatCurrency(value)
  }
  return `${value.toLocaleString("en-IN")} L`
}

// Format discount for display
function formatDiscount(type: string | null, value: number | null): string {
  if (!type || value === null) return "—"
  if (type === "amount") {
    return `${formatCurrency(value)}/L`
  }
  return `${value}%`
}

export function getColumns({
  onEdit,
  onDelete,
  onViewDetails,
  onManageVehicles,
}: ColumnsProps): ColumnDef<CreditCustomerWithStation>[] {
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
        const customer = row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{customer.customer_name}</span>
            {customer.gst_number && (
              <span className="text-xs text-muted-foreground font-mono">
                GST: {customer.gst_number}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "station_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Station
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("station_name")}</span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("phone")}</span>
      ),
    },
    {
      accessorKey: "credit_limit_type",
      header: "Credit Limit",
      cell: ({ row }) => {
        const customer = row.original
        const limitType = customer.credit_limit_type
        const isAmount = limitType === "amount"
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">
              {formatCreditLimit(limitType, customer.credit_limit_value)}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded w-fit ${
                isAmount
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              }`}
            >
              {isAmount ? "Amount" : "Quantity"}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "current_balance",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Balance
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const balance = row.getValue("current_balance") as number
        const isPositive = balance > 0
        const isZero = balance === 0
        return (
          <span
            className={`font-medium font-mono ${
              isZero
                ? "text-muted-foreground"
                : isPositive
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatCurrency(balance)}
          </span>
        )
      },
    },
    {
      accessorKey: "discount_type",
      header: "Discount",
      cell: ({ row }) => {
        const customer = row.original
        return (
          <span className="text-muted-foreground">
            {formatDiscount(customer.discount_type, customer.discount_value)}
          </span>
        )
      },
    },
    {
      accessorKey: "vehicles_count",
      header: "Vehicles",
      cell: ({ row }) => {
        const count = row.getValue("vehicles_count") as number
        return (
          <div className="flex items-center gap-1.5">
            <Car className="size-4 text-muted-foreground" />
            <span className="font-medium">{count}</span>
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const customer = row.original
        const hasBalance = customer.current_balance > 0

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
              <DropdownMenuItem onClick={() => onViewDetails(customer)}>
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageVehicles(customer)}>
                <Car className="mr-2 size-4" />
                Manage Vehicles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(customer)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(customer.credit_customer_id)}
                disabled={hasBalance}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
                {hasBalance && (
                  <span className="ml-2 text-xs">(has balance)</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
