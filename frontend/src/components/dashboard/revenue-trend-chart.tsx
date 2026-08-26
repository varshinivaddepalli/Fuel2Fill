"use client"

import { useState } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  AreaChart as AreaChartIcon,
  BarChart3,
} from "lucide-react"
import type { RevenueTrendPoint } from "@/types/dashboard"

type ChartType = "area" | "bar"

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[]
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

function formatYAxis(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
  return `₹${value}`
}

const CHART_TYPE_OPTIONS: { value: ChartType; icon: typeof AreaChartIcon; label: string }[] = [
  { value: "area", icon: AreaChartIcon, label: "Area" },
  { value: "bar", icon: BarChart3, label: "Bar" },
]

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const [chartType, setChartType] = useState<ChartType>("area")

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>No sales data for this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[220px] sm:h-[300px] items-center justify-center text-muted-foreground text-sm">
            Record daily sales to see revenue trends
          </div>
        </CardContent>
      </Card>
    )
  }

  const sharedAxisProps = {
    x: {
      dataKey: "date" as const,
      tickLine: false,
      axisLine: false,
      tickMargin: 8,
      tickFormatter: (value: string) => value,
    },
    y: {
      tickLine: false,
      axisLine: false,
      tickFormatter: formatYAxis,
      width: 50,
    },
  }

  const tooltipContent = (
    <ChartTooltip
      content={
        <ChartTooltipContent
          formatter={(value) => (
            <div className="flex flex-1 justify-between items-center leading-none gap-2">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-mono font-medium tabular-nums">
                ₹{(value as number).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        />
      }
    />
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>{data.length} day{data.length !== 1 ? "s" : ""} of data</CardDescription>
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
        <ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px] w-full">
          {chartType === "area" ? (
            <AreaChart accessibilityLayer data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis {...sharedAxisProps.x} />
              <YAxis {...sharedAxisProps.y} />
              {tooltipContent}
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <BarChart accessibilityLayer data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis {...sharedAxisProps.x} />
              <YAxis {...sharedAxisProps.y} />
              {tooltipContent}
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
