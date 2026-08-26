import { AddNozzleForm } from "@/components/registration/add-nozzle-form"

export default function AddNozzlePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Add Nozzle</h1>
          <p className="text-muted-foreground mt-2">
            Register nozzles for a pump to connect to tanks
          </p>
        </div>
        <AddNozzleForm />
      </div>
    </div>
  )
}
