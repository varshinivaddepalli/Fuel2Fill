"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const isConfigured = isSupabaseConfigured()

  const getSupabase = () => {
    if (!isConfigured) {
      throw new Error("Supabase is not configured")
    }
    return createClient()
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      router.push("/dashboard")
      return
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    }
    setIsLoading(false)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Welcome to Petro Astra</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Secure access with your email credentials
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

      <form onSubmit={handleEmailLogin} className="grid gap-4">
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
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <a
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || !isConfigured}>
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  )
}
