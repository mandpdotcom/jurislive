"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CircleStop, Loader2, Play, Radio } from "lucide-react"
import {
  CallControls,
  LivestreamLayout,
  StreamCall,
  useStreamVideoClient,
  type Call,
} from "@stream-io/video-react-sdk"
import { useChatContext } from "stream-chat-react"
import type { Channel as StreamChannel } from "stream-chat"
import { useAuth } from "@/components/auth"
import { ShowChat } from "@/components/show-chat"
import { CurrentItemCard } from "@/components/current-item-card"
import { Sleeve } from "@/components/sleeve"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getJSON, postJSON } from "@/lib/client-api"
import { money } from "@/lib/format"
import { useShowState } from "@/lib/use-show-state"
import type { Show, ShowItem } from "@/lib/types"
import { toast } from "sonner"

export default function SellerLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { auth } = useAuth()
  const router = useRouter()
  const videoClient = useStreamVideoClient()
  const { client: chatClient } = useChatContext()

  const [call, setCall] = useState<Call>()
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const finalizingRef = useRef(false)

  // Verify the viewer is the seller before broadcasting.
  useEffect(() => {
    if (!auth) return
    getJSON<{ show: Show }>(`/api/shows/${id}`)
      .then(({ show }) => {
        if (show.seller_id !== auth.userId) {
          router.replace(`/watch/${id}`)
          setAuthorized(false)
        } else setAuthorized(true)
      })
      .catch(() => setAuthorized(false))
  }, [auth, id, router])

  // Broadcast: join the livestream call as host, then enable camera + mic (independent of join).
  useEffect(() => {
    if (!videoClient || !auth || authorized !== true) return
    let active = true
    const c = videoClient.call("livestream", id)
    // Keep the join promise and only leave() after it settles — tearing down a call mid-join
    // strands its telemetry reporter on a dead connection (400 floods). Also covers navigating
    // away while the join is still in flight. See docs/strict-mode-livestream-fixes.md.
    const joined = c
      .join({ create: true, data: { members: [{ user_id: auth.userId, role: "host" }] } })
      .then(async () => {
        if (!active) return
        setCall(c)
        try {
          await c.camera.enable()
        } catch {
          setMediaError("Camera blocked — check browser permissions, then use the controls below.")
        }
        try {
          await c.microphone.enable()
        } catch {
          setMediaError((e) => e ?? "Microphone blocked — check permissions.")
        }
      })
      .catch(() => {
        if (active) setMediaError("Couldn't start the broadcast. Refresh to retry.")
      })
    return () => {
      active = false
      joined.finally(() => c.leave().catch(() => {}))
    }
  }, [videoClient, auth, authorized, id])

  // Watch the chat channel (created server-side at go-live).
  useEffect(() => {
    if (!chatClient || authorized !== true) return
    let active = true
    const ch = chatClient.channel("livestream", id)
    ch.watch().then(() => active && setChannel(ch)).catch(() => {})
    return () => {
      active = false
      ch.stopWatching().catch(() => {})
    }
  }, [chatClient, authorized, id])

  const { show, items, currentItem, refresh } = useShowState({ showId: id, channel })

  async function control(action: string, itemId?: string) {
    try {
      const target = itemId ?? currentItem?.id
      if (!target) return
      await postJSON(`/api/shows/${id}/items/${target}`, { action, user_id: auth!.name })
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    }
  }

  async function onExpire() {
    if (finalizingRef.current || !currentItem || currentItem.status !== "live") return
    finalizingRef.current = true
    await control("finalize", currentItem.id)
    setTimeout(() => (finalizingRef.current = false), 1500)
  }

  async function endShow() {
    try {
      await postJSON(`/api/shows/${id}/end`, { user_id: auth!.name })
      toast.success("Show ended.")
      router.push(`/seller/${id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not end show")
    }
  }

  if (authorized === false) return null
  if (authorized === null) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  const queue = items.filter((i) => i.status === "queued")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className="gap-1 bg-red-600 text-white hover:bg-red-600">
            <Radio className="size-3 animate-pulse" /> LIVE
          </Badge>
          <h1 className="leading-tight font-semibold">{show?.title ?? "Your show"}</h1>
        </div>
        <Button variant="destructive" onClick={endShow}>
          <CircleStop className="size-4" />
          End show
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* broadcast + auction control */}
        <div className="space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-black">
            {call ? (
              <StreamCall call={call}>
                <LivestreamLayout showLiveBadge showParticipantCount showDuration enableFullScreen={false} />
                <div className="absolute right-0 bottom-2 left-0 flex justify-center">
                  <CallControls />
                </div>
              </StreamCall>
            ) : (
              <div className="flex h-full items-center justify-center text-white/70">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
          </div>
          {mediaError && (
            <div className="bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
              {mediaError}
            </div>
          )}

          <CurrentItemCard
            item={currentItem}
            onExpire={onExpire}
            footer={<SellerFooter item={currentItem} onFinalize={() => control("finalize")} />}
          />

          <div>
            <h2 className="mb-2 text-sm font-semibold tracking-tight">
              Up next ({queue.length})
            </h2>
            {queue.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {items.length === 0
                  ? "No records in this show."
                  : "That's the whole crate — end the show when you're done."}
              </p>
            ) : (
              <div className="space-y-2">
                {queue.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    onStart={() => control("start", item.id)}
                    canStart={currentItem?.status !== "live"}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* chat */}
        <div className="h-[70vh] min-h-0 lg:h-[calc(100vh-9rem)]">
          <ShowChat channel={channel} />
        </div>
      </div>
    </div>
  )
}

function SellerFooter({ item, onFinalize }: { item: ShowItem | null; onFinalize: () => void }) {
  if (!item || item.status !== "live") return null
  const label =
    item.sell_mode === "auction"
      ? item.high_bidder
        ? `Sell now — ${money(item.current_bid)}`
        : "End auction (no bids)"
      : "Mark unsold & continue"
  return (
    <Button className="w-full" onClick={onFinalize}>
      {label}
    </Button>
  )
}

function QueueRow({
  item,
  onStart,
  canStart,
}: {
  item: ShowItem
  onStart: () => void
  canStart: boolean
}) {
  return (
    <Card className="flex items-center gap-3 p-2.5">
      <Sleeve seed={`${item.title}-${item.release_id}`} showText={false} className="size-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.title}</div>
        <div className="text-muted-foreground truncate text-xs">{item.artist}</div>
        <div className="text-muted-foreground truncate font-mono text-[11px]">
          {item.sell_mode === "auction" ? `start ${money(item.starting_bid)}` : `buy now ${money(item.buy_now_price)}`}
        </div>
      </div>
      <Button size="sm" onClick={onStart} disabled={!canStart}>
        <Play className="size-3.5" />
        Put up
      </Button>
    </Card>
  )
}
