import Link from "next/link"
import { CreditCard, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, cn } from "@/lib/utils"
import type { CreditOverview } from "@/types/dashboard"

interface CreditOverviewCardProps {
  data: CreditOverview
}

export function CreditOverviewCard({ data }: CreditOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4" />
          Credit Overview
        </CardTitle>
        <CardDescription>
          {data.totalCustomers} active customer{data.totalCustomers !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.totalCustomers === 0 ? (
          <p className="text-sm text-muted-foreground">No credit customers</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xl sm:text-2xl font-semibold tabular-nums">
                {formatCurrency(data.totalOutstanding)}
              </p>
              <p className="text-xs text-muted-foreground">Total outstanding</p>
            </div>
            <div className="space-y-3">
              {data.topCustomers.map((cust) => (
                <div key={cust.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{cust.name}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                      {formatCurrency(cust.outstanding)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={Math.min(cust.utilization, 100)}
                      className={cn(
                        "h-1.5",
                        cust.utilization >= 90 && "[&>div]:bg-red-500",
                        cust.utilization >= 70 && cust.utilization < 90 && "[&>div]:bg-yellow-500",
                        cust.utilization < 70 && "[&>div]:bg-green-500"
                      )}
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                      {cust.utilization}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/credit/customers"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all customers
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
