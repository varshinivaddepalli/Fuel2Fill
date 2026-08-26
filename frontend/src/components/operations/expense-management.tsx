"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  HandCoins,
  AlertCircle,
  Pencil,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import {
  getStationsForExpenses,
  getStationEmployeesForExpenses,
  saveExpenses,
  updateExpense,
  deleteExpense,
  type StationForExpenses,
  type StationEmployeeForExpenses,
  type ExpenseHistoryItem,
} from "@/actions/expenses"
import { useExpenses, useInvalidateQueries } from "@/hooks/use-data"
import { getTodayDateString, formatCurrency, formatDateShort, formatSnakeCase } from "@/lib/utils"
import type { ExpenseCategory, ExpensePaymentMethod } from "@/types/database"

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "utilities", label: "Utilities" },
  { value: "rent", label: "Rent" },
  { value: "insurance", label: "Insurance" },
  { value: "marketing", label: "Marketing" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "transportation", label: "Transportation" },
  { value: "professional_fees", label: "Professional Fees" },
  { value: "taxes", label: "Taxes" },
  { value: "other", label: "Other" },
]

const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "credit", label: "Credit" },
  { value: "bank_transfer", label: "Bank Transfer" },
]

interface LineItem {
  id: string
  category: ExpenseCategory | ""
  amount: number
  payment_method: ExpensePaymentMethod
  vendor_name: string
  description: string
}

function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    category: "",
    amount: 0,
    payment_method: "cash",
    vendor_name: "",
    description: "",
  }
}

const ITEMS_PER_PAGE = 10

export function ExpenseManagement() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Filter states (entry form)
  const [selectedStation, setSelectedStation] = useState("")
  const [selectedApprovedBy, setSelectedApprovedBy] = useState("")
  const [expenseDate, setExpenseDate] = useState(getTodayDateString())

  // History filter states
  const [historyStation, setHistoryStation] = useState("")
  const [historyDateFrom, setHistoryDateFrom] = useState("")
  const [historyDateTo, setHistoryDateTo] = useState("")
  const [historyPage, setHistoryPage] = useState(1)

  // Data states
  const [stations, setStations] = useState<StationForExpenses[]>([])
  const [employees, setEmployees] = useState<StationEmployeeForExpenses[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<ExpenseHistoryItem | null>(null)

  // Edit dialog state
  const [editItem, setEditItem] = useState<ExpenseHistoryItem | null>(null)
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("maintenance")
  const [editAmount, setEditAmount] = useState(0)
  const [editPaymentMethod, setEditPaymentMethod] = useState<ExpensePaymentMethod>("cash")
  const [editVendorName, setEditVendorName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editApprovedBy, setEditApprovedBy] = useState("")
  const [editEmployees, setEditEmployees] = useState<StationEmployeeForExpenses[]>([])
  const [loadingEditEmployees, setLoadingEditEmployees] = useState(false)

  // History via React Query
  const { data: historyData, isLoading: historyLoading } = useExpenses()
  const { invalidateExpenses } = useInvalidateQueries()

  // Fetch stations on mount
  useEffect(() => {
    async function fetchStations() {
      setLoading(true)
      const result = await getStationsForExpenses()
      if (result.success) {
        setStations(result.stations)
      } else {
        toast.error(result.error)
      }
      setLoading(false)
    }
    fetchStations()
  }, [])

  // Fetch employees when station changes
  useEffect(() => {
    if (!selectedStation) {
      setEmployees([])
      setSelectedApprovedBy("")
      return
    }

    async function fetchEmployees() {
      setLoadingEmployees(true)
      const result = await getStationEmployeesForExpenses(selectedStation)
      if (result.success) {
        setEmployees(result.employees)
      } else {
        toast.error(result.error)
      }
      setLoadingEmployees(false)
    }

    fetchEmployees()
    setSelectedApprovedBy("")
  }, [selectedStation])

  // Line item handlers
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, createEmptyLineItem()])
  }, [])

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const updateLineItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return { ...item, [field]: value }
      })
    )
  }, [])

  // Computed values
  const validLineItems = useMemo(() => {
    return lineItems.filter((item) => item.category && item.amount > 0)
  }, [lineItems])

  const grandTotal = useMemo(() => {
    return validLineItems.reduce((sum, item) => sum + item.amount, 0)
  }, [validLineItems])

  const canSave = selectedStation && selectedApprovedBy && expenseDate && validLineItems.length > 0

  // Save handler
  const handleSave = useCallback(async () => {
    if (!canSave) return

    setSaving(true)
    const result = await saveExpenses(
      selectedStation,
      selectedApprovedBy,
      expenseDate,
      validLineItems.map((item) => ({
        category: item.category as ExpenseCategory,
        amount: item.amount,
        payment_method: item.payment_method,
        vendor_name: item.vendor_name || undefined,
        description: item.description || undefined,
      }))
    )

    if (result.success) {
      toast.success(`Saved ${result.savedCount} expense(s) successfully`)
      setLineItems([createEmptyLineItem()])
      invalidateExpenses()
    } else {
      toast.error(result.error)
    }
    setSaving(false)
  }, [canSave, selectedStation, selectedApprovedBy, expenseDate, validLineItems, invalidateExpenses])

  // Reset handler
  const handleReset = useCallback(() => {
    setLineItems([createEmptyLineItem()])
  }, [])

  // Delete handler
  const handleDelete = useCallback(async (expenseId: string) => {
    setDeleteConfirm(null)
    setDeleting(expenseId)
    const result = await deleteExpense(expenseId)
    if (result.success) {
      toast.success("Expense record deleted")
      invalidateExpenses()
    } else {
      toast.error(result.error)
    }
    setDeleting(null)
  }, [invalidateExpenses])

  // Edit handlers
  const openEditDialog = useCallback(async (item: ExpenseHistoryItem) => {
    setEditItem(item)
    setEditCategory(item.category)
    setEditAmount(item.amount)
    setEditPaymentMethod(item.payment_method)
    setEditVendorName(item.vendor_name || "")
    setEditDescription(item.description || "")
    setEditDate(item.expense_date)
    setEditApprovedBy(item.approved_by)

    // Load employees for the expense's station
    setLoadingEditEmployees(true)
    const result = await getStationEmployeesForExpenses(item.station_id)
    if (result.success) {
      setEditEmployees(result.employees)
    } else {
      setEditEmployees([])
    }
    setLoadingEditEmployees(false)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!editItem) return

    setUpdating(true)
    const result = await updateExpense(editItem.expense_id, {
      category: editCategory,
      amount: editAmount,
      payment_method: editPaymentMethod,
      vendor_name: editVendorName || null,
      description: editDescription || null,
      expense_date: editDate,
      approved_by: editApprovedBy,
    })

    if (result.success) {
      toast.success("Expense updated successfully")
      setEditItem(null)
      invalidateExpenses()
    } else {
      toast.error(result.error)
    }
    setUpdating(false)
  }, [editItem, editCategory, editAmount, editPaymentMethod, editVendorName, editDescription, editDate, editApprovedBy, invalidateExpenses])

  // Filtered history
  const filteredHistory = useMemo(() => {
    if (!historyData) return []
    let filtered = historyData
    if (historyStation) {
      filtered = filtered.filter((h) => h.station_id === historyStation)
    }
    if (historyDateFrom) {
      filtered = filtered.filter((h) => h.expense_date >= historyDateFrom)
    }
    if (historyDateTo) {
      filtered = filtered.filter((h) => h.expense_date <= historyDateTo)
    }
    return filtered
  }, [historyData, historyStation, historyDateFrom, historyDateTo])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE))
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredHistory, historyPage])

  // Reset page when filters change
  useEffect(() => {
    setHistoryPage(1)
  }, [historyStation, historyDateFrom, historyDateTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Entry Form ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            Expense Entry
          </CardTitle>
          <CardDescription>
            Record station expenses (maintenance, utilities, rent, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Top-level selectors */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="station">Station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger id="station">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.station_id} value={s.station_id}>
                      {s.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-date">Expense Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                max={getTodayDateString()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approved-by">Approved By</Label>
              <Select
                value={selectedApprovedBy}
                onValueChange={setSelectedApprovedBy}
                disabled={!selectedStation || loadingEmployees}
              >
                <SelectTrigger id="approved-by">
                  <SelectValue
                    placeholder={
                      loadingEmployees ? "Loading..." : !selectedStation ? "Select station first" : "Select employee"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.employee_id} value={e.employee_id}>
                      {e.employee_name} ({e.employee_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Items */}
          {selectedStation && (
            <>
              {employees.length === 0 && !loadingEmployees ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <AlertCircle className="h-4 w-4" />
                  No active employees at this station. Add employees first.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm font-medium">Line Items</div>

                  {/* Header row for wider screens */}
                  <div className="hidden lg:grid lg:grid-cols-[150px_120px_130px_1fr_1fr_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
                    <div>Category</div>
                    <div>Amount</div>
                    <div>Payment</div>
                    <div>Vendor Name</div>
                    <div>Description</div>
                    <div></div>
                  </div>

                  {lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-3 lg:grid-cols-[150px_120px_130px_1fr_1fr_40px] items-start rounded-lg border p-3 lg:border-0 lg:p-0"
                    >
                      {/* Category */}
                      <div className="space-y-1">
                        <Label className="lg:hidden text-xs">Category</Label>
                        <Select
                          value={item.category}
                          onValueChange={(val) => updateLineItem(item.id, "category", val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount */}
                      <div className="space-y-1">
                        <Label className="lg:hidden text-xs">Amount (INR)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          value={item.amount || ""}
                          onChange={(e) => updateLineItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-1">
                        <Label className="lg:hidden text-xs">Payment</Label>
                        <Select
                          value={item.payment_method}
                          onValueChange={(val) => updateLineItem(item.id, "payment_method", val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((pm) => (
                              <SelectItem key={pm.value} value={pm.value}>
                                {pm.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Vendor Name */}
                      <div className="space-y-1">
                        <Label className="lg:hidden text-xs">Vendor Name (optional)</Label>
                        <Input
                          placeholder="Vendor name"
                          value={item.vendor_name}
                          onChange={(e) => updateLineItem(item.id, "vendor_name", e.target.value)}
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <Label className="lg:hidden text-xs">Description (optional)</Label>
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        />
                      </div>

                      {/* Remove */}
                      <div className="flex items-start justify-end lg:justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add Item Button */}
                  <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>

                  {/* Summary & Actions */}
                  <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Items: <span className="font-medium text-foreground">{validLineItems.length}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{formatCurrency(grandTotal, true)}</span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleReset} disabled={saving}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button onClick={handleSave} disabled={!canSave || saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── History Table ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>Past expense records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* History Filters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="history-station">Station</Label>
              <Select
                value={historyStation || "all"}
                onValueChange={(val) => setHistoryStation(val === "all" ? "" : val)}
              >
                <SelectTrigger id="history-station">
                  <SelectValue placeholder="All stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.station_id} value={s.station_id}>
                      {s.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="history-date-from">From</Label>
              <Input
                id="history-date-from"
                type="date"
                value={historyDateFrom}
                onChange={(e) => setHistoryDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="history-date-to">To</Label>
              <Input
                id="history-date-to"
                type="date"
                value={historyDateTo}
                onChange={(e) => setHistoryDateTo(e.target.value)}
                max={getTodayDateString()}
              />
            </div>
          </div>

          {/* Table */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
              <HandCoins className="h-8 w-8 mb-2" />
              No expenses found
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((item) => (
                      <TableRow key={item.expense_id}>
                        <TableCell className="whitespace-nowrap">{formatDateShort(item.expense_date)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {formatSnakeCase(item.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.amount, true)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {formatSnakeCase(item.payment_method)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{item.vendor_name || "—"}</TableCell>
                        <TableCell>{item.approved_by_name}</TableCell>
                        <TableCell>{item.station_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditDialog(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirm(item)}
                              disabled={deleting === item.expense_id}
                            >
                              {deleting === item.expense_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {(historyPage - 1) * ITEMS_PER_PAGE + 1}-
                    {Math.min(historyPage * ITEMS_PER_PAGE, filteredHistory.length)} of {filteredHistory.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                      disabled={historyPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Delete Confirmation ─────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteConfirm && formatCurrency(deleteConfirm.amount, true)}{" "}
              {deleteConfirm && formatSnakeCase(deleteConfirm.category)} expense. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm.expense_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Edit Dialog ─────────────────────────────────── */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update expense details. Click save when done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editCategory} onValueChange={(val) => setEditCategory(val as ExpenseCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (INR)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={editAmount}
                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={editPaymentMethod} onValueChange={(val) => setEditPaymentMethod(val as ExpensePaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>
                        {pm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={getTodayDateString()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Approved By</Label>
              <Select
                value={editApprovedBy}
                onValueChange={setEditApprovedBy}
                disabled={loadingEditEmployees}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingEditEmployees ? "Loading..." : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {editEmployees.map((e) => (
                    <SelectItem key={e.employee_id} value={e.employee_id}>
                      {e.employee_name} ({e.employee_role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vendor Name</Label>
              <Input
                placeholder="Vendor name (optional)"
                value={editVendorName}
                onChange={(e) => setEditVendorName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Description (optional)"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating || editAmount <= 0 || !editDate || !editCategory || !editApprovedBy}>
              {updating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
