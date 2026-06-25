"use client"

import { createContext, useCallback, useContext, useState } from "react"

// Credentials live in React state only (not localStorage) so every browser tab is an
// independent user — the documented way to test multi-user live-shopping flows.
export type Auth = {
  apiKey: string
  userId: string
  name: string
  chatToken: string
  videoToken: string
}

type AuthCtx = {
  auth: Auth | null
  login: (username: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<Auth | null>(null)

  const login = useCallback(async (username: string) => {
    const res = await fetch(`/api/token?user_id=${encodeURIComponent(username)}`)
    if (!res.ok) throw new Error("Could not sign in")
    setAuth((await res.json()) as Auth)
  }, [])

  const logout = useCallback(() => setAuth(null), [])

  return <Ctx.Provider value={{ auth, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
