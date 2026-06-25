"use client"

// The live chat alongside the stream — prebuilt Stream Chat components on the show's
// `livestream` channel. Auction-state events ride this same channel (see use-show-state).

import { Channel, MessageList, MessageComposer, Window } from "stream-chat-react"
import type { Channel as StreamChannel } from "stream-chat"
import { Loader2 } from "lucide-react"

export function ShowChat({ channel }: { channel: StreamChannel | null }) {
  return (
    <div className="bg-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border">
      <div className="border-b px-4 py-2.5 text-sm font-semibold">Live chat</div>
      <div className="min-h-0 flex-1">
        {channel ? (
          <Channel channel={channel}>
            <Window>
              <MessageList />
              <MessageComposer />
            </Window>
          </Channel>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
