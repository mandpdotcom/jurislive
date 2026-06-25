"use client"

import Link from "next/link"
import { Radio } from "lucide-react"
import { Sleeve } from "./sleeve"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatSchedule } from "@/lib/format"
import type { Show } from "@/lib/types"

export function ShowCard({ show }: { show: Show }) {
  const live = show.status === "live"
  // Live shows jump straight to the stream; others open the landing page to RSVP.
  const href = live ? `/watch/${show.id}` : `/shows/${show.id}`
  const tags = show.genre_tags.split(",").map((t) => t.trim()).filter(Boolean)

  return (
    <Card className="group overflow-hidden p-0 transition-colors hover:border-foreground/20">
      <Link href={href} className="block">
        <div className="relative">
          <Sleeve seed={show.cover_seed} className="rounded-none" showText={false} />
          {live && (
            <Badge className="absolute top-2 left-2 gap-1 bg-red-600 text-white hover:bg-red-600">
              <Radio className="size-3 animate-pulse" />
              LIVE
            </Badge>
          )}
          {show.status === "ended" && (
            <Badge variant="secondary" className="absolute top-2 left-2">
              Ended
            </Badge>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <h3 className="leading-tight font-semibold">{show.title}</h3>
          <p className="text-muted-foreground text-sm">by {show.seller_name}</p>
          <div className="text-muted-foreground flex items-center justify-between font-mono text-xs">
            <span>
              {live ? `${show.rsvp_count ?? 0} watching` : formatSchedule(show.scheduled_at)}
            </span>
            <span>{show.item_count ?? 0} records</span>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Link>
    </Card>
  )
}
