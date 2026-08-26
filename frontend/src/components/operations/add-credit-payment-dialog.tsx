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
  getCustomersWithBalance,
  getEmployeesForPayment,
  addCreditPayment,
  type CustomerWithBalance,
  type EmployeeForPayment,
} from "@/actions/credit-payments"
import type { PaymentMode } from "@/types/database"
import { getTodayDateString, formatCurrency } from "@/lib/utils"

// Pre-fill data when paying for a specific transaction
export interface TransactionPaymentData {
  transaction_id: string
  credit_customer_id: string
  customer_name: string
  station_id: string
  station_name: string
  net_amount: number
  amount_paid: number
  amount_remaining: number
}

interface AddCreditPaymentDialogProps {
  onPaymentAdded: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  prefillTransaction?: TransactionPaymentData
}

const paymentModes: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
]

export function AddCreditPaymentDialog({
  onPaymentAdded,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  prefillTransaction,
}: AddCreditPaymentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([])
  const [employees, setEmployees] = useState<EmployeeForPayment[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Determine if we're in transaction payment mode
  const isTransactionPayment = !!prefillTransaction

  // Form state
  const [formData, setFormData] = useState({
    credit_customer_id: "",
    transaction_id: "" as string | null,
    employee_id: "",
    payment_date: getTodayDateString(),
    payment_amount: "",
    payment_mode: "cash" as PaymentMode,
    reference_number: "",
    notes: "",
  })

  // Pre-fill form when dialog opens with transaction data
  useEffect(() => {
    if (open && prefillTransaction) {
      setFormData((prev) => ({
        ...prev,
        credit_customer_id: prefillTransaction.credit_customer_id,
        transaction_id: prefillTransaction.transaction_id,
        payment_amount: prefillTransaction.amount_remaining.toString(),
      }))
    }
  }, [open, prefillTransaction])

  // Get selected customer for info display
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.credit_customer_id === formData.credit_customer_id)
  }, [customers, formData.credit_customer_id])

  // Calculate preview values
  const preview = useMemo(() => {
    const amount = parseFloat(formData.payment_amount) || 0
    // For transaction payments, use transaction's remaining amount as reference
    // For regular payments, use customer's total balance
    const currentBalance = isTransactionPayment
      ? (prefillTransaction?.amount_remaining || 0)
      : (selectedCustomer?.current_balance || 0)
    const newBalance = currentBalance - amount

    return {
      currentBalance,
      paymentAmount: amount,
      newBalance,
      isTransactionPayment,
    }
  }, [formData.payment_amount, selectedCustomer, isTransactionPayment, prefillTransaction])

  // Load customers when dialog opens
  useEffect(() => {
    if (!open) return

    async function loadCustomers() {
      setLoadingCustomers(true)
      const result = await getCustomersWithBalance()
      if (result.success) {
        setCustomers(result.customers)
      } else {
        setError(result.error)
      }
      setLoadingCustomers(false)
    }
    loadCustomers()
  }, [open])

  // Load employees when customer changes (based on station)
  // Or when in transaction payment mode
  useEffect(() => {
    // Determine station ID from either prefill or selected customer
    const stationId = prefillTransaction?.station_id || selectedCustomer?.station_id

    if (!stationId) {
      setEmployees([])
      return
    }

    async function loadEmployees() {
      setLoadingEmployees(true)
      const result = await getEmployeesForPayment(stationId!)
      if (result.success) {
        setEmployees(result.employees)
      }
      setLoadingEmployees(false)
    }
    loadEmployees()
  }, [selectedCustomer, prefillTransaction])

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear dependent fields when customer changes
    if (name === "credit_customer_id") {
      setFormData((prev) => ({
        ...prev,
        employee_id: "",
      }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.credit_customer_id) return "Please select a customer"
    if (!formData.employee_id) return "Please select an employee who received the payment"
    if (!formData.payment_date) return "Payment date is required"
    if (!formData.payment_mode) return "Payment mode is required"

    const amount = parseFloat(formData.payment_amount)
    if (!formData.payment_amount || isNaN(amount) || amount <= 0) {
      return "Payment amount must be greater than 0"
    }

    return null
  }

  const resetForm = () => {
    setFormData({
      credit_customer_id: "",
      transaction_id: null,
      employee_id: "",
      payment_date: getTodayDateString(),
      payment_amount: "",
      payment_mode: "cash",
      reference_number: "",
      notes: "",
    })
    setError(null)
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
      const result = await addCreditPayment({
        credit_customer_id: formData.credit_customer_id,
        transaction_id: formData.transaction_id || null,
        employee_id: formData.employee_id,
        payment_date: formData.payment_date,
        payment_amount: parseFloat(formData.payment_amount),
        payment_mode: formData.payment_mode,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
      })

      if (!result.success) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      toast.success("Payment recorded successfully!", {
        description: `${selectedCustomer?.customer_name} - ${formatCurrency(parseFloat(formData.payment_amount))}`,
      })

      resetForm()
      setOpen(false)
      onPaymentAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment")
    } finally {
      setIsLoading(false)
    }
  }

  // Show reference number field for non-cash payments
  const showReferenceField = formData.payment_mode !== "cash"

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isTransactionPayment ? "Pay for Transaction" : "Record Payment"}
        </DialogTitle>
        <DialogDescription>
          {isTransactionPayment
            ? `Record payment for ${prefillTransaction?.customer_name}'s transaction`
            : "Record a payment received from a credit customer"}
        </DialogDescription>
      </DialogHeader>

      {loadingCustomers ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>No credit customers found.</p>
          <p className="text-sm">Add credit customers first to record payments.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Customer Selection or Transaction Info */}
          <div className="space-y-4">
            {isTransactionPayment && prefillTransaction ? (
              /* Transaction Payment Mode - show transaction info */
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{prefillTransaction.customer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Station:</span>
                  <span>{prefillTransaction.station_name}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Transaction Amount:</span>
                  <span className="font-mono">{formatCurrency(prefillTransaction.net_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(prefillTransaction.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">Amount Remaining:</span>
                  <span className="font-mono text-amber-600">{formatCurrency(prefillTransaction.amount_remaining)}</span>
                </div>
              </div>
            ) : (
              /* Regular Payment Mode - show customer dropdown */
              <>
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
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-mono">{selectedCustomer.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Balance:</span>
                      <span className={`font-medium ${selectedCustomer.current_balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {formatCurrency(selectedCustomer.current_balance)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment Details */}
          {(formData.credit_customer_id || isTransactionPayment) && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Employee */}
                <div className="grid gap-2">
                  <Label htmlFor="employee_id">
                    Received By <span className="text-destructive">*</span>
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

                {/* Payment Date */}
                <div className="grid gap-2">
                  <Label htmlFor="payment_date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="payment_date"
                    name="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Payment Amount */}
                <div className="grid gap-2">
                  <Label htmlFor="payment_amount">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="payment_amount"
                    name="payment_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 5000.00"
                    value={formData.payment_amount}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>

                {/* Payment Mode */}
                <div className="grid gap-2">
                  <Label htmlFor="payment_mode">
                    Mode <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.payment_mode}
                    onValueChange={(value) => handleSelectChange("payment_mode", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reference Number (for non-cash payments) */}
              {showReferenceField && (
                <div className="grid gap-2">
                  <Label htmlFor="reference_number">
                    Reference Number
                    {(formData.payment_mode === "cheque" || formData.payment_mode === "bank_transfer") && (
                      <span className="text-muted-foreground text-xs ml-1">(Recommended)</span>
                    )}
                  </Label>
                  <Input
                    id="reference_number"
                    name="reference_number"
                    placeholder={
                      formData.payment_mode === "upi"
                        ? "UPI Transaction ID"
                        : formData.payment_mode === "card"
                        ? "Transaction Reference"
                        : formData.payment_mode === "cheque"
                        ? "Cheque Number"
                        : "Transaction Reference"
                    }
                    value={formData.reference_number}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              )}

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
          {(formData.credit_customer_id || isTransactionPayment) && formData.payment_amount && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Preview</h4>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isTransactionPayment ? "Amount Remaining:" : "Current Balance:"}
                  </span>
                  <span className={`font-mono ${preview.currentBalance > 0 ? "text-amber-600" : ""}`}>
                    {formatCurrency(preview.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="font-mono text-emerald-600">-{formatCurrency(preview.paymentAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-medium">
                    {isTransactionPayment ? "Remaining After:" : "New Balance:"}
                  </span>
                  <span className={`font-mono font-medium ${preview.newBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatCurrency(preview.newBalance)}
                  </span>
                </div>
                {isTransactionPayment && preview.newBalance <= 0 && (
                  <div className="text-xs text-emerald-600 pt-1">
                    Transaction will be marked as Paid
                  </div>
                )}
                {isTransactionPayment && preview.newBalance > 0 && (
                  <div className="text-xs text-amber-600 pt-1">
                    Transaction will be Partially Paid
                  </div>
                )}
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
            <Button type="submit" disabled={isLoading || (!formData.credit_customer_id && !isTransactionPayment)}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  Record Payment
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
          Record Payment
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  )
}
