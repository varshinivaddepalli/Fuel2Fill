import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  href?: string
  className?: string
  showText?: boolean
  size?: number
}

export function Logo({ href = "/dashboard", className, showText = true, size = 32 }: LogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2 font-semibold", className)}>
      <Image
        src="/logo.png"
        alt="Fuel2Fill"
        width={size}
        height={size}
        className="rounded-md"
      />
      {showText && <span>Fuel2Fill</span>}
    </div>
  )

  if (!href) return content

  return <Link href={href}>{content}</Link>
}
