import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: number
  changePercent: number
  format: "currency" | "number" | "liters"
  icon: LucideIcon
  invertTrend?: boolean
}

function formatValue(value: number, format: KpiCardProps["format"]): string {
  if (format === "currency") return formatCurrency(value)
  if (format === "liters") {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K L`
    return `${value.toFixed(1)} L`
  }
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString("en-IN")
}

export function KpiCard({ title, value, changePercent, format, icon: Icon, invertTrend }: KpiCardProps) {
  const isPositive = changePercent > 0
  const isNegative = changePercent < 0
  const isNeutral = changePercent === 0

  const trendIsGood = invertTrend ? isNegative : isPositive
  const trendIsBad = invertTrend ? isPositive : isNegative

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {title}
        </CardDescription>
        <CardTitle className="text-xl sm:text-2xl font-semibold tabular-nums">
          {formatValue(value, format)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs font-medium",
            trendIsGood && "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950",
            trendIsBad && "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950",
            isNeutral && "text-muted-foreground"
          )}
        >
          {isPositive ? (
            <TrendingUp className="size-3 mr-1" />
          ) : isNegative ? (
            <TrendingDown className="size-3 mr-1" />
          ) : (
            <Minus className="size-3 mr-1" />
          )}
          {isPositive ? "+" : ""}
          {changePercent}%
        </Badge>
      </CardContent>
    </Card>
  )
}
