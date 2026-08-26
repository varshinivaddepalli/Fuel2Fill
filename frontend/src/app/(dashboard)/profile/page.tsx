import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const ProfileForm = dynamic(
  () => import("@/components/profile/profile-form").then(m => ({ default: m.ProfileForm })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ProfileForm />
    </div>
  )
}
