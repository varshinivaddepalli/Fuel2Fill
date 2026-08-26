export function FormErrorBanner({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="mb-6 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {error}
    </div>
  )
}
