"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Disc3, ShoppingBag, Radio } from "lucide-react"
import { useAuth } from "./auth"
import { initials } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function AppHeader() {
  const { auth, logout } = useAuth()
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)

  const refreshCart = useCallback(async () => {
    if (!auth) return
    try {
      const res = await fetch(`/api/cart?user_id=${encodeURIComponent(auth.name)}`)
      const data = await res.json()
      setCartCount(data.items?.length ?? 0)
    } catch {
      /* ignore */
    }
  }, [auth])

  useEffect(() => {
    refreshCart()
    const onChanged = () => refreshCart()
    window.addEventListener("vinyl:cart", onChanged)
    window.addEventListener("focus", onChanged)
    return () => {
      window.removeEventListener("vinyl:cart", onChanged)
      window.removeEventListener("focus", onChanged)
    }
  }, [refreshCart])

  if (!auth) return null

  const nav = [
    { href: "/", label: "Shows", icon: Radio },
    { href: "/cart", label: "Cart", icon: ShoppingBag, count: cartCount },
  ]

  return (
    <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Disc3 className="text-primary size-5" />
          VinylStream
        </Link>

        <nav className="ml-4 flex items-center gap-1">
          {nav.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "hover:bg-muted relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  active ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                <n.icon className="size-4" />
                {n.label}
                {n.count ? (
                  <Badge className="ml-1 h-5 min-w-5 justify-center px-1" variant="default">
                    {n.count}
                  </Badge>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        <Button
          size="sm"
          className="hidden sm:inline-flex"
          render={<Link href="/seller/new">Host a show</Link>}
        />

        <div className="ml-2 flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials(auth.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{auth.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Switch user
          </Button>
        </div>
      </div>
    </header>
  )
}
