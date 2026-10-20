"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, BellRing, Calendar, Loader2, Radio, Settings } from "lucide-react"
import { useAuth } from "@/components/auth"
import { Sleeve } from "@/components/sleeve"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getJSON, postJSON } from "@/lib/client-api"
import { formatSchedule, money } from "@/lib/format"
import type { Show, ShowItem } from "@/lib/types"
import { toast } from "sonner"

export default function ShowLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { auth } = useAuth()
  const [show, setShow] = useState<Show | null>(null)
  const [items, setItems] = useState<ShowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [rsvped, setRsvped] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getJSON<{ show: Show; items: ShowItem[] }>(`/api/shows/${id}`)
      setShow(data.show)
      setItems(data.items)
    } catch {
      toast.error("Show not found")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
    const t = setInterval(load, 6000) // pick up the seller going live
    return () => clearInterval(t)
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }
  if (!show) return null

  const isSeller = auth?.userId === show.seller_id
  const live = show.status === "live"

  async function toggleRsvp() {
    if (!auth) return
    try {
      const data = await postJSON<{ rsvp_count: number }>(`/api/shows/${id}/rsvp`, {
        user_id: auth.name,
      })
      setRsvped(true)
      setShow((s) => (s ? { ...s, rsvp_count: data.rsvp_count } : s))
      toast.success("You're on the list — we'll remind you when it starts.")
    } catch {
      toast.error("Could not RSVP")
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div className="relative">
          <Sleeve seed={show.cover_seed} showText={false} />
          {live && (
            <Badge className="absolute top-3 left-3 gap-1 bg-red-600 text-white hover:bg-red-600">
              <Radio className="size-3 animate-pulse" /> LIVE
            </Badge>
          )}
        </div>

        {live ? (
          <Button className="w-full" render={<Link href={`/watch/${id}`}><Radio className="size-4" />Watch live</Link>} />
        ) : isSeller ? (
          <Button className="w-full" render={<Link href={`/seller/${id}`}><Settings className="size-4" />Open seller console</Link>} />
        ) : (
          <Button className="w-full" variant={rsvped ? "secondary" : "default"} onClick={toggleRsvp} disabled={rsvped}>
            {rsvped ? <BellRing className="size-4" /> : <Bell className="size-4" />}
            {rsvped ? "Reminder set" : "RSVP & remind me"}
          </Button>
        )}

        <Card className="space-y-2 p-4 text-sm">
          <Row icon={<Calendar className="size-4" />} label={live ? "Live now" : formatSchedule(show.scheduled_at)} />
          <Row icon={<Bell className="size-4" />} label={`${show.rsvp_count ?? 0} going`} />
          <Row icon={<Radio className="size-4" />} label={`${items.length} records in the run order`} />
        </Card>
      </div>

      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{show.title}</h1>
          <p className="text-muted-foreground mt-1">Hosted by {show.seller_name}</p>
          {show.genre_tags && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {show.genre_tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h2 className="font-semibold tracking-tight">On the block</h2>
          <p className="text-muted-foreground text-sm">
            {items.length} records, each bound to its real pressing and market value.
          </p>

          <div className="mt-3 space-y-2">
            {items.length === 0 ? (
              <p className="text-muted-foreground text-sm">The seller is still building the crate.</p>
            ) : (
              items.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <span className="text-muted-foreground w-5 text-center font-mono text-sm">
                    {i + 1}
                  </span>
                  <Sleeve seed={`${item.title}-${item.release_id}`} showText={false} className="size-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="text-muted-foreground truncate text-sm">{item.artist}</div>
                    <div className="text-muted-foreground truncate font-mono text-xs">
                      {item.release_year} · {item.country} · {item.label}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px]">
                      {item.sell_mode === "auction" ? "Auction" : "Buy now"}
                    </Badge>
                    <div className="text-muted-foreground mt-1 font-mono text-xs">
                      {money(item.price_low)}–{money(item.price_high)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2">
      {icon}
      <span className="text-foreground">{label}</span>
    </div>
  )
}
