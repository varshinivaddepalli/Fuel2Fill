"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Play,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react"
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
import { formatDateShort } from "@/lib/utils"
import type { ClickAstra } from "@/types/database"

interface ColumnsProps {
  onView: (record: ClickAstra) => void
  onProcess: (record: ClickAstra) => void
  onVerify: (record: ClickAstra) => void
  onDelete: (record: ClickAstra) => void
  deletingId: string | null
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "processing":
      return (
        <Badge variant="outline" className="animate-pulse">
          <Loader2 className="size-3 mr-1 animate-spin" />
          Processing
        </Badge>
      )
    case "completed":
      return (
        <Badge variant="default" className="bg-green-600">
          Completed
        </Badge>
      )
    case "verified":
      return (
        <Badge variant="default" className="bg-blue-600">
          <Check className="size-3 mr-1" />
          Verified
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive">
          <AlertCircle className="size-3 mr-1" />
          Failed
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function getColumns({
  onView,
  onProcess,
  onVerify,
  onDelete,
  deletingId,
}: ColumnsProps): ColumnDef<ClickAstra>[] {
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
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "date",
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
        <div className="text-muted-foreground font-mono text-sm">
          {formatDateShort(row.getValue("date"))}
        </div>
      ),
    },
    {
      accessorKey: "extraction_columns",
      header: "Columns",
      cell: ({ row }) => {
        const columns = (row.getValue("extraction_columns") as string[]) || []
        return (
          <div className="flex flex-wrap gap-1">
            {columns.slice(0, 3).map((col) => (
              <Badge key={col} variant="outline" className="text-xs">
                {col}
              </Badge>
            ))}
            {columns.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{columns.length - 3}
              </Badge>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "processing_status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("processing_status")} />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const record = row.original
        const isDeleting = deletingId === record.id

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
              <DropdownMenuItem onClick={() => onView(record)}>
                <Eye className="mr-2 size-4" />
                View Details
              </DropdownMenuItem>
              {record.processing_status === "pending" && (
                <DropdownMenuItem onClick={() => onProcess(record)}>
                  <Play className="mr-2 size-4" />
                  Process OCR
                </DropdownMenuItem>
              )}
              {record.processing_status === "completed" && (
                <DropdownMenuItem onClick={() => onVerify(record)}>
                  <Check className="mr-2 size-4" />
                  Verify Results
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(record)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 size-4" />
                )}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
