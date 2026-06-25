/**
 * Production ETL: Discogs monthly dump -> curated SQLite catalog.
 * -----------------------------------------------------------------
 * This is the real-world replacement for `lib/catalog-seed.ts`. In the demo we ship a
 * hand-curated slice; in production you point this at the Discogs monthly data dump
 * (https://data.discogs.com, CC0 / public domain) and stream-parse it into the SAME schema
 * `lib/db.ts` already creates — so nothing downstream changes.
 *
 * Why a dump and not the API: the dump has no API key, no rate limits, and no runtime
 * dependency on Discogs' uptime. The releases dump is ~tens of GB of gzipped XML with 15M+
 * releases, so we MUST stream it (never load it into memory) and keep only a curated subset.
 *
 * The dumps DON'T include cover art or marketplace prices. Options (see concept doc):
 *   - generate plausible price ranges (as the demo seed does), or
 *   - run a one-time authenticated Discogs API pass over the curated subset to cache real
 *     artwork + price stats. (Note: Discogs' API terms restrict commercial use; the CC0
 *     license covers only the dumps.)
 *
 * Usage:
 *   npm i sax            # streaming SAX XML parser (only needed to run this script)
 *   gunzip -k discogs_YYYYMMDD_releases.xml.gz   # or stream the .gz directly (see below)
 *   npx tsx scripts/etl-discogs.ts ./discogs_YYYYMMDD_releases.xml
 *
 * To stream the .gz without unzipping first, pipe through zlib.createGunzip() (commented below).
 */

import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import Database from "better-sqlite3"
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sax from "sax" // npm i sax

// ---- Curation policy: which releases make the cut ----
// Keep the catalog small and recognizable. Tune these to taste.
const TARGET_COUNT = 5000
const WANTED_GENRES = new Set(["Jazz", "Rock", "Funk / Soul", "Hip Hop", "Electronic", "Reggae"])
const WANTED_FORMATS = new Set(["Vinyl"])
const MIN_HAVE = 50 // Discogs "community.have" count — a proxy for recognizability

const DB_PATH = path.join(process.cwd(), "data", "vinylstream.db")

type ParsedRelease = {
  id: number
  title: string
  artist: string
  year: number
  genre: string
  style: string
  country: string
  label: string
  catno: string
  format: string
  have: number
  tracks: { position: string; title: string; duration: string }[]
}

function plausiblePrice(have: number): { low: number; median: number; high: number } {
  // Without marketplace data, derive a defensible spread from popularity/scarcity.
  const base = Math.max(8, Math.min(400, Math.round(2000 / Math.sqrt(have + 1))))
  return { low: Math.round(base * 0.55), median: base, high: Math.round(base * 1.8) }
}

function openDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  // Reuse the same schema the app uses. In a real build, import it from lib/db.ts.
  db.exec(`
    CREATE TABLE IF NOT EXISTS masters (id INTEGER PRIMARY KEY, title TEXT, artist TEXT, year INTEGER, genre TEXT, style TEXT);
    CREATE TABLE IF NOT EXISTS tracks (id INTEGER PRIMARY KEY AUTOINCREMENT, master_id INTEGER, position TEXT, title TEXT, duration TEXT);
    CREATE TABLE IF NOT EXISTS releases (id INTEGER PRIMARY KEY, master_id INTEGER, year INTEGER, country TEXT, label TEXT, catno TEXT, format TEXT, price_low REAL, price_median REAL, price_high REAL);
  `)
  return db
}

function run(inputPath: string) {
  const db = openDb()
  const insMaster = db.prepare(
    "INSERT OR REPLACE INTO masters (id, title, artist, year, genre, style) VALUES (?, ?, ?, ?, ?, ?)",
  )
  const insTrack = db.prepare(
    "INSERT INTO tracks (master_id, position, title, duration) VALUES (?, ?, ?, ?)",
  )
  const insRelease = db.prepare(
    "INSERT OR REPLACE INTO releases (id, master_id, year, country, label, catno, format, price_low, price_median, price_high) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )

  let kept = 0
  let cur: Partial<ParsedRelease> | null = null
  let pathStack: string[] = []
  let textBuf = ""
  let curTrack: { position: string; title: string; duration: string } | null = null

  const parser = sax.createStream(true, { trim: true, lowercase: true })

  parser.on("opentag", (node: { name: string; attributes: Record<string, string> }) => {
    pathStack.push(node.name)
    textBuf = ""
    if (node.name === "release") {
      cur = { id: Number(node.attributes.id), tracks: [], have: 0, style: "" }
    } else if (cur && node.name === "track") {
      curTrack = { position: "", title: "", duration: "" }
    }
  })

  parser.on("text", (txt: string) => {
    textBuf += txt
  })

  parser.on("closetag", (name: string) => {
    const ctx = pathStack[pathStack.length - 2]
    if (cur) {
      if (name === "title" && ctx === "release") cur.title = textBuf
      else if (name === "name" && ctx === "artist" && !cur.artist) cur.artist = textBuf
      else if (name === "released" || name === "year") cur.year = parseInt(textBuf, 10) || cur.year || 0
      else if (name === "genre" && !cur.genre) cur.genre = textBuf
      else if (name === "style" && !cur.style) cur.style = textBuf
      else if (name === "country") cur.country = textBuf
      else if (name === "have") cur.have = parseInt(textBuf, 10) || 0
      // track fields
      else if (curTrack && name === "position") curTrack.position = textBuf
      else if (curTrack && name === "title" && ctx === "track") curTrack.title = textBuf
      else if (curTrack && name === "duration") curTrack.duration = textBuf
      else if (name === "track" && curTrack) {
        cur.tracks!.push(curTrack)
        curTrack = null
      } else if (name === "release") {
        maybeKeep(cur as ParsedRelease)
        cur = null
      }
    }
    pathStack.pop()
  })

  function maybeKeep(r: ParsedRelease) {
    if (kept >= TARGET_COUNT) return
    if (!r.title || !r.artist) return
    if (WANTED_GENRES.size && r.genre && !WANTED_GENRES.has(r.genre)) return
    if ((r.have ?? 0) < MIN_HAVE) return
    // (format/label parsing simplified — extend the SAX handlers for <formats>/<labels> as needed)
    const masterId = r.id
    insMaster.run(masterId, r.title, r.artist, r.year ?? 0, r.genre ?? "", r.style ?? "")
    for (const tr of r.tracks ?? []) insTrack.run(masterId, tr.position, tr.title, tr.duration)
    const p = plausiblePrice(r.have ?? 0)
    insRelease.run(
      r.id,
      masterId,
      r.year ?? 0,
      r.country ?? "",
      r.label ?? "",
      r.catno ?? "",
      WANTED_FORMATS.has("Vinyl") ? "Vinyl" : "",
      p.low,
      p.median,
      p.high,
    )
    kept++
    if (kept % 500 === 0) console.log(`kept ${kept} releases…`)
  }

  const input = fs.createReadStream(inputPath)
  const xml = inputPath.endsWith(".gz") ? input.pipe(zlib.createGunzip()) : input

  xml.pipe(parser as unknown as NodeJS.WritableStream)
  parser.on("end", () => {
    console.log(`Done. Curated ${kept} releases into ${DB_PATH}`)
    db.close()
  })
  parser.on("error", (e: Error) => {
    console.error("Parse error:", e)
    process.exit(1)
  })
}

const inputPath = process.argv[2]
if (!inputPath) {
  console.error("Usage: npx tsx scripts/etl-discogs.ts <discogs_releases.xml[.gz]>")
  process.exit(1)
}
run(inputPath)
