import { Building2, Gauge, Droplet, Container, Fuel, type LucideIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type NodeType = "station" | "pump" | "nozzle" | "tank" | "fueltype"

interface TreeNodeProps {
  id: string
  type: NodeType
  name: string
  metadata?: string
  tooltip?: string
}

const nodeConfig: Record<
  NodeType,
  { icon: LucideIcon; colorClass: string; bgClass: string }
> = {
  station: {
    icon: Building2,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  pump: {
    icon: Gauge,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  nozzle: {
    icon: Droplet,
    colorClass: "text-purple-500",
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
  },
  tank: {
    icon: Container,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
  },
  fueltype: {
    icon: Fuel,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
  },
}

export function TreeNode({ id, type, name, metadata, tooltip }: TreeNodeProps) {
  const config = nodeConfig[type]
  const Icon = config.icon

  const card = (
    <div
      data-node-id={id}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2",
        "bg-white dark:bg-neutral-900",
        "border-neutral-200 dark:border-neutral-800",
        "shadow-sm text-sm whitespace-nowrap",
        type === "station" && "px-4 py-3 text-base"
      )}
    >
      <div className={cn("rounded-md p-1", config.bgClass)}>
        <Icon
          className={cn(
            "size-4",
            config.colorClass,
            type === "station" && "size-5"
          )}
        />
      </div>
      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            "font-medium leading-tight text-neutral-900 dark:text-neutral-100",
            type === "station" && "font-semibold"
          )}
        >
          {name}
        </span>
        {metadata && (
          <span className="text-xs leading-tight text-neutral-500">
            {metadata}
          </span>
        )}
      </div>
    </div>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return card
}
