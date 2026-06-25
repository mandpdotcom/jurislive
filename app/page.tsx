"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Disc3, Plus, Radio } from "lucide-react"
import { ShowCard } from "@/components/show-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getJSON } from "@/lib/client-api"
import type { Show } from "@/lib/types"

export default function HubPage() {
  const [shows, setShows] = useState<Show[] | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getJSON<{ shows: Show[] }>("/api/shows")
      setShows(data.shows)
    } catch {
      setShows([])
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 8000) // keep live/upcoming status fresh
    window.addEventListener("focus", load)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", load)
    }
  }, [load])

  const live = shows?.filter((s) => s.status === "live") ?? []
  const upcoming = shows?.filter((s) => s.status === "scheduled") ?? []
  const ended = shows?.filter((s) => s.status === "ended") ?? []

  return (
    <div className="space-y-10">
      <section className="bg-card relative overflow-hidden rounded-xl border p-8">
        <div className="relative z-10 max-w-xl">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Live shopping for vinyl records
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            Discover the hidden treasures of record shop crates, anywhere.
          </h1>
          <p className="text-muted-foreground mt-3">
            Speed auctions where sellers spin records and listeners can bid live.
            <br />Every listing is connected to a real Discogs pressing.
          </p>
          <div className="mt-5 flex gap-2">
            <Button render={<Link href="/seller/new"><Plus className="size-4" />Host a show</Link>} />
            {live.length > 0 && (
              <Button
                variant="outline"
                render={
                  <Link href={`/watch/${live[0].id}`}>
                    <Radio className="size-4" />
                    Jump into a live show
                  </Link>
                }
              />
            )}
          </div>
        </div>
        <Disc3 className="text-muted-foreground/10 pointer-events-none absolute -top-10 -right-10 size-64" />
      </section>

      {shows === null ? (
        <Grid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </Grid>
      ) : shows.length === 0 ? (
        <Empty />
      ) : (
        <>
          {live.length > 0 && (
            <Section title="Live now" accent>
              {live.map((s) => (
                <ShowCard key={s.id} show={s} />
              ))}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Upcoming shows">
              {upcoming.map((s) => (
                <ShowCard key={s.id} show={s} />
              ))}
            </Section>
          )}
          {ended.length > 0 && (
            <Section title="Past shows">
              {ended.map((s) => (
                <ShowCard key={s.id} show={s} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({
  title,
  accent,
  children,
}: {
  title: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        {accent && <span className="inline-block size-2 animate-pulse rounded-full bg-red-600" />}
        {title}
      </h2>
      <Grid>{children}</Grid>
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
}

function Empty() {
  return (
    <div className="rounded-xl border border-dashed py-16 text-center">
      <Disc3 className="text-muted-foreground mx-auto size-10" />
      <h2 className="mt-3 font-semibold">No shows yet</h2>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
        Be the first to go live. Schedule a show, build your crate from the Discogs catalog, and
        start selling.
      </p>
      <Button className="mt-4" render={<Link href="/seller/new"><Plus className="size-4" />Host a show</Link>} />
    </div>
  )
}
