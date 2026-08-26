import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const ViewEmployeeList = dynamic(
  () => import("@/components/employee/view-employee-list").then(m => ({ default: m.ViewEmployeeList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function ViewEmployeePage() {
  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">View Employees</h1>
        <p className="text-muted-foreground mt-2">
          All employees across your stations
        </p>
      </div>
      <ViewEmployeeList />
    </div>
  )
}
