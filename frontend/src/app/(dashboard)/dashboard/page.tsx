import { Suspense } from "react"
import { Metadata } from "next"
import { Loader2 } from "lucide-react"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export const metadata: Metadata = {
  title: "Dashboard | Petro Astra",
  description: "Overview of your fuel station operations",
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
