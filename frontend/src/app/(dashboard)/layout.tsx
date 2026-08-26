import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb"
import { Separator } from "@/components/ui/separator"
import { BreadcrumbProvider } from "@/providers/breadcrumb-context"
import { QueryProvider } from "@/providers/query-provider"
import { ScrollProgressBar } from "@/components/ui/scroll-progress-bar"
import { getAuthContext } from "@/lib/cache"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use cached auth context - combines auth check with cached client profile
  const { user: authUser, client } = await getAuthContext()

  // Redirect unauthenticated users to login
  if (!authUser?.email) {
    redirect("/login")
  }

  // Redirect to onboarding if no client profile
  if (!client) {
    redirect("/onboarding")
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  // Build user object with client_name and photo from clients table
  const user = {
    name: client.client_name,
    email: authUser.email,
    avatar: client.client_photo || undefined,
  }

  return (
    <QueryProvider>
      <BreadcrumbProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar user={user} />
          <SidebarInset>
            <header className="sticky top-0 z-20 bg-background flex h-16 shrink-0 items-center gap-2 border-b px-4 relative">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DashboardBreadcrumb />
              <Link href="/ask-astra" className="ml-auto">
                <Image
                  src="/ask_astra.gif"
                  alt="Ask Astra"
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 cursor-pointer"
                />
              </Link>
              <ScrollProgressBar />
            </header>
            <main className="flex-1 overflow-auto p-4">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </BreadcrumbProvider>
    </QueryProvider>
  )
}
