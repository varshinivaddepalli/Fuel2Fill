"use client"

import Link from "next/link"
import { PieChart, Pie, Cell } from "recharts"
import { Users, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"
import type { WorkforceData } from "@/types/dashboard"

interface WorkforceCardProps {
  data: WorkforceData
}

const chartConfig = {
  present: {
    label: "Present",
    color: "hsl(var(--chart-1))",
  },
  absent: {
    label: "Absent",
    color: "hsl(var(--chart-4))",
  },
  halfDay: {
    label: "Half Day",
    color: "hsl(var(--chart-3))",
  },
  leave: {
    label: "Leave",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function WorkforceCard({ data }: WorkforceCardProps) {
  const { attendance } = data
  const chartData = [
    { name: "Present", value: attendance.present, fill: "var(--color-present)" },
    { name: "Absent", value: attendance.absent, fill: "var(--color-absent)" },
    { name: "Half Day", value: attendance.halfDay, fill: "var(--color-halfDay)" },
    { name: "Leave", value: attendance.leave, fill: "var(--color-leave)" },
  ].filter((d) => d.value > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" />
          Workforce
        </CardTitle>
        <CardDescription>{data.totalEmployees} employees</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {attendance.total > 0 ? (
            <ChartContainer config={chartConfig} className="h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] shrink-0">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="30%"
                  outerRadius="48%"
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : null}
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium tabular-nums">{data.activeShifts}</span>
              <span className="text-muted-foreground"> active shifts</span>
            </div>
            <div>
              <span className="font-medium tabular-nums">{attendance.present}</span>
              <span className="text-muted-foreground"> / {attendance.total} present today</span>
            </div>
            {attendance.absent > 0 && (
              <div>
                <span className="font-medium tabular-nums text-red-600">{attendance.absent}</span>
                <span className="text-muted-foreground"> absent</span>
              </div>
            )}
          </div>
        </div>
        <Link
          href="/employee/attendance"
          className="flex items-center gap-1 mt-4 text-sm text-primary hover:underline"
        >
          View attendance
          <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  )
}
