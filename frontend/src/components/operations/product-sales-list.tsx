"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Package,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  getStationsForProductSales,
  getStationEmployeesForProductSales,
  getAvailableProducts,
  saveProductSaleItems,
  getProductSalesHistory,
  deleteProductSaleItem,
  type StationForProductSales,
  type StationEmployeeForProductSales,
  type AvailableProduct,
  type ProductSaleHistoryItem,
} from "@/actions/product-sales"
import { useProductSales, useInvalidateQueries } from "@/hooks/use-data"
import { getTodayDateString, formatCurrency, formatDateShort, formatSnakeCase } from "@/lib/utils"

interface LineItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  payment_method: "cash" | "upi" | "card" | "bank_transfer" | "credit"
}

function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    product_id: "",
    quantity: 1,
    unit_price: 0,
    payment_method: "cash",
  }
}

const ITEMS_PER_PAGE = 10

export function ProductSalesList() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Filter states (entry form)
  const [selectedStation, setSelectedStation] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [saleDate, setSaleDate] = useState(getTodayDateString())

  // History filter states
  const [historyStation, setHistoryStation] = useState("")
  const [historyDateFrom, setHistoryDateFrom] = useState("")
  const [historyDateTo, setHistoryDateTo] = useState("")
  const [historyPage, setHistoryPage] = useState(1)

  // Data states
  const [stations, setStations] = useState<StationForProductSales[]>([])
  const [employees, setEmployees] = useState<StationEmployeeForProductSales[]>([])
  const [products, setProducts] = useState<AvailableProduct[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)

  // History via React Query
  const { data: historyData, isLoading: historyLoading } = useProductSales()
  const { invalidateProductSales } = useInvalidateQueries()

  // Fetch stations on mount
  useEffect(() => {
    async function fetchStations() {
      setLoading(true)
      const result = await getStationsForProductSales()
      if (result.success) {
        setStations(result.stations)
      } else {
        toast.error(result.error)
      }
      setLoading(false)
    }
    fetchStations()
  }, [])

  // Fetch employees when station changes
  useEffect(() => {
    if (!selectedStation) {
      setEmployees([])
      setSelectedEmployee("")
      setProducts([])
      return
    }

    async function fetchEmployees() {
      setLoadingEmployees(true)
      const result = await getStationEmployeesForProductSales(selectedStation)
      if (result.success) {
        setEmployees(result.employees)
      } else {
        toast.error(result.error)
      }
      setLoadingEmployees(false)
    }

    async function fetchProducts() {
      setLoadingProducts(true)
      const result = await getAvailableProducts(selectedStation)
      if (result.success) {
        setProducts(result.products)
      } else {
        toast.error(result.error)
      }
      setLoadingProducts(false)
    }

    fetchEmployees()
    fetchProducts()
    setSelectedEmployee("")
  }, [selectedStation])

  // Product lookup map
  const productMap = useMemo(() => {
    const map = new Map<string, AvailableProduct>()
    products.forEach((p) => map.set(p.station_product_id, p))
    return map
  }, [products])

  // Line item handlers
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, createEmptyLineItem()])
  }, [])

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const updateLineItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }

        // Auto-fill unit_price when product changes
        if (field === "product_id" && typeof value === "string") {
          const product = products.find((p) => p.station_product_id === value)
          if (product) {
            updated.unit_price = product.selling_price
          }
        }

        return updated
      })
    )
  }, [products])

  // Computed values
  const validLineItems = useMemo(() => {
    return lineItems.filter((item) => item.product_id && item.quantity > 0 && item.unit_price > 0)
  }, [lineItems])

  const grandTotal = useMemo(() => {
    return validLineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }, [validLineItems])

  const canSave = selectedStation && selectedEmployee && saleDate && validLineItems.length > 0

  // Save handler
  const handleSave = useCallback(async () => {
    if (!canSave) return

    setSaving(true)
    const result = await saveProductSaleItems(
      selectedStation,
      selectedEmployee,
      saleDate,
      validLineItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        payment_method: item.payment_method,
      }))
    )

    if (result.success) {
      toast.success(`Saved ${result.savedCount} item(s) successfully`)
      setLineItems([createEmptyLineItem()])
      invalidateProductSales()
      // Refresh products to get updated stock
      const productsResult = await getAvailableProducts(selectedStation)
      if (productsResult.success) {
        setProducts(productsResult.products)
      }
    } else {
      toast.error(result.error)
    }
    setSaving(false)
  }, [canSave, selectedStation, selectedEmployee, saleDate, validLineItems, invalidateProductSales])

  // Reset handler
  const handleReset = useCallback(() => {
    setLineItems([createEmptyLineItem()])
  }, [])

  // Delete handler
  const handleDelete = useCallback(async (saleId: string) => {
    setDeleting(saleId)
    const result = await deleteProductSaleItem(saleId)
    if (result.success) {
      toast.success("Sale record deleted")
      invalidateProductSales()
      // Refresh products to get updated stock
      if (selectedStation) {
        const productsResult = await getAvailableProducts(selectedStation)
        if (productsResult.success) {
          setProducts(productsResult.products)
        }
      }
    } else {
      toast.error(result.error)
    }
    setDeleting(null)
  }, [invalidateProductSales, selectedStation])

  // Filtered history
  const filteredHistory = useMemo(() => {
    if (!historyData) return []
    let filtered = historyData
    if (historyStation) {
      filtered = filtered.filter((h) => h.station_id === historyStation)
    }
    if (historyDateFrom) {
      filtered = filtered.filter((h) => h.sale_date >= historyDateFrom)
    }
    if (historyDateTo) {
      filtered = filtered.filter((h) => h.sale_date <= historyDateTo)
    }
    return filtered
  }, [historyData, historyStation, historyDateFrom, historyDateTo])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE))
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredHistory, historyPage])

  // Reset page when filters change
  useEffect(() => {
    setHistoryPage(1)
  }, [historyStation, historyDateFrom, historyDateTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Entry Form ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Sales Entry
          </CardTitle>
          <CardDescription>
            Record non-fuel product sales (lubricants, coolants, accessories)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="station">Station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger id="station">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.station_id} value={s.station_id}>
                      {s.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
                disabled={!selectedStation || loadingEmployees}
              >
                <SelectTrigger id="employee">
                  <SelectValue
                    placeholder={
                      loadingEmployees ? "Loading..." : !selectedStation ? "Select station first" : "Select employee"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.employee_id} value={e.employee_id}>
                      {e.employee_name} ({e.employee_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-date">Sale Date</Label>
              <Input
                id="sale-date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                max={getTodayDateString()}
              />
            </div>
          </div>

          {/* Line Items */}
          {selectedStation && (
            <>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <AlertCircle className="h-4 w-4" />
                  No products available for this station. Add products first.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm font-medium">Line Items</div>

                  {/* Header row for wider screens */}
                  <div className="hidden md:grid md:grid-cols-[1fr_100px_120px_120px_120px_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
                    <div>Product</div>
                    <div>Qty</div>
                    <div>Unit Price</div>
                    <div>Payment</div>
                    <div>Amount</div>
                    <div></div>
                  </div>

                  {lineItems.map((item, index) => {
                    const product = productMap.get(item.product_id)
                    const lineTotal = item.quantity * item.unit_price

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_100px_120px_120px_120px_40px] items-start rounded-lg border p-3 md:border-0 md:p-0"
                      >
                        {/* Product */}
                        <div className="space-y-1">
                          <Label className="md:hidden text-xs">Product</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(val) => updateLineItem(item.id, "product_id", val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.station_product_id} value={p.station_product_id}>
                                  {p.product_name}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (Stock: {p.current_stock})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {product && (
                            <Badge variant="outline" className="text-xs">
                              Stock: {product.current_stock}
                            </Badge>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1">
                          <Label className="md:hidden text-xs">Quantity</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={product?.current_stock ?? 9999}
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="space-y-1">
                          <Label className="md:hidden text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.01}
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1">
                          <Label className="md:hidden text-xs">Payment</Label>
                          <Select
                            value={item.payment_method}
                            onValueChange={(val) => updateLineItem(item.id, "payment_method", val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1">
                          <Label className="md:hidden text-xs">Amount</Label>
                          <div className="flex h-9 items-center text-sm font-medium">
                            {formatCurrency(lineTotal, true)}
                          </div>
                        </div>

                        {/* Remove */}
                        <div className="flex items-start justify-end md:justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add Item Button */}
                  <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>

                  {/* Summary & Actions */}
                  <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Items: <span className="font-medium text-foreground">{validLineItems.length}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{formatCurrency(grandTotal, true)}</span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleReset} disabled={saving}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button onClick={handleSave} disabled={!canSave || saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── History Table ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
          <CardDescription>Past product sales records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* History Filters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="history-station">Station</Label>
              <Select
                value={historyStation || "all"}
                onValueChange={(val) => setHistoryStation(val === "all" ? "" : val)}
              >
                <SelectTrigger id="history-station">
                  <SelectValue placeholder="All stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.station_id} value={s.station_id}>
                      {s.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="history-date-from">From</Label>
              <Input
                id="history-date-from"
                type="date"
                value={historyDateFrom}
                onChange={(e) => setHistoryDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="history-date-to">To</Label>
              <Input
                id="history-date-to"
                type="date"
                value={historyDateTo}
                onChange={(e) => setHistoryDateTo(e.target.value)}
                max={getTodayDateString()}
              />
            </div>
          </div>

          {/* Table */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
              <Package className="h-8 w-8 mb-2" />
              No product sales found
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((item) => (
                      <TableRow key={item.product_sale_id}>
                        <TableCell className="whitespace-nowrap">{formatDateShort(item.sale_date)}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price, true)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_amount, true)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatSnakeCase(item.payment_method)}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.employee_name}</TableCell>
                        <TableCell>{item.station_name}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(item.product_sale_id)}
                            disabled={deleting === item.product_sale_id}
                          >
                            {deleting === item.product_sale_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {(historyPage - 1) * ITEMS_PER_PAGE + 1}-
                    {Math.min(historyPage * ITEMS_PER_PAGE, filteredHistory.length)} of {filteredHistory.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                      disabled={historyPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
