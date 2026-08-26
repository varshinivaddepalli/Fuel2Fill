"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Loader2, ArrowRightLeft, IndianRupee, Droplets, AlertCircle, CalendarIcon } from "lucide-react"
import { formatCurrency, getTodayDateString, formatDateForInput } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
import { DataTable } from "@/components/operations/credit-transactions-table/data-table"
import { getColumns } from "@/components/operations/credit-transactions-table/columns"
import { AddCreditTransactionDialog } from "@/components/operations/add-credit-transaction-dialog"
import {
  AddCreditPaymentDialog,
  type TransactionPaymentData,
} from "@/components/operations/add-credit-payment-dialog"
import {
  getClientCreditTransactions,
  deleteCreditTransaction,
  type CreditTransactionWithDetails,
} from "@/actions/credit-transactions"

export function CreditTransactionList() {
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<CreditTransactionWithDetails[]>([])
  const [error, setError] = useState<string | null>(null)

  // Date filter state
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [transactionToPay, setTransactionToPay] = useState<TransactionPaymentData | null>(null)

  const loadTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await getClientCreditTransactions({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    })
    if (result.success) {
      setTransactions(result.transactions)
    } else {
      setError(result.error)
    }
    setIsLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // Get unique stations for tabs
  const stations = Array.from(
    new Map(
      transactions.map((t) => [t.station_id, { id: t.station_id, name: t.station_name }])
    ).values()
  )

  // Calculate summary stats
  const totalTransactions = transactions.length
  const totalCreditAmount = transactions.reduce((sum, t) => sum + t.net_amount, 0)
  const totalFuelDispensed = transactions.reduce((sum, t) => sum + t.fuel_quantity, 0)
  const unpaidCount = transactions.filter((t) => t.payment_status !== "paid").length

  // Clear date filters
  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
  }

  // Set quick date filters
  const setTodayFilter = () => {
    const today = getTodayDateString()
    setStartDate(today)
    setEndDate(today)
  }

  const setThisWeekFilter = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    setStartDate(formatDateForInput(startOfWeek))
    setEndDate(getTodayDateString())
  }

  const setThisMonthFilter = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(formatDateForInput(startOfMonth))
    setEndDate(getTodayDateString())
  }

  // Handlers
  const handleDelete = (transactionId: string) => {
    setTransactionToDelete(transactionId)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return

    setIsDeleting(true)
    const result = await deleteCreditTransaction(transactionToDelete)

    if (result.success) {
      toast.success("Transaction deleted successfully!")
      loadTransactions()
    } else {
      toast.error(result.error)
    }

    setIsDeleting(false)
    setDeleteConfirmOpen(false)
    setTransactionToDelete(null)
  }

  const handlePay = (transaction: CreditTransactionWithDetails) => {
    const amountRemaining = transaction.net_amount - transaction.amount_paid
    setTransactionToPay({
      transaction_id: transaction.transaction_id,
      credit_customer_id: transaction.credit_customer_id,
      customer_name: transaction.customer_name,
      station_id: transaction.station_id,
      station_name: transaction.station_name,
      net_amount: transaction.net_amount,
      amount_paid: transaction.amount_paid,
      amount_remaining: amountRemaining,
    })
    setPaymentDialogOpen(true)
  }

  const handlePaymentAdded = () => {
    setPaymentDialogOpen(false)
    setTransactionToPay(null)
    loadTransactions()
  }

  const columns = getColumns({
    onDelete: handleDelete,
    onPay: handlePay,
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
          <h2 className="text-2xl font-bold tracking-tight">Credit Transactions</h2>
          <p className="text-muted-foreground">
            Track credit fuel purchases by customers
          </p>
        </div>
        <AddCreditTransactionDialog onTransactionAdded={loadTransactions} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ArrowRightLeft className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              across {stations.length} station{stations.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Amount</CardTitle>
            <IndianRupee className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalCreditAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              net amount dispensed on credit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fuel Dispensed</CardTitle>
            <Droplets className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalFuelDispensed.toLocaleString("en-IN", { maximumFractionDigits: 2 })} L
            </div>
            <p className="text-xs text-muted-foreground">
              total liters on credit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Transactions</CardTitle>
            <Badge variant={unpaidCount > 0 ? "destructive" : "secondary"} className="text-xs">
              {unpaidCount}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {unpaidCount}
            </div>
            <p className="text-xs text-muted-foreground">
              need payment collection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start_date" className="text-sm">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_date" className="text-sm">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setTodayFilter}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={setThisWeekFilter}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={setThisMonthFilter}>
                This Month
              </Button>
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs with Transactions Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Transactions
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
              {totalTransactions}
            </span>
          </TabsTrigger>
          {stations.map((station) => {
            const count = transactions.filter((t) => t.station_id === station.id).length
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
            data={transactions}
            emptyMessage="No credit transactions found"
            emptyDescription={startDate || endDate ? "Try adjusting your date filters." : "Record your first credit transaction to start tracking."}
          />
        </TabsContent>

        {stations.map((station) => {
          const stationTransactions = transactions.filter((t) => t.station_id === station.id)
          return (
            <TabsContent key={station.id} value={station.id}>
              <DataTable
                columns={columns}
                data={stationTransactions}
                emptyMessage={`No credit transactions at ${station.name}`}
                emptyDescription={startDate || endDate ? "Try adjusting your date filters." : "Record a credit transaction for this station."}
              />
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this credit transaction? This will also
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

      {/* Payment Dialog */}
      <AddCreditPaymentDialog
        onPaymentAdded={handlePaymentAdded}
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open)
          if (!open) setTransactionToPay(null)
        }}
        prefillTransaction={transactionToPay || undefined}
      />
    </div>
  )
}
