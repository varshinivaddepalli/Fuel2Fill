import { IndianRupee, Droplets, Receipt, TrendingUp, CreditCard } from "lucide-react"
import { KpiCard } from "./kpi-card"
import type { DashboardKpisData } from "@/types/dashboard"

interface KpiRowProps {
  data: DashboardKpisData
}

export function KpiRow({ data }: KpiRowProps) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        title="Revenue"
        value={data.revenue.value}
        changePercent={data.revenue.changePercent}
        format="currency"
        icon={IndianRupee}
      />
      <KpiCard
        title="Liters Sold"
        value={data.liters.value}
        changePercent={data.liters.changePercent}
        format="liters"
        icon={Droplets}
      />
      <KpiCard
        title="Expenses"
        value={data.expenses.value}
        changePercent={data.expenses.changePercent}
        format="currency"
        icon={Receipt}
        invertTrend
      />
      <KpiCard
        title="Net Profit"
        value={data.netProfit.value}
        changePercent={data.netProfit.changePercent}
        format="currency"
        icon={TrendingUp}
      />
      <KpiCard
        title="Credit Outstanding"
        value={data.creditOutstanding.value}
        changePercent={data.creditOutstanding.changePercent}
        format="currency"
        icon={CreditCard}
      />
    </div>
  )
}
