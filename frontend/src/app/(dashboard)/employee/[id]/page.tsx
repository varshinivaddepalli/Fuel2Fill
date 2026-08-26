import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const EmployeeProfile = dynamic(
  () => import("@/components/employee/employee-profile").then(m => ({ default: m.EmployeeProfile })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

interface EmployeeProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function EmployeeProfilePage({ params }: EmployeeProfilePageProps) {
  const { id } = await params

  return (
    <div className="container py-6">
      <EmployeeProfile employeeId={id} />
    </div>
  )
}
