"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth"
import { Sleeve } from "@/components/sleeve"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { postJSON } from "@/lib/client-api"
import type { Show } from "@/lib/types"
import { toast } from "sonner"

const GENRES = ["Jazz", "Rock", "Hip Hop", "Electronic", "Funk / Soul", "Reggae"]

export default function NewShowPage() {
  const { auth } = useAuth()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [when, setWhen] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  function toggleTag(t: string) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  }

  async function create() {
    if (!auth || !title.trim()) return
    setBusy(true)
    try {
      const { show } = await postJSON<{ show: Show }>("/api/shows", {
        title: title.trim(),
        scheduled_at: when ? new Date(when).toISOString() : new Date().toISOString(),
        genre_tags: tags.join(", "),
        seller_id: auth.name,
        seller_name: auth.name,
      })
      router.push(`/seller/${show.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create show")
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Schedule a show</h1>
      <p className="text-muted-foreground mt-1">
        Set up your show, then build your crate from the catalog before going live.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_220px]">
        <Card className="space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="title">Show title</Label>
            <Input
              id="title"
              autoFocus
              placeholder="Friday Night Jazz Dig"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="when">Date & time</Label>
            <Input
              id="when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Leave blank to start right away.</p>
          </div>
          <div className="space-y-2">
            <Label>Genre tags</Label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleTag(g)}
                  className={
                    "rounded-full border px-3 py-1 text-sm transition-colors " +
                    (tags.includes(g)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted")
                  }
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={create} disabled={busy || !title.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Create show
          </Button>
        </Card>

        <div className="space-y-2">
          <Sleeve seed={title || "vinylstream"} showText={false} />
          <p className="text-muted-foreground text-center font-mono text-xs">cover preview</p>
        </div>
      </div>
    </div>
  )
}
