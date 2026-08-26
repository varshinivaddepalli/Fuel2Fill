export const VALIDATION_PATTERNS = {
  phone: /^[0-9]{10}$/,
  pincode: /^[0-9]{6}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  aadhaar: /^[0-9]{12}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
} as const

export const VALIDATION_MESSAGES = {
  phone: "Please enter a valid 10-digit phone number",
  pincode: "Please enter a valid 6-digit pincode",
  pan: "Please enter a valid PAN number (e.g., ABCDE1234F)",
  aadhaar: "Please enter a valid 12-digit Aadhaar number",
  gst: "Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)",
} as const

export function validatePhone(value: string, required = true): string | null {
  if (!value.trim()) return required ? "Phone number is required" : null
  if (!VALIDATION_PATTERNS.phone.test(value)) return VALIDATION_MESSAGES.phone
  return null
}

export function validatePincode(value: string, required = false): string | null {
  if (!value.trim()) return required ? "Pincode is required" : null
  if (!VALIDATION_PATTERNS.pincode.test(value)) return VALIDATION_MESSAGES.pincode
  return null
}

export function validatePan(value: string): string | null {
  if (!value.trim()) return null
  if (!VALIDATION_PATTERNS.pan.test(value.toUpperCase())) return VALIDATION_MESSAGES.pan
  return null
}

export function validateAadhaar(value: string): string | null {
  if (!value.trim()) return null
  if (!VALIDATION_PATTERNS.aadhaar.test(value)) return VALIDATION_MESSAGES.aadhaar
  return null
}

export function validateGst(value: string): string | null {
  if (!value.trim()) return "GST number is required"
  if (!VALIDATION_PATTERNS.gst.test(value.toUpperCase())) return VALIDATION_MESSAGES.gst
  return null
}

export function validateCoordinate(
  value: string,
  type: "latitude" | "longitude"
): string | null {
  if (!value) return null
  const num = parseFloat(value)
  if (isNaN(num)) return `${type === "latitude" ? "Latitude" : "Longitude"} must be a valid number`
  if (type === "latitude" && (num < -90 || num > 90)) {
    return "Latitude must be between -90 and 90"
  }
  if (type === "longitude" && (num < -180 || num > 180)) {
    return "Longitude must be between -180 and 180"
  }
  return null
}
