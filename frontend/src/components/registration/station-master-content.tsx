"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Loader2, Fuel, Droplets, Container, GaugeCircle, Pipette } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const FormLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="size-8 animate-spin text-muted-foreground" />
  </div>
)

const AddStationForm = dynamic(
  () => import("@/components/registration/add-station-form").then(m => ({ default: m.AddStationForm })),
  { loading: FormLoader }
)
const AddFuelTypeForm = dynamic(
  () => import("@/components/registration/add-fuel-type-form").then(m => ({ default: m.AddFuelTypeForm })),
  { loading: FormLoader }
)
const AddTankForm = dynamic(
  () => import("@/components/registration/add-tank-form").then(m => ({ default: m.AddTankForm })),
  { loading: FormLoader }
)
const AddPumpForm = dynamic(
  () => import("@/components/registration/add-pump-form").then(m => ({ default: m.AddPumpForm })),
  { loading: FormLoader }
)
const AddNozzleForm = dynamic(
  () => import("@/components/registration/add-nozzle-form").then(m => ({ default: m.AddNozzleForm })),
  { loading: FormLoader }
)

const TABS = [
  { value: "station", label: "Station", icon: Fuel },
  { value: "fuel-type", label: "Fuel Type", icon: Droplets },
  { value: "tank", label: "Tank", icon: Container },
  { value: "pump", label: "Pump", icon: GaugeCircle },
  { value: "nozzle", label: "Nozzle", icon: Pipette },
] as const

export function StationMasterContent() {
  const [activeTab, setActiveTab] = useState("station")
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["station"]))

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setVisitedTabs(prev => new Set(prev).add(value))
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Station Master</h1>
          <p className="text-muted-foreground mt-2">
            Register and configure your station infrastructure
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="station" className="mt-6">
            {visitedTabs.has("station") && <AddStationForm />}
          </TabsContent>
          <TabsContent value="fuel-type" className="mt-6">
            {visitedTabs.has("fuel-type") && <AddFuelTypeForm />}
          </TabsContent>
          <TabsContent value="tank" className="mt-6">
            {visitedTabs.has("tank") && <AddTankForm />}
          </TabsContent>
          <TabsContent value="pump" className="mt-6">
            {visitedTabs.has("pump") && <AddPumpForm />}
          </TabsContent>
          <TabsContent value="nozzle" className="mt-6">
            {visitedTabs.has("nozzle") && <AddNozzleForm />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
