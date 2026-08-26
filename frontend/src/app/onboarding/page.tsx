import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { clientExistsByEmail } from "@/lib/auth/client-profile"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"
import { Logo } from "@/components/shared/logo"

async function getUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

export default async function OnboardingPage() {
  const user = await getUser()

  if (!user?.email) {
    redirect("/login")
  }

  // If client already exists, redirect to dashboard
  const exists = await clientExistsByEmail(user.email)
  if (exists) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-4">
        <Logo size={32} />
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Fuel2Fill</h1>
            <p className="mt-2 text-muted-foreground">
              Let&apos;s set up your profile to get started
            </p>
          </div>
          <OnboardingForm userEmail={user.email} />
        </div>
      </main>
    </div>
  )
}
