"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { PriceChartData } from "@/actions/daily-fuel-price"

interface PriceHistoryChartProps {
  chartData: PriceChartData[]
  fuelTypes: string[]
  colors: string[]
  isLoading?: boolean
}

export function PriceHistoryChart({
  chartData,
  fuelTypes,
  colors,
  isLoading = false,
}: PriceHistoryChartProps) {
  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    fuelTypes.forEach((fuelType, index) => {
      cfg[fuelType] = {
        label: fuelType,
        color: colors[index],
      }
    })
    return cfg
  }, [fuelTypes, colors])

  const lineComponents = useMemo(() => {
    return fuelTypes.map((fuelType, index) => (
      <Line
        key={fuelType}
        type="monotone"
        dataKey={fuelType}
        stroke={colors[index]}
        strokeWidth={2}
        dot={{ fill: colors[index], strokeWidth: 2, r: 4 }}
        activeDot={{ r: 6, strokeWidth: 2 }}
        connectNulls
      />
    ))
  }, [fuelTypes, colors])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Trend</CardTitle>
          <CardDescription>Loading price history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Trend</CardTitle>
          <CardDescription>No price history data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>No price history found for the selected filters.</p>
              <p className="text-sm mt-2">Add fuel prices to see trends here.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Trend</CardTitle>
        <CardDescription>
          Fuel price changes over time ({chartData.length} data points)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${value}`}
              domain={["auto", "auto"]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value, name) => (
                    <div className="flex flex-1 justify-between items-center leading-none gap-2">
                      <span className="text-muted-foreground">
                        {typeof name === "string" ? name : ""}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        ₹{(value as number).toFixed(2)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {lineComponents}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
