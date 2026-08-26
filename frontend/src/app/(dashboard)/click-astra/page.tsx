import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getAuthContext } from "@/lib/cache"

const ClickAstraForm = dynamic(
  () => import("@/components/click-astra/click-astra-form").then(m => ({ default: m.ClickAstraForm })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default async function ClickAstraPage() {
  const { user, client } = await getAuthContext()

  if (!user?.email) {
    redirect("/login")
  }

  if (!client) {
    redirect("/onboarding")
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <ClickAstraForm />
    </div>
  )
}
