"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Disc3, Loader2, Plus, Search } from "lucide-react"
import { Sleeve } from "./sleeve"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { money } from "@/lib/format"
import { getJSON, postJSON } from "@/lib/client-api"
import { GRADES, type CatalogResult, type SellMode, type ShowItem, type Track } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function AddRecordDialog({
  showId,
  onAdded,
}: {
  showId: string
  onAdded: (item: ShowItem) => void
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<CatalogResult | null>(null)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add a record
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o: boolean) => {
          setOpen(o)
          if (!o) setPicked(null)
        }}
      >
        <DialogContent className="max-h-[85vh] w-full overflow-hidden sm:max-w-2xl">
          {picked ? (
            <ConfigureStep
              showId={showId}
              release={picked}
              onBack={() => setPicked(null)}
              onAdded={(item) => {
                onAdded(item)
                setPicked(null)
              }}
            />
          ) : (
            <SearchStep onPick={setPicked} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SearchStep({ onPick }: { onPick: (r: CatalogResult) => void }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<CatalogResult[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{ masters: number; releases: number } | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const data = await getJSON<{ results: CatalogResult[]; stats: typeof stats }>(
        `/api/catalog/search?q=${encodeURIComponent(query)}`,
      )
      setResults(data.results)
      setStats(data.stats)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    search("")
  }, [search])

  function onChange(v: string) {
    setQ(v)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(v), 200)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a record from the catalog</DialogTitle>
        <DialogDescription>
          Search by artist, title, or catalog number, then pick the exact pressing you&apos;re
          selling.
        </DialogDescription>
      </DialogHeader>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          autoFocus
          placeholder="Miles Davis, OK Computer, CL 1355…"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[46vh] pr-3">
        <div className="space-y-1.5">
          {loading && results.length === 0 ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No pressings match “{q}”.
            </p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => onPick(r)}
                className="hover:bg-muted flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors"
              >
                <Sleeve seed={`${r.title}-${r.id}`} showText={false} className="size-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.title}</div>
                  <div className="text-muted-foreground truncate text-sm">{r.artist}</div>
                  <div className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                    {r.year} · {r.country} · {r.label} · {r.catno}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-medium">
                    {money(r.price_low)}–{money(r.price_high)}
                  </div>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {r.genre}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {stats && (
        <p className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
          <Disc3 className="size-3" />
          {stats.releases} pressings · {stats.masters} titles in the local catalog
        </p>
      )}
    </>
  )
}

function ConfigureStep({
  showId,
  release,
  onBack,
  onAdded,
}: {
  showId: string
  release: CatalogResult
  onBack: () => void
  onAdded: (item: ShowItem) => void
}) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [media, setMedia] = useState("VG+")
  const [sleeve, setSleeve] = useState("VG+")
  const [notes, setNotes] = useState("")
  const [mode, setMode] = useState<SellMode>("auction")
  const [startingBid, setStartingBid] = useState(Math.max(1, Math.round(release.price_low * 0.5)))
  const [buyNow, setBuyNow] = useState(release.price_median)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getJSON<{ tracks: Track[] }>(`/api/catalog/release/${release.id}`)
      .then((d) => setTracks(d.tracks))
      .catch(() => setTracks([]))
  }, [release.id])

  async function add() {
    setBusy(true)
    try {
      const { item } = await postJSON<{ item: ShowItem }>(`/api/shows/${showId}/items`, {
        release_id: release.id,
        media_grade: media,
        sleeve_grade: sleeve,
        notes,
        sell_mode: mode,
        starting_bid: startingBid,
        buy_now_price: buyNow,
      })
      toast.success(`Added “${release.title}” to your crate`)
      onAdded(item)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add item")
      setBusy(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground -ml-1 flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Back to search
        </button>
        <DialogTitle className="sr-only">Configure listing</DialogTitle>
      </DialogHeader>

      <ScrollArea className="h-[60vh] pr-3">
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div className="space-y-2">
            <Sleeve seed={`${release.title}-${release.id}`} title={release.title} artist={release.artist} />
            <div className="bg-muted/50 rounded-md p-2 font-mono text-[11px] leading-relaxed">
              <Field k="Year" v={String(release.year)} />
              <Field k="Country" v={release.country} />
              <Field k="Label" v={release.label} />
              <Field k="Cat#" v={release.catno} />
              <Field k="Format" v={release.format} />
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Discogs market value
              </div>
              <div className="font-mono text-sm">
                {money(release.price_low)} – {money(release.price_high)}
              </div>
              <div className="text-muted-foreground font-mono text-xs">
                median {money(release.price_median)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">{release.title}</h3>
              <p className="text-muted-foreground text-sm">{release.artist}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <GradeSelect label="Media grade" value={media} onChange={setMedia} />
              <GradeSelect label="Sleeve grade" value={sleeve} onChange={setSleeve} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Seller notes</Label>
              <Textarea
                id="notes"
                placeholder="Plays clean, slight ring wear, original inner sleeve…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>How are you selling it?</Label>
              <div className="flex gap-2">
                {(["auction", "buynow"] as SellMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                      mode === m ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted",
                    )}
                  >
                    {m === "auction" ? "Live auction" : "Buy it now"}
                  </button>
                ))}
              </div>
            </div>

            {mode === "auction" ? (
              <PriceField
                label="Starting bid"
                value={startingBid}
                onChange={setStartingBid}
                hint="Buyers bid up from here during the live 30-second auction."
              />
            ) : (
              <PriceField
                label="Buy-it-now price"
                value={buyNow}
                onChange={setBuyNow}
                hint="First buyer to claim it during the show wins."
              />
            )}

            {tracks.length > 0 && (
              <div className="space-y-1">
                <Label>Tracklist</Label>
                <div className="bg-muted/40 rounded-md p-2 font-mono text-xs">
                  {tracks.map((t, i) => (
                    <div key={i} className="flex justify-between gap-2 py-0.5">
                      <span className="text-muted-foreground w-8 shrink-0">{t.position}</span>
                      <span className="flex-1 truncate">{t.title}</span>
                      <span className="text-muted-foreground">{t.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Button onClick={add} disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        Add to crate
      </Button>
    </>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  )
}

function GradeSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 font-mono text-sm outline-none focus-visible:ring-3"
      >
        {GRADES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </div>
  )
}

function PriceField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="price">{label}</Label>
      <div className="relative w-40">
        <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">$</span>
        <Input
          id="price"
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="pl-6 font-mono"
        />
      </div>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  )
}
