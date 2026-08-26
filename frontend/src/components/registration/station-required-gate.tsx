"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface StationRequiredGateProps {
  loadingStations: boolean
  stationsCount: number
  entityName: string
  children: React.ReactNode
}

export function StationRequiredGate({
  loadingStations,
  stationsCount,
  entityName,
  children,
}: StationRequiredGateProps) {
  const router = useRouter()

  if (loadingStations) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading stations...</p>
      </div>
    )
  }

  if (stationsCount === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              You need to add a station before adding {entityName}.
            </p>
            <Button onClick={() => router.push("/registration/add-station")}>
              Add Station First
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
