import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const DailyFuelPriceList = dynamic(
  () => import("@/components/operations/daily-fuel-price-list").then(m => ({ default: m.DailyFuelPriceList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function DailyFuelPricePage() {
  return <DailyFuelPriceList />
}
