import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const AttendanceList = dynamic(
  () => import("@/components/employee/attendance-list").then(m => ({ default: m.AttendanceList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function AttendancePage() {
  return <AttendanceList />
}
