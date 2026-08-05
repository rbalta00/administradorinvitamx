# Graph Report - .  (2026-08-05)

## Corpus Check
- 23 files · ~59,872 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 144 nodes · 180 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- External Dependencies
- Core App & Types
- TypeScript Config
- Build & Tooling
- Invitation Data Layer
- Project Metadata
- State Encoding
- Business Logic
- Auth Middleware
- Catalog Utilities
- Vercel Deployment

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `App()` - 13 edges
3. `scripts` - 7 edges
4. `generarHTMLFinal()` - 7 edges
5. `getOrdenSeccionesEfectivo()` - 5 edges
6. `getFotosPorTema()` - 5 edges
7. `InvitacionDatos` - 5 edges
8. `getDatosCatalogTema()` - 4 edges
9. `IntakeForm()` - 4 edges
10. `getColoresEfectivos()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `App()` --references--> `jspdf`  [EXTRACTED]
  src/App.tsx → package.json
- `InvitacionGuardadaRow` --references--> `InvitacionDatos`  [EXTRACTED]
  src/App.tsx → src/types.ts
- `getDatosCatalogTema()` --calls--> `getFotosPorTema()`  [EXTRACTED]
  src/App.tsx → src/data.ts
- `App()` --calls--> `getOrdenSeccionesEfectivo()`  [EXTRACTED]
  src/App.tsx → src/data.ts
- `App()` --calls--> `generarHTMLFinal()`  [EXTRACTED]
  src/App.tsx → src/templates.ts

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "External Dependencies"
Cohesion: 0.08
Nodes (25): dotenv, express, @google/genai, html2canvas, jspdf, lucide-react, motion, dependencies (+17 more)

### Community 1 - "Core App & Types"
Cohesion: 0.09
Nodes (21): Abono, AvisoPago, ConfirmacionRSVP, FUENTES_CURSIVA, FUENTES_ENCABEZADO, FUENTES_TEXTO, KEY_MAP, LazyIframe (+13 more)

### Community 2 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 3 - "Build & Tooling"
Cohesion: 0.11
Nodes (18): autoprefixer, esbuild, vite, devDependencies, autoprefixer, esbuild, tailwindcss, tsx (+10 more)

### Community 4 - "Invitation Data Layer"
Cohesion: 0.21
Nodes (15): InvitacionGuardadaRow, datosDefault, fotosFicticiasDefault, getColoresEfectivos(), getFotosPorTema(), getOrdenSeccionesEfectivo(), PALETAS_COLOR_PERSONALIZADO, paquetes (+7 more)

### Community 5 - "Project Metadata"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, clean, dev, lint, preview (+3 more)

### Community 6 - "State Encoding"
Cohesion: 0.29
Nodes (6): App(), decodeState(), encodeState(), ESTILOS_CAJAS_SECCIONES, guardarEnSupabase(), tipoAperturaPorDefectoDelTema()

### Community 7 - "Business Logic"
Cohesion: 0.50
Nodes (4): ESTATUS_PEDIDO, IntakeForm(), notificarAdminTelegram(), subirImagenPublica()

### Community 9 - "Catalog Utilities"
Cohesion: 0.67
Nodes (3): getColorSugeridoPorTema(), getDatosCatalogTema(), getDatosVisualizacionCatalog()

## Knowledge Gaps
- **71 isolated node(s):** `config`, `name`, `private`, `version`, `type` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `External Dependencies` to `Build & Tooling`, `Project Metadata`?**
  _High betweenness centrality (0.381) - this node is a cross-community bridge._
- **Why does `jspdf` connect `External Dependencies` to `State Encoding`?**
  _High betweenness centrality (0.298) - this node is a cross-community bridge._
- **Why does `App()` connect `State Encoding` to `External Dependencies`, `Core App & Types`, `Invitation Data Layer`, `Business Logic`, `Catalog Utilities`?**
  _High betweenness centrality (0.296) - this node is a cross-community bridge._
- **What connects `config`, `name`, `private` to the rest of the system?**
  _71 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `External Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Core App & Types` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._