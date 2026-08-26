"use client"

import { Fragment, useEffect, useState, useCallback, useMemo } from "react"
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Truck,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Fuel,
  Package,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  getStationsForPurchases,
  getStationFuelTypesForPurchases,
  getStationTanksForPurchases,
  getStationProductsForPurchases,
  saveFuelPurchase,
  saveProductPurchase,
  deletePurchase,
  type StationForPurchases,
  type FuelTypeForPurchases,
  type TankForPurchases,
  type ProductForPurchases,
  type PurchaseHistoryItem,
} from "@/actions/purchases"
import { usePurchases, useInvalidateQueries } from "@/hooks/use-data"
import { getTodayDateString, formatCurrency, formatDateShort, formatSnakeCase } from "@/lib/utils"
import type { PurchaseType, PurchasePaymentMethod } from "@/types/database"

const PAYMENT_METHODS: { value: PurchasePaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "credit", label: "Credit" },
]

// ─── Tank Allocation ───────────────────────────────────────

interface TankAllocation {
  id: string
  tank_id: string
  quantity: number
}

// ─── Fuel Line Item ────────────────────────────────────────

interface FuelLineItem {
  id: string
  fuel_type_id: string
  purchase_price_per_liter: number
  total_quantity: number
  tank_allocations: TankAllocation[]
  // Cached data for this line item
  availableTanks: TankForPurchases[]
  loadingTanks: boolean
}

function createEmptyFuelLineItem(): FuelLineItem {
  return {
    id: crypto.randomUUID(),
    fuel_type_id: "",
    purchase_price_per_liter: 0,
    total_quantity: 0,
    tank_allocations: [{ id: crypto.randomUUID(), tank_id: "", quantity: 0 }],
    availableTanks: [],
    loadingTanks: false,
  }
}

// ─── Product Line Item ─────────────────────────────────────

interface ProductLineItem {
  id: string
  product_id: string
  purchase_price: number
  quantity: number
}

function createEmptyProductLineItem(): ProductLineItem {
  return {
    id: crypto.randomUUID(),
    product_id: "",
    purchase_price: 0,
    quantity: 0,
  }
}

const ITEMS_PER_PAGE = 10

export function PurchaseManagement() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Purchase type toggle
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("fuel")

  // Common form fields
  const [selectedStation, setSelectedStation] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateString())
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>("bank_transfer")
  const [vendorName, setVendorName] = useState("")
  const [notes, setNotes] = useState("")
  const [gstAmount, setGstAmount] = useState(0)

  // Fuel-specific
  const [fuelLineItems, setFuelLineItems] = useState<FuelLineItem[]>([createEmptyFuelLineItem()])

  // Product-specific
  const [productLineItems, setProductLineItems] = useState<ProductLineItem[]>([createEmptyProductLineItem()])

  // Cascading data
  const [stations, setStations] = useState<StationForPurchases[]>([])
  const [fuelTypes, setFuelTypes] = useState<FuelTypeForPurchases[]>([])
  const [products, setProducts] = useState<ProductForPurchases[]>([])
  const [loadingFuelTypes, setLoadingFuelTypes] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)

  // History filter states
  const [historyStation, setHistoryStation] = useState("")
  const [historyType, setHistoryType] = useState<"all" | PurchaseType>("all")
  const [historyDateFrom, setHistoryDateFrom] = useState("")
  const [historyDateTo, setHistoryDateTo] = useState("")
  const [historyPage, setHistoryPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseHistoryItem | null>(null)

  // History via React Query
  const { data: historyData, isLoading: historyLoading } = usePurchases()
  const { invalidatePurchases } = useInvalidateQueries()

  // Fetch stations on mount
  useEffect(() => {
    async function fetchStations() {
      setLoading(true)
      const result = await getStationsForPurchases()
      if (result.success) {
        setStations(result.stations)
      } else {
        toast.error(result.error)
      }
      setLoading(false)
    }
    fetchStations()
  }, [])

  // Fetch fuel types and products when station changes
  useEffect(() => {
    if (!selectedStation) {
      setFuelTypes([])
      setProducts([])
      return
    }

    async function fetchCascadingData() {
      setLoadingFuelTypes(true)
      setLoadingProducts(true)

      const [ftResult, pResult] = await Promise.all([
        getStationFuelTypesForPurchases(selectedStation),
        getStationProductsForPurchases(selectedStation),
      ])

      if (ftResult.success) {
        setFuelTypes(ftResult.fuelTypes)
      } else {
        toast.error(ftResult.error)
      }

      if (pResult.success) {
        setProducts(pResult.products)
      } else {
        toast.error(pResult.error)
      }

      setLoadingFuelTypes(false)
      setLoadingProducts(false)
    }

    fetchCascadingData()
    // Reset line items when station changes
    setFuelLineItems([createEmptyFuelLineItem()])
    setProductLineItems([createEmptyProductLineItem()])
  }, [selectedStation])

  // ─── Fuel Line Item Handlers ─────────────────────────────

  const addFuelLineItem = useCallback(() => {
    setFuelLineItems((prev) => [...prev, createEmptyFuelLineItem()])
  }, [])

  const removeFuelLineItem = useCallback((id: string) => {
    setFuelLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const updateFuelLineItem = useCallback(
    (id: string, field: keyof FuelLineItem, value: string | number) => {
      setFuelLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          return { ...item, [field]: value }
        })
      )
    },
    []
  )

  // Fetch tanks when a fuel type is selected on a line item
  const handleFuelTypeChange = useCallback(
    async (lineItemId: string, fuelTypeId: string) => {
      setFuelLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== lineItemId) return item
          return {
            ...item,
            fuel_type_id: fuelTypeId,
            loadingTanks: true,
            availableTanks: [],
            tank_allocations: [{ id: crypto.randomUUID(), tank_id: "", quantity: 0 }],
          }
        })
      )

      const result = await getStationTanksForPurchases(selectedStation, fuelTypeId)

      setFuelLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== lineItemId) return item
          return {
            ...item,
            loadingTanks: false,
            availableTanks: result.success ? result.tanks : [],
          }
        })
      )

      if (!result.success) {
        toast.error(result.error)
      }
    },
    [selectedStation]
  )

  // Tank allocation handlers
  const addTankAllocation = useCallback((lineItemId: string) => {
    setFuelLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== lineItemId) return item
        return {
          ...item,
          tank_allocations: [
            ...item.tank_allocations,
            { id: crypto.randomUUID(), tank_id: "", quantity: 0 },
          ],
        }
      })
    )
  }, [])

  const removeTankAllocation = useCallback((lineItemId: string, allocId: string) => {
    setFuelLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== lineItemId) return item
        if (item.tank_allocations.length <= 1) return item
        return {
          ...item,
          tank_allocations: item.tank_allocations.filter((a) => a.id !== allocId),
        }
      })
    )
  }, [])

  const updateTankAllocation = useCallback(
    (lineItemId: string, allocId: string, field: keyof TankAllocation, value: string | number) => {
      setFuelLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== lineItemId) return item
          return {
            ...item,
            tank_allocations: item.tank_allocations.map((a) => {
              if (a.id !== allocId) return a
              return { ...a, [field]: value }
            }),
          }
        })
      )
    },
    []
  )

  // ─── Product Line Item Handlers ──────────────────────────

  const addProductLineItem = useCallback(() => {
    setProductLineItems((prev) => [...prev, createEmptyProductLineItem()])
  }, [])

  const removeProductLineItem = useCallback((id: string) => {
    setProductLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const updateProductLineItem = useCallback(
    (id: string, field: keyof ProductLineItem, value: string | number) => {
      setProductLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          return { ...item, [field]: value }
        })
      )
    },
    []
  )

  // ─── Computed Values ─────────────────────────────────────

  const fuelLineItemsTotal = useMemo(() => {
    return fuelLineItems.reduce(
      (sum, item) => sum + item.purchase_price_per_liter * item.total_quantity,
      0
    )
  }, [fuelLineItems])

  const productLineItemsTotal = useMemo(() => {
    return productLineItems.reduce(
      (sum, item) => sum + item.purchase_price * item.quantity,
      0
    )
  }, [productLineItems])

  const lineItemsTotal = purchaseType === "fuel" ? fuelLineItemsTotal : productLineItemsTotal
  const invoiceTotal = lineItemsTotal + gstAmount

  const validFuelItems = useMemo(() => {
    return fuelLineItems.filter(
      (item) =>
        item.fuel_type_id &&
        item.purchase_price_per_liter > 0 &&
        item.total_quantity > 0 &&
        item.tank_allocations.some((a) => a.tank_id && a.quantity > 0)
    )
  }, [fuelLineItems])

  const validProductItems = useMemo(() => {
    return productLineItems.filter(
      (item) => item.product_id && item.purchase_price > 0 && item.quantity > 0
    )
  }, [productLineItems])

  const canSave =
    selectedStation &&
    purchaseDate &&
    (purchaseType === "fuel" ? validFuelItems.length > 0 : validProductItems.length > 0)

  // ─── Save Handler ────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!canSave) return

    setSaving(true)

    if (purchaseType === "fuel") {
      // Validate allocation sums
      for (const item of validFuelItems) {
        const allocSum = item.tank_allocations
          .filter((a) => a.tank_id && a.quantity > 0)
          .reduce((sum, a) => sum + a.quantity, 0)
        if (Math.abs(allocSum - item.total_quantity) > 0.01) {
          toast.error(
            `Tank allocation total (${allocSum.toFixed(3)}L) does not match fuel quantity (${item.total_quantity.toFixed(3)}L)`
          )
          setSaving(false)
          return
        }
      }

      const result = await saveFuelPurchase({
        stationId: selectedStation,
        purchaseDate,
        paymentMethod,
        vendorName: vendorName || undefined,
        notes: notes || undefined,
        gstAmount,
        fuelItems: validFuelItems.map((item) => ({
          fuel_type_id: item.fuel_type_id,
          purchase_price_per_liter: item.purchase_price_per_liter,
          total_quantity: item.total_quantity,
          tank_allocations: item.tank_allocations
            .filter((a) => a.tank_id && a.quantity > 0)
            .map((a) => ({ tank_id: a.tank_id, quantity: a.quantity })),
        })),
      })

      if (result.success) {
        toast.success("Fuel purchase saved successfully")
        resetForm()
        invalidatePurchases()
      } else {
        toast.error(result.error)
      }
    } else {
      const result = await saveProductPurchase({
        stationId: selectedStation,
        purchaseDate,
        paymentMethod,
        vendorName: vendorName || undefined,
        notes: notes || undefined,
        gstAmount,
        productItems: validProductItems.map((item) => ({
          product_id: item.product_id,
          purchase_price: item.purchase_price,
          quantity: item.quantity,
        })),
      })

      if (result.success) {
        toast.success("Product purchase saved successfully")
        resetForm()
        invalidatePurchases()
      } else {
        toast.error(result.error)
      }
    }

    setSaving(false)
  }, [
    canSave,
    purchaseType,
    selectedStation,
    purchaseDate,
    paymentMethod,
    vendorName,
    notes,
    gstAmount,
    validFuelItems,
    validProductItems,
    invalidatePurchases,
  ])

  const resetForm = useCallback(() => {
    setFuelLineItems([createEmptyFuelLineItem()])
    setProductLineItems([createEmptyProductLineItem()])
    setVendorName("")
    setNotes("")
    setGstAmount(0)
  }, [])

  // ─── Delete Handler ──────────────────────────────────────

  const handleDelete = useCallback(
    async (purchaseId: string) => {
      setDeleteConfirm(null)
      setDeleting(purchaseId)
      const result = await deletePurchase(purchaseId)
      if (result.success) {
        toast.success("Purchase deleted (stock restored)")
        invalidatePurchases()
      } else {
        toast.error(result.error)
      }
      setDeleting(null)
    },
    [invalidatePurchases]
  )

  // ─── Filtered History ────────────────────────────────────

  const filteredHistory = useMemo(() => {
    if (!historyData) return []
    let filtered = historyData
    if (historyStation) {
      filtered = filtered.filter((h) => h.station_id === historyStation)
    }
    if (historyType !== "all") {
      filtered = filtered.filter((h) => h.purchase_type === historyType)
    }
    if (historyDateFrom) {
      filtered = filtered.filter((h) => h.purchase_date >= historyDateFrom)
    }
    if (historyDateTo) {
      filtered = filtered.filter((h) => h.purchase_date <= historyDateTo)
    }
    return filtered
  }, [historyData, historyStation, historyType, historyDateFrom, historyDateTo])

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE))
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredHistory, historyPage])

  // Reset page when filters change
  useEffect(() => {
    setHistoryPage(1)
  }, [historyStation, historyType, historyDateFrom, historyDateTo])

  // Summary stats (reflect filters)
  const summaryStats = useMemo(() => {
    if (!filteredHistory) return { count: 0, total: 0 }
    return {
      count: filteredHistory.length,
      total: filteredHistory.reduce((sum, h) => sum + h.total_amount, 0),
    }
  }, [filteredHistory])

  // ─── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Summary Stats ────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Purchases</div>
            <div className="text-2xl font-bold">{summaryStats.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Amount</div>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.total, true)}</div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Entry Form ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Purchase Entry
          </CardTitle>
          <CardDescription>Record incoming fuel or product purchases from suppliers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Purchase Type Toggle */}
          <div className="space-y-2">
            <Label>Purchase Type</Label>
            <div className="flex gap-2">
              <Button
                variant={purchaseType === "fuel" ? "default" : "outline"}
                size="sm"
                onClick={() => setPurchaseType("fuel")}
              >
                <Fuel className="h-4 w-4 mr-1" />
                Fuel
              </Button>
              <Button
                variant={purchaseType === "product" ? "default" : "outline"}
                size="sm"
                onClick={() => setPurchaseType("product")}
              >
                <Package className="h-4 w-4 mr-1" />
                Product
              </Button>
            </div>
          </div>

          {/* Top-level selectors */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <Label htmlFor="purchase-date">Purchase Date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={getTodayDateString()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PurchasePaymentMethod)}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor Name (optional)</Label>
              <Input
                id="vendor-name"
                placeholder="Supplier name"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items */}
          {selectedStation && (
            <>
              {purchaseType === "fuel" && loadingFuelTypes ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading fuel types...
                </div>
              ) : purchaseType === "fuel" && fuelTypes.length === 0 && !loadingFuelTypes ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No active fuel types at this station. Add fuel types first.
                </div>
              ) : purchaseType === "product" && loadingProducts ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products...
                </div>
              ) : purchaseType === "product" && products.length === 0 && !loadingProducts ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No available products at this station. Add products first.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm font-medium">
                    {purchaseType === "fuel" ? "Fuel Items" : "Product Items"}
                  </div>

                  {/* ── Fuel Line Items ─────────────────────── */}
                  {purchaseType === "fuel" &&
                    fuelLineItems.map((item, idx) => (
                      <div key={item.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Fuel Item #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFuelLineItem(item.id)}
                            disabled={fuelLineItems.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {/* Fuel Type */}
                          <div className="space-y-1">
                            <Label className="text-xs">Fuel Type</Label>
                            <Select
                              value={item.fuel_type_id}
                              onValueChange={(val) => handleFuelTypeChange(item.id, val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {fuelTypes.map((ft) => (
                                  <SelectItem key={ft.fueltype_id} value={ft.fueltype_id}>
                                    {ft.fueltype_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Price per Liter */}
                          <div className="space-y-1">
                            <Label className="text-xs">Price per Liter (INR)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={item.purchase_price_per_liter || ""}
                              onChange={(e) =>
                                updateFuelLineItem(
                                  item.id,
                                  "purchase_price_per_liter",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>

                          {/* Total Quantity */}
                          <div className="space-y-1">
                            <Label className="text-xs">Total Quantity (Liters)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.001}
                              placeholder="0.000"
                              value={item.total_quantity || ""}
                              onChange={(e) =>
                                updateFuelLineItem(
                                  item.id,
                                  "total_quantity",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Computed amount */}
                        {item.purchase_price_per_liter > 0 && item.total_quantity > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Amount:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(item.purchase_price_per_liter * item.total_quantity, true)}
                            </span>
                          </div>
                        )}

                        {/* Tank Allocations */}
                        {item.fuel_type_id && (
                          <div className="space-y-2 pl-4 border-l-2 border-muted">
                            <div className="text-xs font-medium text-muted-foreground">
                              Tank Allocations
                            </div>
                            {item.loadingTanks ? (
                              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading tanks...
                              </div>
                            ) : item.availableTanks.length === 0 ? (
                              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                <AlertCircle className="h-3 w-3" />
                                No tanks found for this fuel type
                              </div>
                            ) : (
                              <>
                                {item.tank_allocations.map((alloc) => (
                                  <div
                                    key={alloc.id}
                                    className="grid grid-cols-[1fr_120px_32px] gap-2 items-end"
                                  >
                                    <div className="space-y-1">
                                      <Label className="text-xs">Tank</Label>
                                      <Select
                                        value={alloc.tank_id}
                                        onValueChange={(val) =>
                                          updateTankAllocation(item.id, alloc.id, "tank_id", val)
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select tank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {item.availableTanks.map((t) => (
                                            <SelectItem key={t.tank_id} value={t.tank_id}>
                                              {t.tank_name} ({t.current_stock.toFixed(0)}/{t.tank_capacity.toFixed(0)}{t.capacity_unit === "kg" ? "kg" : "L"})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Qty (L)</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        step={0.001}
                                        placeholder="0.000"
                                        value={alloc.quantity || ""}
                                        onChange={(e) =>
                                          updateTankAllocation(
                                            item.id,
                                            alloc.id,
                                            "quantity",
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeTankAllocation(item.id, alloc.id)}
                                      disabled={item.tank_allocations.length <= 1}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}

                                {/* Allocation sum validation */}
                                {item.total_quantity > 0 && (
                                  <AllocationSummary
                                    allocations={item.tank_allocations}
                                    totalQuantity={item.total_quantity}
                                  />
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addTankAllocation(item.id)}
                                  className="text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Tank
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                  {/* ── Product Line Items ──────────────────── */}
                  {purchaseType === "product" && (
                    <>
                      {/* Header row for wider screens */}
                      <div className="hidden lg:grid lg:grid-cols-[1fr_120px_100px_120px_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
                        <div>Product</div>
                        <div>Purchase Price</div>
                        <div>Quantity</div>
                        <div>Amount</div>
                        <div></div>
                      </div>

                      {productLineItems.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_120px_100px_120px_40px] items-start rounded-lg border p-3 lg:border-0 lg:p-0"
                        >
                          {/* Product */}
                          <div className="space-y-1">
                            <Label className="lg:hidden text-xs">Product</Label>
                            <Select
                              value={item.product_id}
                              onValueChange={(val) =>
                                updateProductLineItem(item.id, "product_id", val)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem
                                    key={p.station_product_id}
                                    value={p.station_product_id}
                                  >
                                    {p.product_name} (stock: {p.current_stock})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Purchase Price */}
                          <div className="space-y-1">
                            <Label className="lg:hidden text-xs">Purchase Price (INR)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={item.purchase_price || ""}
                              onChange={(e) =>
                                updateProductLineItem(
                                  item.id,
                                  "purchase_price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>

                          {/* Quantity */}
                          <div className="space-y-1">
                            <Label className="lg:hidden text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              placeholder="0"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                updateProductLineItem(
                                  item.id,
                                  "quantity",
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>

                          {/* Amount */}
                          <div className="space-y-1">
                            <Label className="lg:hidden text-xs">Amount</Label>
                            <div className="flex items-center h-9 text-sm font-medium">
                              {item.purchase_price > 0 && item.quantity > 0
                                ? formatCurrency(item.purchase_price * item.quantity, true)
                                : "—"}
                            </div>
                          </div>

                          {/* Remove */}
                          <div className="flex items-start justify-end lg:justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive"
                              onClick={() => removeProductLineItem(item.id)}
                              disabled={productLineItems.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Add Item Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={purchaseType === "fuel" ? addFuelLineItem : addProductLineItem}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add {purchaseType === "fuel" ? "Fuel Item" : "Product Item"}
                  </Button>

                  {/* GST & Notes */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="gst-amount">GST Amount (INR)</Label>
                      <Input
                        id="gst-amount"
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={gstAmount || ""}
                        onChange={(e) => setGstAmount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Invoice number, delivery notes, etc."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Summary & Actions */}
                  <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Items:{" "}
                        <span className="font-medium text-foreground">
                          {purchaseType === "fuel" ? validFuelItems.length : validProductItems.length}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Subtotal:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(lineItemsTotal, true)}
                        </span>
                      </span>
                      {gstAmount > 0 && (
                        <span className="text-muted-foreground">
                          GST:{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(gstAmount, true)}
                          </span>
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        Total:{" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(invoiceTotal, true)}
                        </span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={resetForm} disabled={saving}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button onClick={handleSave} disabled={!canSave || saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save Purchase
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
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>Past purchase records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* History Filters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
              <Label htmlFor="history-type">Type</Label>
              <Select
                value={historyType}
                onValueChange={(val) => setHistoryType(val as "all" | PurchaseType)}
              >
                <SelectTrigger id="history-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
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
              <Truck className="h-8 w-8 mb-2" />
              No purchases found
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((item) => (
                      <Fragment key={item.purchase_id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === item.purchase_id ? null : item.purchase_id
                            )
                          }
                        >
                          <TableCell>
                            {expandedRow === item.purchase_id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateShort(item.purchase_date)}
                          </TableCell>
                          <TableCell>{item.station_name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={item.purchase_type === "fuel" ? "default" : "secondary"}
                              className="capitalize"
                            >
                              {item.purchase_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {item.vendor_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {formatSnakeCase(item.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.gst_amount > 0 ? formatCurrency(item.gst_amount, true) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total_amount, true)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirm(item)
                              }}
                              disabled={deleting === item.purchase_id}
                            >
                              {deleting === item.purchase_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded row details */}
                        {expandedRow === item.purchase_id && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-muted/30 p-4">
                              <ExpandedPurchaseDetail item={item} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {(historyPage - 1) * ITEMS_PER_PAGE + 1}-
                    {Math.min(historyPage * ITEMS_PER_PAGE, filteredHistory.length)} of{" "}
                    {filteredHistory.length}
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

      {/* ─── Delete Confirmation ─────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteConfirm?.purchase_type} purchase of{" "}
              {deleteConfirm && formatCurrency(deleteConfirm.total_amount, true)}. Stock changes will
              be reversed automatically. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm.purchase_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Sub-Components ────────────────────────────────────────

function AllocationSummary({
  allocations,
  totalQuantity,
}: {
  allocations: TankAllocation[]
  totalQuantity: number
}) {
  const allocSum = allocations
    .filter((a) => a.tank_id && a.quantity > 0)
    .reduce((sum, a) => sum + a.quantity, 0)
  const diff = Math.abs(allocSum - totalQuantity)
  const isMatch = diff < 0.01

  return (
    <div className={`text-xs ${isMatch ? "text-muted-foreground" : "text-destructive"}`}>
      Allocated: {allocSum.toFixed(3)}L / {totalQuantity.toFixed(3)}L
      {isMatch && " (matched)"}
      {!isMatch && ` (${allocSum < totalQuantity ? "under" : "over"} by ${diff.toFixed(3)}L)`}
    </div>
  )
}

function ExpandedPurchaseDetail({ item }: { item: PurchaseHistoryItem }) {
  return (
    <div className="space-y-3 text-sm">
      {item.notes && (
        <div>
          <span className="text-muted-foreground">Notes:</span> {item.notes}
        </div>
      )}

      {item.fuel_items && item.fuel_items.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Fuel Items</div>
          <div className="rounded border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead className="text-right">Price/L</TableHead>
                  <TableHead className="text-right">Quantity (L)</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Tank Allocations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.fuel_items.map((fi) => (
                  <TableRow key={fi.fuel_item_id}>
                    <TableCell>{fi.fuel_type_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(fi.purchase_price_per_liter, true)}
                    </TableCell>
                    <TableCell className="text-right">{fi.total_quantity.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(fi.total_amount, true)}
                    </TableCell>
                    <TableCell>
                      {fi.allocations.map((a, i) => (
                        <span key={i}>
                          {a.tank_name}: {a.quantity.toFixed(3)}L
                          {i < fi.allocations.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {item.product_items && item.product_items.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Product Items</div>
          <div className="rounded border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.product_items.map((pi) => (
                  <TableRow key={pi.product_item_id}>
                    <TableCell>{pi.product_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(pi.purchase_price, true)}
                    </TableCell>
                    <TableCell className="text-right">{pi.quantity}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(pi.total_amount, true)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
