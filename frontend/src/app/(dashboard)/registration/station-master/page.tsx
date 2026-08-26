import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const StationMasterContent = dynamic(
  () => import("@/components/registration/station-master-content").then(m => ({ default: m.StationMasterContent })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function StationMasterPage() {
  return <StationMasterContent />
}
