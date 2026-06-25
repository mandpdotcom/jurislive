"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/** Live mm:ss countdown to an epoch-ms target. Calls onExpire once when it crosses zero. */
export function Countdown({
  endsAt,
  onExpire,
  className,
}: {
  endsAt: number
  onExpire?: () => void
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const remaining = Math.max(0, endsAt - now)

  useEffect(() => {
    if (remaining <= 0) onExpire?.()
    // run when it hits zero; onExpire is expected to be idempotent / guarded by the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0])

  const secs = Math.ceil(remaining / 1000)
  const mm = Math.floor(secs / 60)
  const ss = secs % 60
  const urgent = remaining > 0 && remaining < 10_000

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        urgent && "text-destructive animate-pulse",
        className,
      )}
    >
      {mm}:{ss.toString().padStart(2, "0")}
    </span>
  )
}
