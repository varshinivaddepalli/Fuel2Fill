"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Clock, CheckCircle2, Trash2, StopCircle } from "lucide-react"
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
import { formatSnakeCase, formatTime, formatDateShort } from "@/lib/utils"
import type { ShiftWithDetails } from "@/actions/shifts"

interface ColumnsProps {
  onDelete: (shiftId: string) => void
  onEndShift: (shiftId: string) => void
}

export function getColumns({ onDelete, onEndShift }: ColumnsProps): ColumnDef<ShiftWithDetails>[] {
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
      accessorKey: "employee_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Employee
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("employee_name")}</div>
      ),
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
        <div className="text-muted-foreground">{row.getValue("station_name")}</div>
      ),
    },
    {
      accessorKey: "employee_role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("employee_role") as string
        const isManager = role === "manager"
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isManager
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {formatSnakeCase(role)}
          </span>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "start_time",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Time
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const shift = row.original
        const startTime = formatTime(shift.start_time)
        const endTime = shift.end_time ? formatTime(shift.end_time) : null
        const date = formatDateShort(shift.start_time)

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span>{startTime}</span>
              <span className="text-muted-foreground">-</span>
              {endTime ? (
                <span>{endTime}</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">Ongoing</span>
              )}
              {shift.total_hours && (
                <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                  ({shift.total_hours}h)
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{date}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "assigned_by_name",
      header: "Assigned By",
      cell: ({ row }) => {
        const assignedBy = row.getValue("assigned_by_name") as string | null
        return assignedBy ? (
          <span className="text-muted-foreground">{assignedBy}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "pump_name",
      header: "Pump",
      cell: ({ row }) => {
        const pumpName = row.getValue("pump_name") as string | null
        return pumpName ? (
          <span className="text-muted-foreground">{pumpName}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const shift = row.original
        const now = new Date()
        const hasEnded = shift.end_time && new Date(shift.end_time) < now

        return hasEnded ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Done</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs text-amber-600 dark:text-amber-400">In Progress</span>
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const shift = row.original
        const isOngoing = !shift.end_time

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
              {isOngoing && (
                <DropdownMenuItem onClick={() => onEndShift(shift.shift_id)}>
                  <StopCircle className="mr-2 size-4" />
                  End Shift
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(shift.shift_id)}
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
