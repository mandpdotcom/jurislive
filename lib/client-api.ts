// Tiny client fetch helpers with consistent error handling.

export async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url)
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((d as { error?: string }).error || r.statusText)
  return d as T
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((d as { error?: string }).error || r.statusText)
  return d as T
}

export async function delJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { method: "DELETE" })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((d as { error?: string }).error || r.statusText)
  return d as T
}

/** Notify the header (and anything listening) that the cart changed. */
export function notifyCartChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("vinyl:cart"))
}
