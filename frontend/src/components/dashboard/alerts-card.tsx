import Link from "next/link"
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardAlert } from "@/types/dashboard"

interface AlertsCardProps {
  alerts: DashboardAlert[]
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4" />
          Alerts
        </CardTitle>
        <CardDescription>
          {alerts.length === 0
            ? "All systems normal"
            : `${alerts.length} alert${alerts.length !== 1 ? "s" : ""} requiring attention`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="size-4" />
            No alerts
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.link}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <AlertTriangle
                  className={`size-4 mt-0.5 shrink-0 ${
                    alert.severity === "critical" ? "text-red-500" : "text-yellow-500"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
