"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Gavel, Loader2, ShoppingBag } from "lucide-react"
import { useChatContext } from "stream-chat-react"
import { LivestreamPlayer } from "@stream-io/video-react-sdk"
import type { Channel as StreamChannel } from "stream-chat"
import { useAuth } from "@/components/auth"
import { ShowChat } from "@/components/show-chat"
import { CurrentItemCard } from "@/components/current-item-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useShowState } from "@/lib/use-show-state"
import { money, nextMinBid } from "@/lib/format"
import { notifyCartChanged, postJSON } from "@/lib/client-api"
import type { ShowItem } from "@/lib/types"
import { toast } from "sonner"

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { auth } = useAuth()
  const { client: chatClient } = useChatContext()
  const [channel, setChannel] = useState<StreamChannel | null>(null)
  const leadingRef = useRef<Set<string>>(new Set())

  // channel_id == call_id == show id (set at creation), so we can derive it from the route.
  useEffect(() => {
    if (!chatClient) return
    let active = true
    const ch = chatClient.channel("livestream", id)
    ch.watch()
      .then(() => active && setChannel(ch))
      .catch(() => active && setChannel(ch)) // still render; chat will retry
    return () => {
      active = false
      ch.stopWatching().catch(() => {})
    }
  }, [chatClient, id])

  const { show, currentItem } = useShowState({
    showId: id,
    channel,
    onSold: (item) => {
      if (auth && item.winner === auth.userId) {
        toast.success(`You won ${item.title} for ${money(item.final_price)}!`, {
          description: "Added to your cart — check out at the end of the show.",
        })
        notifyCartChanged()
      }
      leadingRef.current.delete(item.id)
    },
    onUpdate: (item) => {
      if (!auth) return
      const wasLeading = leadingRef.current.has(item.id)
      const amLeading = item.high_bidder === auth.userId
      if (amLeading) leadingRef.current.add(item.id)
      else if (wasLeading) {
        leadingRef.current.delete(item.id)
        toast.warning(`You've been outbid on ${item.title}`, {
          description: `Now ${money(item.current_bid)} — bid again to stay in.`,
        })
      }
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="ghost" render={<Link href="/"><ArrowLeft /></Link>} />
          <div>
            <h1 className="leading-tight font-semibold">{show?.title ?? "Live show"}</h1>
            <p className="text-muted-foreground text-xs">by {show?.seller_name ?? "…"}</p>
          </div>
        </div>
        {show?.status === "ended" && (
          <span className="text-muted-foreground text-sm">This show has ended.</span>
        )}
      </div>

      <div className="grid gap-4 lg:h-[calc(100vh-10rem)] lg:grid-cols-[1fr_380px]">
        {/* video */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-black">
            <LivestreamPlayer callType="livestream" callId={id} />
          </div>
          <div className="hidden lg:block">
            <BuyerCard showId={id} item={currentItem} />
          </div>
        </div>

        {/* chat (and the item card on small screens) */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="lg:hidden">
            <BuyerCard showId={id} item={currentItem} />
          </div>
          <div className="h-[60vh] min-h-0 lg:h-auto lg:flex-1">
            <ShowChat channel={channel} />
          </div>
        </div>
      </div>
    </div>
  )
}

function BuyerCard({ showId, item }: { showId: string; item: ShowItem | null }) {
  return <CurrentItemCard item={item} footer={<BuyerActions showId={showId} item={item} />} />
}

function BuyerActions({ showId, item }: { showId: string; item: ShowItem | null }) {
  const { auth } = useAuth()
  const [amount, setAmount] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (item && item.sell_mode === "auction") setAmount(nextMinBid(item))
  }, [item])

  if (!item || !auth) return null

  const iWon = item.status === "sold" && item.winner === auth.userId
  if (item.status === "sold") {
    return iWon ? (
      <Button className="w-full" variant="secondary" render={<Link href="/cart"><ShoppingBag className="size-4" />You won it — view cart</Link>} />
    ) : null
  }
  if (item.status !== "live") return null

  const minBid = nextMinBid(item)

  async function act(action: "bid" | "claim", bidAmount?: number) {
    setBusy(true)
    try {
      await postJSON(`/api/shows/${showId}/items/${item!.id}`, {
        action,
        user_id: auth!.name,
        user_name: auth!.name,
        amount: bidAmount,
      })
      if (action === "claim") notifyCartChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Try again")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {item.sell_mode === "auction" && (
        <div className="flex gap-2">
          <div className="relative w-28">
            <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">$</span>
            <Input
              type="number"
              min={minBid}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="pl-6 font-mono"
            />
          </div>
          <Button className="flex-1" disabled={busy || amount < minBid} onClick={() => act("bid", amount)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Gavel className="size-4" />}
            Bid {money(amount)}
          </Button>
        </div>
      )}
      {item.buy_now_price > 0 && (
        <Button
          variant={item.sell_mode === "buynow" ? "default" : "outline"}
          className="w-full"
          disabled={busy}
          onClick={() => act("claim")}
        >
          <ShoppingBag className="size-4" />
          Claim it now — {money(item.buy_now_price)}
        </Button>
      )}
    </div>
  )
}
