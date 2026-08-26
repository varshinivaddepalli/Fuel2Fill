"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormErrorBanner } from "@/components/registration/form-error-banner"
import { FormFooter } from "@/components/registration/form-footer"
import { StationRequiredGate } from "@/components/registration/station-required-gate"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { addMultipleStationProducts } from "@/actions/station-product"
import { getClientStations } from "@/actions/stations"
import type { Station } from "@/types/database"
import { X } from "lucide-react"

type ProductRow = {
  product_name: string
  hsn_code: string
  current_stock: string
  minimum_stock: string
}

const emptyRow = (): ProductRow => ({
  product_name: "",
  hsn_code: "",
  current_stock: "",
  minimum_stock: "",
})

export function AddProductForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [loadingStations, setLoadingStations] = useState(true)

  const [stationId, setStationId] = useState("")
  const [productCount, setProductCount] = useState(1)
  const [products, setProducts] = useState<ProductRow[]>([emptyRow()])

  useEffect(() => {
    async function fetchStations() {
      const result = await getClientStations()
      if (result.success) {
        setStations(result.stations)
      } else {
        setError(result.error)
      }
      setLoadingStations(false)
    }
    fetchStations()
  }, [])

  const handleGenerateRows = useCallback(() => {
    const count = Math.max(1, Math.min(20, productCount))
    setProducts((prev) => {
      if (count > prev.length) {
        return [...prev, ...Array.from({ length: count - prev.length }, emptyRow)]
      }
      return prev.slice(0, count)
    })
    setProductCount(count)
  }, [productCount])

  const handleProductChange = useCallback(
    (index: number, field: keyof ProductRow, value: string) => {
      setProducts((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
      })
    },
    []
  )

  const handleRemoveRow = useCallback(
    (index: number) => {
      if (products.length <= 1) return
      setProducts((prev) => prev.filter((_, i) => i !== index))
      setProductCount((prev) => prev - 1)
    },
    [products.length]
  )

  const validateForm = (): string | null => {
    if (!stationId) return "Please select a station"
    if (products.length === 0) return "Add at least one product"

    const names = new Set<string>()
    for (let i = 0; i < products.length; i++) {
      const name = products[i].product_name.trim()
      if (!name) return `Product ${i + 1}: Name is required`
      const lower = name.toLowerCase()
      if (names.has(lower)) return `Duplicate product name: "${name}"`
      names.add(lower)

      const cs = products[i].current_stock
      if (cs && parseInt(cs) < 0) return `Product ${i + 1}: Current stock cannot be negative`
      const ms = products[i].minimum_stock
      if (ms && parseInt(ms) < 0) return `Product ${i + 1}: Minimum stock cannot be negative`
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured")
      return
    }

    setIsLoading(true)

    try {
      const result = await addMultipleStationProducts(
        stationId,
        products.map((p) => ({
          product_name: p.product_name,
          hsn_code: p.hsn_code.trim() || undefined,
          current_stock: p.current_stock ? parseInt(p.current_stock) : 0,
          minimum_stock: p.minimum_stock ? parseInt(p.minimum_stock) : 0,
        }))
      )

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success(`${result.count} product(s) added successfully!`, {
        description: "The products have been registered to the station.",
      })
      setProducts([emptyRow()])
      setProductCount(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add products")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StationRequiredGate loadingStations={loadingStations} stationsCount={stations.length} entityName="products">
      <form onSubmit={handleSubmit}>
      <FormErrorBanner error={error} />

      <div className="space-y-6">
        {/* Station Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Station</CardTitle>
            <CardDescription>
              Choose the station to add products to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="station_id">
                Station <span className="text-destructive">*</span>
              </Label>
              <Select
                value={stationId}
                onValueChange={setStationId}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.station_id} value={station.station_id}>
                      {station.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Number of Products */}
        <Card>
          <CardHeader>
            <CardTitle>Number of Products</CardTitle>
            <CardDescription>
              How many products do you want to add? (1-20)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="product_count">Count</Label>
                <Input
                  id="product_count"
                  type="number"
                  min={1}
                  max={20}
                  value={productCount}
                  onChange={(e) => setProductCount(parseInt(e.target.value) || 1)}
                  disabled={isLoading}
                />
              </div>
              <Button type="button" variant="secondary" onClick={handleGenerateRows} disabled={isLoading}>
                Generate Rows
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product Rows */}
        {products.map((product, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Product {index + 1}</CardTitle>
              {products.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveRow(index)}
                  disabled={isLoading}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor={`product_name_${index}`}>
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`product_name_${index}`}
                  placeholder="Enter product name"
                  value={product.product_name}
                  onChange={(e) => handleProductChange(index, "product_name", e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`hsn_code_${index}`}>HSN Code</Label>
                <Input
                  id={`hsn_code_${index}`}
                  placeholder="Optional HSN code"
                  value={product.hsn_code}
                  onChange={(e) => handleProductChange(index, "hsn_code", e.target.value)}
                  disabled={isLoading}
                  maxLength={20}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`current_stock_${index}`}>Current Stock</Label>
                  <Input
                    id={`current_stock_${index}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={product.current_stock}
                    onChange={(e) => handleProductChange(index, "current_stock", e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`minimum_stock_${index}`}>Minimum Stock (Alert Level)</Label>
                  <Input
                    id={`minimum_stock_${index}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={product.minimum_stock}
                    onChange={(e) => handleProductChange(index, "minimum_stock", e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <FormFooter isLoading={isLoading} submitLabel={`Add ${products.length} Product${products.length > 1 ? "s" : ""}`} loadingLabel="Adding Products..." />
      </div>
      </form>
    </StationRequiredGate>
  )
}
