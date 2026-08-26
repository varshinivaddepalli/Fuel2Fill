"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil, CheckCircle2, XCircle, Clock, CalendarOff } from "lucide-react"
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
import { formatSnakeCase, formatDateShort, getInitials } from "@/lib/utils"
import type { AttendanceWithDetails } from "@/actions/attendance"
import type { AttendanceStatusType } from "@/types/database"

interface ColumnsProps {
  onDelete: (attendanceId: string) => void
  onEdit: (attendance: AttendanceWithDetails) => void
}

// Aggregated attendance type for Week/Month/Station views
export interface AggregatedAttendance {
  employee_id: string
  employee_name: string
  employee_role: string
  employee_photo: string | null
  station_id: string
  station_name: string
  total_days: number
  present_days: number
  absent_days: number
  half_day_days: number
  leave_days: number
}

const statusConfig: Record<AttendanceStatusType, { label: string; icon: typeof CheckCircle2; color: string }> = {
  present: {
    label: "Present",
    icon: CheckCircle2,
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  absent: {
    label: "Absent",
    icon: XCircle,
    color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  half_day: {
    label: "Half Day",
    icon: Clock,
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  leave: {
    label: "Leave",
    icon: CalendarOff,
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
}

export function getColumns({ onDelete, onEdit }: ColumnsProps): ColumnDef<AttendanceWithDetails>[] {
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
      cell: ({ row }) => {
        const attendance = row.original
        return (
          <div className="flex items-center gap-3">
            {attendance.employee_photo ? (
              <img
                src={attendance.employee_photo}
                alt={attendance.employee_name}
                className="size-8 rounded-full object-cover object-top"
              />
            ) : (
              <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {getInitials(attendance.employee_name)}
              </div>
            )}
            <div>
              <div className="font-medium">{attendance.employee_name}</div>
              <div className="text-xs text-muted-foreground">
                {formatSnakeCase(attendance.employee_role)}
              </div>
            </div>
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
        <div className="text-muted-foreground">{row.getValue("station_name")}</div>
      ),
    },
    {
      accessorKey: "attendance_date",
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
        <div className="font-mono text-sm">
          {formatDateShort(row.getValue("attendance_date"))}
        </div>
      ),
    },
    {
      accessorKey: "attendance_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("attendance_status") as AttendanceStatusType
        const config = statusConfig[status]
        const Icon = config.icon
        return (
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
            <Icon className="size-3.5" />
            {config.label}
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "hours_worked",
      header: "Hours",
      cell: ({ row }) => {
        const hours = row.getValue("hours_worked") as number | null
        return hours !== null ? (
          <span className="font-mono text-sm">{hours}h</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "marked_by_name",
      header: "Marked By",
      cell: ({ row }) => {
        const markedBy = row.getValue("marked_by_name") as string | null
        return markedBy ? (
          <span className="text-muted-foreground">{markedBy}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const attendance = row.original

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
              <DropdownMenuItem onClick={() => onEdit(attendance)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(attendance.attendance_id)}
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

// Aggregated columns for Week/Month/Station views (one row per employee)
export function getAggregatedColumns(): ColumnDef<AggregatedAttendance>[] {
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
      cell: ({ row }) => {
        const data = row.original
        return (
          <div className="flex items-center gap-3">
            {data.employee_photo ? (
              <img
                src={data.employee_photo}
                alt={data.employee_name}
                className="size-8 rounded-full object-cover object-top"
              />
            ) : (
              <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {getInitials(data.employee_name)}
              </div>
            )}
            <div>
              <div className="font-medium">{data.employee_name}</div>
              <div className="text-xs text-muted-foreground">
                {formatSnakeCase(data.employee_role)}
              </div>
            </div>
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
        <div className="text-muted-foreground">{row.getValue("station_name")}</div>
      ),
    },
    {
      accessorKey: "total_days",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Days
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const days = row.getValue("total_days") as number
        return (
          <span className="font-mono text-sm font-medium">
            {days} {days === 1 ? "day" : "days"}
          </span>
        )
      },
    },
    {
      accessorKey: "present_days",
      header: "Present",
      cell: ({ row }) => {
        const days = row.getValue("present_days") as number
        return days > 0 ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="size-3" />
            {days}
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "absent_days",
      header: "Absent",
      cell: ({ row }) => {
        const days = row.getValue("absent_days") as number
        return days > 0 ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
            <XCircle className="size-3" />
            {days}
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "half_day_days",
      header: "Half Day",
      cell: ({ row }) => {
        const days = row.getValue("half_day_days") as number
        return days > 0 ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="size-3" />
            {days}
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
    {
      accessorKey: "leave_days",
      header: "Leave",
      cell: ({ row }) => {
        const days = row.getValue("leave_days") as number
        return days > 0 ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <CalendarOff className="size-3" />
            {days}
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )
      },
    },
  ]
}
