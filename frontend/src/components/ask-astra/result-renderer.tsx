"use client"

import dynamic from "next/dynamic"
import type { VisualizationType, ChartConfig } from "@/types/ask-astra"
import { TableResult } from "./table-result"
import { CardResultFromData } from "./card-result"

// Dynamic import recharts-heavy ChartResult — only loaded when visualization === "chart"
const ChartResult = dynamic(
  () => import("./chart-result").then(m => ({ default: m.ChartResult })),
  { loading: () => <div className="h-[300px] animate-pulse bg-accent rounded-md" /> }
)

interface ResultRendererProps {
  visualization: VisualizationType
  results?: Record<string, unknown>[]
  chartConfig?: ChartConfig
}

export function ResultRenderer({
  visualization,
  results,
  chartConfig,
}: ResultRendererProps) {
  if (!results || results.length === 0) {
    return null
  }

  switch (visualization) {
    case "card":
      return <CardResultFromData results={results} />

    case "chart":
      if (chartConfig) {
        return <ChartResult results={results} config={chartConfig} />
      }
      // Fallback to table if no chart config
      return <TableResult results={results} />

    case "table":
      return <TableResult results={results} />

    case "text":
    default:
      return null
  }
}
