"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { PieChart as PieChartIcon, BarChart3 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { PaymentBreakdown } from "@/types/dashboard"

type ChartType = "pie" | "bar"

interface PaymentBreakdownChartProps {
  data: PaymentBreakdown
}

const SEGMENTS = [
  { key: "cash" as const, label: "Cash" },
  { key: "upi" as const, label: "UPI" },
  { key: "card" as const, label: "Card" },
  { key: "credit" as const, label: "Credit" },
]

const chartConfig = {
  cash: {
    label: "Cash",
    color: "hsl(var(--chart-1))",
  },
  upi: {
    label: "UPI",
    color: "hsl(var(--chart-2))",
  },
  card: {
    label: "Card",
    color: "hsl(var(--chart-3))",
  },
  credit: {
    label: "Credit",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

const CHART_TYPE_OPTIONS: { value: ChartType; icon: typeof PieChartIcon; label: string }[] = [
  { value: "pie", icon: PieChartIcon, label: "Pie" },
  { value: "bar", icon: BarChart3, label: "Bar" },
]

export function PaymentBreakdownChart({ data }: PaymentBreakdownChartProps) {
  const [chartType, setChartType] = useState<ChartType>("pie")
  const total = data.cash + data.upi + data.card + data.credit

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Breakdown</CardTitle>
          <CardDescription>No payment data for this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[220px] sm:h-[300px] items-center justify-center text-muted-foreground text-sm">
            Record daily sales to see payment breakdown
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = SEGMENTS.map((seg) => ({
    name: seg.key,
    label: seg.label,
    value: data[seg.key],
    fill: `var(--color-${seg.key})`,
  })).filter((d) => d.value > 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Breakdown</CardTitle>
            <CardDescription>Total: {formatCurrency(total)}</CardDescription>
          </div>
          <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
            {CHART_TYPE_OPTIONS.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setChartType(value)}
                className={`inline-flex items-center justify-center rounded-sm p-1.5 transition-colors ${
                  chartType === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={label}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-[260px] sm:min-h-[300px] w-full flex flex-col items-center">
          {chartType === "pie" ? (
            <>
              <ChartContainer config={chartConfig} className="h-[160px] sm:h-[200px] w-full">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="65%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="name"
                        formatter={(value) => (
                          <div className="flex flex-1 justify-between items-center leading-none gap-2">
                            <span className="font-mono font-medium tabular-nums">
                              {formatCurrency(value as number)}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
              <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1.5 sm:gap-y-2 mt-2">
                {SEGMENTS.map((seg) => {
                  const val = data[seg.key]
                  if (val === 0) return null
                  const pct = Math.round((val / total) * 100)
                  return (
                    <div key={seg.key} className="flex items-center gap-2 text-sm">
                      <div
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: chartConfig[seg.key].color }}
                      />
                      <span className="text-muted-foreground">{seg.label}</span>
                      <span className="font-medium ml-auto tabular-nums">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => {
                    if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`
                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
                    return `₹${value}`
                  }}
                  width={50}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value) => (
                        <div className="flex flex-1 justify-between items-center leading-none gap-2">
                          <span className="font-mono font-medium tabular-nums">
                            {formatCurrency(value as number)}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
