"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormErrorBanner } from "@/components/registration/form-error-banner"
import { FormFooter } from "@/components/registration/form-footer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { toNullIfEmpty } from "@/lib/utils"
import { addBankAccount } from "@/actions/bank-account"
import type { BankAccountType } from "@/types/database"

const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Indian Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Yes Bank",
  "IDFC First Bank",
  "Bandhan Bank",
  "RBL Bank",
  "AU Small Finance Bank",
  "Ujjivan Small Finance Bank",
  "Equitas Small Finance Bank",
  "Other",
]

const COMPANIES = [
  "Indian Oil Corporation",
  "Bharat Petroleum",
  "Hindustan Petroleum",
  "Reliance Industries",
  "Nayara Energy",
  "Shell",
  "Other",
]

const INITIAL_FORM_DATA = {
  account_type: "" as string,
  account_name: "",
  account_holder_name: "",
  account_number_last4: "",
  bank_name: "",
  branch: "",
  current_balance: "",
  company_name: "",
}

export function AddBankAccountForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

  const resetForm = () => setFormData(INITIAL_FORM_DATA)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.account_type) return "Account type is required"
    if (!formData.account_name.trim()) return "Account name is required"
    if (!formData.account_holder_name.trim()) return "Account holder name is required"
    if (!formData.account_number_last4 || !/^\d{4}$/.test(formData.account_number_last4)) {
      return "Last 4 digits must be exactly 4 digits"
    }
    if (!formData.bank_name) return "Bank name is required"
    if (formData.current_balance && (isNaN(parseFloat(formData.current_balance)) || parseFloat(formData.current_balance) < 0)) {
      return "Current balance must be a valid number >= 0"
    }
    if (formData.account_type === "company" && !formData.company_name) {
      return "Company name is required for company accounts"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured")
      return
    }

    setIsLoading(true)

    try {
      const result = await addBankAccount({
        account_type: formData.account_type as BankAccountType,
        account_name: formData.account_name,
        account_holder_name: formData.account_holder_name,
        account_number_last4: formData.account_number_last4,
        bank_name: formData.bank_name,
        branch: toNullIfEmpty(formData.branch),
        current_balance: formData.current_balance ? parseFloat(formData.current_balance) : 0,
        company_name: formData.account_type === "company" ? formData.company_name : undefined,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success("Bank account added successfully!", {
        description: "The new bank account has been registered.",
      })
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add bank account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormErrorBanner error={error} />

      <div className="space-y-6">
        {/* Account Type Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Type</CardTitle>
            <CardDescription>
              Select the type of bank account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="account_type">
                Account Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, account_type: value }))}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Bank account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="account_name">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account_name"
                name="account_name"
                placeholder="e.g., Main Business Account"
                value={formData.account_name}
                onChange={handleChange}
                disabled={isLoading}
                maxLength={100}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account_holder_name">
                Account Holder Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account_holder_name"
                name="account_holder_name"
                placeholder="Name as on bank account"
                value={formData.account_holder_name}
                onChange={handleChange}
                disabled={isLoading}
                maxLength={255}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="account_number_last4">
                  Last 4 Digits of Account Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="account_number_last4"
                  name="account_number_last4"
                  placeholder="1234"
                  value={formData.account_number_last4}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 4)
                    setFormData((prev) => ({ ...prev, account_number_last4: digits }))
                  }}
                  disabled={isLoading}
                  maxLength={4}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bank_name">
                  Bank Name <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.bank_name}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, bank_name: value }))}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                name="branch"
                placeholder="Branch name (optional)"
                value={formData.branch}
                onChange={handleChange}
                disabled={isLoading}
                maxLength={255}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
            <CardDescription>
              Current balance information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="current_balance">Current Balance</Label>
              <Input
                id="current_balance"
                name="current_balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.current_balance}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Company Details Card (conditional) */}
        {formData.account_type === "company" && (
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>
                Company associated with this account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="company_name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.company_name}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, company_name: value }))}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANIES.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <FormFooter isLoading={isLoading} submitLabel="Add Bank Account" loadingLabel="Adding Bank Account..." />
      </div>
    </form>
  )
}
