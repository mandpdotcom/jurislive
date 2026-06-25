"use client"

// Subscribes to the show's authoritative auction state. State changes arrive as custom events
// on the Stream Chat channel (auction_update / item_sold / show_ended); we also poll /api/shows
// as a fallback so a missed event can't strand the UI. The server is always the source of truth.

import { useCallback, useEffect, useRef, useState } from "react"
import type { Channel as StreamChannel, Event } from "stream-chat"
import { getJSON } from "./client-api"
import { EVT_AUCTION_UPDATE, EVT_ITEM_SOLD, EVT_SHOW_ENDED, type Show, type ShowItem } from "./types"

type Snapshot = { show: Show; items: ShowItem[]; currentItem: ShowItem | null }

export function useShowState({
  showId,
  channel,
  onSold,
  onUpdate,
}: {
  showId: string
  channel: StreamChannel | null
  onSold?: (item: ShowItem) => void
  onUpdate?: (item: ShowItem) => void
}) {
  const [show, setShow] = useState<Show | null>(null)
  const [items, setItems] = useState<ShowItem[]>([])
  const [currentItem, setCurrentItem] = useState<ShowItem | null>(null)
  const soldRef = useRef<(item: ShowItem) => void>(undefined)
  soldRef.current = onSold
  const updateRef = useRef<(item: ShowItem) => void>(undefined)
  updateRef.current = onUpdate

  const refresh = useCallback(async () => {
    try {
      const data = await getJSON<Snapshot>(`/api/shows/${showId}`)
      setShow(data.show)
      setItems(data.items)
      setCurrentItem(data.currentItem)
    } catch {
      /* ignore transient errors; next poll retries */
    }
  }, [showId])

  // patch one item into the list + current pointer
  const applyItem = useCallback((item: ShowItem) => {
    setItems((cur) => cur.map((i) => (i.id === item.id ? item : i)))
    setCurrentItem((cur) => {
      if (item.status === "live") return item
      // a sold/unsold item that IS the one on screen stays visible (shows its result)
      if (cur && cur.id === item.id) return item
      return cur
    })
  }, [])

  useEffect(() => {
    refresh()
    const poll = setInterval(refresh, 5000)
    return () => clearInterval(poll)
  }, [refresh])

  useEffect(() => {
    if (!channel) return
    const parse = (e: Event): ShowItem | null => {
      try {
        const d = (e as unknown as { data?: string }).data
        return d ? (JSON.parse(d).item as ShowItem) : null
      } catch {
        return null
      }
    }

    // Single all-events listener (avoids the typed-EventTypes overload for our custom types).
    const sub = channel.on((e: Event) => {
      const type = e.type as string // our custom types aren't in the SDK's EventTypes union
      if (type === EVT_AUCTION_UPDATE) {
        const item = parse(e)
        if (item) {
          applyItem(item)
          updateRef.current?.(item)
        }
      } else if (type === EVT_ITEM_SOLD) {
        const item = parse(e)
        if (item) {
          applyItem(item)
          soldRef.current?.(item)
        }
      } else if (type === EVT_SHOW_ENDED) {
        setShow((s) => (s ? { ...s, status: "ended" } : s))
      }
    })
    return () => sub.unsubscribe()
  }, [channel, applyItem])

  return { show, items, currentItem, refresh, setCurrentItem }
}
