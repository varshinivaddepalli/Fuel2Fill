import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const StockView = dynamic(
  () => import("@/components/operations/stock-view").then(m => ({ default: m.StockView })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function StockPage() {
  return <StockView />
}
