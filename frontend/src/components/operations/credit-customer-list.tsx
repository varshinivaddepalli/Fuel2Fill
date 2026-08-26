"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Loader2, Users, IndianRupee, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DataTable } from "@/components/operations/credit-customers-table/data-table"
import { getColumns } from "@/components/operations/credit-customers-table/columns"
import { AddCreditCustomerDialog } from "@/components/operations/add-credit-customer-dialog"
import { ManageVehiclesDialog } from "@/components/operations/manage-vehicles-dialog"
import {
  getClientCreditCustomers,
  deleteCreditCustomer,
  type CreditCustomerWithStation,
} from "@/actions/credit-customers"

export function CreditCustomerList() {
  const [isLoading, setIsLoading] = useState(true)
  const [customers, setCustomers] = useState<CreditCustomerWithStation[]>([])
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<CreditCustomerWithStation | null>(null)
  const [vehiclesDialogOpen, setVehiclesDialogOpen] = useState(false)
  const [selectedCustomerForVehicles, setSelectedCustomerForVehicles] = useState<{
    id: string
    name: string
  } | null>(null)

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await getClientCreditCustomers()
    if (result.success) {
      setCustomers(result.customers)
    } else {
      setError(result.error)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Get unique stations for tabs
  const stations = Array.from(
    new Map(
      customers.map((c) => [c.station_id, { id: c.station_id, name: c.station_name }])
    ).values()
  )

  // Calculate summary stats
  const totalCustomers = customers.length
  const totalOutstanding = customers.reduce((sum, c) => sum + c.current_balance, 0)
  const customersWithBalance = customers.filter((c) => c.current_balance > 0).length

  // Handlers
  const handleEdit = (customer: CreditCustomerWithStation) => {
    setEditCustomer(customer)
    setEditDialogOpen(true)
  }

  const handleDelete = (customerId: string) => {
    setCustomerToDelete(customerId)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return

    setIsDeleting(true)
    const result = await deleteCreditCustomer(customerToDelete)

    if (result.success) {
      toast.success("Customer deleted successfully!")
      loadCustomers()
    } else {
      toast.error(result.error)
    }

    setIsDeleting(false)
    setDeleteConfirmOpen(false)
    setCustomerToDelete(null)
  }

  const handleViewDetails = (customer: CreditCustomerWithStation) => {
    // For now, we'll show vehicles dialog as details
    setSelectedCustomerForVehicles({
      id: customer.credit_customer_id,
      name: customer.customer_name,
    })
    setVehiclesDialogOpen(true)
  }

  const handleManageVehicles = (customer: CreditCustomerWithStation) => {
    setSelectedCustomerForVehicles({
      id: customer.credit_customer_id,
      name: customer.customer_name,
    })
    setVehiclesDialogOpen(true)
  }

  const columns = getColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onViewDetails: handleViewDetails,
    onManageVehicles: handleManageVehicles,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Credit Customers</h2>
          <p className="text-muted-foreground">
            Manage credit customers and their vehicles
          </p>
        </div>
        <AddCreditCustomerDialog onCustomerAdded={loadCustomers} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              across {stations.length} station{stations.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-amber-600" : ""}`}>
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              from {customersWithBalance} customer{customersWithBalance !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Balance</CardTitle>
            <IndianRupee className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCustomers > 0
                ? formatCurrency(totalOutstanding / totalCustomers)
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">per customer</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with Data Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Customers
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
              {totalCustomers}
            </span>
          </TabsTrigger>
          {stations.map((station) => {
            const count = customers.filter((c) => c.station_id === station.id).length
            return (
              <TabsTrigger key={station.id} value={station.id}>
                {station.name}
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {count}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="all">
          <DataTable
            columns={columns}
            data={customers}
            emptyMessage="No credit customers yet"
            emptyDescription="Add your first credit customer to start managing credit sales."
          />
        </TabsContent>

        {stations.map((station) => {
          const stationCustomers = customers.filter((c) => c.station_id === station.id)
          return (
            <TabsContent key={station.id} value={station.id}>
              <DataTable
                columns={columns}
                data={stationCustomers}
                emptyMessage={`No credit customers at ${station.name}`}
                emptyDescription="Add a credit customer to this station."
              />
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Edit Dialog */}
      <AddCreditCustomerDialog
        onCustomerAdded={() => {
          loadCustomers()
          setEditDialogOpen(false)
          setEditCustomer(null)
        }}
        editCustomer={editCustomer}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditCustomer(null)
        }}
      />

      {/* Manage Vehicles Dialog */}
      <ManageVehiclesDialog
        customerId={selectedCustomerForVehicles?.id || null}
        customerName={selectedCustomerForVehicles?.name || ""}
        open={vehiclesDialogOpen}
        onOpenChange={(open) => {
          setVehiclesDialogOpen(open)
          if (!open) setSelectedCustomerForVehicles(null)
        }}
        onVehiclesChanged={loadCustomers}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this credit customer? This action cannot be
              undone. All associated vehicles will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
