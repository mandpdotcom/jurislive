// Generated record "sleeve" artwork. The Discogs dumps ship no cover images, so each release
// gets a deterministic gradient sleeve with a vinyl disc peeking out — the app's visual signature.

import { sleeveColors } from "@/lib/format"
import { cn } from "@/lib/utils"

export function Sleeve({
  seed,
  title,
  artist,
  className,
  spinning = false,
  showText = true,
}: {
  seed: string
  title?: string
  artist?: string
  className?: string
  spinning?: boolean
  showText?: boolean
}) {
  const c = sleeveColors(seed)
  return (
    <div
      className={cn("relative aspect-square w-full overflow-hidden rounded-md", className)}
      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
    >
      {/* vinyl disc sliding out behind the sleeve */}
      <div
        className={cn(
          "absolute top-1/2 right-[-30%] aspect-square w-[78%] -translate-y-1/2 rounded-full",
          spinning && "animate-[spin_5s_linear_infinite]",
        )}
        style={{
          background: `repeating-radial-gradient(circle at center, #0b0b0d 0 2px, #18181b 2px 4px)`,
          boxShadow: "0 0 0 1px rgba(0,0,0,.4)",
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${c.from}, ${c.to})` }}
        >
          <div className="absolute top-1/2 left-1/2 aspect-square w-[14%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70" />
        </div>
      </div>

      {/* subtle sleeve sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-white/10" />

      {showText && (title || artist) && (
        <div className="absolute inset-x-0 bottom-0 z-10 p-3" style={{ color: c.ink }}>
          {artist && <div className="font-mono text-[10px] tracking-wide uppercase opacity-80">{artist}</div>}
          {title && <div className="text-sm leading-tight font-semibold drop-shadow-sm">{title}</div>}
        </div>
      )}
    </div>
  )
}
