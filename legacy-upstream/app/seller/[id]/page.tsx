"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Loader2, Radio, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth"
import { AddRecordDialog } from "@/components/add-record-dialog"
import { Sleeve } from "@/components/sleeve"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getJSON, postJSON, delJSON } from "@/lib/client-api"
import { money } from "@/lib/format"
import type { Show, ShowItem } from "@/lib/types"
import { toast } from "sonner"

export default function SellerConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { auth } = useAuth()
  const router = useRouter()
  const [show, setShow] = useState<Show | null>(null)
  const [items, setItems] = useState<ShowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [goingLive, setGoingLive] = useState(false)

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
  if (!isSeller) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">This is someone else&apos;s seller console.</p>
        <Button className="mt-3" variant="outline" render={<Link href={`/shows/${id}`}>View the show page</Link>} />
      </div>
    )
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...items]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    setItems(next)
    try {
      const data = await postJSON<{ items: ShowItem[] }>(`/api/shows/${id}/reorder`, {
        orderedIds: next.map((i) => i.id),
      })
      setItems(data.items)
    } catch {
      load()
    }
  }

  async function remove(itemId: string) {
    try {
      await delJSON(`/api/shows/${id}/items/${itemId}`)
      setItems((cur) => cur.filter((i) => i.id !== itemId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove")
    }
  }

  async function goLive() {
    if (items.length === 0) {
      toast.error("Add at least one record before going live.")
      return
    }
    setGoingLive(true)
    try {
      await postJSON(`/api/shows/${id}/golive`, { user_id: auth!.name })
      router.push(`/seller/${id}/live`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not go live")
      setGoingLive(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <Sleeve seed={show.cover_seed} showText={false} className="size-20 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{show.title}</h1>
              <Badge variant={show.status === "live" ? "default" : "secondary"}>{show.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {items.length} records in your crate · hosted by {show.seller_name}
            </p>
            {show.genre_tags && (
              <div className="mt-2 flex flex-wrap gap-1">
                {show.genre_tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {show.status === "live" ? (
            <Button render={<Link href={`/seller/${id}/live`}><Radio className="size-4" />Open live console</Link>} />
          ) : (
            <Button onClick={goLive} disabled={goingLive}>
              {goingLive ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
              Go live
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Run order</h2>
        <AddRecordDialog showId={id} onAdded={(item) => setItems((cur) => [...cur, item])} />
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Your crate is empty. Add records from the catalog to build your run order.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <Card key={item.id} className="flex items-center gap-3 p-3">
              <span className="text-muted-foreground w-6 text-center font-mono text-sm">
                {i + 1}
              </span>
              <Sleeve seed={`${item.title}-${item.release_id}`} showText={false} className="size-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{item.title}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {item.sell_mode === "auction" ? "Auction" : "Buy now"}
                  </Badge>
                </div>
                <div className="text-muted-foreground truncate text-sm">{item.artist}</div>
                <div className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                  {item.release_year} · {item.country} · {item.label} · {item.catno}
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="font-mono text-xs">
                  M: {item.media_grade} · S: {item.sleeve_grade}
                </div>
                <div className="font-mono text-sm font-medium">
                  {item.sell_mode === "auction"
                    ? `start ${money(item.starting_bid)}`
                    : money(item.buy_now_price)}
                </div>
              </div>
              <div className="flex flex-col">
                <Button size="icon-xs" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                >
                  <ArrowDown />
                </Button>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => remove(item.id)}>
                <Trash2 className="text-muted-foreground" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
