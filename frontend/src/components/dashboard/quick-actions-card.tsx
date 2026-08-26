import Link from "next/link"
import {
  Fuel,
  UserCheck,
  CalendarClock,
  IndianRupee,
  Receipt,
  CreditCard,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const ACTIONS = [
  { label: "Record Sales", href: "/operations/daily-sale-record", icon: Fuel },
  { label: "Mark Attendance", href: "/employee/attendance", icon: UserCheck },
  { label: "Manage Shifts", href: "/employee/shifts", icon: CalendarClock },
  { label: "Update Fuel Price", href: "/operations/daily-fuel-price", icon: IndianRupee },
  { label: "Record Expense", href: "/operations/expenses", icon: Receipt },
  { label: "Credit Payments", href: "/credit/payments", icon: CreditCard },
]

export function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Frequently used operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <action.icon className="size-4 text-primary shrink-0" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
