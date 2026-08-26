"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCustomersForTransaction,
  getVehiclesForTransaction,
  getFuelTypesForTransaction,
  getEmployeesForTransaction,
  addCreditTransaction,
  type CustomerForTransaction,
  type VehicleForTransaction,
  type FuelTypeForTransaction,
  type EmployeeForTransaction,
} from "@/actions/credit-transactions"
import { getTodayDateString, formatCurrency } from "@/lib/utils"

interface AddCreditTransactionDialogProps {
  onTransactionAdded: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddCreditTransactionDialog({
  onTransactionAdded,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddCreditTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [customers, setCustomers] = useState<CustomerForTransaction[]>([])
  const [vehicles, setVehicles] = useState<VehicleForTransaction[]>([])
  const [fuelTypes, setFuelTypes] = useState<FuelTypeForTransaction[]>([])
  const [employees, setEmployees] = useState<EmployeeForTransaction[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [loadingVehicles, setLoadingVehicles] = useState(false)
  const [loadingFuelTypes, setLoadingFuelTypes] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    credit_customer_id: "",
    vehicle_id: "",
    fueltype_id: "",
    employee_id: "",
    transaction_date: getTodayDateString(),
    fuel_quantity: "",
    unit_price: "",
    notes: "",
  })

  // Get selected customer for info display
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.credit_customer_id === formData.credit_customer_id)
  }, [customers, formData.credit_customer_id])

  // Calculate preview values
  const preview = useMemo(() => {
    const quantity = parseFloat(formData.fuel_quantity) || 0
    const price = parseFloat(formData.unit_price) || 0
    const grossAmount = quantity * price

    let discountApplied = 0
    if (selectedCustomer?.discount_type && selectedCustomer?.discount_value) {
      if (selectedCustomer.discount_type === "amount") {
        // Discount per liter
        discountApplied = quantity * selectedCustomer.discount_value
      } else {
        // Percentage
        discountApplied = grossAmount * (selectedCustomer.discount_value / 100)
      }
    }

    const netAmount = grossAmount - discountApplied
    const newBalance = (selectedCustomer?.current_balance || 0) + netAmount

    return {
      grossAmount,
      discountApplied,
      netAmount,
      newBalance,
    }
  }, [formData.fuel_quantity, formData.unit_price, selectedCustomer])

  // Load customers when dialog opens
  useEffect(() => {
    if (!open) return

    async function loadCustomers() {
      setLoadingCustomers(true)
      const result = await getCustomersForTransaction()
      if (result.success) {
        setCustomers(result.customers)
      } else {
        setError(result.error)
      }
      setLoadingCustomers(false)
    }
    loadCustomers()
  }, [open])

  // Load vehicles when customer changes
  useEffect(() => {
    if (!formData.credit_customer_id) {
      setVehicles([])
      return
    }

    async function loadVehicles() {
      setLoadingVehicles(true)
      const result = await getVehiclesForTransaction(formData.credit_customer_id)
      if (result.success) {
        setVehicles(result.vehicles)
      }
      setLoadingVehicles(false)
    }
    loadVehicles()
  }, [formData.credit_customer_id])

  // Load fuel types and employees when customer changes (based on station)
  useEffect(() => {
    if (!selectedCustomer) {
      setFuelTypes([])
      setEmployees([])
      return
    }

    const stationId = selectedCustomer.station_id

    async function loadStationData() {
      setLoadingFuelTypes(true)
      setLoadingEmployees(true)

      const [fuelTypesResult, employeesResult] = await Promise.all([
        getFuelTypesForTransaction(stationId),
        getEmployeesForTransaction(stationId),
      ])

      if (fuelTypesResult.success) {
        setFuelTypes(fuelTypesResult.fuelTypes)
      }
      if (employeesResult.success) {
        setEmployees(employeesResult.employees)
      }

      setLoadingFuelTypes(false)
      setLoadingEmployees(false)
    }
    loadStationData()
  }, [selectedCustomer])

  // Auto-fill price when fuel type changes
  useEffect(() => {
    if (!formData.fueltype_id) return

    const selectedFuelType = fuelTypes.find((ft) => ft.fueltype_id === formData.fueltype_id)
    if (selectedFuelType) {
      setFormData((prev) => ({
        ...prev,
        unit_price: selectedFuelType.current_price.toString(),
      }))
    }
  }, [formData.fueltype_id, fuelTypes])

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear dependent fields when customer changes
    if (name === "credit_customer_id") {
      setFormData((prev) => ({
        ...prev,
        vehicle_id: "",
        fueltype_id: "",
        employee_id: "",
        unit_price: "",
      }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.credit_customer_id) return "Please select a customer"
    if (!formData.fueltype_id) return "Please select a fuel type"
    if (!formData.employee_id) return "Please select an employee"
    if (!formData.transaction_date) return "Transaction date is required"

    const quantity = parseFloat(formData.fuel_quantity)
    if (!formData.fuel_quantity || isNaN(quantity) || quantity <= 0) {
      return "Fuel quantity must be greater than 0"
    }

    const price = parseFloat(formData.unit_price)
    if (!formData.unit_price || isNaN(price) || price <= 0) {
      return "Unit price must be greater than 0"
    }

    return null
  }

  const resetForm = () => {
    setFormData({
      credit_customer_id: "",
      vehicle_id: "",
      fueltype_id: "",
      employee_id: "",
      transaction_date: getTodayDateString(),
      fuel_quantity: "",
      unit_price: "",
      notes: "",
    })
    setError(null)
    setVehicles([])
    setFuelTypes([])
    setEmployees([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      const result = await addCreditTransaction({
        credit_customer_id: formData.credit_customer_id,
        vehicle_id: formData.vehicle_id || null,
        fueltype_id: formData.fueltype_id,
        employee_id: formData.employee_id,
        transaction_date: formData.transaction_date,
        fuel_quantity: parseFloat(formData.fuel_quantity),
        unit_price: parseFloat(formData.unit_price),
        notes: formData.notes || null,
      })

      if (!result.success) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      toast.success("Credit transaction added successfully!", {
        description: `${selectedCustomer?.customer_name} - ${formatCurrency(preview.netAmount)}`,
      })

      resetForm()
      setOpen(false)
      onTransactionAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction")
    } finally {
      setIsLoading(false)
    }
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add Credit Transaction</DialogTitle>
        <DialogDescription>
          Record a credit fuel purchase for a customer
        </DialogDescription>
      </DialogHeader>

      {loadingCustomers ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>No credit customers found.</p>
          <p className="text-sm">Add credit customers first to record transactions.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Customer</h4>

            <div className="grid gap-2">
              <Label htmlFor="credit_customer_id">
                Select Customer <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.credit_customer_id}
                onValueChange={(value) => handleSelectChange("credit_customer_id", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.credit_customer_id} value={customer.credit_customer_id}>
                      <div className="flex flex-col">
                        <span>{customer.customer_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {customer.station_name} • Balance: {formatCurrency(customer.current_balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Info Display */}
            {selectedCustomer && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Station:</span>
                  <span>{selectedCustomer.station_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className={selectedCustomer.current_balance > 0 ? "text-amber-600 font-medium" : ""}>
                    {formatCurrency(selectedCustomer.current_balance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Limit:</span>
                  <span>
                    {selectedCustomer.credit_limit_type === "amount"
                      ? formatCurrency(selectedCustomer.credit_limit_value)
                      : `${selectedCustomer.credit_limit_value.toLocaleString("en-IN")} L`}
                  </span>
                </div>
                {selectedCustomer.discount_type && selectedCustomer.discount_value && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="text-emerald-600">
                      {selectedCustomer.discount_type === "amount"
                        ? `${formatCurrency(selectedCustomer.discount_value)}/L`
                        : `${selectedCustomer.discount_value}%`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Vehicle Selection (Optional) */}
            {formData.credit_customer_id && (
              <div className="grid gap-2">
                <Label htmlFor="vehicle_id">Vehicle (Optional)</Label>
                <Select
                  value={formData.vehicle_id || "none"}
                  onValueChange={(value) => handleSelectChange("vehicle_id", value === "none" ? "" : value)}
                  disabled={isLoading || loadingVehicles}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingVehicles ? "Loading..." : "Select a vehicle"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vehicle</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                        {vehicle.vehicle_number}
                        {vehicle.vehicle_type && ` (${vehicle.vehicle_type})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Transaction Details */}
          {formData.credit_customer_id && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Transaction Details</h4>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Fuel Type */}
                <div className="grid gap-2">
                  <Label htmlFor="fueltype_id">
                    Fuel Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.fueltype_id}
                    onValueChange={(value) => handleSelectChange("fueltype_id", value)}
                    disabled={isLoading || loadingFuelTypes}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingFuelTypes ? "Loading..." : "Select fuel type"} />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((ft) => (
                        <SelectItem key={ft.fueltype_id} value={ft.fueltype_id}>
                          {ft.fueltype_name} ({formatCurrency(ft.current_price)}/L)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Employee */}
                <div className="grid gap-2">
                  <Label htmlFor="employee_id">
                    Recorded By <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => handleSelectChange("employee_id", value)}
                    disabled={isLoading || loadingEmployees}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingEmployees ? "Loading..." : "Select employee"} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employee_id} value={emp.employee_id}>
                          {emp.employee_name} ({emp.employee_role === "manager" ? "Manager" : "Pump Boy"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Transaction Date */}
                <div className="grid gap-2">
                  <Label htmlFor="transaction_date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="transaction_date"
                    name="transaction_date"
                    type="date"
                    value={formData.transaction_date}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>

                {/* Fuel Quantity */}
                <div className="grid gap-2">
                  <Label htmlFor="fuel_quantity">
                    Quantity (L) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fuel_quantity"
                    name="fuel_quantity"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g., 50.000"
                    value={formData.fuel_quantity}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>

                {/* Unit Price */}
                <div className="grid gap-2">
                  <Label htmlFor="unit_price">
                    Price/L <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 105.50"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional notes..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Preview Section */}
          {formData.credit_customer_id && formData.fuel_quantity && formData.unit_price && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Preview</h4>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Amount:</span>
                  <span className="font-mono">{formatCurrency(preview.grossAmount)}</span>
                </div>
                {preview.discountApplied > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount Applied:</span>
                    <span className="font-mono text-emerald-600">-{formatCurrency(preview.discountApplied)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-medium">Net Amount:</span>
                  <span className="font-mono font-medium">{formatCurrency(preview.netAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New Balance:</span>
                  <span className={`font-mono ${preview.newBalance > 0 ? "text-amber-600" : ""}`}>
                    {formatCurrency(preview.newBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.credit_customer_id}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  Add Transaction
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  )

  // If controlled, don't wrap with DialogTrigger
  if (controlledOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetForm()
      }}>
        {dialogContent}
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  )
}
