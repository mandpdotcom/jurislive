"use client"

// Client root: holds auth, gates the whole app behind the Login Screen, and (once signed in)
// mounts the Stream clients + persistent header above every route.

import { AuthProvider, useAuth } from "./auth"
import { StreamProviders } from "./stream-providers"
import { LoginScreen } from "./login-screen"
import { AppHeader } from "./app-header"

function Gate({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth()
  if (!auth) return <LoginScreen />
  return (
    <StreamProviders auth={auth}>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </StreamProviders>
  )
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  )
}
