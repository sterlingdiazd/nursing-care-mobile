# Demo API resilience

This app implements **five overlapping strategies** so the iPhone never gets
stuck on a stale or wrong API URL — a recurring source of red "Network request
failed" toasts in past demos.

Read this start-to-finish the day before a demo. Most of it is automatic; only
strategy 1 (tunnel) and strategy 4 (`.local` hostname) require an explicit
choice up front.

## Strategy 1 — Public tunnel (recommended for any high-stakes demo)

The phone reaches the laptop over the public internet via a tunnel, so the demo
works on **any** Wi-Fi — even cellular — and is immune to laptop IP changes.

### One-time setup (cloudflared)

```bash
brew install cloudflared
cloudflared tunnel login                  # one-time browser auth
cloudflared tunnel create nursing-demo    # one-time tunnel create
cloudflared tunnel route dns nursing-demo nursing-demo.<your-domain>.com
```

If you don't own a domain, use the quick tunnel (random URL, recreated each run):

```bash
cloudflared tunnel --url http://localhost:5050
```

### Per-demo run

```bash
# 1. Start the backend on :5050 as usual
# 2. Start the tunnel and copy the printed URL
cloudflared tunnel --url http://localhost:5050
# → https://random-words-12345.trycloudflare.com
# 3. Set the env var BEFORE starting expo
EXPO_PUBLIC_API_BASE_URL=https://random-words-12345.trycloudflare.com npx expo start --clear
```

The resolver auto-detects this env var as priority-2 (right after manual
override). The phone will talk to the backend over the tunnel and the LAN
becomes irrelevant.

`EXPO_PUBLIC_DEMO_TUNNEL_URL` is an alternate name with the same effect — useful
if you want both an env override AND a baked-in tunnel fallback (the env wins,
the tunnel is the safety net).

## Strategy 2 — In-app override + diagnostics screen (the on-stage safety net)

If anything goes wrong on stage, open **Menú → Diagnóstico**. The screen shows:

- The **currently resolved URL** and **how it was detected** ("IP del servidor
  Metro", "Túnel de demostración", "Sobrescritura manual", …).
- A **text field** to override the URL. Tap **Guardar sobrescritura** and the
  app immediately switches to that URL for every subsequent request. Persisted
  to `AsyncStorage`, survives a restart.
- A **Probar candidatos** button that probes every fallback against
  `/api/health` and shows latency + status for each one — so you can see which
  URL is reachable from the phone right now.
- **Eliminar** removes a manual override and reverts to automatic detection.

This is the actual "never again" insurance — no rebuild, no laptop dive, no
panic.

## Strategy 3 — Candidate-list health probe + self-heal

On startup AND on any "Network request failed", the resolver probes a small
candidate list in priority order:

1. Manual override (AsyncStorage)
2. `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_API_URL`
3. `EXPO_PUBLIC_DEMO_TUNNEL_URL` (baked tunnel)
4. Metro debugger host (IP)
5. Expo Linking host (IP)
6. `http://<EXPO_PUBLIC_API_HOSTNAME>.local:<port>` (mDNS — strategy 4)
7. Last-known-good URL (AsyncStorage)
8. `localhost` (web/simulator only)

First URL that responds 2xx to `/api/health` wins, and is cached as
**last-known-good** for the next launch. The toast only appears if *every*
candidate failed — and in that case the diagnostics screen shows you exactly
which ones tried and why each failed.

This is fully automatic. No setup.

## Strategy 4 — `.local` mDNS hostname (passive resilience on the same Wi-Fi)

If the phone and laptop are on the **same Wi-Fi**, the laptop's
`<hostname>.local` Bonjour name follows the laptop across DHCP renewals, sleep,
router reboots — so a single env var gives you a stable address.

```bash
# In your demo .env (or shell):
EXPO_PUBLIC_API_HOSTNAME=sterling-laptop
# → resolver tries http://sterling-laptop.local:5050
```

(The `.local` suffix is added automatically if missing.)

Find your laptop hostname with `hostname` or System Settings → General →
About → Name. Verify `.local` works first by curling from another machine:

```bash
curl http://sterling-laptop.local:5050/api/health
```

If the curl works, the phone will too — strategy 3 will probe it and adopt it
as the winner whenever the IP-based candidates fail.

## Strategy 5 — Cached snapshot + offline banner (graceful degradation)

Even if every candidate fails AND the manual override is wrong, the **admin
dashboard** still renders — using the **last successful snapshot** read from
`AsyncStorage`, with an amber banner saying _"Sin conexión — mostrando últimos
datos · Reintentar"_.

This means: in the worst case, the demo still shows real data instead of an
empty white screen and a red toast. Tapping **Reintentar** re-fetches; on
success the banner disappears and live data takes over.

Pattern: any screen that does a `GET` for a critical view writes its response
into the snapshot cache (`writeSnapshot(bucket, data)`). On a connectivity
error it reads back with `readSnapshot(bucket)` and renders the
`OfflineSnapshotBanner` component.

Currently wired: admin dashboard. To extend to another screen, see
`src/services/apiSnapshotCache.ts` and the `AdminDashboardScreen.tsx` example.

## Demo-day checklist

The morning of the demo, in this order:

1. **Backend on :5050 healthy** — `curl http://localhost:5050/api/health` →
   200 with `status: "Healthy"`.
2. **Tunnel up** (if using strategy 1) — `curl https://<tunnel-url>/api/health`
   from a coffee-shop Wi-Fi → 200.
3. **Expo started with the right env** —
   `EXPO_PUBLIC_API_BASE_URL=https://… npx expo start --clear`. The `--clear`
   flushes the Metro cache so the env reaches the bundle.
4. **On the phone, open Menú → Diagnóstico** — confirm the **URL activa** field
   shows the tunnel/expected URL and **Fuente** says the expected source.
   Tap **Probar candidatos**. Confirm at least one green row.
5. **Open Inicio** — confirm the dashboard renders without the red toast or
   the amber offline banner.

If step 5 shows the amber banner: the API is unreachable but the cache saved
you. Hit Reintentar; if it still fails, jump to Diagnóstico, paste a known-good
URL into the override field, save.

If step 5 shows the red toast: open Diagnóstico → Probar candidatos and read
the green row. That's the URL the app should use; paste it into the override
field and save. Demo continues.
