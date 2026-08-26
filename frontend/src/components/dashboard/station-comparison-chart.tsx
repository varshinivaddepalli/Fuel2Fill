"use client"

import {
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { StationComparisonItem } from "@/types/dashboard"

interface StationComparisonChartProps {
  data: StationComparisonItem[]
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  liters: {
    label: "Liters",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

function formatRevenue(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
  return `₹${value}`
}

export function StationComparisonChart({ data }: StationComparisonChartProps) {
  if (data.length <= 1) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Station Comparison</CardTitle>
        <CardDescription>Revenue and liters sold per station</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] sm:h-[300px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="stationName"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              yAxisId="revenue"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatRevenue}
              width={45}
            />
            <YAxis
              yAxisId="liters"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}L`}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex flex-1 justify-between items-center leading-none gap-2">
                      <span className="text-muted-foreground">
                        {name === "revenue" ? "Revenue" : "Liters"}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {name === "revenue"
                          ? `₹${(value as number).toLocaleString("en-IN")}`
                          : `${(value as number).toLocaleString("en-IN")} L`}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="revenue"
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              yAxisId="liters"
              dataKey="liters"
              fill="var(--color-liters)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
