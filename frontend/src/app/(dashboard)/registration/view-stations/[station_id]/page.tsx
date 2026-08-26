import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const StationDetail = dynamic(
  () => import("@/components/stations/station-detail").then(m => ({ default: m.StationDetail })),
  { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div> }
)

interface StationDetailPageProps {
  params: Promise<{
    station_id: string
  }>
}

export default async function StationDetailPage({ params }: StationDetailPageProps) {
  const { station_id } = await params

  return (
    <div className="container py-6">
      <StationDetail stationId={station_id} />
    </div>
  )
}
