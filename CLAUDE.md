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

### Deployment: single Vercel project

- One Vercel project, **`administradorinvitamx`** (`.vercel/project.json`), deployed at **https://administradorinvitamx.vercel.app**. Unlike the old `invitacionesmx` repo, there is no separate SSO-protected editor domain plus a public demo/`VITE_PUBLIC_DEMO_ONLY` split here — this single deployment serves editor, guest view (`?v=1&d=...`), and catalog (`?catalog=true`) modes all from the same public URL. Treat it as effectively public: anyone with the URL can reach the editor UI (no SSO gate observed).
- Supabase project is `ahwcilcejffgddeeuiux` (`VITE_SUPABASE_URL` in `.env.local`) — same Supabase backend used by the invitations product generally.
- **Fixed (2026-07-27):** `getCatalogUrl()` and `getShareUrl()` in `App.tsx` used to hardcode `https://invitacionmx-demo.vercel.app` as the share/catalog link base (copy-pasted from the `invitacionesmx` fork), pointing generated links at the wrong app. Both now build off `window.location.origin`, so links always match whatever domain the app is actually running on.
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
- **Known gap (not yet fixed in code):** Premium and Deluxe currently have identical `secciones` lists in `data.ts` — the only difference is `maxFotos`. The intended differentiation going forward is: **pases** (control de pases por invitado) and **PDF descargable** included by default in Deluxe, offered as paid à la carte add-ons in Básico/Premium (both already exist as features — `seccionesExcluidas: ["pases"]` in `datosDefault` and `handleDescargarPDF` — just not tied to package tier in the code/business logic yet).
