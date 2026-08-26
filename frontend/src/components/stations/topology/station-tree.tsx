"use client"

import { useRef, useState, useEffect } from "react"
import { Building2 } from "lucide-react"
import { TreeNode } from "./tree-node"
import type { StationDetailData } from "@/actions/station-detail"

interface PathData {
  d: string
  dashed: boolean
  key: string
}

export function StationTree({ data }: { data: StationDetailData }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [paths, setPaths] = useState<PathData[]>([])

  const { station, pumps, nozzles, tanks, fuelTypes } = data
  const hasInfra =
    pumps.length > 0 || tanks.length > 0 || fuelTypes.length > 0

  // Calculate SVG connector paths after layout
  useEffect(() => {
    const container = containerRef.current
    if (!container || !hasInfra) {
      setPaths([])
      return
    }

    const calculate = () => {
      const containerRect = container.getBoundingClientRect()

      // Build connections from data
      const conns: { from: string; to: string; dashed?: boolean }[] = []

      for (const pump of pumps) {
        conns.push({
          from: `station-${station.station_id}`,
          to: `pump-${pump.pump_id}`,
        })
      }
      for (const nozzle of nozzles) {
        conns.push({
          from: `pump-${nozzle.pump_id}`,
          to: `nozzle-${nozzle.nozzle_id}`,
        })
        conns.push({
          from: `nozzle-${nozzle.nozzle_id}`,
          to: `tank-${nozzle.tank_id}`,
          dashed: true,
        })
      }
      for (const tank of tanks) {
        conns.push({
          from: `tank-${tank.tank_id}`,
          to: `fueltype-${tank.fueltype_id}`,
        })
      }

      const newPaths: PathData[] = []
      const seen = new Set<string>()

      for (const conn of conns) {
        const key = `${conn.from}→${conn.to}`
        if (seen.has(key)) continue
        seen.add(key)

        const fromEl = container.querySelector(
          `[data-node-id="${conn.from}"]`
        ) as HTMLElement | null
        const toEl = container.querySelector(
          `[data-node-id="${conn.to}"]`
        ) as HTMLElement | null
        if (!fromEl || !toEl) continue

        const fromRect = fromEl.getBoundingClientRect()
        const toRect = toEl.getBoundingClientRect()

        const fromX =
          fromRect.left + fromRect.width / 2 - containerRect.left
        const fromY = fromRect.top + fromRect.height - containerRect.top
        const toX = toRect.left + toRect.width / 2 - containerRect.left
        const toY = toRect.top - containerRect.top

        const midY = (fromY + toY) / 2

        newPaths.push({
          d: `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`,
          dashed: !!conn.dashed,
          key,
        })
      }

      setPaths(newPaths)
    }

    // Delay to ensure layout is settled
    const timeoutId = setTimeout(calculate, 80)

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculate)
    })
    observer.observe(container)

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [hasInfra, station, pumps, nozzles, tanks])

  if (!hasInfra) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="size-10 text-muted-foreground mb-3" />
        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
          {station.station_name}
        </h4>
        <p className="text-sm text-muted-foreground mt-1">
          No infrastructure added yet
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center gap-12 px-4 py-6"
    >
      {/* SVG overlay for connector lines */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ overflow: "visible" }}
      >
        {paths.map((path) => (
          <path
            key={path.key}
            d={path.d}
            fill="none"
            className={
              path.dashed
                ? "stroke-neutral-200 dark:stroke-neutral-700"
                : "stroke-neutral-300 dark:stroke-neutral-600"
            }
            strokeWidth={1.5}
            strokeDasharray={path.dashed ? "6 4" : undefined}
          />
        ))}
      </svg>

      {/* Level 0: Station */}
      <div className="relative z-10 flex justify-center">
        <TreeNode
          id={`station-${station.station_id}`}
          type="station"
          name={station.station_name}
          metadata={station.city}
          tooltip={`${station.address_line1}, ${station.city}, ${station.state}`}
        />
      </div>

      {/* Level 1: Pumps */}
      {pumps.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-6">
          {pumps.map((pump) => (
            <TreeNode
              key={pump.pump_id}
              id={`pump-${pump.pump_id}`}
              type="pump"
              name={pump.pump_name}
              metadata={`${pump.nozzle_count} nozzle${pump.nozzle_count !== 1 ? "s" : ""}`}
            />
          ))}
        </div>
      )}

      {/* Level 2: Nozzles grouped by pump */}
      {nozzles.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-8">
          {pumps.map((pump) => {
            const pumpNozzles = nozzles.filter(
              (n) => n.pump_id === pump.pump_id
            )
            if (pumpNozzles.length === 0) return null
            return (
              <div key={pump.pump_id} className="flex gap-3">
                {pumpNozzles.map((nozzle) => (
                  <TreeNode
                    key={nozzle.nozzle_id}
                    id={`nozzle-${nozzle.nozzle_id}`}
                    type="nozzle"
                    name={nozzle.nozzle_name}
                    tooltip={`Pump: ${nozzle.pump.pump_name} · Tank: ${nozzle.tank.tank_name}`}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Level 3: Tanks */}
      {tanks.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-6">
          {tanks.map((tank) => (
            <TreeNode
              key={tank.tank_id}
              id={`tank-${tank.tank_id}`}
              type="tank"
              name={tank.tank_name}
              metadata={`${tank.tank_capacity.toLocaleString()}L capacity`}
              tooltip={`Current: ${tank.current_stock.toLocaleString()}L · ${tank.fuel_type.fueltype_name}`}
            />
          ))}
        </div>
      )}

      {/* Level 4: Fuel Types */}
      {fuelTypes.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-6">
          {fuelTypes.map((ft) => (
            <TreeNode
              key={ft.fueltype_id}
              id={`fueltype-${ft.fueltype_id}`}
              type="fueltype"
              name={ft.fueltype_name}
              metadata={ft.unit_of_measure}
              tooltip={`Price: ₹${ft.fueltype_price}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
