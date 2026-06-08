# Stream Overlay

`overlay.html` — a full-screen **1920×1080 live dashboard** for the pump.fun launch stream. Same design system as the app (warm white / ink / orange, Archivo + Inter). Built to run h24 with no voice or face: it shows the ecosystem's live activity.

## What it shows

- **Header**: brand, LIVE badge, uptime clock + DAY 1–3 counter.
- **Prize pool** (top center): live SOL pool, grows over time.
- **Left column**: Coaches joined, Squads built (with "+N just now" deltas), and a Most-Picked Players milestone list.
- **Right column**: $FANTABALL on-chain dashboard (market cap, 24h volume, holders, price, each with % change) and a cascading **Live Feed** (X share notifications + ecosystem events).
- **Bottom band**: Top 50 most-owned players as a descending bar chart (top 10 in orange, 11–50 in grey).
- **Now playing** chip: a text label for your track (audio itself is added in OBS, see below).
- **Center**: a transparent safe area (1060×640) where your scene/gameplay/camera sits behind the overlay frame.

## Use in OBS (or Streamlabs)

1. Add a **Browser Source**.
2. Set **Local file** → select `overlay.html` (or host it and use the URL).
3. Width **1920**, Height **1080**, FPS 30.
4. Put it as the **top layer** so the panels overlay your scene. The center window is transparent-ish — place your camera/gameplay/scene source *below* it.
5. For the h24 launch, just leave it running; the clock and DAY counter advance on their own.

## Music (added in OBS, not in the file)

Music is **not** embedded — that avoids copyright strikes on the stream and keeps the file clean. Add your house/deep or football playlist as a separate **Audio Input/Media Source** in OBS. Update the on-screen track name by editing the `#np` text, e.g.:

```html
<span id="np">Deep House Radio</span>
```

Use royalty-free / DMCA-safe music for a public stream (e.g. a licensed stream-safe playlist) to avoid takedowns.

## Demo vs Live data

The overlay ships in **DEMO mode**: realistic simulated numbers so it looks alive immediately (counters tick up, players get picked, X-share notifications cascade, chart reorders).

To drive it from real data when the backend is up:

1. In the `<script>`, set `DEMO = false` and update `API_BASE`.
2. Implement the `/public/stream/state` endpoint in `backend/public_api.py` returning:
   ```json
   {
     "coaches": 8420, "squads": 6180, "pool": 312.4,
     "mcap": 284, "vol": 41.2, "holders": 1847, "price": 0.00028,
     "owns": [{"n":"MBAPPE","c":4821}, ...]   // top 50, descending
   }
   ```
3. `fetchLive()` already maps the response into the overlay and re-renders every 5s.
   X-share notifications can be pushed by polling a recent-shares endpoint and calling `pushFeed(...)`.

Everything is client-side; no build step. Open `overlay.html` in any browser to preview.
