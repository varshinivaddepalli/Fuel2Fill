import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const CreditTransactionList = dynamic(
  () => import("@/components/operations/credit-transaction-list").then(m => ({ default: m.CreditTransactionList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function CreditTransactionsPage() {
  return <CreditTransactionList />
}
