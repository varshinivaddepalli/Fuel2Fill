"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface FormFooterProps {
  isLoading: boolean
  submitLabel: string
  loadingLabel: string
  disabled?: boolean
}

export function FormFooter({ isLoading, submitLabel, loadingLabel, disabled }: FormFooterProps) {
  const router = useRouter()

  return (
    <div className="flex justify-end gap-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => router.back()}
        disabled={isLoading}
      >
        Cancel
      </Button>
      <Button type="submit" size="lg" disabled={isLoading || disabled}>
        {isLoading ? loadingLabel : submitLabel}
      </Button>
    </div>
  )
}
