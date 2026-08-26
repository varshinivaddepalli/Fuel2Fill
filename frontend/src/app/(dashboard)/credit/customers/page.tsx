import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const CreditCustomerList = dynamic(
  () => import("@/components/operations/credit-customer-list").then(m => ({ default: m.CreditCustomerList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function CreditCustomersPage() {
  return <CreditCustomerList />
}
