"use client"

import Link from "next/link"
import { MoreHorizontal, Pencil, Trash2, MapPin, Phone, Fuel, Container, Gauge, Droplet, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePrefetch } from "@/hooks/use-data"
import type { StationWithCounts } from "@/actions/station-detail"

interface StationCardProps {
  station: StationWithCounts
  onEdit: (station: StationWithCounts) => void
  onDelete: (station: StationWithCounts) => void
}

export function StationCard({ station, onEdit, onDelete }: StationCardProps) {
  const isActive = station.status === "active"
  const { prefetchStationDetail } = usePrefetch()

  return (
    <Link
      href={`/registration/view-stations/${station.station_id}`}
      className={`
        group relative block
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-800
        rounded-lg
        transition-all duration-150 ease-out
        hover:border-neutral-300 dark:hover:border-neutral-700
        hover:shadow-md
        cursor-pointer
      `}
      onMouseEnter={() => prefetchStationDetail(station.station_id)}
    >
      {/* Header with status badge and dropdown */}
      <div className="flex items-center justify-between p-4 pb-2">
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={isActive
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
          }
        >
          {station.status}
        </Badge>

        {/* Dropdown menu - stops propagation to prevent navigation */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => {
              e.preventDefault()
              onEdit(station)
            }}>
              <Pencil className="mr-2 size-4" />
              Edit Station
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                onDelete(station)
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete Station
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main content */}
      <div className="px-4 pb-4">
        {/* Station name */}
        <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {station.station_name}
        </h3>

        {/* Address */}
        <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
          <MapPin className="size-4 mt-0.5 flex-shrink-0 text-neutral-400" />
          <span className="line-clamp-2">
            {station.address_line1}, {station.city}, {station.state}
          </span>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          <Phone className="size-4 flex-shrink-0 text-neutral-400" />
          <span className="font-mono">{station.station_phone}</span>
        </div>

        {/* Infrastructure counts summary */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-md p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5" title="Fuel Types">
              <Fuel className="size-4 text-amber-500" />
              <span className="text-neutral-700 dark:text-neutral-300">{station.fuel_type_count}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Tanks">
              <Container className="size-4 text-blue-500" />
              <span className="text-neutral-700 dark:text-neutral-300">{station.tank_count}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Pumps">
              <Gauge className="size-4 text-emerald-500" />
              <span className="text-neutral-700 dark:text-neutral-300">{station.pump_count}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Nozzles">
              <Droplet className="size-4 text-purple-500" />
              <span className="text-neutral-700 dark:text-neutral-300">{station.nozzle_count}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Products">
              <Package className="size-4 text-orange-500" />
              <span className="text-neutral-700 dark:text-neutral-300">{station.product_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hover indicator bar */}
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-1 rounded-l-lg
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
          ${isActive ? "bg-emerald-500" : "bg-neutral-400"}
        `}
      />
    </Link>
  )
}
