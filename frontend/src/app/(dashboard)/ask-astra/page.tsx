import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getAuthContext } from "@/lib/cache"

const ChatInterface = dynamic(
  () => import("@/components/ask-astra/chat-interface").then(m => ({ default: m.ChatInterface })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default async function AskAstraPage() {
  const { user, client } = await getAuthContext()

  if (!user?.email) {
    redirect("/login")
  }

  if (!client) {
    redirect("/onboarding")
  }

  return (
    <div className="h-full">
      <ChatInterface userName={client.client_name} />
    </div>
  )
}
