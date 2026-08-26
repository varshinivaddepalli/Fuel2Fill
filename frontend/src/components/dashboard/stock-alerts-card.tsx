import { Package, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ProductStockAlert } from "@/types/dashboard"

interface StockAlertsCardProps {
  products: ProductStockAlert[]
  showStationName: boolean
}

export function StockAlertsCard({ products, showStationName }: StockAlertsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="size-4" />
          Product Stock Alerts
        </CardTitle>
        <CardDescription>Items below minimum stock</CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="size-4" />
            All products sufficiently stocked
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.productId} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{product.productName}</p>
                  {showStationName && (
                    <p className="text-xs text-muted-foreground">{product.stationName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {product.currentStock} / {product.minimumStock}
                  </span>
                  <Badge
                    variant="secondary"
                    className={
                      product.currentStock === 0
                        ? "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950"
                        : "text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950"
                    }
                  >
                    {product.currentStock === 0 ? "Out" : "Low"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
