import { AddPumpForm } from "@/components/registration/add-pump-form"

export default function AddPumpPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Add Pumps</h1>
          <p className="text-muted-foreground mt-2">
            Register fuel dispensing pumps for a station (up to 10 at once)
          </p>
        </div>
        <AddPumpForm />
      </div>
    </div>
  )
}
