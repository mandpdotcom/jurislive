"use client"

// The "current item" overlay — the heart of the live-shopping screen. Binds canonical pressing
// data (from the catalog) to the live, server-authoritative auction state.

import { Disc3 } from "lucide-react"
import { Sleeve } from "./sleeve"
import { Countdown } from "./countdown"
import { Badge } from "@/components/ui/badge"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ShowItem } from "@/lib/types"

export function CurrentItemCard({
  item,
  footer,
  onExpire,
}: {
  item: ShowItem | null
  footer?: React.ReactNode
  onExpire?: () => void
}) {
  if (!item) {
    return (
      <div className="bg-card flex flex-col items-center justify-center gap-2 rounded-xl border p-8 text-center">
        <Disc3 className="text-muted-foreground/50 size-10" />
        <p className="text-muted-foreground text-sm">Waiting for the next record…</p>
      </div>
    )
  }

  const isAuction = item.sell_mode === "auction"
  const live = item.status === "live"
  const sold = item.status === "sold"
  const unsold = item.status === "unsold"

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="flex gap-4 p-4">
        <Sleeve
          seed={`${item.title}-${item.release_id}`}
          showText={false}
          className="size-28 shrink-0"
          spinning={live}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {isAuction ? "Live auction" : "Buy it now"}
            </Badge>
            {live && (
              <Badge className="gap-1 bg-red-600 text-[10px] text-white hover:bg-red-600">
                <span className="size-1.5 animate-pulse rounded-full bg-white" /> ON THE BLOCK
              </Badge>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-lg leading-tight font-semibold">{item.title}</h3>
          <p className="text-muted-foreground truncate text-sm">{item.artist}</p>
          <div className="text-muted-foreground mt-1.5 font-mono text-xs leading-relaxed">
            <div className="truncate">
              {item.release_year} · {item.country} · {item.label} · {item.catno}
            </div>
            <div className="truncate">{item.format}</div>
            <div className="mt-1">
              media <span className="text-foreground">{item.media_grade}</span> · sleeve{" "}
              <span className="text-foreground">{item.sleeve_grade}</span>
            </div>
          </div>
          {item.notes && <p className="mt-2 line-clamp-2 text-sm italic">“{item.notes}”</p>}
        </div>
      </div>

      {/* market value strip */}
      <div className="text-muted-foreground bg-muted/40 flex items-center justify-between border-y px-4 py-1.5 font-mono text-xs">
        <span>Discogs market value</span>
        <span className="text-foreground">
          {money(item.price_low)} – {money(item.price_high)}{" "}
          <span className="text-muted-foreground">· median {money(item.price_median)}</span>
        </span>
      </div>

      {/* auction state */}
      <div className="p-4">
        {sold ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-green-600">SOLD</div>
              <div className="text-muted-foreground text-xs">to {item.winner_name}</div>
            </div>
            <div className="font-mono text-2xl font-semibold">{money(item.final_price)}</div>
          </div>
        ) : unsold ? (
          <div className="text-muted-foreground text-sm">Passed — no sale on this one.</div>
        ) : isAuction ? (
          <div className="flex items-end justify-between">
            <div>
              <div className="text-muted-foreground text-xs">
                {item.current_bid != null ? "Current bid" : "Starting bid"}
              </div>
              <div className="font-mono text-3xl font-semibold">
                {money(item.current_bid ?? item.starting_bid)}
              </div>
              <div className="text-muted-foreground mt-0.5 h-4 text-xs">
                {item.high_bidder_name ? `high bidder: ${item.high_bidder_name}` : "no bids yet"}
              </div>
            </div>
            {live && item.ends_at && (
              <div className="text-right">
                <div className="text-muted-foreground text-xs">closes in</div>
                <Countdown endsAt={item.ends_at} onExpire={onExpire} className="text-2xl" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <div className="text-muted-foreground text-xs">Buy it now</div>
              <div className="font-mono text-3xl font-semibold">{money(item.buy_now_price)}</div>
            </div>
          </div>
        )}

        {footer && <div className={cn("mt-3", (sold || unsold) && "opacity-90")}>{footer}</div>}
      </div>
    </div>
  )
}
