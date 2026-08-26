"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  getStationsForCreditCustomers,
  addCreditCustomer,
  updateCreditCustomer,
  type StationForDropdown,
  type CreditCustomerWithStation,
} from "@/actions/credit-customers"
import { getTodayDateString, toNullIfEmpty } from "@/lib/utils"
import { validatePhone, validatePincode, validateGst } from "@/lib/validation/indian-formats"

// Simple email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return emailRegex.test(email)
}

interface AddCreditCustomerDialogProps {
  onCustomerAdded: () => void
  editCustomer?: CreditCustomerWithStation | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddCreditCustomerDialog({
  onCustomerAdded,
  editCustomer,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddCreditCustomerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [stations, setStations] = useState<StationForDropdown[]>([])
  const [loadingStations, setLoadingStations] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    station_id: "",
    customer_name: "",
    gst_number: "",
    phone: "",
    alt_phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    credit_limit_type: "amount" as "amount" | "quantity",
    credit_limit_value: "",
    discount_type: "none" as "none" | "amount" | "percentage",
    discount_value: "",
    registered_date: getTodayDateString(),
  })

  const isEditing = !!editCustomer

  // Load stations when dialog opens
  useEffect(() => {
    if (!open) return

    async function loadStations() {
      setLoadingStations(true)
      const result = await getStationsForCreditCustomers()
      if (result.success) {
        setStations(result.stations)
      } else {
        setError(result.error)
      }
      setLoadingStations(false)
    }
    loadStations()
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (editCustomer && open) {
      setFormData({
        station_id: editCustomer.station_id,
        customer_name: editCustomer.customer_name,
        gst_number: editCustomer.gst_number || "",
        phone: editCustomer.phone,
        alt_phone: editCustomer.alt_phone || "",
        email: editCustomer.email || "",
        address_line1: editCustomer.address_line1 || "",
        address_line2: editCustomer.address_line2 || "",
        city: editCustomer.city || "",
        state: editCustomer.state || "",
        pincode: editCustomer.pincode || "",
        credit_limit_type: editCustomer.credit_limit_type,
        credit_limit_value: editCustomer.credit_limit_value.toString(),
        discount_type: editCustomer.discount_type || "none",
        discount_value: editCustomer.discount_value?.toString() || "",
        registered_date: editCustomer.registered_date,
      })
    }
  }, [editCustomer, open])

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear discount value when discount type changes to "none"
    if (name === "discount_type" && value === "none") {
      setFormData((prev) => ({ ...prev, discount_value: "" }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "phone" || name === "alt_phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.station_id) return "Please select a station"
    if (!formData.customer_name.trim()) return "Customer name is required"
    if (!formData.phone.trim()) return "Phone number is required"

    // Validate phone (validatePhone returns error message or null)
    const phoneError = validatePhone(formData.phone)
    if (phoneError) return phoneError

    // Validate alternate phone if provided
    if (formData.alt_phone) {
      const altPhoneError = validatePhone(formData.alt_phone, false)
      if (altPhoneError) return altPhoneError
    }

    // Validate email if provided
    if (formData.email && !validateEmail(formData.email)) {
      return "Invalid email format"
    }

    // Validate GST if provided (validateGst returns error or null, but requires value)
    if (formData.gst_number) {
      const gstError = validateGst(formData.gst_number)
      if (gstError && gstError !== "GST number is required") return gstError
    }

    // Validate pincode if provided
    if (formData.pincode) {
      const pincodeError = validatePincode(formData.pincode, false)
      if (pincodeError) return pincodeError
    }

    // Validate credit limit
    if (!formData.credit_limit_value) return "Credit limit is required"
    const creditLimit = parseFloat(formData.credit_limit_value)
    if (isNaN(creditLimit) || creditLimit <= 0) {
      return "Credit limit must be greater than 0"
    }

    // Validate discount if type is selected (not "none")
    if (formData.discount_type !== "none") {
      if (!formData.discount_value) return "Discount value is required when type is selected"
      const discountValue = parseFloat(formData.discount_value)
      if (isNaN(discountValue) || discountValue < 0) {
        return "Discount value cannot be negative"
      }
      if (formData.discount_type === "percentage" && discountValue > 100) {
        return "Percentage discount cannot exceed 100%"
      }
    }

    return null
  }

  const resetForm = () => {
    setFormData({
      station_id: "",
      customer_name: "",
      gst_number: "",
      phone: "",
      alt_phone: "",
      email: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
      credit_limit_type: "amount",
      credit_limit_value: "",
      discount_type: "none",
      discount_value: "",
      registered_date: getTodayDateString(),
    })
    setError(null)
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
      const hasDiscount = formData.discount_type !== "none"
      const customerData = {
        station_id: formData.station_id,
        customer_name: formData.customer_name.trim(),
        gst_number: toNullIfEmpty(formData.gst_number.toUpperCase()),
        phone: formData.phone.trim(),
        alt_phone: toNullIfEmpty(formData.alt_phone),
        email: toNullIfEmpty(formData.email.toLowerCase()),
        address_line1: toNullIfEmpty(formData.address_line1),
        address_line2: toNullIfEmpty(formData.address_line2),
        city: toNullIfEmpty(formData.city),
        state: toNullIfEmpty(formData.state),
        pincode: toNullIfEmpty(formData.pincode),
        credit_limit_type: formData.credit_limit_type,
        credit_limit_value: parseFloat(formData.credit_limit_value),
        discount_type: hasDiscount ? formData.discount_type as "amount" | "percentage" : null,
        discount_value: hasDiscount && formData.discount_value
          ? parseFloat(formData.discount_value)
          : null,
        registered_date: formData.registered_date,
      }

      let result
      if (isEditing) {
        result = await updateCreditCustomer({
          credit_customer_id: editCustomer!.credit_customer_id,
          ...customerData,
        })
      } else {
        result = await addCreditCustomer(customerData)
      }

      if (!result.success) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      toast.success(isEditing ? "Customer updated successfully!" : "Customer added successfully!", {
        description: formData.customer_name,
      })

      resetForm()
      setOpen(false)
      onCustomerAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer")
    } finally {
      setIsLoading(false)
    }
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Credit Customer" : "Add Credit Customer"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the credit customer details"
            : "Add a new credit customer to manage credit sales"}
        </DialogDescription>
      </DialogHeader>

      {loadingStations ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>You need to add a station first.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Basic Information</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Station */}
              <div className="grid gap-2">
                <Label htmlFor="station_id">
                  Station <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.station_id}
                  onValueChange={(value) => handleSelectChange("station_id", value)}
                  disabled={isLoading || isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem key={station.station_id} value={station.station_id}>
                        {station.station_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Name */}
              <div className="grid gap-2">
                <Label htmlFor="customer_name">
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  placeholder="Organization or representative name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* GST Number */}
              <div className="grid gap-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  name="gst_number"
                  placeholder="e.g., 27AABCU9603R1ZM"
                  value={formData.gst_number}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="uppercase"
                />
              </div>

              {/* Registration Date */}
              <div className="grid gap-2">
                <Label htmlFor="registered_date">Registration Date</Label>
                <Input
                  id="registered_date"
                  name="registered_date"
                  type="date"
                  value={formData.registered_date}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Phone */}
              <div className="grid gap-2">
                <Label htmlFor="phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              {/* Alternate Phone */}
              <div className="grid gap-2">
                <Label htmlFor="alt_phone">Alternate Phone</Label>
                <Input
                  id="alt_phone"
                  name="alt_phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Optional"
                  value={formData.alt_phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Address</h4>

            <div className="grid gap-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                name="address_line1"
                placeholder="Street address"
                value={formData.address_line1}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                name="address_line2"
                placeholder="Apartment, suite, etc."
                value={formData.address_line2}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  placeholder="6-digit"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          {/* Credit Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Credit Settings</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Credit Limit Type */}
              <div className="grid gap-2">
                <Label htmlFor="credit_limit_type">
                  Limit Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.credit_limit_type}
                  onValueChange={(value) => handleSelectChange("credit_limit_type", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Amount (₹)</SelectItem>
                    <SelectItem value="quantity">Quantity (Liters)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Credit Limit Value */}
              <div className="grid gap-2">
                <Label htmlFor="credit_limit_value">
                  Credit Limit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="credit_limit_value"
                  name="credit_limit_value"
                  type="number"
                  step={formData.credit_limit_type === "amount" ? "0.01" : "0.001"}
                  min="0"
                  placeholder={formData.credit_limit_type === "amount" ? "e.g., 50000" : "e.g., 1000"}
                  value={formData.credit_limit_value}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.credit_limit_type === "amount"
                    ? "Maximum credit amount in rupees"
                    : "Maximum fuel quantity in liters"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Discount Type */}
              <div className="grid gap-2">
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value) => handleSelectChange("discount_type", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No discount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No discount</SelectItem>
                    <SelectItem value="amount">Amount per Liter (₹/L)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount Value */}
              <div className="grid gap-2">
                <Label htmlFor="discount_value">
                  Discount Value
                  {formData.discount_type !== "none" && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="discount_value"
                  name="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === "percentage" ? "100" : undefined}
                  placeholder={
                    formData.discount_type === "none"
                      ? "Select type first"
                      : formData.discount_type === "amount"
                      ? "e.g., 2.00"
                      : "e.g., 5"
                  }
                  value={formData.discount_value}
                  onChange={handleInputChange}
                  disabled={isLoading || formData.discount_type === "none"}
                />
                {formData.discount_type !== "none" && (
                  <p className="text-xs text-muted-foreground">
                    {formData.discount_type === "amount"
                      ? "Discount per liter of fuel"
                      : "Percentage off total amount"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isEditing ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  {isEditing ? "Update Customer" : "Add Customer"}
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
          Add Customer
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  )
}
