"use client"

import { useState } from "react"
import { Disc3, Loader2 } from "lucide-react"
import { useAuth } from "./auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) return
    setBusy(true)
    setError(null)
    try {
      await login(username.trim())
    } catch {
      setError("Couldn't sign in. Try again.")
      setBusy(false)
    }
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-full">
            <Disc3 className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">VinylStream</h1>
            <p className="text-muted-foreground text-sm">Live shopping for vinyl records</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <Input
            autoFocus
            required
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={busy || !username.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Continue
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          Open this URL in another tab with a different username to test multi-user features — be a
          seller in one, a buyer in the other.
        </p>
      </Card>
    </div>
  )
}
