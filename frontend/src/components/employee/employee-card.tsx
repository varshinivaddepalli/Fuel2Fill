"use client"

import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatSnakeCase, getInitials, formatDateShort } from "@/lib/utils"
import type { Employee } from "@/types/database"

interface EmployeeCardProps {
  employee: Employee
}

export function EmployeeCard({ employee }: EmployeeCardProps) {
  const isManager = employee.employee_role === "manager"

  return (
    <Link
      href={`/employee/${employee.employee_id}`}
      className="block"
    >
      <div
        className={`
          group relative
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-800
          rounded-lg
          transition-all duration-150 ease-out
          hover:border-neutral-300 dark:hover:border-neutral-700
          hover:shadow-md
          cursor-pointer
        `}
      >
        {/* Main content - horizontal layout */}
        <div className="flex items-center gap-4 p-4">
          {/* Avatar with status indicator */}
          <div className="relative flex-shrink-0">
            <Avatar className="size-12 border border-neutral-200 dark:border-neutral-700">
              {employee.employee_photo ? (
                <AvatarImage
                  src={employee.employee_photo}
                  alt={employee.employee_name}
                  className="object-cover object-top"
                />
              ) : null}
              <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm font-medium">
                {getInitials(employee.employee_name)}
              </AvatarFallback>
            </Avatar>
            {/* Status dot */}
            <div
              className={`
                absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full
                border-2 border-white dark:border-neutral-900
                ${isManager ? "bg-blue-500" : "bg-emerald-500"}
              `}
              title={isManager ? "Manager" : "Active"}
            />
          </div>

          {/* Primary info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {employee.employee_name}
              </h3>
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  ${isManager
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }
                `}
              >
                {formatSnakeCase(employee.employee_role)}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-500">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400 dark:text-neutral-600">Joined</span>
                <span className="font-mono text-neutral-600 dark:text-neutral-400">
                  {formatDateShort(employee.joining_date)}
                </span>
              </div>
              <div className="w-px h-3 bg-neutral-200 dark:bg-neutral-700" />
              <div className="flex items-center gap-1.5">
                <span
                  className={`
                    size-1.5 rounded-full
                    ${employee.employment_type === "full_time"
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                    }
                  `}
                />
                <span className="text-neutral-600 dark:text-neutral-400">
                  {formatSnakeCase(employee.employment_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Right section - ID badge style */}
          <div className="hidden sm:flex flex-col items-end gap-1 pl-4 border-l border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
              Employee ID
            </span>
            <span className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
              {employee.employee_id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Hover indicator bar */}
        <div
          className={`
            absolute left-0 top-0 bottom-0 w-1 rounded-l-lg
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
            ${isManager ? "bg-blue-500" : "bg-emerald-500"}
          `}
        />
      </div>
    </Link>
  )
}
