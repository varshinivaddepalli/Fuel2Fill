"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Camera, Upload, X, SwitchCamera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { addEmployee } from "@/actions/employee"
import { getClientStations } from "@/actions/stations"
import { validatePhone, validateAadhaar } from "@/lib/validation/indian-formats"
import { getTodayDateString, toNullIfEmpty } from "@/lib/utils"
import type { Station, EmployeeRoleType, EmploymentType } from "@/types/database"

export function AddEmployeeForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [loadingStations, setLoadingStations] = useState(true)

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Camera state
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getInitialFormData = () => ({
    station_id: "",
    employee_name: "",
    employee_role: "" as EmployeeRoleType | "",
    employee_phone: "",
    employee_address: "",
    aadhaar_number: "",
    employment_type: "full_time" as EmploymentType,
    joining_date: getTodayDateString(),
    salary: "",
  })

  const [formData, setFormData] = useState(getInitialFormData)
  const resetForm = () => setFormData(getInitialFormData())
  useEffect(() => {
    async function loadStations() {
      const result = await getClientStations()
      if (result.success) {
        setStations(result.stations)
      } else {
        setError(result.error)
      }
      setLoadingStations(false)
    }
    loadStations()
  }, [])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  // Cleanup photo preview URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === "employee_phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError("Please select a valid image (JPEG, PNG, or WebP)")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  const removePhoto = () => {
    setPhotoFile(null)
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Start camera with specified facing mode
  const startCameraWithMode = useCallback(async (mode: "user" | "environment") => {
    setCameraError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      })

      setCameraStream(stream)
      setFacingMode(mode)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.error("Camera error:", err)
      setCameraError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera access in your browser settings."
          : "Could not access camera. Please make sure your device has a camera."
      )
    }
  }, [])

  // Start camera (initial)
  const startCamera = useCallback(async () => {
    setShowCamera(true)
    await startCameraWithMode(facingMode)
  }, [facingMode, startCameraWithMode])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setShowCamera(false)
    setCameraError(null)
  }, [cameraStream])

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    // Stop current stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
    }
    // Start with opposite facing mode
    const newMode = facingMode === "user" ? "environment" : "user"
    await startCameraWithMode(newMode)
  }, [cameraStream, facingMode, startCameraWithMode])

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) return

      // Create file from blob
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setPhotoFile(file)
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })

      // Stop camera after capture
      stopCamera()
    }, 'image/jpeg', 0.9)
  }, [stopCamera])

  const uploadPhotoToStorage = async (): Promise<string | null> => {
    if (!photoFile) return null

    const supabase = createClient()
    const fileExt = photoFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    setUploadingPhoto(true)

    const { data, error: uploadError } = await supabase.storage
      .from('employee-photos')
      .upload(fileName, photoFile, {
        cacheControl: '3600',
        upsert: false
      })

    setUploadingPhoto(false)

    if (uploadError) {
      throw new Error(`Failed to upload photo: ${uploadError.message}`)
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('employee-photos')
      .getPublicUrl(data.path)

    return publicUrl
  }

  const validateForm = (): string | null => {
    if (!formData.station_id) {
      return "Please select a station"
    }
    if (!formData.employee_name.trim()) {
      return "Employee name is required"
    }
    if (!formData.employee_role) {
      return "Employee role is required"
    }

    const phoneError = validatePhone(formData.employee_phone)
    if (phoneError) return phoneError

    if (!formData.aadhaar_number.trim()) {
      return "Aadhaar number is required"
    }
    const aadhaarError = validateAadhaar(formData.aadhaar_number)
    if (aadhaarError) return aadhaarError

    if (!formData.joining_date) {
      return "Joining date is required"
    }

    if (!formData.salary || parseFloat(formData.salary) < 0) {
      return formData.employment_type === "part_time"
        ? "Valid daily wage is required"
        : "Valid monthly salary is required"
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
      // Upload photo first if selected
      let photoUrl: string | null = null
      if (photoFile) {
        photoUrl = await uploadPhotoToStorage()
      }

      const result = await addEmployee({
        station_id: formData.station_id,
        employee_name: formData.employee_name,
        employee_role: formData.employee_role as EmployeeRoleType,
        employee_phone: formData.employee_phone,
        employee_address: toNullIfEmpty(formData.employee_address),
        aadhaar_number: toNullIfEmpty(formData.aadhaar_number),
        employment_type: formData.employment_type,
        joining_date: formData.joining_date,
        salary: parseFloat(formData.salary),
        employee_photo: photoUrl,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success("Employee added successfully!", {
        description: "The new employee has been registered.",
      })
      resetForm()
      removePhoto()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StationRequiredGate loadingStations={loadingStations} stationsCount={stations.length} entityName="employees">
      <>
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full max-w-lg mx-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Take Photo</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={stopCamera}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cameraError ? (
                  <div className="text-center py-8">
                    <p className="text-destructive mb-4">{cameraError}</p>
                    <Button variant="outline" onClick={stopCamera}>
                      Close
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopCamera}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={switchCamera}
                        title={facingMode === "user" ? "Switch to back camera" : "Switch to front camera"}
                      >
                        <SwitchCamera className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={capturePhoto}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Capture
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      <form onSubmit={handleSubmit}>
        <FormErrorBanner error={error} />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Station Selection</CardTitle>
              <CardDescription>
                Select the station where this employee will work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="station_id">
                  Station <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.station_id}
                  onValueChange={(value) => handleSelectChange("station_id", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem key={station.station_id} value={station.station_id}>
                        {station.station_name} - {station.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employee Photo</CardTitle>
              <CardDescription>
                Upload or capture a photo of the employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {photoPreview ? (
                  <div className="relative">
                    <Image
                      src={photoPreview}
                      alt="Employee photo preview"
                      width={150}
                      height={150}
                      className="h-36 w-36 rounded-full object-cover border-2 border-muted"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                      onClick={removePhoto}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/50">
                    <span className="text-sm text-muted-foreground">No photo</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoSelect}
                    disabled={isLoading}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    disabled={isLoading}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG or WebP. Max 5MB.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employee Details</CardTitle>
              <CardDescription>
                Basic information about the employee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="employee_name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="employee_name"
                  name="employee_name"
                  placeholder="Enter employee's full name"
                  value={formData.employee_name}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="employee_role">
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.employee_role}
                    onValueChange={(value) => handleSelectChange("employee_role", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="pump_attendant">Pump Attendant</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                      <SelectItem value="tank_supervisor">Tank Supervisor</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="housekeeping">Housekeeping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="employment_type">
                    Employment Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(value) => handleSelectChange("employment_type", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="employee_phone">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="employee_phone"
                    name="employee_phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit phone number"
                    value={formData.employee_phone}
                    onChange={handleChange}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aadhaar_number">
                    Aadhaar Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="aadhaar_number"
                    name="aadhaar_number"
                    placeholder="12-digit Aadhaar number"
                    value={formData.aadhaar_number}
                    onChange={handleChange}
                    disabled={isLoading}
                    maxLength={12}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employee_address">Address</Label>
                <Input
                  id="employee_address"
                  name="employee_address"
                  placeholder="Employee's address"
                  value={formData.employee_address}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>
                Joining date and salary information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="joining_date">
                    Joining Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="joining_date"
                    name="joining_date"
                    type="date"
                    value={formData.joining_date}
                    onChange={handleChange}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="salary">
                    {formData.employment_type === "part_time" ? "Daily Wage (INR)" : "Monthly Salary (INR)"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="salary"
                    name="salary"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={formData.employment_type === "part_time" ? "e.g., 500" : "e.g., 15000"}
                    value={formData.salary}
                    onChange={handleChange}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <FormFooter
            isLoading={isLoading}
            submitLabel="Add Employee"
            loadingLabel={uploadingPhoto ? "Uploading Photo..." : "Adding Employee..."}
          />
        </div>
      </form>
      </>
    </StationRequiredGate>
  )
}
