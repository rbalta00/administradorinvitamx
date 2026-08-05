# Graph Report - .  (2026-08-05)

## Corpus Check
- 23 files · ~59,872 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 227 nodes · 240 edges · 47 communities (16 shown, 31 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App.tsx + Abono
- dotenv + express
- autoprefixer + esbuild
- DOM + DOM.Iterable
- InvitacionGuardadaRow + data.ts
- Animated Opening Styles - Card + api/notify-telegram.ts - Teleg
- abonos Table - Payment Transac + Manual Access Blocking - bloqu
- checkins Table - Door Check-In + InvitacionDatos - Core Invitat
- Canonical Repository Status + Generador de Invitaciones XV -
- Base64 URL Encoding - Compact  + localStorage Persistence - xv_
- PDF Download - Invitation as P + html2canvas - Version 1.4.1
- middleware.ts + config
- vercel.json + headers
- Delivery Turnaround - 24-48 Ho + Payment Policy - 50% Deposit
- Sections - Dynamic Content Blo + Section Order - Dynamic Reorde
- Background Music Player - Even
- Calendar Add-To-Calendar Butto
- Business Features List - Sales
- Live Countdown Timer - Event C
- Decorative Rain Effect - Anima
- Parents and Godparents Section
- Gift Registry Section - Mesa d
- Google Maps Integration - Cere
- Instagram Hashtag Section - Ev
- Nuevo Cliente - Quick Order Cr
- Invitation Packages - Básico, 
- Photo Gallery - Carousel with 
- Post-Delivery Edits Policy
- Theme Customization - Personal
- Invitation Themes - 12 Pre-Bui
- .env.example - APP_URL Configu
- .env.example - Gemini API Key
- index.html - HTML Root and Ent
- Node Dependencies - package.js
- Express - Version 4.21.2
- @google/genai - Version 2.4.0
- lucide-react - Version 0.546.0
- motion - Version 12.23.24
- Tailwind CSS - Version 4.1.14
- TypeScript - Version 5.8.2
- README.md - AI Studio Setup In
- tsconfig.json - ES2022 Target

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `App()` - 13 edges
3. `App.tsx - Editor UI and Query-Param Routing` - 11 edges
4. `Supabase - Backend Database and RLS` - 8 edges
5. `scripts` - 7 edges
6. `generarHTMLFinal()` - 7 edges
7. `invitaciones Table - Supabase Core Schema` - 6 edges
8. `getOrdenSeccionesEfectivo()` - 5 edges
9. `getFotosPorTema()` - 5 edges
10. `InvitacionDatos` - 5 edges

## Surprising Connections (you probably didn't know these)
- `tsconfig.json - JSX Configuration` --references--> `App.tsx - Editor UI and Query-Param Routing`  [INFERRED]
  tsconfig.json → CLAUDE.md
- `vercel.json - Single Page App Rewrite` --references--> `Generador de Invitaciones XV - Digital Invitation Generator`  [INFERRED]
  vercel.json → CLAUDE.md
- `React - Version 19.0.1` --references--> `App.tsx - Editor UI and Query-Param Routing`  [EXTRACTED]
  package.json → CLAUDE.md
- `@supabase/supabase-js - Version 2.110.0` --references--> `Supabase - Backend Database and RLS`  [EXTRACTED]
  package.json → CLAUDE.md
- `vercel.json - CSP frame-ancestors Headers` --references--> `Vercel - Single Project Deployment`  [EXTRACTED]
  vercel.json → CLAUDE.md

## Import Cycles
- None detected.

## Communities (47 total, 31 thin omitted)

### Community 0 - "App.tsx + Abono"
Cohesion: 0.08
Nodes (34): Abono, App(), AvisoPago, ConfirmacionRSVP, decodeState(), encodeState(), ESTATUS_PEDIDO, ESTILOS_CAJAS_SECCIONES (+26 more)

### Community 1 - "dotenv + express"
Cohesion: 0.07
Nodes (28): dotenv, express, @google/genai, html2canvas, jspdf, lucide-react, motion, dependencies (+20 more)

### Community 2 - "autoprefixer + esbuild"
Cohesion: 0.07
Nodes (26): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+18 more)

### Community 3 - "DOM + DOM.Iterable"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 4 - "InvitacionGuardadaRow + data.ts"
Cohesion: 0.21
Nodes (15): InvitacionGuardadaRow, datosDefault, fotosFicticiasDefault, getColoresEfectivos(), getFotosPorTema(), getOrdenSeccionesEfectivo(), PALETAS_COLOR_PERSONALIZADO, paquetes (+7 more)

### Community 5 - "Animated Opening Styles - Card + api/notify-telegram.ts - Teleg"
Cohesion: 0.14
Nodes (16): Animated Opening Styles - Card, Envelope, Curtain, api/notify-telegram.ts - Telegram Bot Notifications, App.tsx - Editor UI and Query-Param Routing, Cloudinary - Image Upload and CDN, data.ts - Static Content and Configuration, main.tsx - React Root Mount, middleware.ts - Vercel Edge Middleware and Admin Auth, Telegram Bot Notifications to Admin (+8 more)

### Community 6 - "abonos Table - Payment Transac + Manual Access Blocking - bloqu"
Cohesion: 0.17
Nodes (15): abonos Table - Payment Transaction Records, Manual Access Blocking - bloqueada + motivo_bloqueo, api/admin/abonos.ts - Bulk Payments Read, api/admin/list-invitaciones.ts - Bulk Invitations Read, avisos_pago Table - Payment Notifications, confirmaciones Table - RSVP Records, Ingresos Dashboard - Revenue Aggregation, Client Intake Form - ?intake=1&iid=<row id> (+7 more)

### Community 7 - "checkins Table - Door Check-In + InvitacionDatos - Core Invitat"
Cohesion: 0.22
Nodes (11): checkins Table - Door Check-In Records, InvitacionDatos - Core Invitation Content Schema, PaqueteConfig - Package Tier Configuration, Pases - Per-Guest Personalized Passes, Pricing - Básico Package, Pricing - Deluxe Package, Pases Pricing - Per-Guest Pass Feature, Pricing - Premium Package (+3 more)

### Community 8 - "Canonical Repository Status + Generador de Invitaciones XV -"
Cohesion: 0.50
Nodes (4): Canonical Repository Status, Generador de Invitaciones XV - Digital Invitation Generator, Vite - Version 6.2.3, vercel.json - Single Page App Rewrite

### Community 9 - "Base64 URL Encoding - Compact  + localStorage Persistence - xv_"
Cohesion: 0.67
Nodes (3): Base64 URL Encoding - Compact State Blob, localStorage Persistence - xv_datos_invitacion, State Diffing - URL-Encoded Invitation Delta

### Community 10 - "PDF Download - Invitation as P + html2canvas - Version 1.4.1"
Cohesion: 0.67
Nodes (3): PDF Download - Invitation as PDF Memento, html2canvas - Version 1.4.1, jspdf - Version 4.2.1

## Knowledge Gaps
- **77 isolated node(s):** `config`, `name`, `private`, `version`, `type` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dotenv + express` to `autoprefixer + esbuild`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dotenv + express` to `App.tsx + Abono`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `App()` connect `App.tsx + Abono` to `dotenv + express`, `InvitacionGuardadaRow + data.ts`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App.tsx - Editor UI and Query-Param Routing` (e.g. with `middleware.ts - Vercel Edge Middleware and Admin Auth` and `tsconfig.json - JSX Configuration`) actually correct?**
  _`App.tsx - Editor UI and Query-Param Routing` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `name`, `private` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx + Abono` be split into smaller, more focused modules?**
  _Cohesion score 0.07507507507507508 - nodes in this community are weakly interconnected._
- **Should `dotenv + express` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._