import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const EmployeeShiftsList = dynamic(
  () => import("@/components/employee/employee-shifts-list").then(m => ({ default: m.EmployeeShiftsList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function EmployeeShiftsPage() {
  return (
    <div className="container py-6">
      <EmployeeShiftsList />
    </div>
  )
}
