"use client"

// Mounts the long-lived Chat + Video clients ONCE at the app shell. Per-screen components
// (watch / live) render <Channel> and use LivestreamPlayer from these root providers — they
// never re-instantiate a client. (Canonical multi-product pattern; Feeds omitted.)

import { useEffect, useState } from "react"
import { Chat, useCreateChatClient } from "stream-chat-react"
import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk"
import { useTheme } from "next-themes"
import { Loader2 } from "lucide-react"

import "stream-chat-react/css/index.css"
import "@stream-io/video-react-sdk/dist/css/styles.css"

import type { Auth } from "./auth"

export function StreamProviders({ auth, children }: { auth: Auth; children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()

  const chatClient = useCreateChatClient({
    apiKey: auth.apiKey,
    tokenOrProvider: auth.chatToken,
    userData: { id: auth.userId, name: auth.name },
  })

  // Video: useState + useEffect (NOT useMemo). tokenProvider defined inside the effect so it
  // doesn't change identity each render; it re-fetches a fresh video token on expiry.
  //
  // Use getOrCreateInstance (keyed by apiKey+user) so React strict mode's setup→cleanup→setup
  // returns the SAME cached client on remount — no double construction, no "already exists"
  // warning. We deliberately do NOT call disconnectUser() in cleanup: disconnectUser is async
  // and deletes the instance from the SDK's cache, so pairing it with getOrCreateInstance is the
  // "User token is not set" trap (the remount reuses the cached instance, then the prior
  // cleanup's async disconnect tears it down a tick later). The socket closes on tab unload,
  // which is fine for this demo. (Deviates from the skill's canonical new+disconnectUser snippet;
  // see docs/strict-mode-livestream-fixes.md.)
  const [videoClient, setVideoClient] = useState<StreamVideoClient>()
  useEffect(() => {
    const tokenProvider = () =>
      fetch(`/api/token?user_id=${encodeURIComponent(auth.name)}`)
        .then((r) => r.json())
        .then((d) => d.videoToken as string)
    const c = StreamVideoClient.getOrCreateInstance({
      apiKey: auth.apiKey,
      user: { id: auth.userId, name: auth.name },
      tokenProvider,
    })
    setVideoClient(c)
  }, [auth.apiKey, auth.userId, auth.name])

  if (!chatClient || !videoClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  const themeClass = resolvedTheme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light"

  return (
    <Chat client={chatClient} theme={themeClass}>
      <StreamVideo client={videoClient}>{children}</StreamVideo>
    </Chat>
  )
}
