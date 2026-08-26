"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { Loader2, Fuel, User, AlertCircle, RotateCcw, Save } from "lucide-react"
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
import { toast } from "sonner"
import {
  getStationEmployeesForSaleRecord,
  getNozzlesForSaleEntry,
  getPreviousCloseReadings,
  getExistingSaleRecords,
  getCreditCustomersForDSR,
  getVehiclesForDSR,
  getExistingCreditEntriesForDSR,
  saveDailyEntryRecords,
  type StationEmployee,
  type NozzleForSaleRecord,
  type ExistingSaleRecord,
  type CreditCustomerForDSR,
  type VehicleForDSR,
  type DailyEntryRecordInput,
} from "@/actions/daily-sale-record"
import {
  getStationsWithFuelTypes,
  getCurrentFuelPrices,
  updateDailyFuelPrice,
  type StationWithFuelTypes,
} from "@/actions/daily-fuel-price"
import {
  saveExpenses,
  type ExpenseLineItem,
} from "@/actions/expenses"
import {
  getAvailableProducts,
  saveProductSaleItems,
  type AvailableProduct,
  type ProductSaleLineItem,
} from "@/actions/product-sales"
import { useInvalidateQueries } from "@/hooks/use-data"
import { getTodayDateString, formatSnakeCase } from "@/lib/utils"
import { FuelPriceSection, type FuelPriceData } from "./fuel-price-section"
import { NozzleSaleSection } from "./nozzle-sale-section"
import { ExpenseSection, type ExpenseRowData } from "./expense-section"
import { ProductSaleSection, type ProductSaleRowData } from "./product-sale-section"
import type { NozzleEntryData } from "./nozzle-card"
import type { CreditEntryData } from "./credit-entry-row"

export function DailyEntryForm() {
  const { invalidateStock } = useInvalidateQueries()

  // Loading states
  const [loading, setLoading] = useState(true)
  const [loadingNozzles, setLoadingNozzles] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [selectedStation, setSelectedStation] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [entryDate, setEntryDate] = useState(getTodayDateString())

  // Data states
  const [stations, setStations] = useState<StationWithFuelTypes[]>([])
  const [employees, setEmployees] = useState<StationEmployee[]>([])
  const [isManager, setIsManager] = useState(false)

  // Fuel price state
  const [fuelPrices, setFuelPrices] = useState<FuelPriceData[]>([])

  // Nozzle state
  const [nozzleData, setNozzleData] = useState<Map<string, NozzleEntryData>>(new Map())

  // Credit customer state
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomerForDSR[]>([])
  const [vehiclesByCustomer, setVehiclesByCustomer] = useState<Map<string, VehicleForDSR[]>>(new Map())

  // Expense state
  const [expenseRows, setExpenseRows] = useState<ExpenseRowData[]>([])

  // Product sale state
  const [productSaleRows, setProductSaleRows] = useState<ProductSaleRowData[]>([])
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([])

  // Ref to read latest fuelPrices without making fetchNozzleData depend on them
  const fuelPricesRef = useRef(fuelPrices)
  useEffect(() => { fuelPricesRef.current = fuelPrices }, [fuelPrices])

  // Warn user before leaving with unsaved data
  useEffect(() => {
    const hasUnsavedData = nozzleData.size > 0 && Array.from(nozzleData.values()).some(
      (n) => n.close_reading > 0 || (n.credit_entries && n.credit_entries.length > 0)
    )
    if (!hasUnsavedData) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [nozzleData])

  // Fetch stations on mount
  useEffect(() => {
    async function fetchStations() {
      setLoading(true)
      setError(null)
      const result = await getStationsWithFuelTypes()
      if (result.success) {
        setStations(result.stations)
      } else {
        setError(result.error)
        toast.error(result.error)
      }
      setLoading(false)
    }
    fetchStations()
  }, [])

  // Fetch station-dependent data when station changes
  useEffect(() => {
    async function fetchStationData() {
      if (!selectedStation) {
        setEmployees([])
        setSelectedEmployee("")
        setCreditCustomers([])
        setVehiclesByCustomer(new Map())
        setFuelPrices([])
        setNozzleData(new Map())
        setExpenseRows([])
        setProductSaleRows([])
        setAvailableProducts([])
        return
      }

      const selectedStationData = stations.find((s) => s.station_id === selectedStation)

      // Fetch employees, credit customers, current prices, and available products in parallel
      const [employeesResult, customersResult, pricesResult, productsResult] = await Promise.all([
        getStationEmployeesForSaleRecord(selectedStation),
        getCreditCustomersForDSR(selectedStation),
        getCurrentFuelPrices(),
        getAvailableProducts(selectedStation),
      ])

      if (employeesResult.success) {
        setEmployees(employeesResult.employees)
      } else {
        toast.error(employeesResult.error)
        setEmployees([])
      }

      if (customersResult.success) {
        setCreditCustomers(customersResult.customers)
      } else {
        setCreditCustomers([])
      }

      if (productsResult.success) {
        setAvailableProducts(productsResult.products)
      } else {
        setAvailableProducts([])
      }

      // Build fuel prices from station fuel types + daily prices
      if (selectedStationData) {
        const dailyPriceMap = new Map<string, number>()
        if (pricesResult.success) {
          pricesResult.prices
            .filter((p) => p.station_id === selectedStation)
            .forEach((p) => dailyPriceMap.set(p.fueltype_id, p.new_price))
        }

        const prices: FuelPriceData[] = selectedStationData.fuel_types.map((ft) => {
          const dailyPrice = dailyPriceMap.get(ft.fueltype_id)
          const currentPrice = dailyPrice ?? ft.current_price
          return {
            fueltype_id: ft.fueltype_id,
            fueltype_name: ft.fueltype_name,
            current_price: currentPrice,
            new_price: currentPrice,
            changed: false,
          }
        })
        setFuelPrices(prices)
      }

      setSelectedEmployee("")
      setNozzleData(new Map())
      setVehiclesByCustomer(new Map())
      setExpenseRows([])
      setProductSaleRows([])
    }
    fetchStationData()
  }, [selectedStation, stations])

  // Fetch nozzle data when employee and date are set
  const fetchNozzleData = useCallback(async () => {
    if (!selectedStation || !selectedEmployee || !entryDate) {
      setNozzleData(new Map())
      return
    }

    setLoadingNozzles(true)

    try {
      // Fetch nozzles and existing records in parallel
      const [nozzlesResult, existingResult] = await Promise.all([
        getNozzlesForSaleEntry(selectedStation, selectedEmployee, entryDate),
        getExistingSaleRecords(selectedStation, entryDate),
      ])

      if (!nozzlesResult.success) {
        toast.error(nozzlesResult.error)
        setLoadingNozzles(false)
        return
      }

      setIsManager(nozzlesResult.isManager)

      if (nozzlesResult.nozzles.length === 0) {
        setNozzleData(new Map())
        setLoadingNozzles(false)
        return
      }

      const nozzleIds = nozzlesResult.nozzles.map((n) => n.nozzle_id)

      // Fetch previous readings and existing credit entries
      const [previousResult, creditEntriesResult] = await Promise.all([
        getPreviousCloseReadings(selectedStation, nozzleIds, entryDate),
        getExistingCreditEntriesForDSR(selectedStation, entryDate),
      ])

      // Create lookup maps
      const existingRecordsMap = new Map<string, ExistingSaleRecord>()
      if (existingResult.success) {
        existingResult.records.forEach((r) => existingRecordsMap.set(r.nozzle_id, r))
      }

      const previousReadingsMap = new Map<string, number | null>()
      if (previousResult.success) {
        previousResult.readings.forEach((r) => previousReadingsMap.set(r.nozzle_id, r.close_reading))
      }

      // Group existing credit entries by nozzle_id
      const creditEntriesByNozzle = new Map<string, CreditEntryData[]>()
      if (creditEntriesResult.success) {
        creditEntriesResult.entries.forEach((ce) => {
          const existing = creditEntriesByNozzle.get(ce.nozzle_id) || []
          existing.push({
            id: crypto.randomUUID(),
            credit_customer_id: ce.credit_customer_id,
            vehicle_id: ce.vehicle_id || "",
            entry_type: "amt",
            quantity: ce.fuel_quantity,
            amount: ce.credit_amount,
          })
          creditEntriesByNozzle.set(ce.nozzle_id, existing)

          // Pre-load vehicles for existing credit customers
          if (ce.credit_customer_id) {
            loadVehiclesForCustomer(ce.credit_customer_id)
          }
        })
      }

      // Build fuel price lookup from latest fuelPrices via ref (avoids stale closure)
      const fuelPriceMap = new Map<string, number>()
      fuelPricesRef.current.forEach((fp) => fuelPriceMap.set(fp.fueltype_id, fp.new_price))

      // Initialize nozzle data
      const newNozzleData = new Map<string, NozzleEntryData>()

      for (const nozzle of nozzlesResult.nozzles) {
        const existingRecord = existingRecordsMap.get(nozzle.nozzle_id)
        const previousReading = previousReadingsMap.get(nozzle.nozzle_id)
        const isFirstRecord = previousReading === null && !existingRecord
        const creditEntries = creditEntriesByNozzle.get(nozzle.nozzle_id) || []

        // Use fuel price from our fuelPrices state (which user may have edited)
        const fuelPrice = fuelPriceMap.get(nozzle.fueltype_id) ?? nozzle.current_fuel_price

        if (existingRecord) {
          newNozzleData.set(nozzle.nozzle_id, {
            nozzle_id: nozzle.nozzle_id,
            pump_id: nozzle.pump_id,
            nozzle_name: nozzle.nozzle_name,
            pump_name: nozzle.pump_name,
            fueltype_id: nozzle.fueltype_id,
            fueltype_name: nozzle.fueltype_name,
            fuel_price: existingRecord.fuel_price,
            opening_reading: existingRecord.opening_reading,
            close_reading: existingRecord.close_reading,
            testing_qty: existingRecord.testing_qty || 0,
            upi_sales: existingRecord.upi_sales,
            card_sales: existingRecord.card_sales,
            credit_entries: creditEntries,
            isEditing: true,
            isFirstRecord: false,
          })
        } else {
          newNozzleData.set(nozzle.nozzle_id, {
            nozzle_id: nozzle.nozzle_id,
            pump_id: nozzle.pump_id,
            nozzle_name: nozzle.nozzle_name,
            pump_name: nozzle.pump_name,
            fueltype_id: nozzle.fueltype_id,
            fueltype_name: nozzle.fueltype_name,
            fuel_price: fuelPrice,
            opening_reading: previousReading ?? 0,
            close_reading: 0,
            testing_qty: 0,
            upi_sales: 0,
            card_sales: 0,
            credit_entries: [],
            isEditing: false,
            isFirstRecord,
          })
        }
      }

      setNozzleData(newNozzleData)
    } catch {
      toast.error("Failed to load nozzle data")
    }

    setLoadingNozzles(false)
  }, [selectedStation, selectedEmployee, entryDate])

  useEffect(() => {
    fetchNozzleData()
  }, [fetchNozzleData])

  // Load vehicles for a credit customer (with caching)
  const loadVehiclesForCustomer = useCallback(async (customerId: string) => {
    if (!customerId || vehiclesByCustomer.has(customerId)) return

    const result = await getVehiclesForDSR(customerId)
    if (result.success) {
      setVehiclesByCustomer((prev) => {
        const newMap = new Map(prev)
        newMap.set(customerId, result.vehicles)
        return newMap
      })
    }
  }, [vehiclesByCustomer])

  // Handle fuel price change
  const handleFuelPriceChange = useCallback((fueltypeId: string, newPrice: number) => {
    setFuelPrices((prev) =>
      prev.map((fp) =>
        fp.fueltype_id === fueltypeId
          ? { ...fp, new_price: newPrice, changed: newPrice !== fp.current_price }
          : fp
      )
    )

    // Update nozzle fuel prices that use this fuel type
    setNozzleData((prev) => {
      const newMap = new Map(prev)
      newMap.forEach((nozzle, id) => {
        if (nozzle.fueltype_id === fueltypeId) {
          newMap.set(id, { ...nozzle, fuel_price: newPrice })
        }
      })
      return newMap
    })
  }, [])

  // Handle nozzle field change
  const handleNozzleFieldChange = useCallback((nozzleId: string, field: string, value: number) => {
    setNozzleData((prev) => {
      const newMap = new Map(prev)
      const data = newMap.get(nozzleId)
      if (data) {
        newMap.set(nozzleId, { ...data, [field]: value })
      }
      return newMap
    })
  }, [])

  // Credit entry handlers
  const handleCreditEntryAdd = useCallback((nozzleId: string) => {
    setNozzleData((prev) => {
      const newMap = new Map(prev)
      const data = newMap.get(nozzleId)
      if (data) {
        const newEntry: CreditEntryData = {
          id: crypto.randomUUID(),
          credit_customer_id: "",
          vehicle_id: "",
          entry_type: "qty",
          quantity: 0,
          amount: 0,
        }
        newMap.set(nozzleId, {
          ...data,
          credit_entries: [...data.credit_entries, newEntry],
        })
      }
      return newMap
    })
  }, [])

  const handleCreditEntryUpdate = useCallback((nozzleId: string, entryId: string, updates: Partial<CreditEntryData>) => {
    setNozzleData((prev) => {
      const newMap = new Map(prev)
      const data = newMap.get(nozzleId)
      if (data) {
        newMap.set(nozzleId, {
          ...data,
          credit_entries: data.credit_entries.map((ce) =>
            ce.id === entryId ? { ...ce, ...updates } : ce
          ),
        })
      }
      return newMap
    })
  }, [])

  const handleCreditEntryRemove = useCallback((nozzleId: string, entryId: string) => {
    setNozzleData((prev) => {
      const newMap = new Map(prev)
      const data = newMap.get(nozzleId)
      if (data) {
        newMap.set(nozzleId, {
          ...data,
          credit_entries: data.credit_entries.filter((ce) => ce.id !== entryId),
        })
      }
      return newMap
    })
  }, [])

  // Expense handlers
  const handleExpenseAdd = useCallback(() => {
    setExpenseRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: "",
        amount: 0,
        payment_method: "",
        vendor_name: "",
        description: "",
      },
    ])
  }, [])

  const handleExpenseUpdate = useCallback((id: string, updates: Partial<ExpenseRowData>) => {
    setExpenseRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }, [])

  const handleExpenseRemove = useCallback((id: string) => {
    setExpenseRows((prev) => prev.filter((row) => row.id !== id))
  }, [])

  // Product sale handlers
  const handleProductSaleAdd = useCallback(() => {
    setProductSaleRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: "",
        quantity: 0,
        unit_price: 0,
        payment_method: "",
      },
    ])
  }, [])

  const handleProductSaleUpdate = useCallback((id: string, updates: Partial<ProductSaleRowData>) => {
    setProductSaleRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }, [])

  const handleProductSaleRemove = useCallback((id: string) => {
    setProductSaleRows((prev) => prev.filter((row) => row.id !== id))
  }, [])

  // Reset
  const handleReset = useCallback(() => {
    fetchNozzleData()
    setExpenseRows([])
    setProductSaleRows([])
    toast.info("Form reset to original values")
  }, [fetchNozzleData])

  // Save flow
  const handleSave = useCallback(async () => {
    if (!selectedStation || !selectedEmployee || !entryDate) {
      toast.error("Please select station, employee, and date")
      return
    }

    setSaving(true)

    try {
      // Phase 1: Save changed fuel prices
      const changedPrices = fuelPrices.filter((fp) => fp.changed && fp.new_price > 0)
      if (changedPrices.length > 0) {
        const priceResults = await Promise.all(
          changedPrices.map((fp) =>
            updateDailyFuelPrice({
              station_id: selectedStation,
              fueltype_id: fp.fueltype_id,
              new_price: fp.new_price,
              effective_date: entryDate,
              employee_id: selectedEmployee,
            })
          )
        )

        const failedPrice = priceResults.find((r) => !r.success)
        if (failedPrice && !failedPrice.success) {
          toast.error(`Failed to update fuel price: ${failedPrice.error}`)
          setSaving(false)
          return
        }

        toast.success(`Updated ${changedPrices.length} fuel price(s)`)
      }

      // Phase 2: Save nozzle records + credit entries
      const records: DailyEntryRecordInput[] = []
      nozzleData.forEach((data) => {
        records.push({
          nozzle_id: data.nozzle_id,
          pump_id: data.pump_id,
          fuel_price: data.fuel_price,
          opening_reading: data.opening_reading,
          close_reading: data.close_reading,
          testing_qty: data.testing_qty,
          upi_sales: data.upi_sales,
          card_sales: data.card_sales,
          credit_entries: data.credit_entries
            .filter((ce) => ce.credit_customer_id && (ce.quantity > 0 || ce.amount > 0))
            .map((ce) => ({
              credit_customer_id: ce.credit_customer_id,
              vehicle_id: ce.vehicle_id || null,
              entry_type: ce.entry_type,
              fuel_quantity: ce.quantity,
              credit_amount: ce.amount,
            })),
        })
      })

      // Client-side validation
      for (const record of records) {
        if (record.close_reading > 0) {
          if (record.close_reading < record.opening_reading) {
            toast.error("Close reading must be >= opening reading")
            setSaving(false)
            return
          }
          const testingQty = record.testing_qty || 0
          const diff = record.close_reading - record.opening_reading
          if (testingQty > diff) {
            toast.error("Testing qty cannot exceed reading difference")
            setSaving(false)
            return
          }
          const totalLiters = diff - testingQty
          const totalAmount = totalLiters * record.fuel_price
          const creditTotal = record.credit_entries.reduce((s, ce) => s + ce.credit_amount, 0)
          const cashSales = totalAmount - record.upi_sales - record.card_sales - creditTotal
          if (cashSales < -0.01) {
            toast.error("Payment amounts exceed total sale amount (negative cash). Please review.")
            setSaving(false)
            return
          }
        }
      }

      const result = await saveDailyEntryRecords(selectedStation, selectedEmployee, entryDate, records)

      if (result.success) {
        toast.success(`Successfully saved ${result.savedCount} sale record(s)`)
        invalidateStock()
        // Update fuel price current_price to reflect saved values
        setFuelPrices((prev) =>
          prev.map((fp) => (fp.changed ? { ...fp, current_price: fp.new_price, changed: false } : fp))
        )
        // Refresh nozzle data to show "Editing" badges
        fetchNozzleData()
      } else {
        toast.error(result.error)
        setSaving(false)
        return
      }

      // Phase 3: Save expenses
      const validExpenses = expenseRows.filter((row) => row.category && row.amount > 0 && row.payment_method)
      if (validExpenses.length > 0) {
        const expenseItems: ExpenseLineItem[] = validExpenses.map((row) => ({
          category: row.category as ExpenseLineItem["category"],
          amount: row.amount,
          payment_method: row.payment_method as ExpenseLineItem["payment_method"],
          vendor_name: row.vendor_name || undefined,
          description: row.description || undefined,
        }))

        const expenseResult = await saveExpenses(selectedStation, selectedEmployee, entryDate, expenseItems)
        if (expenseResult.success) {
          toast.success(`Saved ${expenseResult.savedCount} expense(s)`)
          setExpenseRows([])
        } else {
          toast.error(`Expenses: ${expenseResult.error}`)
          setSaving(false)
          return
        }
      }

      // Phase 4: Save product sales
      const validProductSales = productSaleRows.filter((row) => row.product_id && row.quantity > 0 && row.payment_method)
      if (validProductSales.length > 0) {
        const productItems: ProductSaleLineItem[] = validProductSales.map((row) => ({
          product_id: row.product_id,
          quantity: row.quantity,
          unit_price: row.unit_price,
          payment_method: row.payment_method as ProductSaleLineItem["payment_method"],
        }))

        const productResult = await saveProductSaleItems(selectedStation, selectedEmployee, entryDate, productItems)
        if (productResult.success) {
          toast.success(`Saved ${productResult.savedCount} product sale(s)`)
          setProductSaleRows([])
          invalidateStock()
        } else {
          toast.error(`Product sales: ${productResult.error}`)
          setSaving(false)
          return
        }
      }
    } catch {
      toast.error("An unexpected error occurred while saving")
    }

    setSaving(false)
  }, [selectedStation, selectedEmployee, entryDate, fuelPrices, nozzleData, expenseRows, productSaleRows, fetchNozzleData, invalidateStock])

  // Selected employee info
  const selectedEmployeeInfo = useMemo(() => {
    return employees.find((e) => e.employee_id === selectedEmployee)
  }, [employees, selectedEmployee])

  // Count records with data
  const recordsWithData = useMemo(() => {
    let count = 0
    nozzleData.forEach((data) => {
      if (data.close_reading > 0) count++
    })
    return count
  }, [nozzleData])

  const hasChanges = useMemo(() => {
    return recordsWithData > 0 || fuelPrices.some((fp) => fp.changed) || expenseRows.length > 0 || productSaleRows.length > 0
  }, [recordsWithData, fuelPrices, expenseRows.length, productSaleRows.length])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Daily Entry</h2>
        <p className="text-muted-foreground">
          Set fuel prices and record daily sales in one place
        </p>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Select Details</CardTitle>
          <CardDescription>
            Choose station, date, and employee to begin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Station */}
            <div className="grid gap-2">
              <Label>Station</Label>
              <Select
                value={selectedStation || "placeholder"}
                onValueChange={(v) => setSelectedStation(v === "placeholder" ? "" : v)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select station</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.station_id} value={s.station_id}>
                      {s.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label>Entry Date</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                max={getTodayDateString()}
              />
            </div>

            {/* Employee */}
            <div className="grid gap-2">
              <Label>Recorded By</Label>
              <Select
                value={selectedEmployee || "placeholder"}
                onValueChange={(v) => setSelectedEmployee(v === "placeholder" ? "" : v)}
                disabled={!selectedStation || employees.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select employee</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.employee_id} value={e.employee_id}>
                      {e.employee_name} ({formatSnakeCase(e.employee_role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Info Banner */}
      {selectedEmployeeInfo && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border">
          <User className="size-4 text-muted-foreground" />
          <span className="text-sm">
            Recording for <strong>{selectedEmployeeInfo.employee_name}</strong>{" "}
            <Badge variant="outline" className="ml-1">
              {formatSnakeCase(selectedEmployeeInfo.employee_role)}
            </Badge>
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            {isManager ? "All station nozzles" : "Shift-assigned nozzles"}
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="size-12 text-destructive/70 mb-4" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : !selectedStation ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Fuel className="size-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Select a station to begin</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Fuel Price Section - always visible when station is selected */}
          <FuelPriceSection fuelPrices={fuelPrices} onPriceChange={handleFuelPriceChange} />

          {/* Nozzle Section - requires employee */}
          {!selectedEmployee ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <User className="size-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Select an employee to load nozzle sale entry
                </p>
              </CardContent>
            </Card>
          ) : loadingNozzles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading nozzles...</span>
            </div>
          ) : nozzleData.size === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="size-12 text-amber-500/70 mb-4" />
                {isManager ? (
                  <>
                    <p className="text-muted-foreground font-medium">No nozzles found for this station</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please add nozzles in the Registration section first.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground font-medium">No active shifts found for this date</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This employee has no assigned nozzles on {entryDate}. Create a shift first.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <NozzleSaleSection
              nozzleData={nozzleData}
              creditCustomers={creditCustomers}
              vehiclesByCustomer={vehiclesByCustomer}
              onFieldChange={handleNozzleFieldChange}
              onCreditEntryUpdate={handleCreditEntryUpdate}
              onCreditEntryAdd={handleCreditEntryAdd}
              onCreditEntryRemove={handleCreditEntryRemove}
              onLoadVehicles={loadVehiclesForCustomer}
            />
          )}

          {/* Expense Section */}
          {selectedEmployee && (
            <ExpenseSection
              rows={expenseRows}
              onAdd={handleExpenseAdd}
              onUpdate={handleExpenseUpdate}
              onRemove={handleExpenseRemove}
            />
          )}

          {/* Product Sale Section */}
          {selectedEmployee && (
            <ProductSaleSection
              rows={productSaleRows}
              products={availableProducts}
              onAdd={handleProductSaleAdd}
              onUpdate={handleProductSaleUpdate}
              onRemove={handleProductSaleRemove}
            />
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Save All
                  {recordsWithData > 0 && ` (${recordsWithData})`}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
