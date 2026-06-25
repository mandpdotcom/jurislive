# VinylStream — Live Shopping for Vinyl Records

## Overview

VinylStream is a demo application showing how to build a live shopping experience in the style of Whatnot, focused on a single selling vertical: vinyl records.

Sellers schedule live shows, build verified inventory from the Discogs database, and sell records on camera through timed auctions or instant "claim" purchases. Buyers discover upcoming shows, follow sellers, watch streams, chat, and bid in real time.

The vinyl vertical is chosen deliberately: every record is a specific, identifiable object (a particular pressing, in a particular condition), which makes it a strong showcase for the pattern at the heart of most live commerce apps — binding canonical product data to a live video stream. Swap the record database for any other inventory source and the same skeleton supports cards, sneakers, watches, or any collectible vertical.

## Core User Flows

### 1. Seller: Create a Show

- Seller creates a profile and connects a payout method
- Schedules a show with a title, date/time, genre tags, and cover image
- The show gets a landing page where buyers can RSVP and opt in to reminders

### 2. Seller: Build Inventory (Discogs Integration)

This is the step that makes the marketplace trustworthy.

- Seller adds an item by searching the catalog (artist/title) or entering a barcode/catalog number — backed by a local database built from the Discogs data dump (see "Why Discogs" below)
- The app presents matching releases; the seller selects the **exact pressing** (year, country, label, format)
- The app auto-fills canonical metadata: cover art, tracklist, format details, and the Discogs marketplace price range (low / median / high)
- The seller adds what no database can know: condition grades for media and sleeve, their own photos, a starting bid or buy-it-now price, and personal notes ("plays clean, slight ring wear")
- Items are queued into a run order the seller can rearrange before going live

### 3. Live Show

- The seller goes live with low-latency video
- A **current item card** overlays the stream: cover art, pressing details, condition, market price range, and the live auction state
- Buyers place bids or claim buy-it-now items; auctions are short and timer-driven ("30 seconds on this one")
- A live chat runs alongside the stream; the seller can pin the current item, answer questions, and play a snippet of the record on camera
- When an item sells, it moves to the buyer's cart and the seller advances to the next item in the queue

### 4. Checkout & Fulfillment

- Wins accumulate in a cart during the show; the buyer checks out once at the end with combined shipping
- Payments use a marketplace escrow-style flow, released on shipment confirmation
- Orders are trackable; buyers can rate sellers after delivery

## Architecture Sketch

| Layer | Responsibility |
|---|---|
| **Video** | Live broadcast from the seller, low-latency playback for buyers |
| **Chat** | Real-time chat alongside the stream; pinned messages, moderation |
| **Realtime auction state** | Authoritative server-side bid state — current price, high bidder, countdown. Bid events can ride the same realtime channels as chat, but the source of truth lives on the server, never in the client or the video stream |
| **Catalog service** | A small local database (e.g. SQLite) built from the Discogs monthly data dump: search, release lookup, price ranges. No API key, no rate limits, no network dependency during the live demo. In a production app this layer would wrap the Discogs API or another inventory source |
| **Commerce** | Marketplace payments with split payouts, orders, shipping (mocked in the demo) |
| **Notifications** | Show reminders, outbid alerts, followed-seller go-live alerts |

## Why Discogs

Discogs is a community-built database of essentially every vinyl release ever pressed. This gives the demo:

- **Real, verifiable inventory** — actual releases with actual metadata, not placeholder products
- **An authenticity story** — the "pick your exact pressing" step is the same trust mechanism any collectible marketplace needs (card grading, sneaker authentication, watch references)
- **Pricing intelligence** — showing "market value: $24–85" next to a live auction demonstrates a feature real apps want

### Catalog data: dump, not API

Rather than calling the Discogs API at runtime, the demo builds its catalog from the **Discogs monthly data dumps** (data.discogs.com) — full XML exports of release, artist, label, and master data, published under the **CC0 (public domain) license**. This removes the API key requirement, the rate limits, and any licensing concerns, and it makes the demo independent of third-party uptime during a live presentation.

The dump is huge (tens of gigabytes, 15+ million releases), so a one-time ETL script stream-parses the XML and extracts a curated slice — a few thousand recognizable releases across genres — into a local SQLite database. That subset is the demo's entire catalog.

Two things the dumps don't include, with demo workarounds:

- **Cover art images** — bundle a small set of self-made or freely licensed record images, or run a one-time authenticated API pass over the curated subset to cache real artwork
- **Marketplace price data** — generate plausible price ranges per item, or harvest real ones in the same one-time API pass

Either way, nothing is fetched at runtime: the catalog, images, and prices are all served locally. A production app would replace this layer with live API access (note that Discogs' API terms restrict commercial use — the CC0 license covers only the dumps) or a different inventory source entirely.

## Payments

The intended integration is **Stripe Connect**, the standard choice for marketplace apps of this shape (Whatnot itself runs on it). The mapping:

- **Express accounts** for seller onboarding — Stripe hosts bank connection, identity verification (KYC), and tax form collection, so the app doesn't build any of it
- **Destination charges** (or separate charges + transfers) to split each sale: buyer pays, the platform keeps a commission, the remainder is paid out to the seller
- **Payment Intents with manual capture** to approximate escrow for auctions: authorize the buyer's card when they win an item, capture the funds when the seller confirms shipment
- **Stripe Tax / 1099 reporting** for marketplace compliance obligations

Alternatives worth knowing: **Adyen for Platforms** (common at larger scale, strong in Europe), **Mangopay** (popular with European marketplaces), and **Braintree** (PayPal's marketplace offering). For most teams prototyping a live shopping app, Stripe Connect is the path of least resistance.

In the demo, payments are mocked — a "card charged, payout queued" state stands in for the real flow — but the data model (orders, fees, payouts) follows the Connect shape so the real integration drops in cleanly.

## Demo Scope (MVP Slice)

**Seller side:** create a show → add ~5 items via Discogs search → go live with the item queue.

**Buyer side:** join the stream → see the current item card → bid → win → cart.

**Mocked:** payments, shipping, notifications.

## The Takeaway for Builders

VinylStream is a skeleton, not a product. The interesting parts — live video, chat, realtime auction state, and an external catalog bound to the stream — are exactly the parts every live shopping app shares. Replace Discogs with your inventory source, replace vinyl with your vertical, and keep everything else.
