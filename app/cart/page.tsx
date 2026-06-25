"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Package, ShoppingBag } from "lucide-react"
import { useAuth } from "@/components/auth"
import { Sleeve } from "@/components/sleeve"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getJSON, notifyCartChanged, postJSON } from "@/lib/client-api"
import { money, moneyExact } from "@/lib/format"
import type { Order, ShowItem } from "@/lib/types"
import { toast } from "sonner"

type Group = { showId: string; showTitle: string; items: ShowItem[] }

export default function CartPage() {
  const { auth } = useAuth()
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!auth) return
    const [cart, ord] = await Promise.all([
      getJSON<{ groups: Group[] }>(`/api/cart?user_id=${encodeURIComponent(auth.name)}`),
      getJSON<{ orders: Order[] }>(`/api/orders?user_id=${encodeURIComponent(auth.name)}`),
    ])
    setGroups(cart.groups)
    setOrders(ord.orders)
  }, [auth])

  useEffect(() => {
    load()
  }, [load])

  async function checkout(showId: string) {
    if (!auth) return
    setCheckingOut(showId)
    try {
      const { order } = await postJSON<{ order: Order }>("/api/checkout", {
        user_id: auth.name,
        show_id: showId,
      })
      toast.success("Card charged · payout queued", {
        description: `Order ${order.id.slice(0, 12)} confirmed. Combined shipping applied.`,
      })
      notifyCartChanged()
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed")
    } finally {
      setCheckingOut(null)
    }
  }

  if (groups === null) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your record wins, grouped by the live show you watched.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed py-16 text-center">
          <ShoppingBag className="text-muted-foreground mx-auto size-10" />
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm">
            No wins yet. Jump into a live show and start bidding.
          </p>
          <Button className="mt-4" variant="outline" render={<Link href="/">Browse shows</Link>} />
        </Card>
      ) : (
        groups.map((g) => <CheckoutGroup key={g.showId} group={g} onCheckout={checkout} busy={checkingOut === g.showId} />)
      )}

      {orders.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Package className="size-5" /> Orders
          </h2>
          {orders.map((o) => (
            <Card key={o.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 text-green-600" />
                  Order {o.id.slice(0, 12)}
                </div>
                <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                  paid · seller payout {moneyExact(o.seller_payout)} · fee {moneyExact(o.platform_fee)}
                </div>
              </div>
              <div className="font-mono text-lg font-semibold">{moneyExact(o.total)}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CheckoutGroup({
  group,
  onCheckout,
  busy,
}: {
  group: Group
  onCheckout: (showId: string) => void
  busy: boolean
}) {
  const subtotal = group.items.reduce((s, i) => s + (i.final_price ?? 0), 0)
  const shipping = 6
  const fee = Math.round(subtotal * 0.1 * 100) / 100
  const total = subtotal + shipping

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-muted/40 border-b px-4 py-2.5 text-sm font-semibold">{group.showTitle}</div>
      <div className="divide-y">
        {group.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3">
            <Sleeve seed={`${item.title}-${item.release_id}`} showText={false} className="size-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{item.title}</div>
              <div className="text-muted-foreground truncate text-sm">{item.artist}</div>
              <div className="text-muted-foreground truncate font-mono text-xs">
                {item.release_year} · {item.country} · {item.label} · M:{item.media_grade}/S:{item.sleeve_grade}
              </div>
            </div>
            <div className="font-mono font-medium">{money(item.final_price)}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t px-4 py-3 font-mono text-sm">
        <Line k="Subtotal" v={moneyExact(subtotal)} />
        <Line k="Combined shipping" v={moneyExact(shipping)} />
        <Line k="Platform fee (10%, from seller)" v={`−${moneyExact(fee)}`} muted />
        <div className="flex items-center justify-between pt-1 text-base font-semibold">
          <span>Total</span>
          <span>{moneyExact(total)}</span>
        </div>
      </div>
      <div className="border-t p-3">
        <Button className="w-full" onClick={() => onCheckout(group.showId)} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
          Check out · {moneyExact(total)}
        </Button>
      </div>
    </Card>
  )
}

function Line({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={"flex items-center justify-between " + (muted ? "text-muted-foreground" : "")}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  )
}
