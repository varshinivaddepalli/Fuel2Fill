"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ClientInsert } from "@/types/database"

interface OnboardingFormProps {
  userEmail: string
}

export function OnboardingForm({ userEmail }: OnboardingFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    client_pan: "",
    client_aadhaar: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "client_phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = (): string | null => {
    if (!formData.client_name.trim()) {
      return "Client name is required"
    }
    if (!formData.client_phone.trim()) {
      return "Phone number is required"
    }
    if (!/^[0-9]{10,15}$/.test(formData.client_phone)) {
      return "Please enter a valid phone number (10-15 digits)"
    }
    if (formData.client_pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.client_pan.toUpperCase())) {
      return "Please enter a valid PAN number (e.g., ABCDE1234F)"
    }
    if (formData.client_aadhaar && !/^[0-9]{12}$/.test(formData.client_aadhaar)) {
      return "Please enter a valid 12-digit Aadhaar number"
    }
    if (formData.pincode && !/^[0-9]{6}$/.test(formData.pincode)) {
      return "Please enter a valid 6-digit pincode"
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
      const supabase = createClient()

      const toNullIfEmpty = (value: string): string | null => {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : null
      }

      const clientData: ClientInsert = {
        client_email: userEmail,
        client_name: formData.client_name.trim(),
        client_phone: formData.client_phone.trim(),
        client_pan: toNullIfEmpty(formData.client_pan.toUpperCase()),
        client_aadhaar: toNullIfEmpty(formData.client_aadhaar),
        address_line1: toNullIfEmpty(formData.address_line1),
        address_line2: toNullIfEmpty(formData.address_line2),
        city: toNullIfEmpty(formData.city),
        state: toNullIfEmpty(formData.state),
        pincode: toNullIfEmpty(formData.pincode),
      }

      const { error: insertError } = await supabase
        .from("clients")
        .insert(clientData)

      if (insertError) {
        throw new Error(insertError.message)
      }

      toast.success("Profile created successfully!", {
        description: "Welcome to Fuel2Fill.",
      })
      router.push("/dashboard")
      return
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile")
    }
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your primary contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This is the email associated with your account
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client_name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client_name"
                name="client_name"
                placeholder="Enter your full name"
                value={formData.client_name}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client_phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client_phone"
                name="client_phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit phone number"
                value={formData.client_phone}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity Documents</CardTitle>
            <CardDescription>
              Optional - can be added later
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="client_pan">PAN Number</Label>
                <Input
                  id="client_pan"
                  name="client_pan"
                  placeholder="ABCDE1234F"
                  value={formData.client_pan}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="uppercase"
                  maxLength={10}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client_aadhaar">Aadhaar Number</Label>
                <Input
                  id="client_aadhaar"
                  name="client_aadhaar"
                  placeholder="12-digit Aadhaar"
                  value={formData.client_aadhaar}
                  onChange={handleChange}
                  disabled={isLoading}
                  maxLength={12}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>
              Optional - can be added later
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                name="address_line1"
                placeholder="Street address"
                value={formData.address_line1}
                onChange={handleChange}
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
                onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  placeholder="6 digits"
                  value={formData.pincode}
                  onChange={handleChange}
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading ? "Creating Profile..." : "Complete Setup"}
          </Button>
        </div>
      </div>
    </form>
  )
}
