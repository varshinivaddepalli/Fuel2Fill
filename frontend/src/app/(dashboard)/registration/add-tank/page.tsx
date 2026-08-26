import { AddTankForm } from "@/components/registration/add-tank-form"

export default function AddTankPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Add Tanks</h1>
          <p className="text-muted-foreground mt-2">
            Register fuel storage tanks for a station (up to 5 at once)
          </p>
        </div>
        <AddTankForm />
      </div>
    </div>
  )
}
