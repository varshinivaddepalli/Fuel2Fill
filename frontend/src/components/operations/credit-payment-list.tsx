"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Loader2, Wallet, IndianRupee, Banknote, AlertCircle, CreditCard, Smartphone } from "lucide-react"
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
import { DataTable } from "@/components/operations/credit-payments-table/data-table"
import { getColumns } from "@/components/operations/credit-payments-table/columns"
import { AddCreditPaymentDialog } from "@/components/operations/add-credit-payment-dialog"
import {
  getClientCreditPayments,
  deleteCreditPayment,
  type CreditPaymentWithDetails,
} from "@/actions/credit-payments"

export function CreditPaymentList() {
  const [isLoading, setIsLoading] = useState(true)
  const [payments, setPayments] = useState<CreditPaymentWithDetails[]>([])
  const [error, setError] = useState<string | null>(null)

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPayments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await getClientCreditPayments()
    if (result.success) {
      setPayments(result.payments)
    } else {
      setError(result.error)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  // Get unique stations for tabs
  const stations = Array.from(
    new Map(
      payments.map((p) => [p.station_id, { id: p.station_id, name: p.station_name }])
    ).values()
  )

  // Calculate summary stats
  const totalPayments = payments.length
  const totalAmountReceived = payments.reduce((sum, p) => sum + p.payment_amount, 0)

  // Breakdown by mode
  const byMode = payments.reduce(
    (acc, p) => {
      acc[p.payment_mode] = (acc[p.payment_mode] || 0) + p.payment_amount
      return acc
    },
    {} as Record<string, number>
  )

  // Handlers
  const handleDelete = (paymentId: string) => {
    setPaymentToDelete(paymentId)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return

    setIsDeleting(true)
    const result = await deleteCreditPayment(paymentToDelete)

    if (result.success) {
      toast.success("Payment deleted successfully!")
      loadPayments()
    } else {
      toast.error(result.error)
    }

    setIsDeleting(false)
    setDeleteConfirmOpen(false)
    setPaymentToDelete(null)
  }

  const columns = getColumns({
    onDelete: handleDelete,
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
          <h2 className="text-2xl font-bold tracking-tight">Credit Payments</h2>
          <p className="text-muted-foreground">
            Track payments received from credit customers
          </p>
        </div>
        <AddCreditPaymentDialog onPaymentAdded={loadPayments} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              across {stations.length} station{stations.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Received</CardTitle>
            <IndianRupee className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalAmountReceived)}
            </div>
            <p className="text-xs text-muted-foreground">
              total collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash</CardTitle>
            <Banknote className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(byMode.cash || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              cash payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Digital</CardTitle>
            <Smartphone className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((byMode.upi || 0) + (byMode.card || 0) + (byMode.bank_transfer || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              UPI + Card + Transfer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mode Breakdown (condensed) */}
      {totalPayments > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          {byMode.upi > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <Smartphone className="size-3" />
              UPI: {formatCurrency(byMode.upi)}
            </div>
          )}
          {byMode.card > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <CreditCard className="size-3" />
              Card: {formatCurrency(byMode.card)}
            </div>
          )}
          {byMode.cheque > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Cheque: {formatCurrency(byMode.cheque)}
            </div>
          )}
          {byMode.bank_transfer > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
              Bank: {formatCurrency(byMode.bank_transfer)}
            </div>
          )}
        </div>
      )}

      {/* Tabs with Data Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Payments
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
              {totalPayments}
            </span>
          </TabsTrigger>
          {stations.map((station) => {
            const count = payments.filter((p) => p.station_id === station.id).length
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
            data={payments}
            emptyMessage="No credit payments yet"
            emptyDescription="Record your first payment to start tracking collections."
          />
        </TabsContent>

        {stations.map((station) => {
          const stationPayments = payments.filter((p) => p.station_id === station.id)
          return (
            <TabsContent key={station.id} value={station.id}>
              <DataTable
                columns={columns}
                data={stationPayments}
                emptyMessage={`No payments at ${station.name}`}
                emptyDescription="Record a payment for this station."
              />
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record? This will also
              update the customer&apos;s balance. This action cannot be undone.
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
