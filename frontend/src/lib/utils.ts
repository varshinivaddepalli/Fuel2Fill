import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts snake_case string to Title Case
 * e.g., "pump_boy" -> "Pump Boy", "full_time" -> "Full Time"
 */
export function formatSnakeCase(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Get initials from a name (max 2 characters)
 * e.g., "John Doe" -> "JD", "Alice" -> "A"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format date for display in Indian locale
 */
export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/**
 * Format date with full month name
 */
export function formatDateLong(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Format time from ISO string or time string
 * e.g., "2024-01-15T09:00:00" -> "09:00 AM"
 */
export function formatTime(timeString: string): string {
  const date = new Date(timeString)
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Format datetime for shift display
 * e.g., "2024-01-15T09:00:00" -> "15 Jan 2024, 09:00 AM"
 */
export function formatShiftDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString)
  const dateStr = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const timeStr = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  return `${dateStr}, ${timeStr}`
}

/**
 * Format date to YYYY-MM-DD string in LOCAL timezone (not UTC)
 * Use this for date inputs and database storage to avoid timezone issues
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayDateString(): string {
  return formatDateForInput(new Date())
}

/**
 * Convert empty string to null, trim non-empty strings
 * Useful for optional form fields before database storage
 */
export function toNullIfEmpty(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Format amount as Indian Rupee currency
 * e.g., 50000 -> "₹50,000"
 */
export function formatCurrency(amount: number, showDecimals = false): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount)
}
