"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Banknote,
  ArrowRight,
  TrendingUp,
  TrendingDown,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  getStationsForSettlement,
  getClientBankAccounts,
  getNetPositionSummary,
  saveSettlements,
  deleteSettlement,
  type StationForSettlement,
  type BankAccountForSettlement,
  type NetPositionSummary,
  type SettlementHistoryItem,
} from "@/actions/settlement"
import { useSettlements, useInvalidateQueries } from "@/hooks/use-data"
import { getTodayDateString, formatCurrency, formatDateShort } from "@/lib/utils"
import type { SettlementMethod } from "@/types/database"

const METHODS: { value: SettlementMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank" },
]

interface LineItem {
  id: string
  from_method: SettlementMethod
  to_method: SettlementMethod
  from_bank_account_id: string
  to_bank_account_id: string
  amount: number
  reference_number: string
  notes: string
}

function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    from_method: "cash",
    to_method: "bank",
    from_bank_account_id: "",
    to_bank_account_id: "",
    amount: 0,
    reference_number: "",
    notes: "",
  }
}

function formatMethodDisplay(method: SettlementMethod, bankName: string | null): string {
  if (method === "bank" && bankName) return `Bank: ${bankName}`
  return method.toUpperCase()
}

const ITEMS_PER_PAGE = 10

export function SettlementManagement() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Selectors
  const [selectedStation, setSelectedStation] = useState("")
  const [settlementDate, setSettlementDate] = useState(getTodayDateString())

  // History filter states
  const [historyStation, setHistoryStation] = useState("")
  const [historyDateFrom, setHistoryDateFrom] = useState("")
  const [historyDateTo, setHistoryDateTo] = useState("")
  const [historyPage, setHistoryPage] = useState(1)

  // Data states
  const [stations, setStations] = useState<StationForSettlement[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccountForSettlement[]>([])
  const [summary, setSummary] = useState<NetPositionSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()])

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<SettlementHistoryItem | null>(null)

  // History via React Query
  const { data: historyData, isLoading: historyLoading } = useSettlements()
  const { invalidateSettlements } = useInvalidateQueries()

  // Fetch stations on mount
  useEffect(() => {
    async function fetchStations() {
      setLoading(true)
      const result = await getStationsForSettlement()
      if (result.success) {
        setStations(result.stations)
      } else {
        toast.error(result.error)
      }
      setLoading(false)
    }
    fetchStations()
  }, [])

  // Fetch summary + bank accounts when station+date selected
  useEffect(() => {
    if (!selectedStation || !settlementDate) {
      setSummary(null)
      return
    }

    async function fetchData() {
      setLoadingSummary(true)
      const [summaryResult, accountsResult] = await Promise.all([
        getNetPositionSummary(selectedStation, settlementDate),
        getClientBankAccounts(),
      ])

      if (summaryResult.success) {
        setSummary(summaryResult.summary)
      } else {
        toast.error(summaryResult.error)
        setSummary(null)
      }

      if (accountsResult.success) {
        setBankAccounts(accountsResult.accounts)
      } else {
        toast.error(accountsResult.error)
      }

      setLoadingSummary(false)
    }

    fetchData()
  }, [selectedStation, settlementDate])

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
        const updated = { ...item, [field]: value }
        // Clear bank account when method changes away from bank
        if (field === "from_method" && value !== "bank") {
          updated.from_bank_account_id = ""
        }
        if (field === "to_method" && value !== "bank") {
          updated.to_bank_account_id = ""
        }
        return updated
      })
    )
  }, [])

  // Validation
  const validLineItems = useMemo(() => {
    return lineItems.filter((item) => {
      if (item.amount <= 0) return false
      if (item.from_method === item.to_method && item.from_method !== "bank") return false
      if (item.from_method === "bank" && item.to_method === "bank" && item.from_bank_account_id === item.to_bank_account_id) return false
      if (item.from_method === "bank" && !item.from_bank_account_id) return false
      if (item.to_method === "bank" && !item.to_bank_account_id) return false
      return true
    })
  }, [lineItems])

  const grandTotal = useMemo(() => {
    return validLineItems.reduce((sum, item) => sum + item.amount, 0)
  }, [validLineItems])

  const canSave = selectedStation && settlementDate && validLineItems.length > 0

  // Save handler
  const handleSave = useCallback(async () => {
    if (!canSave) return

    setSaving(true)
    const result = await saveSettlements(
      selectedStation,
      settlementDate,
      validLineItems.map((item) => ({
        from_method: item.from_method,
        to_method: item.to_method,
        from_bank_account_id: item.from_method === "bank" ? item.from_bank_account_id : null,
        to_bank_account_id: item.to_method === "bank" ? item.to_bank_account_id : null,
        amount: item.amount,
        reference_number: item.reference_number || undefined,
        notes: item.notes || undefined,
      }))
    )

    if (result.success) {
      toast.success(`Saved ${result.savedCount} settlement(s) successfully`)
      setLineItems([createEmptyLineItem()])
      invalidateSettlements()
      // Refresh summary
      const summaryResult = await getNetPositionSummary(selectedStation, settlementDate)
      if (summaryResult.success) setSummary(summaryResult.summary)
      // Refresh bank accounts (balances changed)
      const accountsResult = await getClientBankAccounts()
      if (accountsResult.success) setBankAccounts(accountsResult.accounts)
    } else {
      toast.error(result.error)
    }
    setSaving(false)
  }, [canSave, selectedStation, settlementDate, validLineItems, invalidateSettlements])

  // Reset handler
  const handleReset = useCallback(() => {
    setLineItems([createEmptyLineItem()])
  }, [])

  // Delete handler
  const handleDelete = useCallback(async (settlementId: string) => {
    setDeleteConfirm(null)
    setDeleting(settlementId)
    const result = await deleteSettlement(settlementId)
    if (result.success) {
      toast.success("Settlement record deleted")
      invalidateSettlements()
      // Refresh summary if on same station+date
      if (selectedStation && settlementDate) {
        const summaryResult = await getNetPositionSummary(selectedStation, settlementDate)
        if (summaryResult.success) setSummary(summaryResult.summary)
        const accountsResult = await getClientBankAccounts()
        if (accountsResult.success) setBankAccounts(accountsResult.accounts)
      }
    } else {
      toast.error(result.error)
    }
    setDeleting(null)
  }, [invalidateSettlements, selectedStation, settlementDate])

  // Filtered history
  const filteredHistory = useMemo(() => {
    if (!historyData) return []
    let filtered = historyData
    if (historyStation) {
      filtered = filtered.filter((h) => h.station_id === historyStation)
    }
    if (historyDateFrom) {
      filtered = filtered.filter((h) => h.settlement_date >= historyDateFrom)
    }
    if (historyDateTo) {
      filtered = filtered.filter((h) => h.settlement_date <= historyDateTo)
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
      {/* ─── Station + Date Selectors ───────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Settlement
          </CardTitle>
          <CardDescription>
            Record fund movements between payment methods (cash, UPI, card, bank)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <Label htmlFor="settlement-date">Settlement Date</Label>
              <Input
                id="settlement-date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
              />
            </div>
          </div>

          {/* ─── Net Position Summary Cards ──────────────── */}
          {selectedStation && settlementDate && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {loadingSummary ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-4 w-16 mb-3" />
                        <Skeleton className="h-6 w-24 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : summary ? (
                <>
                  {(["cash", "upi", "card"] as const).map((method) => {
                    const data = summary[method]
                    return (
                      <Card key={method}>
                        <CardContent className="pt-6">
                          <div className="text-sm font-medium text-muted-foreground uppercase mb-1">
                            {method}
                          </div>
                          <div
                            className={`text-2xl font-bold ${
                              data.net > 0 ? "text-green-600" : data.net < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {formatCurrency(Math.abs(data.net), true)}
                            {data.net < 0 && " (deficit)"}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              In: {formatCurrency(data.inflow, true)}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3 text-red-600" />
                              Out: {formatCurrency(data.outflow, true)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </>
              ) : null}
            </div>
          )}

          {/* ─── Settlement Form (Line Items) ───────────── */}
          {selectedStation && settlementDate && (
            <div className="space-y-4">
              <div className="text-sm font-medium">Settlement Items</div>

              {/* Header row for wider screens */}
              <div className="hidden xl:grid xl:grid-cols-[110px_110px_1fr_1fr_100px_1fr_1fr_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <div>From</div>
                <div>To</div>
                <div>From Account</div>
                <div>To Account</div>
                <div>Amount</div>
                <div>Reference</div>
                <div>Notes</div>
                <div></div>
              </div>

              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-2 xl:grid-cols-[110px_110px_1fr_1fr_100px_1fr_1fr_36px] items-start rounded-lg border p-3 xl:border-0 xl:p-0"
                >
                  {/* From Method */}
                  <div className="min-w-0 space-y-1">
                    <Label className="xl:hidden text-xs">From</Label>
                    <Select
                      value={item.from_method}
                      onValueChange={(val) => updateLineItem(item.id, "from_method", val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* To Method */}
                  <div className="min-w-0 space-y-1">
                    <Label className="xl:hidden text-xs">To</Label>
                    <Select
                      value={item.to_method}
                      onValueChange={(val) => updateLineItem(item.id, "to_method", val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* From Bank Account */}
                  <div className="min-w-0 space-y-1">
                    <Label className="xl:hidden text-xs">From Account</Label>
                    {item.from_method === "bank" ? (
                      <Select
                        value={item.from_bank_account_id}
                        onValueChange={(val) => updateLineItem(item.id, "from_bank_account_id", val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((a) => (
                            <SelectItem key={a.bank_account_id} value={a.bank_account_id}>
                              {a.account_name} ({a.bank_name} ****{a.account_number_last4})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="N/A" className="text-muted-foreground" />
                    )}
                  </div>

                  {/* To Bank Account */}
                  <div className="min-w-0 space-y-1">
                    <Label className="xl:hidden text-xs">To Account</Label>
                    {item.to_method === "bank" ? (
                      <Select
                        value={item.to_bank_account_id}
                        onValueChange={(val) => updateLineItem(item.id, "to_bank_account_id", val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((a) => (
                            <SelectItem key={a.bank_account_id} value={a.bank_account_id}>
                              {a.account_name} ({a.bank_name} ****{a.account_number_last4})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="N/A" className="text-muted-foreground" />
                    )}
                  </div>

                  {/* Amount */}
                  <div className="min-w-0 space-y-1">
                    <Label className="xl:hidden text-xs">Amount (INR)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={item.amount || ""}
                      onChange={(e) => updateLineItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  {/* Reference */}
                  <div className="min-w-0 space-y-1">
                    <Label className="xl:hidden text-xs">Reference (optional)</Label>
                    <Input
                      placeholder="Ref #"
                      value={item.reference_number}
                      onChange={(e) => updateLineItem(item.id, "reference_number", e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div className="min-w-0 space-y-1">
                    <Label className="xl:hidden text-xs">Notes (optional)</Label>
                    <Input
                      placeholder="Notes"
                      value={item.notes}
                      onChange={(e) => updateLineItem(item.id, "notes", e.target.value)}
                    />
                  </div>

                  {/* Remove */}
                  <div className="flex items-start justify-end xl:justify-center">
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

              {/* Validation warnings */}
              {lineItems.some((item) => {
                if (item.from_method === item.to_method && item.from_method !== "bank") return true
                if (item.from_method === "bank" && item.to_method === "bank" && item.from_bank_account_id && item.from_bank_account_id === item.to_bank_account_id) return true
                return false
              }) && (
                <p className="text-sm text-destructive">
                  Source and destination must be different.
                </p>
              )}

              {/* Add Item Button */}
              <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Add Settlement
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
        </CardContent>
      </Card>

      {/* ─── Settlement History ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
          <CardDescription>Past settlement records</CardDescription>
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
              <Banknote className="h-8 w-8 mb-2" />
              No settlements found
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead></TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((item) => (
                      <TableRow key={item.settlement_id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateShort(item.settlement_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize whitespace-nowrap">
                            {item.from_method === "bank" && item.from_bank_name
                              ? item.from_bank_name
                              : item.from_method.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-1">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize whitespace-nowrap">
                            {item.to_method === "bank" && item.to_bank_name
                              ? item.to_bank_name
                              : item.to_method.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount, true)}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">
                          {item.reference_number || "—"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {item.notes || "—"}
                        </TableCell>
                        <TableCell>{item.station_name}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteConfirm(item)}
                            disabled={deleting === item.settlement_id}
                          >
                            {deleting === item.settlement_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
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
            <AlertDialogTitle>Delete Settlement Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteConfirm && formatCurrency(deleteConfirm.amount, true)}{" "}
              settlement ({deleteConfirm && `${deleteConfirm.from_method.toUpperCase()} → ${deleteConfirm.to_method.toUpperCase()}`}).
              {deleteConfirm && (deleteConfirm.from_method === "bank" || deleteConfirm.to_method === "bank") &&
                " Bank account balances will be reversed."
              }{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm.settlement_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
