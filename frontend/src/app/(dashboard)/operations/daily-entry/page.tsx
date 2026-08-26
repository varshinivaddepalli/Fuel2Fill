import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const DailyEntryForm = dynamic(
  () => import("@/components/operations/daily-entry/daily-entry-form").then(m => ({ default: m.DailyEntryForm })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function DailyEntryPage() {
  return <DailyEntryForm />
}
