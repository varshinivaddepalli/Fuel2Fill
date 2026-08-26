"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  CreditCard,
  User,
  Clock,
  Loader2,
} from "lucide-react"
import { getEmployeeById, type EmployeeWithStation } from "@/actions/employees"
import { formatSnakeCase, getInitials, formatDateLong } from "@/lib/utils"
import { useBreadcrumb } from "@/providers/breadcrumb-context"

interface EmployeeProfileProps {
  employeeId: string
}

export function EmployeeProfile({ employeeId }: EmployeeProfileProps) {
  const router = useRouter()
  const { setDynamicLabel, clearDynamicLabel } = useBreadcrumb()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employee, setEmployee] = useState<EmployeeWithStation | null>(null)

  useEffect(() => {
    async function fetchEmployee() {
      setLoading(true)
      setError(null)

      const result = await getEmployeeById(employeeId)

      if (result.success) {
        setEmployee(result.employee)
        // Set employee name as breadcrumb label
        setDynamicLabel(employeeId, result.employee.employee_name)
      } else {
        setError(result.error)
      }

      setLoading(false)
    }

    fetchEmployee()

    // Cleanup: clear the dynamic label when component unmounts
    return () => {
      clearDynamicLabel(employeeId)
    }
  }, [employeeId, setDynamicLabel, clearDynamicLabel])

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const maskAadhaar = (aadhaar: string | null) => {
    if (!aadhaar) return "Not provided"
    return `XXXX XXXX ${aadhaar.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-destructive mb-4">{error || "Employee not found"}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  const isManager = employee.employee_role === "manager"

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          href="/employee/view-employee"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Employees
        </Link>
      </div>

      {/* Header Card */}
      <Card className="mb-6 overflow-hidden">
        <div
          className={`h-2 ${
            isManager
              ? "bg-blue-500"
              : "bg-emerald-500"
          }`}
        />
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Large Avatar */}
            <div className="relative">
              <Avatar className="size-24 border-4 border-white dark:border-neutral-800 shadow-lg">
                {employee.employee_photo ? (
                  <AvatarImage
                    src={employee.employee_photo}
                    alt={employee.employee_name}
                    className="object-cover object-top"
                  />
                ) : null}
                <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                  {getInitials(employee.employee_name)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-1 right-1 size-5 rounded-full border-2 border-white dark:border-neutral-800 ${
                  isManager ? "bg-blue-500" : "bg-emerald-500"
                }`}
              />
            </div>

            {/* Name and Role */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {employee.employee_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    isManager
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {formatSnakeCase(employee.employee_role)}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-neutral-500">
                  <Building2 className="size-4" />
                  {employee.station_name}
                </span>
              </div>
            </div>

            {/* Employee ID */}
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                Employee ID
              </p>
              <p className="font-mono text-sm text-neutral-600 dark:text-neutral-400">
                {employee.employee_id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Employment Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="size-4 text-neutral-500" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm text-neutral-500 flex items-center gap-2">
                <User className="size-4" />
                Role
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {formatSnakeCase(employee.employee_role)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm text-neutral-500 flex items-center gap-2">
                <Clock className="size-4" />
                Employment Type
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {formatSnakeCase(employee.employment_type)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm text-neutral-500 flex items-center gap-2">
                <Calendar className="size-4" />
                Joining Date
              </span>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {formatDateLong(employee.joining_date)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-neutral-500 flex items-center gap-2">
                <CreditCard className="size-4" />
                Salary
              </span>
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {formatSalary(employee.salary)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Phone className="size-4 text-neutral-500" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm text-neutral-500 flex items-center gap-2">
                <Phone className="size-4" />
                Phone
              </span>
              <span className="text-sm font-medium font-mono text-neutral-900 dark:text-neutral-100">
                {employee.employee_phone}
              </span>
            </div>
            <div className="py-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm text-neutral-500 flex items-center gap-2 mb-2">
                <MapPin className="size-4" />
                Address
              </span>
              <p className="text-sm text-neutral-900 dark:text-neutral-100">
                {employee.employee_address || "Not provided"}
              </p>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-neutral-500 flex items-center gap-2">
                <CreditCard className="size-4" />
                Aadhaar
              </span>
              <span className="text-sm font-medium font-mono text-neutral-900 dark:text-neutral-100">
                {maskAadhaar(employee.aadhaar_number)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Station Info */}
      <Card className="mt-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Building2 className="size-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                  Assigned Station
                </p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {employee.station_name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                Status
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
