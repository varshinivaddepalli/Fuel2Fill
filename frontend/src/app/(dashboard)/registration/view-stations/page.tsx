import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const ViewStationsList = dynamic(
  () => import("@/components/stations/view-stations-list").then(m => ({ default: m.ViewStationsList })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

export default function ViewStationsPage() {
  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">View Stations</h1>
        <p className="text-muted-foreground">
          Manage your fuel stations and their infrastructure
        </p>
      </div>
      <ViewStationsList />
    </div>
  )
}
