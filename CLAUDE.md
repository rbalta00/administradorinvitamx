# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Deployment: two Vercel projects from this same repo

- **`invitacionmx-generador`** — the private editor deployment. Protected by Vercel Authentication (SSO, `ssoProtection.deploymentType: "all_except_custom_domains"`), so only team members logged into Vercel can reach it. This is where invitations actually get built/edited (and the only place with Supabase write access).
- **`invitacionmx-demo`** — a second Vercel project linked to the *same* GitHub repo/branch, with SSO protection explicitly disabled and env var `VITE_PUBLIC_DEMO_ONLY=true` set (production/preview/development). When that env var is `"true"`, `App.tsx` blocks the editor UI entirely (see the guard right before the component's final `return`) and only serves the read-only modes: catalog (`?catalog=true`), guest view (`?v=1&d=...`), and embed (`?embed=true&tema=<id>`). This is the domain that's actually safe to hand to clients/guests — no matter what query params someone appends, the private editor never renders here.
- `getCatalogUrl()` and `getShareUrl()` in `App.tsx` always build links against `https://invitacionmx-demo.vercel.app`, never `window.location.origin`. Don't change that back — the editor's own domain is SSO-protected, so any catalog/invitation link generated from it would 302 to a Vercel login page for anyone outside the team.
- `vercel.json`'s `headers` sets a `Content-Security-Policy: frame-ancestors ...` allow-listing `invitacionmx-catalogo.vercel.app`, `invitacionmx-landing.vercel.app`/`invitamx.online`, and localhost dev ports. This is what lets those two sites `<iframe>` the live demo catalog (`invitacionmx-demo.vercel.app/?catalog=true`). Vercel adds `X-Frame-Options: DENY` to every deployment by default; a CSP `frame-ancestors` header overrides that for the whitelisted origins (browsers prefer CSP `frame-ancestors` over `X-Frame-Options` when both are present).
- Gotchas when redeploying: (1) `invitacionmx-generador.vercel.app` is a manually-assigned alias, not automatic — after `vercel --prod` you must re-run `vercel alias set <new-deployment-url> invitacionmx-generador.vercel.app`, or the friendly URL keeps pointing at the old deployment; (2) this Vercel account/team appears to auto-enable SSO protection on *new* projects too — if `invitacionmx-demo` (or any future public-facing project) ever needs it off, don't assume the default is unprotected, check `ssoProtection` via the API and clear it explicitly (`PATCH /v9/projects/:id` with `{"ssoProtection": null}`) if needed.

### Adding a new theme

A theme requires: an entry in `temas` in `data.ts` (colors, fonts, `customStyle` CSS, `decorativeEmoji`), a matching case in `getColorSugeridoPorTema` in `App.tsx` if it needs specific suggested dress colors, and ideally an entry in `fotosFicticiasDefault` in `data.ts` for catalog/placeholder photos. Themes with special opening-animation styling are special-cased by id inside `generarHTMLFinal` in `templates.ts` (e.g. the envelope-opening animation is only used for a specific list of theme ids).

### Adding/removing a section

Sections (e.g. `ceremonia`, `galeria`, `regalos`) are plain string ids listed per-package in `paquetes[...].secciones` in `data.ts`, human-labeled in `NOMBRES_SECCIONES` in `App.tsx`, individually toggleable per-invitation via `seccionesExcluidas`, and rendered conditionally inside `generarHTMLFinal` via `isSectionActive(secName)`.
