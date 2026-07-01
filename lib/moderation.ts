// Lightweight profanity masking for user-supplied labels (display names, show titles).
//
// Even though sandboxes are isolated per visitor, a visitor shouldn't be able to render a slur
// back in their own screenshots/screenshares, so we mask offensive words at the write boundary.
// This is a deliberately tiny, representative blocklist for the demo — a production app would use
// a maintained list or Stream's built-in chat moderation rather than hardcoding terms here.

const BLOCKLIST = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "nigger",
  "faggot",
  "retard",
  "whore",
  "viagra",
]

/** Replace any whitespace-delimited word containing a blocklisted term with asterisks. */
export function cleanLabel(raw: string): string {
  return raw.replace(/\S+/g, (word) => {
    const normalized = word.toLowerCase()
    return BLOCKLIST.some((term) => normalized.includes(term)) ? "*".repeat(word.length) : word
  })
}
