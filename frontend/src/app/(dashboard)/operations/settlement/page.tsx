import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const SettlementManagement = dynamic(
  () => import("@/components/operations/settlement-management").then(m => ({ default: m.SettlementManagement })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function SettlementPage() {
  return <SettlementManagement />
}
