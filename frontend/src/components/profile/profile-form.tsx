"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { Pencil, Save, X, Loader2, Eye, EyeOff, Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getClientProfile, updateClientProfile } from "@/actions/profile"
import { createClient } from "@/lib/supabase/client"
import type { Client } from "@/types/database"
import { formatDateLong, toNullIfEmpty, getInitials } from "@/lib/utils"
import {
  validatePhone,
  validatePincode,
  validatePan,
  validateAadhaar,
} from "@/lib/validation/indian-formats"

// Mask PAN: ABCDE1234F -> XXXXX1234X
function maskPAN(pan: string | null): string {
  if (!pan) return "Not provided"
  return `XXXXX${pan.slice(5, 9)}X`
}

// Mask Aadhaar: 123456789012 -> XXXX XXXX 9012
function maskAadhaar(aadhaar: string | null): string {
  if (!aadhaar) return "Not provided"
  return `XXXX XXXX ${aadhaar.slice(-4)}`
}

export function ProfileForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Client | null>(null)

  // Track which sensitive fields to show unmasked
  const [showPAN, setShowPAN] = useState(false)
  const [showAadhaar, setShowAadhaar] = useState(false)

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Camera state
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    client_pan: "",
    client_aadhaar: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
  })

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    const result = await getClientProfile()
    if (result.success && result.data) {
      setProfile(result.data)
      setFormData({
        client_name: result.data.client_name || "",
        client_phone: result.data.client_phone || "",
        client_pan: result.data.client_pan || "",
        client_aadhaar: result.data.client_aadhaar || "",
        address_line1: result.data.address_line1 || "",
        address_line2: result.data.address_line2 || "",
        city: result.data.city || "",
        state: result.data.state || "",
        pincode: result.data.pincode || "",
      })
    } else {
      setError(result.error || "Failed to load profile")
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "client_phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }))
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Photo handling
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError("Please select a valid image (JPEG, PNG, or WebP)")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

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

  // Camera functions
  const startCamera = useCallback(async () => {
    setCameraError(null)
    setShowCamera(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      })

      setCameraStream(stream)

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

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return

      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(blob))
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
      .from('client-photos')
      .upload(fileName, photoFile, {
        cacheControl: '3600',
        upsert: false
      })

    setUploadingPhoto(false)

    if (uploadError) {
      throw new Error(`Failed to upload photo: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('client-photos')
      .getPublicUrl(data.path)

    return publicUrl
  }

  const validateForm = (): string | null => {
    if (!formData.client_name.trim()) {
      return "Name is required"
    }

    const phoneError = validatePhone(formData.client_phone, true)
    if (phoneError) return phoneError

    const panError = validatePan(formData.client_pan)
    if (panError) return panError

    const aadhaarError = validateAadhaar(formData.client_aadhaar)
    if (aadhaarError) return aadhaarError

    const pincodeError = validatePincode(formData.pincode, false)
    if (pincodeError) return pincodeError

    return null
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        client_name: profile.client_name || "",
        client_phone: profile.client_phone || "",
        client_pan: profile.client_pan || "",
        client_aadhaar: profile.client_aadhaar || "",
        address_line1: profile.address_line1 || "",
        address_line2: profile.address_line2 || "",
        city: profile.city || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
      })
    }
    removePhoto()
    setIsEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)

    try {
      // Upload photo first if selected
      let photoUrl: string | null | undefined = undefined
      if (photoFile) {
        photoUrl = await uploadPhotoToStorage()
      }

      const result = await updateClientProfile({
        client_name: formData.client_name.trim(),
        client_phone: formData.client_phone.trim(),
        client_pan: toNullIfEmpty(formData.client_pan.toUpperCase()),
        client_aadhaar: toNullIfEmpty(formData.client_aadhaar),
        address_line1: toNullIfEmpty(formData.address_line1),
        address_line2: toNullIfEmpty(formData.address_line2),
        city: toNullIfEmpty(formData.city),
        state: toNullIfEmpty(formData.state),
        pincode: toNullIfEmpty(formData.pincode),
        ...(photoUrl !== undefined && { client_photo: photoUrl }),
      })

      if (result.success && result.data) {
        setProfile(result.data)
        removePhoto()
        setIsEditing(false)
        toast.success("Profile updated successfully")
      } else {
        setError(result.error || "Failed to update profile")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error || "Failed to load profile"}
      </div>
    )
  }

  // Determine which photo to show
  const displayPhoto = photoPreview || profile.client_photo

  return (
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
                    <div className="flex justify-center gap-4">
                      <Button type="button" variant="outline" onClick={stopCamera}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={capturePhoto}>
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

      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your account information
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || uploadingPhoto}>
                {uploadingPhoto ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {uploadingPhoto ? "Uploading..." : isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Profile Photo Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>
              {isEditing ? "Upload or capture a new photo" : "Your profile picture"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {displayPhoto ? (
                <div className="relative">
                  <img
                    src={displayPhoto}
                    alt="Profile photo"
                    className="h-36 w-36 rounded-full object-cover object-top border-2 border-muted"
                  />
                  {isEditing && photoPreview && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                      onClick={removePhoto}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Avatar className="h-36 w-36">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-3xl">
                    {getInitials(profile.client_name)}
                  </AvatarFallback>
                </Avatar>
              )}

              {isEditing && (
                <>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoSelect}
                      disabled={isSaving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startCamera}
                      disabled={isSaving}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Capture
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG or WebP. Max 5MB.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your primary contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.client_email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="client_name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="client_name"
                    name="client_name"
                    placeholder="Enter your full name"
                    value={formData.client_name}
                    onChange={handleChange}
                    disabled={isSaving}
                    required
                  />
                ) : (
                  <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    {profile.client_name}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client_phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="client_phone"
                    name="client_phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit phone number"
                    value={formData.client_phone}
                    onChange={handleChange}
                    disabled={isSaving}
                    required
                  />
                ) : (
                  <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    {profile.client_phone}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity Documents</CardTitle>
            <CardDescription>
              Sensitive information is masked for security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="client_pan">PAN Number</Label>
                {isEditing ? (
                  <Input
                    id="client_pan"
                    name="client_pan"
                    placeholder="ABCDE1234F"
                    value={formData.client_pan}
                    onChange={handleChange}
                    disabled={isSaving}
                    className="uppercase"
                    maxLength={10}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono">
                      {showPAN && profile.client_pan
                        ? profile.client_pan
                        : maskPAN(profile.client_pan)}
                    </div>
                    {profile.client_pan && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPAN(!showPAN)}
                        className="h-9 w-9"
                      >
                        {showPAN ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client_aadhaar">Aadhaar Number</Label>
                {isEditing ? (
                  <Input
                    id="client_aadhaar"
                    name="client_aadhaar"
                    placeholder="12-digit Aadhaar"
                    value={formData.client_aadhaar}
                    onChange={handleChange}
                    disabled={isSaving}
                    maxLength={12}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono">
                      {showAadhaar && profile.client_aadhaar
                        ? profile.client_aadhaar
                        : maskAadhaar(profile.client_aadhaar)}
                    </div>
                    {profile.client_aadhaar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowAadhaar(!showAadhaar)}
                        className="h-9 w-9"
                      >
                        {showAadhaar ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Your registered address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    name="address_line1"
                    placeholder="Street address"
                    value={formData.address_line1}
                    onChange={handleChange}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    name="address_line2"
                    placeholder="Apartment, suite, etc."
                    value={formData.address_line2}
                    onChange={handleChange}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      placeholder="6 digits"
                      value={formData.pincode}
                      onChange={handleChange}
                      disabled={isSaving}
                      maxLength={6}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {profile.address_line1 ||
                profile.address_line2 ||
                profile.city ||
                profile.state ||
                profile.pincode ? (
                  <div className="space-y-1">
                    {profile.address_line1 && <div>{profile.address_line1}</div>}
                    {profile.address_line2 && <div>{profile.address_line2}</div>}
                    <div>
                      {[profile.city, profile.state, profile.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No address provided</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>System information about your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Account Status</Label>
                <div className="text-sm font-medium capitalize">
                  {profile.status}
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Member Since</Label>
                <div className="text-sm font-medium">
                  {formatDateLong(profile.joining_date)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
