"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Loader2,
  Fuel,
  User,
  AlertCircle,
  Edit3,
  RotateCcw,
  Save,
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
import { toast } from "sonner"
import {
  getStationEmployeesForSaleRecord,
  getNozzlesForSaleEntry,
  getPreviousCloseReadings,
  getExistingSaleRecords,
  saveDailySaleRecords,
  getCreditCustomersForDSR,
  getVehiclesForDSR,
  type StationEmployee,
  type NozzleForSaleRecord,
  type SaleRecordInput,
  type ExistingSaleRecord,
  type CreditCustomerForDSR,
  type VehicleForDSR,
} from "@/actions/daily-sale-record"
import { getStationsWithFuelTypes, type StationWithFuelTypes } from "@/actions/daily-fuel-price"
import { useInvalidateQueries } from "@/hooks/use-data"
import { getTodayDateString, formatSnakeCase, cn } from "@/lib/utils"

interface NozzleFormData {
  nozzle_id: string
  pump_id: string
  nozzle_name: string
  pump_name: string
  fueltype_name: string
  fuel_price: number
  opening_reading: number
  close_reading: number
  testing_qty: number
  cash_sales: number
  upi_sales: number
  card_sales: number
  credit_sales: number
  credit_customer_id: string
  vehicle_id: string
  isEditing: boolean
  isFirstRecord: boolean
}

export function DailySaleRecordList() {
  const { invalidateStock } = useInvalidateQueries()
  const [loading, setLoading] = useState(true)
  const [loadingNozzles, setLoadingNozzles] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [selectedStation, setSelectedStation] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [saleDate, setSaleDate] = useState(getTodayDateString())

  // Data states
  const [stations, setStations] = useState<StationWithFuelTypes[]>([])
  const [employees, setEmployees] = useState<StationEmployee[]>([])
  const [nozzles, setNozzles] = useState<NozzleForSaleRecord[]>([])
  const [formData, setFormData] = useState<Map<string, NozzleFormData>>(new Map())
  const [isManager, setIsManager] = useState(false)

  // Credit customer states
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomerForDSR[]>([])
  const [vehiclesByCustomer, setVehiclesByCustomer] = useState<Map<string, VehicleForDSR[]>>(new Map())

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

  // Fetch employees and credit customers when station changes
  useEffect(() => {
    async function fetchStationData() {
      if (!selectedStation) {
        setEmployees([])
        setSelectedEmployee("")
        setCreditCustomers([])
        setVehiclesByCustomer(new Map())
        return
      }

      // Fetch employees and credit customers in parallel
      const [employeesResult, customersResult] = await Promise.all([
        getStationEmployeesForSaleRecord(selectedStation),
        getCreditCustomersForDSR(selectedStation),
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

      setSelectedEmployee("")
      setNozzles([])
      setFormData(new Map())
      setVehiclesByCustomer(new Map())
    }
    fetchStationData()
  }, [selectedStation])

  // Fetch nozzles when employee and date are selected
  const fetchNozzleData = useCallback(async () => {
    if (!selectedStation || !selectedEmployee || !saleDate) {
      setNozzles([])
      setFormData(new Map())
      return
    }

    setLoadingNozzles(true)

    try {
      // Fetch nozzles, previous readings, and existing records in parallel
      const [nozzlesResult, existingResult] = await Promise.all([
        getNozzlesForSaleEntry(selectedStation, selectedEmployee, saleDate),
        getExistingSaleRecords(selectedStation, saleDate),
      ])

      if (!nozzlesResult.success) {
        toast.error(nozzlesResult.error)
        setLoadingNozzles(false)
        return
      }

      setNozzles(nozzlesResult.nozzles)
      setIsManager(nozzlesResult.isManager)

      if (nozzlesResult.nozzles.length === 0) {
        setFormData(new Map())
        setLoadingNozzles(false)
        return
      }

      // Get nozzle IDs
      const nozzleIds = nozzlesResult.nozzles.map((n) => n.nozzle_id)

      // Fetch previous readings
      const previousResult = await getPreviousCloseReadings(selectedStation, nozzleIds, saleDate)

      // Create maps for quick lookup
      const existingRecordsMap = new Map<string, ExistingSaleRecord>()
      if (existingResult.success) {
        existingResult.records.forEach((r) => existingRecordsMap.set(r.nozzle_id, r))
      }

      const previousReadingsMap = new Map<string, number | null>()
      if (previousResult.success) {
        previousResult.readings.forEach((r) => previousReadingsMap.set(r.nozzle_id, r.close_reading))
      }

      // Initialize form data
      const newFormData = new Map<string, NozzleFormData>()

      for (const nozzle of nozzlesResult.nozzles) {
        const existingRecord = existingRecordsMap.get(nozzle.nozzle_id)
        const previousReading = previousReadingsMap.get(nozzle.nozzle_id)
        const isFirstRecord = previousReading === null && !existingRecord

        if (existingRecord) {
          // Edit mode: pre-fill with existing data
          newFormData.set(nozzle.nozzle_id, {
            nozzle_id: nozzle.nozzle_id,
            pump_id: nozzle.pump_id,
            nozzle_name: nozzle.nozzle_name,
            pump_name: nozzle.pump_name,
            fueltype_name: nozzle.fueltype_name,
            fuel_price: existingRecord.fuel_price,
            opening_reading: existingRecord.opening_reading,
            close_reading: existingRecord.close_reading,
            testing_qty: existingRecord.testing_qty || 0,
            cash_sales: existingRecord.cash_sales,
            upi_sales: existingRecord.upi_sales,
            card_sales: existingRecord.card_sales,
            credit_sales: existingRecord.credit_sales,
            credit_customer_id: "",
            vehicle_id: "",
            isEditing: true,
            isFirstRecord: false,
          })
        } else {
          // New record: auto-fill opening reading from previous close
          newFormData.set(nozzle.nozzle_id, {
            nozzle_id: nozzle.nozzle_id,
            pump_id: nozzle.pump_id,
            nozzle_name: nozzle.nozzle_name,
            pump_name: nozzle.pump_name,
            fueltype_name: nozzle.fueltype_name,
            fuel_price: nozzle.current_fuel_price,
            opening_reading: previousReading ?? 0,
            close_reading: 0,
            testing_qty: 0,
            cash_sales: 0,
            upi_sales: 0,
            card_sales: 0,
            credit_sales: 0,
            credit_customer_id: "",
            vehicle_id: "",
            isEditing: false,
            isFirstRecord,
          })
        }
      }

      setFormData(newFormData)
    } catch {
      toast.error("Failed to load nozzle data")
    }

    setLoadingNozzles(false)
  }, [selectedStation, selectedEmployee, saleDate])

  useEffect(() => {
    fetchNozzleData()
  }, [fetchNozzleData])

  // Handle form field change
  const handleFieldChange = useCallback((nozzleId: string, field: keyof NozzleFormData, value: number | string) => {
    setFormData((prev) => {
      const newMap = new Map(prev)
      const data = newMap.get(nozzleId)
      if (data) {
        newMap.set(nozzleId, { ...data, [field]: value })
      }
      return newMap
    })
  }, [])

  // Load vehicles for a credit customer
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

  // Calculate totals for a nozzle
  const calculateTotals = useCallback((data: NozzleFormData) => {
    const totalLiters = Math.max(0, data.close_reading - data.opening_reading - data.testing_qty)
    const totalAmount = totalLiters * data.fuel_price
    const paymentTotal = data.cash_sales + data.upi_sales + data.card_sales + data.credit_sales
    return { totalLiters, totalAmount, paymentTotal }
  }, [])

  // Reset form
  const handleReset = useCallback(() => {
    fetchNozzleData()
    toast.info("Form reset to original values")
  }, [fetchNozzleData])

  // Save records
  const handleSave = useCallback(async () => {
    if (!selectedStation || !selectedEmployee || !saleDate) {
      toast.error("Please select station, employee, and date")
      return
    }

    const records: SaleRecordInput[] = []
    formData.forEach((data) => {
      records.push({
        nozzle_id: data.nozzle_id,
        pump_id: data.pump_id,
        fuel_price: data.fuel_price,
        opening_reading: data.opening_reading,
        close_reading: data.close_reading,
        testing_qty: data.testing_qty,
        cash_sales: data.cash_sales,
        upi_sales: data.upi_sales,
        card_sales: data.card_sales,
        credit_sales: data.credit_sales,
        credit_customer_id: data.credit_customer_id || null,
        vehicle_id: data.vehicle_id || null,
      })
    })

    setSaving(true)
    const result = await saveDailySaleRecords(selectedStation, selectedEmployee, saleDate, records)
    setSaving(false)

    if (result.success) {
      toast.success(`Successfully saved ${result.savedCount} sale record(s)`)
      invalidateStock()
      // Refresh data to show updated "Editing" badges
      fetchNozzleData()
    } else {
      toast.error(result.error)
    }
  }, [selectedStation, selectedEmployee, saleDate, formData, fetchNozzleData, invalidateStock])

  // Get selected employee info
  const selectedEmployeeInfo = useMemo(() => {
    return employees.find((e) => e.employee_id === selectedEmployee)
  }, [employees, selectedEmployee])

  // Count records with data
  const recordsWithData = useMemo(() => {
    let count = 0
    formData.forEach((data) => {
      if (data.close_reading > 0) count++
    })
    return count
  }, [formData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Daily Sale Record</h2>
        <p className="text-muted-foreground">
          Record daily fuel sales with meter readings and payment breakdowns
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Select Details</CardTitle>
          <CardDescription>
            Choose station, employee, and date to enter sale records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Station Filter */}
            <div className="grid gap-2">
              <Label htmlFor="station-filter">Station</Label>
              <Select
                value={selectedStation || "placeholder"}
                onValueChange={(v) => setSelectedStation(v === "placeholder" ? "" : v)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Select station
                  </SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station.station_id} value={station.station_id}>
                      {station.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div className="grid gap-2">
              <Label htmlFor="employee-filter">Employee</Label>
              <Select
                value={selectedEmployee || "placeholder"}
                onValueChange={(v) => setSelectedEmployee(v === "placeholder" ? "" : v)}
                disabled={!selectedStation || employees.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Select employee
                  </SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.employee_id} value={employee.employee_id}>
                      {employee.employee_name} ({formatSnakeCase(employee.employee_role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="grid gap-2">
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
        </CardContent>
      </Card>

      {/* Employee Info Banner */}
      {selectedEmployeeInfo && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border">
          <User className="size-4 text-muted-foreground" />
          <span className="text-sm">
            Recording sales for <strong>{selectedEmployeeInfo.employee_name}</strong>{" "}
            <Badge variant="outline" className="ml-1">
              {formatSnakeCase(selectedEmployeeInfo.employee_role)}
            </Badge>
          </span>
          {isManager ? (
            <span className="text-xs text-muted-foreground ml-2">
              Showing all station nozzles
            </span>
          ) : (
            <span className="text-xs text-muted-foreground ml-2">
              Showing nozzles from assigned shifts
            </span>
          )}
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
            <p className="text-muted-foreground">
              Select a station to begin entering sale records
            </p>
          </CardContent>
        </Card>
      ) : !selectedEmployee ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <User className="size-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Select an employee who is recording the sales
            </p>
          </CardContent>
        </Card>
      ) : loadingNozzles ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading nozzles...</span>
        </div>
      ) : nozzles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="size-12 text-amber-500/70 mb-4" />
            {isManager ? (
              <>
                <p className="text-muted-foreground font-medium">
                  No nozzles found for this station
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please add nozzles in the Registration section first.
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground font-medium">
                  No active shifts found for this date
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This pump boy has no assigned nozzles on {saleDate}.
                  Please create a shift with nozzle assignment first.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Nozzle Sale Records */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nozzle Sale Records</CardTitle>
              <CardDescription>
                Enter meter readings and payment breakdown for each nozzle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Array.from(formData.values()).map((data) => (
                <NozzleEntryRow
                  key={data.nozzle_id}
                  data={data}
                  totals={calculateTotals(data)}
                  onFieldChange={handleFieldChange}
                  creditCustomers={creditCustomers}
                  vehicles={vehiclesByCustomer.get(data.credit_customer_id) || []}
                  onLoadVehicles={loadVehiclesForCustomer}
                />
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving || recordsWithData === 0}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Save Records ({recordsWithData})
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// Nozzle Entry Row Component
interface NozzleEntryRowProps {
  data: NozzleFormData
  totals: { totalLiters: number; totalAmount: number; paymentTotal: number }
  onFieldChange: (nozzleId: string, field: keyof NozzleFormData, value: number | string) => void
  creditCustomers: CreditCustomerForDSR[]
  vehicles: VehicleForDSR[]
  onLoadVehicles: (customerId: string) => void
}

function NozzleEntryRow({ data, totals, onFieldChange, creditCustomers, vehicles, onLoadVehicles }: NozzleEntryRowProps) {
  const handleChange = (field: keyof NozzleFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0
    onFieldChange(data.nozzle_id, field, value)
  }

  const handleCreditCustomerChange = (value: string) => {
    onFieldChange(data.nozzle_id, "credit_customer_id", value)
    onFieldChange(data.nozzle_id, "vehicle_id", "") // Clear vehicle when customer changes
    if (value) {
      onLoadVehicles(value)
    }
  }

  const handleVehicleChange = (value: string) => {
    onFieldChange(data.nozzle_id, "vehicle_id", value)
  }

  const showCreditCustomerSection = data.credit_sales > 0

  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Nozzle Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Fuel className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{data.nozzle_name}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm text-muted-foreground">{data.pump_name}</span>
              <span className="text-muted-foreground">|</span>
              <Badge variant="secondary">{data.fueltype_name}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.isFirstRecord && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              First Record
            </Badge>
          )}
          {data.isEditing && (
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              <Edit3 className="size-3 mr-1" />
              Editing
            </Badge>
          )}
        </div>
      </div>

      {/* Meter Readings Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Opening Reading</Label>
          <Input
            type="number"
            step="0.001"
            value={data.opening_reading}
            onChange={handleChange("opening_reading")}
            placeholder="0.000"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Close Reading</Label>
          <Input
            type="number"
            step="0.001"
            value={data.close_reading}
            onChange={handleChange("close_reading")}
            placeholder="0.000"
            className={cn(
              "font-mono",
              data.close_reading > 0 && data.close_reading < data.opening_reading && "border-red-500"
            )}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Testing QTY (L)</Label>
          <Input
            type="number"
            step="0.001"
            value={data.testing_qty}
            onChange={handleChange("testing_qty")}
            placeholder="0.000"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Fuel Price (₹/L)</Label>
          <Input
            type="number"
            step="0.01"
            value={data.fuel_price}
            onChange={handleChange("fuel_price")}
            placeholder="0.00"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Calculated</Label>
          <div className="h-9 px-3 py-2 rounded-md border bg-muted/50 font-mono text-sm flex items-center justify-between">
            <span>{totals.totalLiters.toFixed(3)} L</span>
            <span className="text-muted-foreground">|</span>
            <span className="font-semibold">₹{totals.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Breakdown Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Cash (₹)</Label>
          <Input
            type="number"
            step="0.01"
            value={data.cash_sales}
            onChange={handleChange("cash_sales")}
            placeholder="0.00"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">UPI (₹)</Label>
          <Input
            type="number"
            step="0.01"
            value={data.upi_sales}
            onChange={handleChange("upi_sales")}
            placeholder="0.00"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Card (₹)</Label>
          <Input
            type="number"
            step="0.01"
            value={data.card_sales}
            onChange={handleChange("card_sales")}
            placeholder="0.00"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Credit (₹)</Label>
          <Input
            type="number"
            step="0.01"
            value={data.credit_sales}
            onChange={handleChange("credit_sales")}
            placeholder="0.00"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Payment Total</Label>
          <div
            className={cn(
              "h-9 px-3 py-2 rounded-md border font-mono text-sm flex items-center",
              Math.abs(totals.paymentTotal - totals.totalAmount) > 0.01 && totals.totalAmount > 0
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-muted/50"
            )}
          >
            ₹{totals.paymentTotal.toFixed(2)}
            {Math.abs(totals.paymentTotal - totals.totalAmount) > 0.01 && totals.totalAmount > 0 && (
              <span className="ml-2 text-xs">
                ({totals.paymentTotal > totals.totalAmount ? "+" : ""}
                {(totals.paymentTotal - totals.totalAmount).toFixed(2)})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Credit Sale Details - shown when credit_sales > 0 */}
      {showCreditCustomerSection && creditCustomers.length > 0 && (
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Credit Sale Details
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              (Link this credit sale to a customer for tracking)
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Credit Customer</Label>
              <Select
                value={data.credit_customer_id || "none"}
                onValueChange={(v) => handleCreditCustomerChange(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No customer linked</SelectItem>
                  {creditCustomers.map((customer) => (
                    <SelectItem key={customer.credit_customer_id} value={customer.credit_customer_id}>
                      {customer.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Vehicle (Optional)</Label>
              <Select
                value={data.vehicle_id || "none"}
                onValueChange={(v) => handleVehicleChange(v === "none" ? "" : v)}
                disabled={!data.credit_customer_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={data.credit_customer_id ? "Select vehicle" : "Select customer first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vehicle</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                      {vehicle.vehicle_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
