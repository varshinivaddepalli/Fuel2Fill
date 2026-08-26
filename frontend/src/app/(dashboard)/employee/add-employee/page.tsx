import { AddEmployeeForm } from "@/components/registration/add-employee-form"

export default function AddEmployeePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Add New Employee</h1>
          <p className="text-muted-foreground mt-2">
            Register a new employee to a station
          </p>
        </div>
        <AddEmployeeForm />
      </div>
    </div>
  )
}
