import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const CreditPaymentList = dynamic(
  () => import("@/components/operations/credit-payment-list").then(m => ({ default: m.CreditPaymentList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function CreditPaymentsPage() {
  return <CreditPaymentList />
}
