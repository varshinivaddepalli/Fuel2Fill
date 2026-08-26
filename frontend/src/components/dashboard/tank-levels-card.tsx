import { Fuel } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { TankLevel } from "@/types/dashboard"

interface TankLevelsCardProps {
  tanks: TankLevel[]
  showStationName: boolean
}

export function TankLevelsCard({ tanks, showStationName }: TankLevelsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fuel className="size-4" />
          Tank Inventory
        </CardTitle>
        <CardDescription>Current fuel levels</CardDescription>
      </CardHeader>
      <CardContent>
        {tanks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tanks configured</p>
        ) : (
          <div className="space-y-4">
            {tanks.map((tank) => (
              <div key={tank.tankId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium min-w-0 truncate">
                    {tank.tankName} - {tank.fuelTypeName}
                    {showStationName && (
                      <span className="text-muted-foreground font-normal"> ({tank.stationName})</span>
                    )}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0 text-xs sm:text-sm">
                    {tank.currentStock.toLocaleString("en-IN")}{tank.capacityUnit === "kg" ? "kg" : "L"} / {tank.capacity.toLocaleString("en-IN")}{tank.capacityUnit === "kg" ? "kg" : "L"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={tank.percentFull}
                    className={cn(
                      "h-2",
                      tank.percentFull < 20 && "[&>div]:bg-red-500",
                      tank.percentFull >= 20 && tank.percentFull < 50 && "[&>div]:bg-yellow-500",
                      tank.percentFull >= 50 && "[&>div]:bg-green-500"
                    )}
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                    {tank.percentFull}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
