"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function AuthVideoBackground() {
  const [videoLoaded, setVideoLoaded] = useState(false)

  return (
    <div className="relative hidden bg-background lg:block overflow-hidden">
      {/* Loading state - Clean background with animated logo */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background transition-opacity duration-1000 ease-out",
          videoLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />

        {/* Animated logo container - continuous left to right */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-logo-marquee">
            <div className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="Petro Astra"
                  width={48}
                  height={48}
                  className="rounded-xl"
                />
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl -z-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-semibold tracking-tight text-foreground">
                  Petro Astra
                </span>
                <span className="text-xs text-muted-foreground">
                  Loading...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Animated gradient orbs for modern effect */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      {/* Video element */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlayThrough={() => setVideoLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        <source src="/login_video.mp4" type="video/mp4" />
      </video>

      {/* Overlay for better contrast */}
      <div
        className={cn(
          "absolute inset-0 bg-black/20 transition-opacity duration-1000",
          videoLoaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}
