import { AddBankAccountForm } from "@/components/registration/add-bank-account-form"

export default function AddBankAccountPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Add Bank Account</h1>
          <p className="text-muted-foreground mt-2">
            Register a new bank account for your business
          </p>
        </div>
        <AddBankAccountForm />
      </div>
    </div>
  )
}
