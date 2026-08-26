"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Step = "email" | "otp" | "password"

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const isConfigured = isSupabaseConfigured()

  const getSupabase = () => {
    if (!isConfigured) {
      throw new Error("Supabase is not configured")
    }
    return createClient()
  }

  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      })

      if (error) throw error
      setStep("otp")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      })

      if (error) throw error
      setStep("password")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Update password and login
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      // User is now logged in with new password
      router.push("/")
      return
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password")
    }
    setIsLoading(false)
  }

  const getStepTitle = () => {
    switch (step) {
      case "email":
        return "Forgot password?"
      case "otp":
        return "Enter verification code"
      case "password":
        return "Create new password"
    }
  }

  const getStepDescription = () => {
    switch (step) {
      case "email":
        return "Enter your email and we'll send you a verification code"
      case "otp":
        return `We sent a code to ${email}`
      case "password":
        return "Enter your new password below"
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{getStepTitle()}</h1>
        <p className="text-balance text-sm text-muted-foreground">
          {getStepDescription()}
        </p>
      </div>

      {!isConfigured && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Email Form */}
      {step === "email" && (
        <form onSubmit={handleSendOtp} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !isConfigured}>
            {isLoading ? "Sending..." : "Send verification code"}
          </Button>
        </form>
      )}

      {/* Step 2: OTP Verification */}
      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              disabled={isLoading}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !isConfigured}>
            {isLoading ? "Verifying..." : "Verify code"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("email")
              setOtp("")
              setError(null)
            }}
            disabled={isLoading}
          >
            Use different email
          </Button>
        </form>
      )}

      {/* Step 3: New Password */}
      {step === "password" && (
        <form onSubmit={handleUpdatePassword} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !isConfigured}>
            {isLoading ? "Updating..." : "Update password & login"}
          </Button>
        </form>
      )}

      <div className="text-center text-sm">
        Remember your password?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Back to login
        </Link>
      </div>
    </div>
  )
}
