"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, ClipboardList, Package, Users, UserCircle, Eye, CalendarClock, ClipboardCheck, LayoutDashboard, Settings2, IndianRupee, Sparkles, Receipt, UserCheck, ArrowRightLeft, Wallet, ScanLine, ShoppingCart, HandCoins, Truck, Warehouse, FilePenLine, Landmark, Banknote, Building2, CreditCard } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { NavUser } from "@/components/dashboard/nav-user"
import { Logo } from "@/components/shared/logo"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  // Default user for development/demo
  const currentUser = user ?? {
    name: "User",
    email: "user@example.com",
  }

  // Check if current path is under registration
  const isRegistrationActive = pathname.startsWith("/registration")

  // Check if current path is under employee
  const isEmployeeActive = pathname.startsWith("/employee")

  // Check if current path is under operations
  const isOperationsActive = pathname.startsWith("/operations")

  // Check if current path is under credit
  const isCreditActive = pathname.startsWith("/credit")

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <Logo showText={false} size={28} href="" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Fuel2Fill</span>
                  <span className="truncate text-xs text-muted-foreground">Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {/* Dashboard Link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/dashboard"}
                tooltip="Dashboard"
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Ask Astra Link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/ask-astra"}
                tooltip="Ask Astra"
              >
                <Link href="/ask-astra">
                  <Sparkles />
                  <span>Ask Astra</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Click Astra Link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/click-astra"}
                tooltip="Click Astra"
              >
                <Link href="/click-astra">
                  <ScanLine />
                  <span>Click Astra</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Operations Dropdown */}
            <Collapsible
              asChild
              defaultOpen={isOperationsActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Operations">
                    <Settings2 />
                    <span>Operations</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/operations/daily-entry"}
                      >
                        <Link href="/operations/daily-entry">
                          <FilePenLine />
                          <span>Daily Entry</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/operations/daily-fuel-price"}
                      >
                        <Link href="/operations/daily-fuel-price">
                          <IndianRupee />
                          <span>Daily Fuel Price</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/operations/daily-sale-record"}
                      >
                        <Link href="/operations/daily-sale-record">
                          <Receipt />
                          <span>Daily Sale Record</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/operations/product-sales"}
                      >
                        <Link href="/operations/product-sales">
                          <ShoppingCart />
                          <span>Product Sales</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/operations/expenses"}
                      >
                        <Link href="/operations/expenses">
                          <HandCoins />
                          <span>Expenses</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/operations/settlement"}
                      >
                        <Link href="/operations/settlement">
                          <Banknote />
                          <span>Settlement</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Purchases Link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/purchases"}
                tooltip="Purchases"
              >
                <Link href="/purchases">
                  <Truck />
                  <span>Purchases</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Credit Dropdown */}
            <Collapsible
              asChild
              defaultOpen={isCreditActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Credit">
                    <CreditCard />
                    <span>Credit</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/credit/customers"}
                      >
                        <Link href="/credit/customers">
                          <UserCheck />
                          <span>Credit Customers</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/credit/transactions"}
                      >
                        <Link href="/credit/transactions">
                          <ArrowRightLeft />
                          <span>Credit Transactions</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/credit/payments"}
                      >
                        <Link href="/credit/payments">
                          <Wallet />
                          <span>Credit Payments</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Employee Dropdown */}
            <Collapsible
              asChild
              defaultOpen={isEmployeeActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Employee">
                    <UserCircle />
                    <span>Employee</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/employee/add-employee"}
                      >
                        <Link href="/employee/add-employee">
                          <Users />
                          <span>Add Employee</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/employee/view-employee"}
                      >
                        <Link href="/employee/view-employee">
                          <Eye />
                          <span>View Employee</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/employee/shifts"}
                      >
                        <Link href="/employee/shifts">
                          <CalendarClock />
                          <span>Employee Shifts</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/employee/attendance"}
                      >
                        <Link href="/employee/attendance">
                          <ClipboardCheck />
                          <span>Attendance</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Stock View Link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/stock"}
                tooltip="Stock View"
              >
                <Link href="/stock">
                  <Warehouse />
                  <span>Stock View</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Registration Dropdown */}
            <Collapsible
              asChild
              defaultOpen={isRegistrationActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Registration">
                    <ClipboardList />
                    <span>Registration</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/registration/view-stations")}
                      >
                        <Link href="/registration/view-stations">
                          <Eye />
                          <span>View Stations</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/registration/station-master"}
                      >
                        <Link href="/registration/station-master">
                          <Building2 />
                          <span>Station Master</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/registration/add-product"}
                      >
                        <Link href="/registration/add-product">
                          <Package />
                          <span>Add Product</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/registration/add-bank-account"}
                      >
                        <Link href="/registration/add-bank-account">
                          <Landmark />
                          <span>Add Bank Account</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
