"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, AlertCircle, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStationDetail } from "@/hooks/use-data"
import { useBreadcrumb } from "@/providers/breadcrumb-context"
import { StationOverviewTab } from "./station-overview-tab"
import { StationInfrastructureTab } from "./station-infrastructure-tab"
import { StationProductsTab } from "./station-products-tab"

interface StationDetailProps {
  stationId: string
}

export function StationDetail({ stationId }: StationDetailProps) {
  const { data, isLoading, error } = useStationDetail(stationId)
  const { setDynamicLabel, clearDynamicLabel } = useBreadcrumb()

  // Set breadcrumb label when station data is available
  useEffect(() => {
    if (data?.station) {
      setDynamicLabel(stationId, data.station.station_name)
    }
    return () => clearDynamicLabel(stationId)
  }, [data?.station, stationId, setDynamicLabel, clearDynamicLabel])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="size-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium">Error Loading Station</h3>
        <p className="text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "An error occurred"}
        </p>
        <Link
          href="/registration/view-stations"
          className="mt-4 text-primary hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-4" />
          Back to Stations
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Station Not Found</h3>
        <p className="text-muted-foreground mt-1">
          The station you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/registration/view-stations"
          className="mt-4 text-primary hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-4" />
          Back to Stations
        </Link>
      </div>
    )
  }

  const { station, fuelTypes, tanks, pumps, nozzles, products } = data
  const isActive = station.status === "active"

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/registration/view-stations"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Stations
      </Link>

      {/* Station header */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="size-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{station.station_name}</h1>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={isActive
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }
                >
                  {station.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {station.address_line1}, {station.city}, {station.state} - {station.pincode}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>SAP: {station.station_sap_code}</span>
                <span className="w-px h-4 bg-border" />
                <span>GST: {station.station_gst_number}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="infrastructure">
            Infrastructure
            <span className="ml-2 text-xs text-muted-foreground">
              ({fuelTypes.length + tanks.length + pumps.length + nozzles.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="products">
            Products
            <span className="ml-2 text-xs text-muted-foreground">({products.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <StationOverviewTab station={station} />
        </TabsContent>

        <TabsContent value="infrastructure">
          <StationInfrastructureTab
            stationId={stationId}
            fuelTypes={fuelTypes}
            tanks={tanks}
            pumps={pumps}
            nozzles={nozzles}
          />
        </TabsContent>

        <TabsContent value="products">
          <StationProductsTab stationId={stationId} products={products} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
