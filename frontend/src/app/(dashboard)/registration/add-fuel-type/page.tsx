import { AddFuelTypeForm } from "@/components/registration/add-fuel-type-form"

export default function AddFuelTypePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Add Fuel Type</h1>
          <p className="text-muted-foreground mt-2">
            Register a new fuel type for a station
          </p>
        </div>
        <AddFuelTypeForm />
      </div>
    </div>
  )
}
