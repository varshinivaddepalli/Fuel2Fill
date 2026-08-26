import { validatePhone, validatePincode, validateGst, validateCoordinate } from "./indian-formats"

export interface StationFormData {
  station_name: string
  station_phone: string
  station_sap_code: string
  station_gst_number: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  latitude: string
  longitude: string
}

/**
 * Validates station form data
 * @returns Error message string if validation fails, null if valid
 */
export function validateStationForm(formData: StationFormData): string | null {
  if (!formData.station_name.trim()) return "Station name is required"
  if (!formData.station_phone.trim()) return "Phone number is required"
  if (!formData.station_sap_code.trim()) return "SAP code is required"
  if (!formData.station_gst_number.trim()) return "GST number is required"
  if (!formData.address_line1.trim()) return "Address is required"
  if (!formData.city.trim()) return "City is required"
  if (!formData.state.trim()) return "State is required"
  if (!formData.pincode.trim()) return "Pincode is required"

  const phoneError = validatePhone(formData.station_phone)
  if (phoneError) return phoneError

  const pincodeError = validatePincode(formData.pincode)
  if (pincodeError) return pincodeError

  const gstError = validateGst(formData.station_gst_number)
  if (gstError) return gstError

  const latError = validateCoordinate(formData.latitude, "latitude")
  if (latError) return latError

  const lngError = validateCoordinate(formData.longitude, "longitude")
  if (lngError) return lngError

  return null
}
