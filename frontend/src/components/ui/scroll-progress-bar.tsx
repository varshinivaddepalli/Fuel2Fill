"use client"

import { useEffect, useRef } from "react"

export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    // The scrollable container is <main>, not the window
    const scrollableEl = document.querySelector("main")
    if (!scrollableEl) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollableEl
      const maxScroll = scrollHeight - clientHeight
      if (maxScroll <= 0) {
        bar.style.opacity = "0"
        return
      }
      const pct = scrollTop / maxScroll
      bar.style.opacity = pct <= 0 ? "0" : "1"
      bar.style.transform = `scaleX(${pct})`
    }

    scrollableEl.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => scrollableEl.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      ref={barRef}
      className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-primary opacity-0 transition-opacity duration-150"
    />
  )
}
