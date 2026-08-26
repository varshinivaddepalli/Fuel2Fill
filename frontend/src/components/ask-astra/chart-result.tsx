"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig as ShadcnChartConfig,
} from "@/components/ui/chart";
import type { ChartConfig, ChartDataPoint, PieDataPoint } from "@/types/ask-astra";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface ChartResultProps {
  results: Record<string, unknown>[];
  config: ChartConfig;
}

export function ChartResult({ results, config }: ChartResultProps) {
  const { type, x_axis, y_axis, label_key, value_key } = config;

  const data = useMemo((): ChartDataPoint[] | PieDataPoint[] => {
    if (!results || results.length === 0) return [];

    if (type === "pie") {
      return results.map((row) => ({
        name: String(row[label_key || Object.keys(row)[0]] || ""),
        value: Number(row[value_key || Object.keys(row)[1]] || 0),
      })) as PieDataPoint[];
    }

    return results.map((row) => ({
      x: String(row[x_axis || Object.keys(row)[0]] || ""),
      y: Number(row[y_axis || Object.keys(row)[1]] || 0),
      ...row,
    })) as ChartDataPoint[];
  }, [results, type, x_axis, y_axis, label_key, value_key]);

  const chartConfig = useMemo((): ShadcnChartConfig => {
    if (type === "pie") {
      const pieData = data as PieDataPoint[];
      const cfg: ShadcnChartConfig = {};
      pieData.forEach((item, index) => {
        const safeKey = `slice-${index}`;
        cfg[safeKey] = {
          label: item.name,
          color: COLORS[index % COLORS.length],
        };
      });
      return cfg;
    }
    return {
      y: {
        label: y_axis?.replace(/_/g, " ") || "Value",
        color: COLORS[0],
      },
    };
  }, [type, data, y_axis]);

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data to display
      </div>
    );
  }

  if (type === "line") {
    return (
      <ChartContainer config={chartConfig} className="min-h-[220px] h-[220px] sm:h-[280px] md:h-[300px] w-full">
        <LineChart accessibilityLayer data={data as ChartDataPoint[]}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="y"
            name={y_axis?.replace(/_/g, " ") || "Value"}
            stroke="var(--color-y)"
            strokeWidth={2}
            dot={{ fill: "var(--color-y)", r: 3 }}
          />
        </LineChart>
      </ChartContainer>
    );
  }

  if (type === "bar") {
    return (
      <ChartContainer config={chartConfig} className="min-h-[220px] h-[220px] sm:h-[280px] md:h-[300px] w-full">
        <BarChart accessibilityLayer data={data as ChartDataPoint[]}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="y"
            name={y_axis?.replace(/_/g, " ") || "Value"}
            fill="var(--color-y)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    );
  }

  if (type === "pie") {
    const pieData = data as PieDataPoint[];

    return (
      <ChartContainer config={chartConfig} className="min-h-[220px] h-[220px] sm:h-[280px] md:h-[300px] w-full">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            label={({ name, percent }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
            labelLine={{ strokeWidth: 1 }}
          >
            {pieData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex flex-1 justify-between items-center leading-none gap-2">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {(value as number).toLocaleString()}
                    </span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
      </ChartContainer>
    );
  }

  return null;
}
