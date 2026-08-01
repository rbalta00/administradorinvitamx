# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ This is the canonical repo (as of 2026-07-27)

**`administradorinvitamx`** is the official, actively-maintained "Generador de Invitaciones XV". All new work goes here.

There are several other repos on `github.com/rbalta00` that started from the same Google AI Studio scaffold (`react-example` / "GENERADOR PRIVADO XV") and share most of this file structure, but they are **stale duplicates that diverged independently** — do not confuse them with this one and do not port features from here into them:

- `invitacionesmx` (deploys to Vercel project `invitacionmx-demo`, GitHub remote `invitacionmx`)
- `invitamx`
- `INVITAMXGEN`
- `admin-hanny`, `hanny-xv-admin` (client-specific forks for one customer, not the general product)

If asked to "open the generator" or "fix the generator" without a repo specified, assume this repo and its deployment at **https://administradorinvitamx.vercel.app** unless told otherwise.

**Scope discipline:** when working in this repo, stay inside it. Don't read from, write to, or cross-reference the duplicate repos listed above as if they shared state with this one — they don't (separate Supabase usage, separate deploys, separately diverged code), even though they started from the same template.

### Planned future work (not started — wait for explicit go-ahead)

The user's eventual plan (stated 2026-07-27, timeline not yet set):
1. Delete all the stale duplicate repos listed above once this repo fully replaces them operationally.
2. Create exactly **one** new repo, name **`app`**, meant to be an improved rebuild of this generator (not a from-scratch unrelated project) — likely covers gaps noted below (auth, broken-link class of bugs, automation).
3. Do not start on `app` or delete anything until the user explicitly says so in a future session — this note exists so that instruction isn't lost/forgotten between sessions.

### Pending decision (2026-07-31): real lock/expiration on public links

Explicitly deferred, not started — user said "por ahora déjalo pendiente" (leave it pending for now):

- Today, both the guest invitation link (`?v=1&d=...`) and the client intake-form link (`?intake=1&iid=...`) are **open to anyone who has the URL**, indefinitely. The editor itself got a real server-side login on 2026-07-31 (see `middleware.ts` below), but the guest-facing and client-facing links deliberately were not touched.
- Why this is harder than it sounds: the guest invitation link is **self-contained by design** — the entire `InvitacionDatos` is base64-encoded in the `d` param and rendered client-side with zero Supabase dependency (see "State, sharing, and persistence" below). Adding real expiration to it means either (a) making guest view mode depend on a live Supabase lookup (`iid`-based, like the intake form already does), which changes a load-bearing architectural property (offline-shareable, no backend dependency to view), or (b) some other mechanism — this needs a real design conversation, not a quick patch.
- The intake-form link (`?intake=1&iid=...`) already depends on Supabase, so locking *that one* specifically (e.g. respecting `activo_hasta` or a dedicated expiry column, returning a "this link is no longer active" screen from `IntakeForm`) would be comparatively easy and low-risk — worth doing first if/when this gets picked back up, independent of the harder guest-link problem.
- Do not build either half of this until the user explicitly asks — this note exists purely so the open item isn't lost between sessions.

### Telegram notifications to the admin (live since 2026-08-01)

Fully working end-to-end — confirmed live (a real "ping" reached the admin's Telegram):

- `api/notify-telegram.ts` is a Vercel serverless function. **Important:** it uses the classic Node handler signature `(req: IncomingMessage, res: ServerResponse)`, NOT the Web-standard `(request: Request) => Response` style used in `middleware.ts` — those are different execution contexts (Edge Middleware vs. Node serverless Function). Using the Request/Response signature here made the function hang forever with no response (confirmed live: GET/POST both timed out, Vercel eventually returned 504) because nothing ever called `res.end()`. If touching this file again, keep the `(req, res)` signature.
- It silently no-ops (returns 200) if `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` env vars aren't set in Vercel.
- `notificarAdminTelegram(mensaje: string)` (module-scope helper in `App.tsx`, right after `subirImagenPublica`) does a fire-and-forget `fetch("/api/notify-telegram", ...)`. Wired into three places: `IntakeForm`'s `handleEnviarAvisoPago` (cliente avisa pago), `IntakeForm`'s `handleEnviar` (cliente llena/guarda su formulario de datos), and `enviarRSVPWhatsApp()` in `templates.ts` (invitado confirma asistencia). Also used by the catalog's personalized demo flow.
- `vercel.json`'s catch-all rewrite to `/index.html` is narrowed to `/((?!api/).*)` so it doesn't shadow this API route.
- `middleware.ts`'s matcher excludes `/api/*` from the Basic Auth check (except `/api/admin/*`, added 2026-08-01 — see below) — **public API routes must stay excluded**, since anonymous visitors (guest RSVP, intake form, catalog demo) call this endpoint directly and never carry Basic Auth credentials. Without this exclusion the middleware returns 401 before the function ever runs (confirmed live — this was broken from when the feature first shipped until 2026-08-01).
- Bot: username `invitqmxbot` (created via @BotFather, first_name "Invitamxbot"). Token and chat_id are set as `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` in Vercel (production + preview).

### Anti-spam rate limiting on public writes (added 2026-08-01)

`confirmaciones`, `avisos_pago`, and the intake form's `invitaciones` update are all written directly from anonymous, unauthenticated pages using the public anon key (RLS is "allow all" on every table — there's no backend proxying these writes). Rate limiting is enforced **in Postgres itself**, via `BEFORE INSERT`/`BEFORE UPDATE` triggers, so it can't be bypassed by calling the REST API directly instead of going through the app:

- `confirmaciones` and `avisos_pago` both already had a `invitacion_id → invitaciones.id` foreign key, which means an attacker can't spam rows under a random/made-up invitation id — a real (unguessable) UUID is required. So the added triggers (`rl_confirmaciones`, `rl_avisos_pago`) only need to rate-limit *known* invitation ids: max 15 confirmaciones / 5 avisos de pago per invitación per 10 minutes, plus a generous global circuit-breaker (40 / 20 per 5 minutes across the whole table) in case multiple real ids get spammed at once.
- The intake form (`?intake=1&iid=...`) only ever touches `invitaciones.intake_actualizado_en` on save — the admin editor's own saves never set that column — so `rl_invitaciones_intake` fires only on that column changing (`when (new.intake_actualizado_en is distinct from old.intake_actualizado_en)`) and rejects resubmits less than 15 seconds apart, without ever touching the admin's normal editing flow.
- All three raise a plain `raise exception 'rate_limit_exceeded: ...'`, which PostgREST turns into an HTTP error response. The RSVP path (plain `fetch` in `templates.ts`) already silently swallows all insert failures (`.catch(() => {})`, same as any network error), so a rate-limited guest just doesn't get a DB row recorded — no UI change needed there. `avisos_pago` and the intake form go through `supabase-js` in `App.tsx`, whose existing `try/catch` already surfaces `err.message` (the Spanish rate-limit text) in the on-page error banner.
- Verified live by scripting 20 rapid inserts against a real invitación id (blocked at #16) and two back-to-back intake updates (second one rejected).

### Bulk-read exposure closed via /api/admin/* (added 2026-08-01)

RLS on every table (`invitaciones`, `confirmaciones`, `abonos`, `avisos_pago`) is `USING (true)` for ALL commands, including `SELECT` — the anon-spam rate-limiting above only covers writes. The public anon key ships in the client bundle by design (this app has no real user auth), so anyone who extracts it could previously run an **unfiltered** `SELECT * FROM invitaciones` (or `abonos`) directly against the REST API and dump every client's name/phone/`datosBancarios`/notes and every payment record across the *entire* business in one request — categorically different from the accepted "anyone with this one unguessable UUID can view/act on this one row" model the rest of the app already relies on (guest link, intake link — those stay exactly as they were, that risk tier is accepted, not fixed here).

Fix, scoped deliberately narrow (full RLS/auth redesign was explicitly deferred by the user as too large/risky for now): the only two places the app ever needed an **unfiltered, all-rows** read are `cargarListaInvitaciones` (all of "Mis Invitaciones") and the "💰 Ingresos" dashboard's all-of-`abonos` read. Both now go through new server-side endpoints instead of a direct anon-key `supabase-js` call:

- `api/admin/list-invitaciones.ts` / `api/admin/abonos.ts` — Node serverless functions (same `(req, res)` signature as `notify-telegram.ts`, for the same runtime reason) that use `SUPABASE_SERVICE_ROLE_KEY` (server-only env var, never in any client bundle) to read directly, bypassing RLS entirely since these are the only two legitimate all-rows reads in the app.
- `middleware.ts`'s matcher carves `/api/admin/*` back OUT of the public-API exclusion (`/((?!assets/|api/(?!admin/)).*)`), so unlike `notify-telegram`, these two routes **do** require the same Basic Auth as the rest of the editor — a request to either one without valid admin credentials gets a 401 before the function body ever runs.
- `App.tsx`'s `cargarListaInvitaciones`/`cargarDashboardIngresos` now `fetch("/api/admin/list-invitaciones")` / `fetch("/api/admin/abonos")` instead of querying Supabase directly for these two reads; every other read/write in the app (per-row, always scoped by a known id) is untouched and still uses the anon key exactly as before.
- Requires `SUPABASE_SERVICE_ROLE_KEY` set in Vercel (production + preview) — the secret key from Supabase Project Settings → API → "service_role". **Never** put this in a `VITE_`-prefixed variable or reference it from any file under `src/` — it must only ever be read server-side inside `api/admin/*.ts`.

## Project overview

"Generador de Invitaciones XV" — a single-page React app for building and sharing digital invitations for Mexican quinceañera (XV años) parties. It's built and iterated on via Google AI Studio; the codebase is a single-app Vite project with (almost) no backend of its own.

## Commands

- `npm run dev` — start Vite dev server on port 3000 (`--host=0.0.0.0`)
- `npm run build` — production build via `vite build`
- `npm run preview` — preview the production build
- `npm run lint` — type-check only (`tsc --noEmit`); there is no separate lint tool configured
- `npm run clean` — removes `dist/` and `server.js` (a stray artifact some AI Studio deploys generate at the root)

There is no test suite in this repo.

## Architecture

The app is almost entirely contained in five files under `src/`:

- `src/types.ts` — the core data shapes: `InvitacionDatos` (all invitation content: event details, ceremony/reception, itinerary, guest list, photos, theme, package, etc.), `PaqueteConfig`, `TemaConfig`.
- `src/data.ts` — static content: the 3 `paquetes` (basico/premium/deluxe — each defines which sections are enabled and max photo count), the `temas` array (12 visual themes, each with its own font/color/gradient/custom CSS), placeholder photo sets per theme (`fotosFicticiasDefault` / `getFotosPorTema`), and `datosDefault` (default invitation data per package, used as the diffing baseline for URL state — see below).
- `src/templates.ts` — `generarHTMLFinal(datos, tema)` builds the entire guest-facing invitation as a single self-contained HTML string (inline `<style>`/`<script>`, lightbox, countdown, opening/envelope animation, etc.). This is the actual product: everything else in the app exists to configure the object passed into this function.
- `src/App.tsx` (~3200 lines) — the whole editor UI, plus three routing-free "modes" selected purely from URL query params (there is no router):
  - **Editor mode** (default): full form UI for editing `InvitacionDatos`, live preview iframe, image uploads, sharing/export tools.
  - **View mode** (`?v=1` or `?view=true`): renders `generarHTMLFinal(...)` and replaces the entire document with it — this is what a guest sees when they open a shared link.
  - **Catalog mode** (`?catalog=true`/`?catalogo=true`, optional `&tema=<id>`): a gallery of all themes rendered via lazy-loaded iframes (`LazyIframe`), used to showcase designs before a customer buys a package.
- `src/main.tsx` — trivial root mount.

### State, sharing, and persistence

- Invitation data (`datos`) lives in React state in `App.tsx` and is auto-persisted to `localStorage` (`xv_datos_invitacion`) on every change.
- Shareable links encode `datos` into a compact base64 blob in the `d` URL param. `encodeState`/`decodeState` (top of `App.tsx`) diff every field against `datosDefault[paquete]` and only serialize values that differ, using short key aliases (`KEY_MAP`/`SUB_KEY_MAP`) — this keeps links short enough to avoid the ~2KB URL limit (414 errors). Any embedded base64 (`data:image`) photos/backgrounds are stripped from the encoded state and fall back to theme defaults; real sharing of custom photos relies on Cloudinary URLs instead.
- Per-theme custom background images are separately persisted in `localStorage` under `xv_fondos_personalizados`, keyed by theme id, and merged back in regardless of which invitation is loaded.
- Per-theme catalog customizations (design tweaks made while previewing a theme) are saved under `xv_diseño_guardado_tema_${temaId}` and take priority over the theme's canned catalog preview data.

### External services (no server code in this repo)

- **Cloudinary** — `subirACloudinary` uploads directly from the browser to a hardcoded cloud (`dswrrm5u1`) and unsigned preset (`invitaciones-xv`) for photos/backgrounds.
- **Supabase** — `guardarEnSupabase` writes a row into an `invitaciones` table, and custom per-theme backgrounds (`fondos_personalizados`) are synced there too (upserted into a single row with `id: 1`) so they carry over across devices/domains, not just `localStorage`. The client is created in `App.tsx` from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` env vars (see `.env.example`) via `@supabase/supabase-js` and exposed as `window.supabaseClient`; if those env vars are missing, it logs a warning and Supabase calls no-op.
- **WhatsApp** — sharing/confirmation flows just build `https://api.whatsapp.com/send?phone=...&text=...` links and `window.open` them; no API integration.
- `@google/genai` and `GEMINI_API_KEY` exist in `package.json`/`.env.example` as AI-Studio-template boilerplate but are not referenced anywhere in `src/` — treat as currently unused.

### Client/order management — "Mis Invitaciones" (added 2026-07-31)

Beyond the single in-progress `datos` in editor state, there's now a full manual sales-tracking layer on top of the `invitaciones` Supabase table, all inside `App.tsx`:

- **"Mis Invitaciones" panel** (`mostrarMisInvitaciones` state): lists every saved row (each row's full state lives in a `datos_completos` jsonb column, separate from the older denormalized summary columns like `nombre_quinceanera`/`fecha_fiesta`). Supports: search by name/tema, filter by estatus, two clickable summary chips (saldo pendiente / evento en los próximos 14 días that double as quick filters), CSV export, duplicate, delete, and re-opening a saved invitation back into the editor (`handleAbrirInvitacionGuardada`).
- **"+ Nuevo Cliente"** (`handleCrearNuevoCliente`): quick-start alta — name + phone + package creates the Supabase row *immediately* (estatus `cotizacion`) before any design work happens, so a sale is tracked from the moment it's made.
- **Pagos y estatus per row**: estatus dropdown (`ESTATUS_PEDIDO`: cotizacion → anticipo_pagado → en_diseno → entregada → evento_pasado → archivada; auto-flips to `evento_pasado` on load once `fecha_fiesta` is past, unless already `archivada`), `precio_total`/`precio_pagado` with computed "falta pagar", `pases_pagado`/`pdf_pagado` checkboxes, freeform `notas`, and a `link_pago` field (admin pastes a Mercado Pago/PayPal.me link generated *outside* this app — there is no payment gateway integration) with a one-click WhatsApp send. All of these update via scoped column-only Supabase updates (`handleActualizarCampoInvitacion` etc.), deliberately separate from `guardarEnSupabase` (which saves the *design*), so neither ever clobbers the other.
- **RSVP tracking**: the "Confirmación (RSVP)" section's WhatsApp submit (`enviarRSVPWhatsApp` in `templates.ts`) also best-effort POSTs to a `confirmaciones` Supabase table (via plain `fetch` + anon key baked in at build time — this runs inside the guest-facing static HTML, no supabase-js there) whenever the share link carries an `&iid=<row id>` (added by `getShareUrl` only once an invitation has been saved at least once). "Ver confirmaciones" in Mis Invitaciones shows the count/list and lets the admin correct `num_personas` or delete a bad entry.
- **Client intake form** (`?intake=1&iid=<row id>`, `IntakeForm` component, standalone from the rest of `App.tsx`): a public, login-free page the admin sends the client (button in Pagos y estatus) so the client fills their own fecha/ceremonia/recepción/itinerario/padrinos/mesa de regalos and uploads their own photos to Cloudinary, instead of the admin typing it all in. Reads and writes the Supabase row directly by `iid` (not the `d`-blob mechanism the rest of the app uses) and merges into the *existing* `datos_completos` on save (never blind-overwrites), so the **same link can be reused** any number of times to complete or correct info later. Sets `intake_actualizado_en` on every save, surfaced as a badge in Mis Invitaciones so the admin knows the client responded without having to check manually.
- Related `invitaciones` table columns added 2026-07-31 beyond the original set: `datos_completos`, `activo_hasta`, `precio_total`, `pases_pagado`, `pdf_pagado`, `notas`, `link_pago`, `intake_actualizado_en`. New table: `confirmaciones` (RSVP responses, FK `invitacion_id` → `invitaciones.id`).
- **"💰 Ingresos" dashboard** (added 2026-08-01, `mostrarDashboardIngresos` state, right next to the "Mis Invitaciones" button): aggregate totals across ALL saved invitaciones, not the single one open in the editor. Cobrado histórico and the month-by-month breakdown are computed from the `abonos` table (`abonosTodos` state, loaded fresh every time the panel opens) because it's the only source with a real payment date per transaction — `invitaciones.precio_pagado` is just the running total, with no timestamp. Pendiente por cobrar and cobrado-por-paquete reuse `listaInvitaciones` (loading it first via the existing `cargarListaInvitaciones` if it isn't already loaded).
- **Bulk backup and archive** (added 2026-08-01, inside "Mis Invitaciones"): "🗄️ Respaldo completo" downloads a single JSON file with every field (including the full `datos_completos`) for every saved invitación, regardless of the active search/filter — deliberately NOT filtered, unlike the CSV export, since a backup that silently excludes rows because a filter was left on isn't a real backup. "📦 Archivar N pasados" (only rendered when `invitacionesArchivablesPorEventoPasado.length > 0`) bulk-updates every row already auto-flipped to `estado: "evento_pasado"` to `"archivada"` in one Supabase call, behind the shared `confirmModal` confirm dialog.
- **Found while building the above:** the shared `confirmModal` dialog used the same `z-[110]` as the "Mis Invitaciones"/"Dashboard de Ingresos" panels, so triggering it from inside either one rendered it invisibly *behind* that panel (same z-index, later DOM sibling wins) — real, pre-existing bug (also silently affected the existing "Eliminar invitación" flow), not something introduced by this feature. Fixed by bumping it to `z-[130]`, above the `z-[120]` already used by "Nuevo Cliente" for the same reason. Also fixed `confirmModal`'s "Proceder" button, which used the invalid Tailwind class `bg-indigo-650` (no such shade exists — only default steps like 600/700) and therefore rendered with no background at all, making the white "Proceder" text invisible; changed to `bg-indigo-600`. **Note:** the same invalid `-650` shade (`text-indigo-650`, `text-slate-650`, `bg-emerald-650`) appears in ~13 other unrelated spots in `App.tsx` (device-preview toggle, form labels, the "¡Sincronizado!" button state, toast text) — left untouched as out of scope for this task, but worth a dedicated cleanup pass later.

### Deployment: single Vercel project

- One Vercel project, **`administradorinvitamx`** (`.vercel/project.json`), deployed at **https://administradorinvitamx.vercel.app**. This single deployment serves editor, guest view (`?v=1&d=...`), catalog (`?catalog=true`), and the client intake form (`?intake=1&iid=...`) modes all from the same public URL.
- **Editor login (added 2026-07-31):** `middleware.ts` (Vercel Edge Middleware, project root) gates the bare editor behind HTTP Basic Auth — password lives only in the server-side `ADMIN_PASSWORD` env var (no `VITE_` prefix, never shipped to the client bundle). It explicitly lets through the same public query-param modes App.tsx already treats as public (`v=1`/`view=true`, `catalog=true`/`catalogo=true`, `intake=1`) plus `/assets/*`, so guest links, the catalog, and the client intake form all stay 100% unauthenticated — only the bare editor prompts for the password. See the "Pending decision" note above: this login does *not* add expiration/locking to the guest or intake links themselves, only to the editor.
- Supabase project is `ahwcilcejffgddeeuiux` (`VITE_SUPABASE_URL` in `.env.local`) — same Supabase backend used by the invitations product generally.
- **Fixed (2026-07-27):** `getCatalogUrl()` and `getShareUrl()` in `App.tsx` used to hardcode `https://invitacionmx-demo.vercel.app` as the share/catalog link base (copy-pasted from the `invitacionesmx` fork), pointing generated links at the wrong app. Both now build off `window.location.origin`, so links always match whatever domain the app is actually running on.
- **Fixed (2026-07-27) — pases privacy leak:** `getShareUrl()` used to encode the *entire* `datos.invitados` array into every generated link (the `g` param only pre-filled a search box in the "pases" section of `templates.ts` — it never restricted the data itself). This meant any link — general or a specific guest's "personalized" one — let whoever opened it search and see every other family's name and pase count. Fixed by having `getShareUrl(invitadoIndex)` embed only the target guest (or an empty list for the general/no-guest link), and by removing the search UI in `templates.ts` entirely in favor of a fixed display (`mostrarPaseFijo()`) of whatever single guest is present. Side benefit: this also removes the old ~2KB-URL-length ceiling on total guest-list size, since a link's payload no longer grows with how many invitados exist overall — see the pases pricing policy below, which is now a business/labor constraint, not a technical one.
- `vercel.json`'s `headers` sets a `Content-Security-Policy: frame-ancestors ...` allow-listing `invitacionmx-catalogo.vercel.app`, `invitacionmx-landing.vercel.app`/`invitamx.online`, and localhost dev ports — inherited from the same fork; revisit if this app's catalog needs to be embedded elsewhere.

### Adding a new theme

A theme requires: an entry in `temas` in `data.ts` (colors, fonts, `customStyle` CSS, `decorativeEmoji`), a matching case in `getColorSugeridoPorTema` in `App.tsx` if it needs specific suggested dress colors, and ideally an entry in `fotosFicticiasDefault` in `data.ts` for catalog/placeholder photos. Themes with special opening-animation styling are special-cased by id inside `generarHTMLFinal` in `templates.ts` (e.g. the envelope-opening animation is only used for a specific list of theme ids).

### Adding/removing a section

Sections (e.g. `ceremonia`, `galeria`, `regalos`) are plain string ids listed per-package in `paquetes[...].secciones` in `data.ts`, human-labeled in `NOMBRES_SECCIONES` in `App.tsx`, individually toggleable per-invitation via `seccionesExcluidas`. Each section's HTML is a standalone `const xSeccionHTML = isSectionActive("x") ? \`...\` : "";` in `generarHTMLFinal` (`templates.ts`) — a new section needs one of these plus a matching entry in the `SECCIONES_CONTENIDO_HTML` map right below them.

### Section order

`"apertura"` (opening screen) and `"cierre"` (closing footer) always render first/last. The other 14 "content" sections render in a per-invitation order: `datos.ordenSecciones` (an array of section ids) if set, else each package's default order from `paquetes[...].secciones`. `getOrdenSeccionesEfectivo(paquete, ordenSecciones)` in `data.ts` is the single source of truth for this — it validates the stored order against whatever sections the current package actually has (dropping ones no longer available, appending any missing ones at the end) — and is used both by the editor's reorder UI (`SeccionesToggleList`'s ↑/↓ buttons, `moverSeccion` in `App.tsx`) and by `generarHTMLFinal` when joining `SECCIONES_CONTENIDO_HTML` into the final output. Always go through this helper rather than reading `ordenSecciones` directly — package switches and stale/missing entries are exactly what it's meant to handle safely.

## Business/pricing policy (2026-07-27)

- **Turning sections off per invitation (`seccionesExcluidas` / the "Personalizar Secciones Habilitadas" toggles) does NOT warrant a discount.** Sections have no marginal cost — they're just content blocks. What's actually paid for per package tier is the resources: `maxFotos`, the "pases" (per-guest ticket count) feature, the PDF download, and the package-exclusive sections (familia, regalos, hashtag, calendario in Premium/Deluxe). A client asking to hide sections to simplify their design should be accommodated at full package price — this already happened once (a client got the full package with several sections hidden, still charged full price) and is the correct call, not a one-off exception.
- **Package tiers as of 2026-07-27:** Básico $499 MXN (4 fotos), Premium $799 MXN (8 fotos, adds familia/regalos/hashtag/calendario), Deluxe $1,199–1,499 MXN (14 fotos). Market research (Mexico, digital XV invitations) puts basic designs at $300–800 MXN and full platforms with QR/per-guest passes at $1,490+ MXN — current pricing is already competitively positioned, no need to undercut further.
- **Premium vs. Deluxe differentiation (addressed 2026-07-31):** Premium and Deluxe still have identical `secciones` lists in `data.ts` on purpose — `maxFotos` is the structural difference, and "pases"/PDF being included-vs-à-la-carte is a *pricing* distinction, not a features-available one (both packages can technically use either). What was actually missing was the policy being visible anywhere in the editor: added pricing badges next to the "pases" toggle (`POLITICA_PASES` in `App.tsx`) and the PDF download button, so the admin sees "Incluido sin costo" vs "A la carte +$X MXN" per the current package — informational only, doesn't gate anything.
- **Pases personalizados — pricing policy (2026-07-27):** the real marginal cost of this feature isn't technical (fixed by the privacy patch below — no more URL-length ceiling), it's the admin's manual time: each personalized pass means adding the guest to the tool and individually generating+sending their link over WhatsApp. Policy:
  - **Deluxe:** pases included at no extra charge, up to **40 familias**. Beyond that, +$15–20 MXN per additional familia.
  - **Premium:** not included by default; à la carte add-on **+$180 MXN**, covers up to 20 familias, then +$15–20 MXN each beyond that.
  - **Básico:** not included by default; à la carte add-on **+$150 MXN**, covers up to 10 familias, then +$15–20 MXN each beyond that.
  - Toggling sections off (see the rule above) still never gets a discount — this policy is specifically about the pases feature's per-family cost, a separate axis from section visibility.
- **Payment, delivery, and post-delivery policy (2026-07-28):**
  - **Deposit:** 50% up front to reserve the client's date and start the design, remaining 50% due against delivery of the final link.
  - **Turnaround:** 24–48 hours after receiving all the client's data (photos, text, dates, etc.) — faster than the ~72h competitors advertise, worth using as a selling point.
  - **Post-delivery edits:** first 2 rounds of adjustments are free within 7 days of delivery; after that window or after 2 rounds, each additional edit costs $99–150 MXN.
  - These three numbers are also baked into `ventas/plantillas-whatsapp.txt` (objection-handling templates) — if any of them change, update both places.

## Lista de funcionalidades para copy de venta / landing page (2026-07-31)

Referencia rápida de TODO lo que el producto hace hoy, para escribir/actualizar copy en `invitacionmx-landing` u otro material de venta sin tener que releer el código. Organizado por lo que le importa a quien compra (la familia de la quinceañera), no por arquitectura técnica.

### La invitación digital en sí (lo que ve el invitado)

- **12 temas de diseño listos**, cada uno con tipografía, paleta y decoración propia: Dorado Clásico, Vuelo de Mariposas, Floral Acuarela, Místico Celestial (tema noche), Eucalipto Botánico, Glam Rose Oro, Rustique Boho Chic, Princesa Elegante (gala), Mármol & Oro Geométrico, Ciber Cyber Neon (glow), XV Coquette Listones Rose, XV Coquette Luxe. Buen ángulo: "hay un diseño para cada estilo de quinceañera, del clásico elegante al neón moderno".
- **+ 1 tema "Personalizado" (A Medida)**: para quien quiere colores/tipografía/estilo de apertura 100% a su gusto en vez de un catálogo fijo — ángulo de venta premium/exclusividad.
- **3 estilos de apertura animada**: tarjeta con botón, sobre con sello de cera que se abre, o cortina/telón que se descorre — se puede elegir independiente del tema.
- **Efecto de "lluvia" decorativa animada** (pétalos, mariposas, listones, estrellas, etc. según el tema) cayendo sobre la pantalla — detalle visual que compite con invitaciones impresas de gama alta.
- **Cuenta regresiva en vivo** para el evento.
- **Mensaje de bienvenida personalizado**.
- **Ubicación de ceremonia y recepción** con dirección y botón directo a Google Maps.
- **Itinerario/programa del evento** (hora por hora).
- **Código de vestimenta**.
- **Sección de padres y padrinos**.
- **Mesa de regalos y datos bancarios** con botón de "copiar" para que el invitado no batalle transcribiendo la CLABE.
- **Galería de fotos con carrusel/lightbox** (toca una foto y se abre en grande).
- **Hashtag de Instagram** del evento.
- **Botón "Agregar a mi calendario"**.
- **Pases de entrada personalizados por invitado/familia** — cada familia puede tener su propio link con su nombre y número de pases asignados (control de quién entra).
- **Confirmación de asistencia (RSVP) integrada**: el invitado confirma directo desde la invitación (nombre, sí/no, número de personas) y le llega por WhatsApp a la familia — **ya no depende de que la familia lleve la cuenta a mano**: también hay un resumen en vivo ("van 12 personas confirmadas") visible para la familia en su propio link.
- **Reproductor de música de fondo** (la canción que el cliente elija).
- **100% optimizada para celular** — se siente como una app, no como una página web genérica.
- **Descarga en PDF** como recuerdo de regalo, además del link interactivo.
- Todo el link vive en un solo mensaje de WhatsApp — no requiere que el invitado descargue nada ni cree una cuenta.

### La experiencia de compra / servicio (ángulos de "por qué comprar con nosotros")

- **Entrega en 24–48 horas** una vez que el cliente manda sus datos — más rápido que el ~72h que anuncia la competencia.
- **El cliente ya no tiene que escribirle todo por WhatsApp a mano**: recibe un link propio (sin necesidad de crear cuenta ni contraseña) donde captura fecha, ceremonia, recepción, itinerario, padrinos, mesa de regalos y sube sus propias fotos directo — puede volver a ese mismo link después si le falta algo o quiere corregir.
- **Vista de muestra antes de pagar**: se le puede mandar al cliente potencial una "muestra" de cómo se vería su invitación real (con sus datos), vigente por 5 días, antes de comprometerse a comprar.
- **Anticipo del 50%** para apartar la fecha, resto contra entrega del link final.
- **2 rondas de ajustes gratis** dentro de los primeros 7 días de la entrega.
- **3 paquetes según necesidad y presupuesto**: Básico $499 MXN (4 fotos), Premium $799 MXN (8 fotos + secciones de familia/regalos/hashtag/calendario), Deluxe $1,199–1,499 MXN (14 fotos, pases y PDF incluidos sin costo extra).
- **Pases personalizados por familia** disponibles en cualquier paquete (incluidos en Deluxe, complemento pagado en Básico/Premium) — útil para bodas/XV con lista de invitados controlada.

### Lo que NO se debe prometer en copy (para no generar expectativas falsas)

- No hay pasarela de pago en línea (el cliente no "compra solo" con tarjeta en un carrito) — el proceso de venta y cobro sigue siendo manual (WhatsApp, transferencia, o un link de pago que genera el administrador a mano en Mercado Pago/PayPal).
- No hay una "app" descargable ni notificaciones push — todo es un link web.
- El envío de RSVP depende de que el invitado tenga WhatsApp; no hay confirmación por SMS/email.

Cuando el código cambie de forma que afecte esta lista (nueva sección, nuevo tema, cambio de paquete/precio), actualizar esta sección también.
