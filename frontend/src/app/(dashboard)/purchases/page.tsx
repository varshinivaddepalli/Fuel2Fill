import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const PurchaseManagement = dynamic(
  () => import("@/components/operations/purchase-management").then(m => ({ default: m.PurchaseManagement })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function PurchasesPage() {
  return <PurchaseManagement />
}
