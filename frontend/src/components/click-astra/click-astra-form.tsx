"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import {
  Loader2,
  Upload,
  Camera,
  X,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  FileSpreadsheet,
  ScanLine,
  RefreshCw,
  Save,
  FileText,
  SwitchCamera,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  getClickAstraRecords,
  createClickAstraRecord,
  processClickAstraOCR,
  verifyClickAstraRecord,
  deleteClickAstraRecord,
  exportClickAstraRecords,
  getClickAstraTemplates,
  createClickAstraTemplate,
  deleteClickAstraTemplate,
} from "@/actions/click-astra"
import { ClickAstra, ClickAstraTemplate } from "@/types/database"
import { getTodayDateString, formatDateShort, cn } from "@/lib/utils"
import { BackendStatusIndicator } from "@/components/ui/backend-status-indicator"
import { DataTable, getColumns } from "./click-astra-records-table"
// xlsx is dynamically imported at usage point to reduce initial bundle size

// Helper to convert any value to a displayable string
const formatValueAsString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ""
  }
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  return String(value)
}

// Helper to format value for display in verification form (more readable)
const formatValueForDisplay = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ""
  }
  if (Array.isArray(value)) {
    // Check if it's an array of simple values (strings, numbers)
    if (value.length > 0 && typeof value[0] !== "object") {
      // Simple array - join with newlines for readability
      return value.join("\n")
    }
    // Array of objects - format with indentation
    return JSON.stringify(value, null, 2)
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

// Check if value is a complex type (array or object)
const isComplexValue = (value: string): boolean => {
  return value.includes("\n") || value.startsWith("[") || value.startsWith("{")
}

export function ClickAstraForm() {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<ClickAstra[]>([])
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [date, setDate] = useState(getTodayDateString())
  const [extractionColumns, setExtractionColumns] = useState<string[]>([])
  const [newColumn, setNewColumn] = useState("")
  const [llmInstructions, setLlmInstructions] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Camera states
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Verification dialog states
  const [verifyingRecord, setVerifyingRecord] = useState<ClickAstra | null>(null)
  const [verifiedData, setVerifiedData] = useState<Record<string, string>>({})
  const [savingVerification, setSavingVerification] = useState(false)

  // View dialog states
  const [viewingRecord, setViewingRecord] = useState<ClickAstra | null>(null)

  // Delete loading state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Selected records for export
  const [selectedRecords, setSelectedRecords] = useState<ClickAstra[]>([])

  // Template states
  const [templates, setTemplates] = useState<ClickAstraTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)

  // Polling ref for cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup polling interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      // Cleanup object URL
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  // Fetch records and templates on mount
  useEffect(() => {
    fetchRecords()
    fetchTemplates()
  }, [])

  const fetchTemplates = useCallback(async () => {
    const result = await getClickAstraTemplates()
    if (result.success) {
      setTemplates(result.templates)
    }
  }, [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getClickAstraRecords()
    if (result.success) {
      setRecords(result.records)
    } else {
      setError(result.error || "Failed to fetch records")
      toast.error(result.error || "Failed to fetch records")
    }
    setLoading(false)
  }, [])

  // Helper to set image preview with cleanup
  const setImagePreviewWithCleanup = useCallback((newUrl: string | null) => {
    setImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return newUrl
    })
  }, [])

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/) && file.type !== "application/pdf") {
        toast.error("Please upload a JPEG, PNG, WebP image or PDF file")
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB")
        return
      }
      setImageFile(file)
      setImagePreviewWithCleanup(URL.createObjectURL(file))
      // Auto-fill name from filename if empty
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  // Camera functions - start with specific facing mode
  const startCameraWithMode = useCallback(async (mode: "user" | "environment") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      })
      setCameraStream(stream)
      setFacingMode(mode)

      // Set srcObject and play directly
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch((err) => {
          console.error("Failed to play video:", err)
        })
      }
    } catch (err) {
      console.error("Camera error:", err)
      setShowCamera(false)
      toast.error("Could not access camera. Please allow camera access.")
    }
  }, [])

  // Start camera (initial)
  const startCamera = useCallback(async () => {
    // Open dialog FIRST so video element is mounted
    setShowCamera(true)
    await startCameraWithMode(facingMode)
  }, [facingMode, startCameraWithMode])

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    // Stop current stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
    }
    // Start with opposite facing mode
    const newMode = facingMode === "user" ? "environment" : "user"
    await startCameraWithMode(newMode)
  }, [cameraStream, facingMode, startCameraWithMode])

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }, [cameraStream])

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Check if video has dimensions (stream is ready)
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast.error("Camera not ready. Please wait a moment and try again.")
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `capture_${Date.now()}.jpg`, {
                type: "image/jpeg",
              })
              setImageFile(file)
              setImagePreviewWithCleanup(URL.createObjectURL(blob))
              if (!name) {
                setName(`Capture ${formatDateShort(getTodayDateString())}`)
              }
            }
            stopCamera()
          },
          "image/jpeg",
          0.9
        )
      }
    }
  }

  // Add extraction column
  const addColumn = () => {
    if (newColumn.trim() && !extractionColumns.includes(newColumn.trim())) {
      setExtractionColumns([...extractionColumns, newColumn.trim()])
      setNewColumn("")
    }
  }

  const removeColumn = (column: string) => {
    setExtractionColumns(extractionColumns.filter((c) => c !== column))
  }

  // Apply template
  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) return

    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setExtractionColumns(template.extraction_columns || [])
      if (template.llm_instructions) {
        setLlmInstructions(template.llm_instructions)
      }
      toast.success(`Template "${template.name}" applied`)
    }
  }

  // Save as template
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name")
      return
    }
    if (extractionColumns.length === 0) {
      toast.error("Please add at least one column before saving as template")
      return
    }

    setSavingTemplate(true)
    const result = await createClickAstraTemplate({
      name: newTemplateName.trim(),
      extraction_columns: extractionColumns,
      llm_instructions: llmInstructions.trim() || null,
    })
    setSavingTemplate(false)

    if (result.success) {
      toast.success("Template saved")
      setShowSaveTemplateDialog(false)
      setNewTemplateName("")
      fetchTemplates()
    } else {
      toast.error(result.error || "Failed to save template")
    }
  }

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) return

    setDeletingTemplateId(templateId)
    const result = await deleteClickAstraTemplate(templateId)
    setDeletingTemplateId(null)

    if (result.success) {
      toast.success("Template deleted")
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId("")
      }
      fetchTemplates()
    } else {
      toast.error(result.error || "Failed to delete template")
    }
  }

  // Clear form
  const clearForm = () => {
    setName("")
    setDate(getTodayDateString())
    setExtractionColumns([])
    setNewColumn("")
    setLlmInstructions("")
    setImageFile(null)
    setImagePreviewWithCleanup(null)
    setSelectedTemplateId("")
  }

  // Upload and create record
  const handleSubmit = async () => {
    if (!imageFile) {
      toast.error("Please upload or capture an image")
      return
    }
    if (!name.trim()) {
      toast.error("Please enter a name for the document")
      return
    }
    if (extractionColumns.length === 0) {
      toast.error("Please add at least one column to extract")
      return
    }

    setUploading(true)

    try {
      // Upload image to Supabase Storage
      const supabase = createClient()
      const fileName = `${Date.now()}_${imageFile.name.replace(/\s+/g, "_")}`

      const { error: uploadError } = await supabase.storage
        .from("click-astra-images")
        .upload(fileName, imageFile)

      if (uploadError) {
        toast.error("Failed to upload image: " + uploadError.message)
        setUploading(false)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("click-astra-images").getPublicUrl(fileName)

      // Create record
      const result = await createClickAstraRecord({
        name: name.trim(),
        image_name: imageFile.name,
        image_url: publicUrl,
        date,
        extraction_columns: extractionColumns,
        llm_instructions: llmInstructions.trim() || null,
      })

      if (result.success) {
        toast.success("Document uploaded successfully")
        clearForm()
        fetchRecords()
      } else {
        toast.error(result.error || "Failed to create record")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload")
    }

    setUploading(false)
  }

  // Process OCR
  const handleProcess = async (record: ClickAstra) => {
    const result = await processClickAstraOCR(record.id)
    if (result.success) {
      toast.success("Processing started")

      // Clear any existing polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }

      // Poll for completion - fetch fresh data each time to avoid stale closure
      pollIntervalRef.current = setInterval(async () => {
        const refreshResult = await getClickAstraRecords()
        if (refreshResult.success) {
          setRecords(refreshResult.records)
          const updated = refreshResult.records.find((r) => r.id === record.id)
          if (updated && updated.processing_status !== "processing") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            // Show completion notification
            if (updated.processing_status === "completed") {
              toast.success("Processing completed!")
            } else if (updated.processing_status === "failed") {
              toast.error("Processing failed: " + (updated.error_message || "Unknown error"))
            }
          }
        }
      }, 2000)

      // Stop polling after 2 minutes
      setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }, 120000)
    } else {
      toast.error(result.error || "Failed to start processing")
    }
  }

  // Delete record
  const handleDelete = async (record: ClickAstra) => {
    if (!confirm("Are you sure you want to delete this record?")) return

    setDeletingId(record.id)
    const result = await deleteClickAstraRecord(record.id)
    setDeletingId(null)

    if (result.success) {
      toast.success("Record deleted")
      fetchRecords()
    } else {
      toast.error(result.error || "Failed to delete")
    }
  }

  // Open verification dialog
  const openVerification = (record: ClickAstra) => {
    setVerifyingRecord(record)
    // Initialize verified data with AI response or empty values for columns
    const initialData: Record<string, string> = {}
    const columns = record.extraction_columns || []
    const aiResponse = (record.ai_response as Record<string, unknown>) || {}

    columns.forEach((col) => {
      initialData[col] = formatValueForDisplay(aiResponse[col])
    })

    setVerifiedData(initialData)
  }

  // Save verification
  const saveVerification = async () => {
    if (!verifyingRecord) return

    setSavingVerification(true)
    const result = await verifyClickAstraRecord(verifyingRecord.id, verifiedData)
    setSavingVerification(false)

    if (result.success) {
      toast.success("Verification saved")
      setVerifyingRecord(null)
      setVerifiedData({})
      fetchRecords()
    } else {
      toast.error(result.error || "Failed to save verification")
    }
  }

  // Export to Excel
  const handleExport = async () => {
    // If records are selected, export only those; otherwise export all
    const selectedIds = selectedRecords.length > 0
      ? selectedRecords.map((r) => r.id)
      : undefined

    const result = await exportClickAstraRecords(selectedIds)
    if (!result.success || !result.data) {
      toast.error(result.error || "Failed to export")
      return
    }

    // Only include the user-specified extraction columns
    const flatData = result.data.map((record) => {
      const aiResponse = (record.ai_response as Record<string, unknown>) || {}
      const columns = (record.extraction_columns as string[]) || []

      const row: Record<string, string> = {}

      // Only add the columns user specified for extraction
      columns.forEach((col) => {
        row[col] = formatValueAsString(aiResponse[col])
      })

      return row
    })

    // Create workbook and download
    const XLSX = await import("xlsx")
    const ws = XLSX.utils.json_to_sheet(flatData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Click Astra Records")
    XLSX.writeFile(wb, `click_astra_export_${getTodayDateString()}.xlsx`)

    const exportCount = selectedRecords.length > 0 ? selectedRecords.length : result.data.length
    toast.success(`Exported ${exportCount} record(s) to Excel`)
  }

  // Get status badge variant (used in view dialog)
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "processing":
        return (
          <Badge variant="outline" className="animate-pulse">
            <Loader2 className="size-3 mr-1 animate-spin" />
            Processing
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600">
            Completed
          </Badge>
        )
      case "verified":
        return (
          <Badge variant="default" className="bg-blue-600">
            <Check className="size-3 mr-1" />
            Verified
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="size-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Data table columns
  const columns = useMemo(
    () =>
      getColumns({
        onView: setViewingRecord,
        onProcess: handleProcess,
        onVerify: openVerification,
        onDelete: handleDelete,
        deletingId,
      }),
    [deletingId]
  )

  // Handle selection change from data table
  const handleSelectionChange = useCallback((selected: ClickAstra[]) => {
    setSelectedRecords(selected)
  }, [])

  // Count exportable records (completed or verified)
  const exportableCount = useMemo(() => {
    if (selectedRecords.length > 0) {
      return selectedRecords.filter(
        (r) => r.processing_status === "completed" || r.processing_status === "verified"
      ).length
    }
    return records.filter(
      (r) => r.processing_status === "completed" || r.processing_status === "verified"
    ).length
  }, [records, selectedRecords])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Click Astra</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upload images, extract data with OCR, and export to Excel
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          disabled={exportableCount === 0}
          className="w-full sm:w-auto"
        >
          <FileSpreadsheet className="size-4 mr-2" />
          {selectedRecords.length > 0
            ? `Export Selected (${selectedRecords.length})`
            : "Export All"}
        </Button>
      </div>

      {/* Upload Form Card */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ScanLine className="size-4 sm:size-5" />
            Upload Document
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Upload or capture an image to extract data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left side - Image upload/capture */}
            <div className="space-y-4">
              {/* Image/PDF Preview */}
              {imagePreview ? (
                <div className="relative rounded-lg border overflow-hidden">
                  {imageFile?.type === "application/pdf" ? (
                    // PDF preview using iframe
                    <iframe
                      src={imagePreview}
                      title="PDF Preview"
                      className="w-full h-48 bg-muted"
                    />
                  ) : (
                    // Image preview
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-contain bg-muted"
                    />
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg bg-muted/50">
                  <Upload className="size-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Upload or capture an image
                  </p>
                </div>
              )}

              {/* Upload/Capture Buttons */}
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <Button variant="outline" className="w-full h-10 sm:h-9" asChild>
                    <span>
                      <Upload className="size-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </label>
                <Button
                  variant="outline"
                  onClick={startCamera}
                  disabled={uploading}
                  className="h-10 sm:h-9"
                >
                  <Camera className="size-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>

            {/* Right side - Form fields */}
            <div className="space-y-4">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="doc-name">Document Name</Label>
                <Input
                  id="doc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name for this document"
                  disabled={uploading}
                />
              </div>

              {/* Date */}
              <div className="grid gap-2">
                <Label htmlFor="doc-date">Date</Label>
                <Input
                  id="doc-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={uploading}
                />
              </div>

              {/* Extraction Columns */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Columns to Extract</Label>
                  {extractionColumns.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowSaveTemplateDialog(true)}
                      disabled={uploading}
                    >
                      <Save className="size-3 mr-1" />
                      Save as Template
                    </Button>
                  )}
                </div>

                {/* Template Selector */}
                {templates.length > 0 && (
                  <div className="flex gap-2">
                    <Select
                      value={selectedTemplateId}
                      onValueChange={applyTemplate}
                      disabled={uploading}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Load from template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <FileText className="size-3" />
                              {template.name}
                              <span className="text-muted-foreground text-xs">
                                ({template.extraction_columns.length} columns)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplateId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTemplate(selectedTemplateId)}
                        disabled={deletingTemplateId === selectedTemplateId}
                        title="Delete template"
                      >
                        {deletingTemplateId === selectedTemplateId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value)}
                    placeholder="e.g., Invoice Number, Amount"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addColumn()
                      }
                    }}
                    disabled={uploading}
                  />
                  <Button variant="outline" onClick={addColumn} disabled={uploading}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                {extractionColumns.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {extractionColumns.map((col) => (
                      <Badge key={col} variant="secondary" className="gap-1">
                        {col}
                        <button
                          onClick={() => removeColumn(col)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LLM Instructions */}
          <div className="grid gap-2">
            <Label htmlFor="llm-instructions">Instructions for AI (Optional)</Label>
            <Textarea
              id="llm-instructions"
              value={llmInstructions}
              onChange={(e) => setLlmInstructions(e.target.value)}
              placeholder="Additional instructions for the AI to process this document..."
              rows={3}
              disabled={uploading}
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={clearForm} disabled={uploading} className="h-10 sm:h-9">
              Clear
            </Button>
            <Button onClick={handleSubmit} disabled={uploading || !imageFile} className="h-10 sm:h-9">
              {uploading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-2" />
                  <span className="hidden sm:inline">Upload Document</span>
                  <span className="sm:hidden">Upload</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div>
              <CardTitle className="text-base sm:text-lg">Document Records</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and manage uploaded documents
              </CardDescription>
            </div>
            <BackendStatusIndicator />
          </div>
          <Button variant="ghost" size="icon" onClick={fetchRecords} className="absolute top-3 right-3 sm:static">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-12 text-destructive/70 mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={records}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Capture Photo</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Position the document and click capture
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-between sm:justify-end gap-2">
              <Button variant="outline" onClick={stopCamera} className="flex-1 sm:flex-none h-10 sm:h-9">
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={switchCamera}
                title={facingMode === "user" ? "Switch to back camera" : "Switch to front camera"}
                className="h-10 sm:h-9"
              >
                <SwitchCamera className="size-4" />
              </Button>
              <Button onClick={capturePhoto} className="flex-1 sm:flex-none h-10 sm:h-9">
                <Camera className="size-4 mr-2" />
                Capture
              </Button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>

      {/* View Record Dialog */}
      <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg truncate pr-8">{viewingRecord?.name}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Document details and extracted data
            </DialogDescription>
          </DialogHeader>
          {viewingRecord && (
            <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <div className="space-y-3 sm:space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Date</p>
                    <p className="text-sm sm:text-base font-medium">{formatDateShort(viewingRecord.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(viewingRecord.processing_status)}
                  </div>
                </div>

                {/* Image/PDF Preview */}
                {viewingRecord.image_url && (
                  <div className="rounded-lg border overflow-hidden">
                    {viewingRecord.image_url.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={viewingRecord.image_url}
                        title="PDF Preview"
                        className="w-full h-48 sm:h-64 bg-muted"
                      />
                    ) : (
                      <img
                        src={viewingRecord.image_url}
                        alt={viewingRecord.name}
                        className="w-full max-h-48 sm:max-h-64 object-contain bg-muted"
                      />
                    )}
                  </div>
                )}

                {/* Extracted Data */}
                {viewingRecord.ai_response && (
                  <div>
                    <p className="text-xs sm:text-sm font-medium mb-2">Extracted Data</p>
                    <div className="rounded-lg border p-3 sm:p-4 bg-muted/50 overflow-x-auto">
                      <pre className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                        {JSON.stringify(viewingRecord.ai_response, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {viewingRecord.error_message && (
                  <div className="rounded-lg border border-destructive p-3 sm:p-4 bg-destructive/10">
                    <p className="text-xs sm:text-sm text-destructive">{viewingRecord.error_message}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog
        open={!!verifyingRecord}
        onOpenChange={(open) => {
          if (!open) {
            setVerifyingRecord(null)
            setVerifiedData({})
          }
        }}
      >
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">Verify Extracted Data</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Review and correct the extracted data before confirming
            </DialogDescription>
          </DialogHeader>
          {verifyingRecord && (
            <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <div className="space-y-3 sm:space-y-4 pb-4">
                {/* Image/PDF Preview */}
                {verifyingRecord.image_url && (
                  <div className="rounded-lg border overflow-hidden">
                    {verifyingRecord.image_url.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={verifyingRecord.image_url}
                        title="PDF Preview"
                        className="w-full h-32 sm:h-48 bg-muted"
                      />
                    ) : (
                      <img
                        src={verifyingRecord.image_url}
                        alt={verifyingRecord.name}
                        className="w-full max-h-32 sm:max-h-48 object-contain bg-muted"
                      />
                    )}
                  </div>
                )}

                {/* Editable Fields */}
                <div className="space-y-3 sm:space-y-4">
                  {(verifyingRecord.extraction_columns || []).map((col) => {
                    const value = verifiedData[col] || ""
                    const complex = isComplexValue(value)
                    // Calculate rows based on content
                    const lineCount = value.split("\n").length
                    const rows = Math.min(Math.max(lineCount + 1, 3), 10)

                    return (
                      <div key={col} className="grid gap-1.5 sm:gap-2">
                        <Label htmlFor={`verify-${col}`} className="text-sm font-medium">
                          {col}
                        </Label>
                        {complex ? (
                          <Textarea
                            id={`verify-${col}`}
                            value={value}
                            onChange={(e) =>
                              setVerifiedData((prev) => ({ ...prev, [col]: e.target.value }))
                            }
                            disabled={savingVerification}
                            rows={rows}
                            className="font-mono text-xs sm:text-sm bg-muted/30"
                          />
                        ) : (
                          <Input
                            id={`verify-${col}`}
                            value={value}
                            onChange={(e) =>
                              setVerifiedData((prev) => ({ ...prev, [col]: e.target.value }))
                            }
                            disabled={savingVerification}
                            className="h-10 sm:h-9"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Actions - outside scroll area */}
          {verifyingRecord && (
            <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 sm:pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setVerifyingRecord(null)
                  setVerifiedData({})
                }}
                disabled={savingVerification}
                className="h-10 sm:h-9"
              >
                Cancel
              </Button>
              <Button onClick={saveVerification} disabled={savingVerification} className="h-10 sm:h-9">
                {savingVerification ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="size-4 mr-2" />
                    <span className="hidden sm:inline">Confirm Verification</span>
                    <span className="sm:hidden">Confirm</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Save as Template</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Save the current extraction columns as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid gap-1.5 sm:gap-2">
              <Label htmlFor="template-name" className="text-sm">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Invoice Template, Receipt Template"
                disabled={savingTemplate}
                className="h-10 sm:h-9"
              />
            </div>

            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Columns to save:</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {extractionColumns.map((col) => (
                  <Badge key={col} variant="secondary" className="text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>

            {llmInstructions && (
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">LLM instructions will also be saved</p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveTemplateDialog(false)
                  setNewTemplateName("")
                }}
                disabled={savingTemplate}
                className="h-10 sm:h-9"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={savingTemplate} className="h-10 sm:h-9">
                {savingTemplate ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
