import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { AuthVideoBackground } from "@/components/auth/auth-video-background"
import { Logo } from "@/components/shared/logo"

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left side - Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Logo href="/" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>

      {/* Right side - Video */}
      <AuthVideoBackground />
    </div>
  )
}
