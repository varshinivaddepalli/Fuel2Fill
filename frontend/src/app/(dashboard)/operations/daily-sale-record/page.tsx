import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const DailySaleRecordList = dynamic(
  () => import("@/components/operations/daily-sale-record-list").then(m => ({ default: m.DailySaleRecordList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function DailySaleRecordPage() {
  return <DailySaleRecordList />
}
