import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const ProductSalesList = dynamic(
  () => import("@/components/operations/product-sales-list").then(m => ({ default: m.ProductSalesList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function ProductSalesPage() {
  return <ProductSalesList />
}
