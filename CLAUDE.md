# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Textura de papel sutil en el sobre y el fondo (temas elegantes) (2026-11-20)

Pedido explícito: que la invitación se sienta como una tarjeta de papel real -- grano sutil en el
sobre (apertura tipo "sobre") y en el fondo general del contenido, solo en los 10 temas elegantes/
de papel (`dorado-clasico`, `mariposas`, `floral-acuarela`, `botanico`, `boho-chic`,
`princesa-elegante`, `marmol-oro`, `coquette-pink`, `coquette-luxe`, `vino-elegante`), nunca en los
de brillo/oscuro (`celestial`, `neon`, `aurora-boreal`, `glam-rose`, `personalizado`).

- **Textura generada 100% por código** (`templates.ts`, constantes module-level cerca de
  `construirUrlGoogleFonts`): `TEXTURA_PAPEL_SVG` (ruido `feTurbulence`, 254 bytes) horneado con
  `opacity='0.05'` directo en el SVG (dentro del rango 0.04-0.08 pedido), codificado a
  `TEXTURA_PAPEL_DATAURI` (376 caracteres, sin imágenes externas, sin librerías, sin peticiones de
  red, sin JS). `TEMAS_CON_TEXTURA_PAPEL` (los 10 ids de arriba) + `temaTieneTexturaPapel` (nuevo,
  calculado en `generarHTMLFinal` por el tema EFECTIVO, mismo criterio que `tipoAperturaEfectivo`
  -- nunca por `datos.personalizacion`, no hay control nuevo en el editor).
- **"Fondo compuesto" en vez de un `::after` nuevo** (`texturaPapelSobre(fondoBase)`, helper
  nuevo): compone la textura con el fondo YA existente de cada superficie vía `background-image`/
  `background-blend-mode: multiply` (oscurece, nunca aclara) -- sin tocar ninguna clase ni la
  estructura del HTML existente, solo agregando una capa más a la propiedad `background` que esa
  superficie ya traía. Aplicado en `.envelope-container`/`.envelope-flap`/`.envelope-pocket`/
  `.envelope-letter` (el sobre, incluyendo la solapa y la carta) y en `.theme-container`/`body`
  (el fondo general, tanto con foto de fondo personalizada subida como sin ella).
- **Bug real encontrado y corregido durante la propia verificación en vivo**: `background-image`
  solo acepta valores `<image>` (gradiente/url), NUNCA un color plano -- `.envelope-container`
  (fondo `tema.colors.light`) y `.envelope-letter` (fondo `white`) pasan justo eso, un color
  plano, y la primera versión de `texturaPapelSobre` los metía tal cual como segunda capa de
  `background-image`, lo que invalida la declaración ENTERA (el navegador la descarta por
  completo) -- confirmado con `getComputedStyle` real en el editor: esas 2 superficies se
  quedaban sin ningún fondo (`background-image: none`), mientras que `.envelope-pocket`/
  `.envelope-flap` (cuyo fondo YA es un `linear-gradient(...)`, un `<image>` válido) sí
  funcionaban desde el primer intento. Corregido: `texturaPapelSobre` detecta si `fondoBase` es
  un gradiente/url real (`background-image` de 2 capas, como antes) o un color plano (ahí el
  color se deja en `background-color` aparte, y la textura es la ÚNICA capa de
  `background-image`, compuesta contra ese color vía `background-blend-mode: multiply` -- que
  también blendea contra `background-color`, no solo entre capas de `background-image`).
- **Límite conocido, no un bug**: la solapa del sobre (`.envelope-flap`) es un triángulo armado
  con el truco de `border-left/right: transparent` + `border-top: solid` sobre una caja de
  `width:0;height:0` -- el `background`/textura ahí solo se ve en las 2 esquinas donde el borde
  transparente deja pasar el fondo (el grueso del triángulo es el borde SÓLIDO, que no acepta
  textura, es borde, no fondo). Aceptado a propósito: agregar la textura vía una técnica distinta
  (ej. `border-image`, o un nuevo elemento recortado con `clip-path`) hubiera requerido tocar
  estructura/clases existentes, explícitamente prohibido en el encargo.
- **Verificado en vivo** (servidor local de desarrollo, "Monitor de Invitación" del editor +
  catálogo con `?catalog=true&tema=X`): con `getComputedStyle` real (no solo visual, la opacidad
  es demasiado sutil para verse en una captura comprimida) se confirmó la textura presente y con
  el blend correcto en las 4 superficies del sobre Y en el fondo general, en AMBOS casos (con foto
  de fondo personalizada -- blend `"multiply, normal"`, 2 capas -- y sin ella -- blend
  `"multiply"`, 1 capa contra `background-color`); confirmado que `celestial` no tiene ningún
  rastro de `feTurbulence` en su HTML generado (cero textura); contenido/texto siguen legibles y
  sin regresión visual en los 2 temas de papel probados (`mariposas` con sobre real abierto,
  `vino-elegante` sin foto de fondo). `npm run lint` con los mismos 6 errores preexistentes de
  `ImportMeta.env`, cero nuevos; `npm run build` limpio.
- Commit en `master`, pusheado.

## "Mis Invitaciones" abre en "Activas", no en "Requieren atención" (2026-11-20)

Bug real reportado con repro en vivo: el panel "Mis Invitaciones" nacía con `pestanaListaInvitaciones`
en `"atencion"` -- si no había ninguna invitación en `invitacionesUrgentes` en ese momento (el caso
normal), la lista se veía vacía con "Ninguna invitación coincide con estos filtros." pese a que SÍ
había cargado todo de Supabase (los contadores de arriba, "Activas (9)"/"Todos (12)", lo probaban).
El filtro "Todos" de la segunda fila es de TIPO DE EVENTO, no de estado, así que no rescataba la vista.

- **Fix real, 2 lugares, no uno solo**: el `useState` inicial de `pestanaListaInvitaciones`
  (`App.tsx`, ~línea 3227) cambió de `"atencion"` a `"activas"` -- pero eso solo cubre el primer
  render antes de abrir el panel por primera vez. **Hallazgo encontrado revisando el propio
  comentario junto a ese `useState`** (decía explícitamente "ver el onClick que abre Mis
  Invitaciones, que la resetea cada vez" -- una pista de que el primer fix, por sí solo, era un
  no-op): el botón "Mis Invitaciones" (el único lugar que hace `setMostrarMisInvitaciones(true)`)
  tenía su propio `setPestanaListaInvitaciones("atencion")` en el `onClick`, que pisaba el default
  de arriba CADA VEZ que se abre el panel -- confirmado que es el único call site además del
  `useState`. Corregido también a `"activas"`. No se tocó el orden de las pestañas, los
  contadores, la lógica de `invitacionesFiltradas`, ni qué cuenta como `invitacionesUrgentes` --
  "🔥 Requieren atención" sigue existiendo con su contador, solo deja de ser la vista con la que
  abre el panel.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de `ImportMeta.env`).
- Commit `<ver git log>` en `master`, pusheado.

## Clonar invitación ya no hereda extras à la carte activados (2026-11-20)

Encargo explícito: `handleDuplicarInvitacionGuardada` (`App.tsx`) guardaba la fila nueva con el
`datos_completos` íntegro de la original -- las columnas de pago (`pases_pagado`/`pdf_pagado`/
`checkin_pagado`) correctamente NO se copian (ya era así), pero las funciones ya DESBLOQUEADAS
dentro de `datos_completos` sí viajaban activadas: `controlAccesoQR: true` (el QR de puerta,
+$150 MXN, no lo incluye ningún plan) y cualquier sección condicionada por paquete que el admin
hubiera prendido a mano a la carta (ej. "pases" en un Básico) quedaba fuera de
`seccionesExcluidas` en la copia -- un cliente nuevo nacía con extras activos que no ha pagado.

- **Fix, solo en el flujo de duplicar**: antes de llamar a `guardarEnSupabase`, se arma
  `datosParaClon` con `controlAccesoQR: false` siempre, y `seccionesExcluidas` recalculado con
  `recalcularSeccionesPorPaquete(fila.datos_completos.seccionesExcluidas, fila.datos_completos.paquete)`
  -- la MISMA función que ya usa el selector de paquete (línea ~1331) para decidir qué secciones
  condicionadas por plan (`pases`/`familia`/`regalos`, ver `SECCIONES_CONDICIONADAS_POR_PAQUETE`)
  quedan prendidas/apagadas, sin duplicar esa lógica. El resto de `seccionesExcluidas` (secciones
  que el admin apagó a mano sin depender del paquete, ej. "Galería") se conserva intacto, porque
  es justo lo que ya hace esa función -- no se tocó nada más de `datos_completos` (tema,
  personalización, textos, fotos, invitados, datos del evento/cliente viajan igual).
- El estado del editor (`setDatos`) se carga desde `datosParaClon`, no desde `fila.datos_completos`
  tal cual, para que lo que se ve en pantalla tras duplicar coincida con lo que de verdad se
  guardó (antes de este fix hubiera mostrado los extras todavía activos hasta la próxima recarga).
- Columnas/payload de `guardarEnSupabase` sin tocar -- la copia sigue naciendo con id/código corto
  nuevos, 0 aperturas, sin pagos ni flags de pago, desbloqueada.
- Toast de éxito ampliado: ahora avisa explícitamente que los extras à la carte (QR de puerta y
  secciones sueltas) inician apagados en la copia y se activan cuando se registre su pago.
- **Verificado por lógica** (simulación en Node de `recalcularSeccionesPorPaquete`, misma función
  copiada tal cual del archivo, sin mocks de Supabase): un Básico con "pases" desbloqueado a la
  carta (`seccionesExcluidas: ["familia","regalos"]`) vuelve a excluir "pases" al duplicar
  (`["familia","regalos","pases"]`); un Premium/Deluxe (`seccionesExcluidas: []`) se mantiene sin
  nada excluido; una sección no condicionada apagada a mano (ej. "galeria") sobrevive intacta en
  la copia junto con el recálculo de las condicionadas. `npm run lint` (`tsc --noEmit`) con los
  mismos 6 errores preexistentes de `ImportMeta.env`, cero nuevos; `npm run build` limpio.
- Commit en `master`, pusheado.

## Aperturas estilo Verbena (delta): lacre que se parte, pantalla "PARA / Familia", apertura Caligrafía (2026-11-20)

Encargo explícito (análisis de competencia Verbena citado en el propio prompt del usuario, no vive
en este repo -- mecanismos genéricos adaptados con el arte propio de InvitaMX, nada de su material
copiado). Delta
sobre el prompt de aperturas ya aplicado el 2026-11-19 (las 5 aperturas sobre/cortina/tarjeta/
puertas/destellos, el sello de cera con inicial, y el panel visual con mini-previews) -- nada de
eso se rehizo.

- **Parte 1 -- lacre que se parte en dos** (`templates.ts`, bloque "sobre"): el disco del sello
  ahora son 2 mitades (`.sello-mitad-izq`/`-der`) recortadas con `clip-path` en un borde irregular
  (grieta), más un laurel decorativo simple en SVG (`.sello-laurel`) detrás. Al tocar, cada mitad
  se traslada/rota hacia su lado y se desvanece (solo `transform`/`opacity`, con transición, sin
  `@keyframes` nuevo); la solapa se abre 600ms después (antes 450ms) y `comenzarExperiencia()` se
  dispara a los 2200ms totales (antes 1900ms) -- dentro del rango de 2-3s pedido. Verificado con
  `getComputedStyle` tras forzar la clase `sello-rompiendo`: mitades en `opacity:0` con transform
  de traslación/rotación distinto cada una, laurel en `opacity:0`.
- **Parte 2 -- pantalla "PARA / Familia" + botón "TOCA PARA ABRIR"**: nuevo bloque compartido
  (`aperturaParaFamiliaHTML`/`botonTocaParaAbrirHTML`/`aperturaEstiloCompartidoCSS` en
  `generarHTMLFinal`) insertado en las 6 aperturas (arriba del elemento principal, con el color de
  texto correcto para el fondo de cada una). El nombre de la familia se resuelve en runtime
  (`?fam=` del link + `datosInvitacion.invitados[0]`, el mismo dato que ya usa `mostrarPaseFijo()`
  -- no se inventó un mecanismo nuevo) dentro de un paso nuevo del `DOMContentLoaded` existente, con
  try/catch silencioso igual que el resto de esa función. Sin `?fam=` o sin invitado resuelto, el
  bloque se queda oculto -- la apertura se ve exactamente igual que antes. El botón "TOCA PARA
  ABRIR" (texto unificado, antes variaba entre "✨ Tocar Para Abrir ✨" y solo un párrafo de ayuda
  en sobre/cortina/puertas) se agregó a las 6 aperturas. Verificado end-to-end con
  `generarHTMLFinal` ejecutado directo (esbuild + Node, fuera del repo, con los datos de ejemplo
  del catálogo que ya traen 3 invitados de muestra) y abierto en navegador real: con `?fam=` la
  pantalla muestra "PARA / Familia Pérez González" antes de "Tienes una invitación exclusiva" (y
  equivalente en las otras 5); sin `?fam=` o con `?fam=` vacío, no aparece nada y no hay errores de
  consola.
- **Parte 3 -- sexto tipo de apertura "Caligrafía"**: agregado a `types.ts` (`tipoApertura`),
  `App.tsx` (`TipoApertura`, `TIPOS_APERTURA`, `MiniPreviewApertura` con un trazo SVG real
  animado en bucle para la mini-vista, `index.css` con su keyframe), y `templates.ts`
  (`tipoAperturaEfectivo`, bloque nuevo + `comenzarExperienciaCaligrafia()`). El nombre se
  "escribe solo" al cargar (sin esperar toque) con un revelado progresivo por `clip-path` +
  fade -- el trazo SVG letra-por-letra que pedía el encargo como ideal no es viable para un
  nombre arbitrario en una fuente de Google Fonts cualquiera sin una librería de trazado de
  glifos que este proyecto no tiene vendorizada, así que se usó el fallback que el propio
  encargo ya contemplaba explícitamente para ese caso ("revelado progresivo... + fade", aclarado
  para que no se confunda con un fade plano). Debajo, el tipo de evento (`textosEvento.tituloSobre`,
  reusado tal cual) y el botón "TOCA PARA ABRIR" (tocar acelera/salta a la portada, sin esperar a
  que termine el trazo). Con `prefers-reduced-motion`, el nombre se muestra ya escrito (sin la
  clase que dispara la animación) y solo se espera el toque -- verificado simulando el media query
  vía `matchMedia` monkeypatcheado en consola real. No se cambió ningún default de tema -- queda
  como opción elegible para cualquiera de los 14.
- **No se tocó**: las reglas de las 5 aperturas existentes fuera del lacre de "sobre", el flujo de
  `comenzarExperiencia()` (música/widget/caída), RSVP/pases/secciones/precios, ni ningún default de
  tema -- confirmado con `npm run lint` (mismos 6 errores preexistentes de `ImportMeta.env`, cero
  nuevos) y `npm run build` limpio.
- Verificación hecha renderizando `generarHTMLFinal` directo (sin pasar por el editor) porque la
  ruta de depuración `?embed=true` tiene un bug preexistente, no causado por este cambio (confirmado
  reproduciéndolo también en código sin tocar): un `document.write` duplicado sobre el mismo
  documento ("Identifier 'datosInvitacion' has already been declared"), que aborta el script
  completo de esa página de depuración en particular. El **preview real del editor** (el iframe
  "Monitor de invitación") no tiene este problema -- se confirmó ahí también con el botón nuevo
  visible. No investigado a fondo por estar fuera de alcance de este encargo; queda anotado por si
  alguien lo encuentra buscando "PARA/familia no aparece" en el modo embed específicamente.

## Tipo de Evento: XV ya no es el único evento soportado (2026-11-19)

Pedido explícito del usuario: generalizar el generador (hasta ahora 100% de quinceañeras) para
poder producir invitaciones de Boda, Cumpleaños, Bautizo, Primera Comunión, Graduación, Baby
Shower y Aniversario, con los mismos temas/fondos/paquetes/precios/secciones/RSVP/pases/PDF --
**solo cambian las palabras** que ve el invitado.

- **`InvitacionDatos.tipoEvento?`** (`types.ts`) -- `"xv" | "boda" | "cumpleanos" | "bautizo" |
  "primera-comunion" | "graduacion" | "baby-shower" | "aniversario"`. Ausente o desconocido =
  `"xv"`, para que cualquier invitación guardada antes de este campo se siga generando idéntica.
- **`TEXTOS_POR_EVENTO`/`textosEventoDe()`** (`templates.ts`, exportados) -- diccionario único con
  los ~15 textos que cambian por tipo (apertura ×3 estilos, portada, mensaje, familia, `<title>`,
  calendario, frase de confirmación de RSVP), resuelto UNA vez en `generarHTMLFinal` como
  `textosEvento` y usado en cada lugar que antes tenía el texto de XV fijo -- nunca ternarios
  sueltos. De paso se encontró y generalizó un texto más no pedido explícitamente ("celebrar
  juntos mis 15 años" del detalle de "Agregar a calendario") y se limpió un comentario HTML
  interno que decía "quinceañera" (invisible para el invitado, pero por consistencia).
- **Editor (`App.tsx`)**: selector "Tipo de Evento" (8 botones) al inicio de la pestaña
  "Quinceañera", antes del campo de nombre -- `handleSeleccionarTipoEvento`. La etiqueta de ese
  campo (`ETIQUETA_NOMBRE_POR_EVENTO`) y los mensajes de validación de nombre faltante se adaptan
  por tipo; igual el encabezado "Padres de..." de la pestaña Familia (`ETIQUETA_PADRES_POR_EVENTO`
  -- no estaba en el pedido original, se encontró al revisar esa pestaña y se generalizó con el
  mismo mecanismo). El mensaje de bienvenida y el itinerario de ejemplo (solo para Boda, con un
  array equivalente por paquete) se rellenan con un default del tipo nuevo SOLO si el texto
  actual sigue siendo exactamente un default "de fábrica" conocido -- si el admin o el cliente
  (desde su propio `?intake=1`) ya lo editó, nunca se pisa. El quick-create "+ Nuevo Cliente"
  (sin selector de tipo) se deja tal cual, siempre crea XV por default -- fuera de alcance de este
  cambio, declarado a propósito.
- **`IntakeForm`** (el formulario público `?intake=1&iid=...`) ya lee `datos_completos.tipoEvento`
  de la fila (estaba disponible, no se tocó el query) y lo usa para adaptar la frase de "Copiar
  recordatorio" que el cliente le manda a sus propios invitados sin RSVP -- mismo
  `TEXTOS_POR_EVENTO.fraseConfirmacion` que usa el aviso de Telegram al admin. El resto del
  formulario de intake no depende del tipo de evento.
- **Nada de temas, paquetes, precios, secciones ni fondos cambió** -- confirmado generando los 8
  tipos con los 5 estilos de apertura (sobre/cortina/puertas/destellos/tarjeta) y ambas variantes
  de portada (circular/fondo): ningún texto de XV ("Quince", "Primaveras", "XV", "Gala XV") quedó
  en ningún tipo que no sea "xv"; una invitación sin el campo `tipoEvento` genera el mismo HTML
  visible que una con `tipoEvento: "xv"` explícito (solo difiere el JSON de depuración embebido
  en la página, que ahora sí trae esa llave -- no es texto visible). Verificado ejecutando
  `generarHTMLFinal` directo (vía un bundle de esbuild con `import.meta.env` stubbeado, fuera del
  repo) para los 8 tipos × 5 aperturas, no solo leyendo el código.
- `docs/guia-de-uso.md`, `public/manual.html` y `D:\InvitaMX\invitamx-manual-usuario.html`
  actualizados con el selector nuevo y la etiqueta adaptable (regla fija de abajo).

## Tema nuevo: "Vino Elegante" 🍷, color rojo/vino (2026-11-17)

Pedido del usuario: "piensa primero si algún color falta para las quinceañeras y sobre de eso creamos
o eliminamos algún tema, investiga". Antes de construir nada se extrajeron los colores `primary` reales
de los 13 temas existentes y se investigó tendencias de color para XV años (Comex 2026, Pantone 2026,
ideas específicas de XV de Eventifai) — **ningún tema existente cubre la familia roja/vino/borgoña**,
un color clásico y popular para quinceañeras (fiestas tipo gala/salón). El usuario respondió "si hazlo".

- **Tema nuevo `vino-elegante`** agregado a `temas` en `src/data.ts` (entre `aurora-boreal` y
  `personalizado`, mismo patrón estructural que `princesa-elegante` como plantilla): `primary: "#7B1E3A"`
  (vino/borgoña), acentos en champán/dorado (`secondary: "#E8C4A0"`, `accent: "#C9A24B"`), tipografía
  `Cormorant Garamond` (heading) + `Great Vibes` (cursiva) — ambas ya estaban en `FONT_URL_SEGMENTS`
  de `templates.ts`, no hizo falta tocar ese archivo. `decorativeEmoji: "🍷"`.
- Agregado también un caso en `getColorSugeridoPorTema` (`App.tsx`): vino + champán + blanco como
  colores de vestimenta sugeridos para este tema.
- **No hizo falta tocar** `fotosFicticiasDefault`/`getFotosPorTema` (data.ts) — igual que 11 de los
  13 temas existentes, cae al fallback genérico de fotos de "dorado-clasico" automáticamente.
- Verificado en vivo (`npm run dev`, `?catalog=true&tema=vino-elegante`): renderiza correctamente de
  principio a fin (apertura, agradecimiento, tipografía y paleta coherentes). `npm run lint`
  (`tsc --noEmit`) sigue con los mismos 6 errores preexistentes, cero nuevos.
- **De paso, cerrado un gap ya detectado antes** (no reportado por el usuario en este hilo, encontrado
  al investigar): `invitacionmx-catalogo` nunca tenía `aurora-boreal` en su `themes` array (`app/page.tsx`)
  pese a que ya existía en el generador desde antes — agregado en el mismo commit que `vino-elegante`.
- Repos actualizados en la misma pasada: `invitacionmx-catalogo` (`themes` array, +2 temas) e
  `invitacionmx-landing` (`Pricing.tsx`/`WhyUs.tsx`: "13 temas" → "14 temas", 4 ocurrencias) — ver
  la sección "Lista de funcionalidades para copy de venta" más abajo, también actualizada.

## Bug real corregido: `ordenSecciones`/`estiloCajasSecciones` no sobrevivían a un link compartido (2026-11-10)

Pedido explícito del usuario: "haz una auditoría completa del motor y la coherencia y
efectividad y todo de invitamx". `KEY_MAP` (tope de `App.tsx`, usado por
`encodeState`/`decodeState` para armar el `d` de `?v=1&d=...`) nunca tuvo alias para
estos 2 campos de `InvitacionDatos` -- se perdían en silencio al compartir un link:

- **`ordenSecciones`** (gap NUEVO, no documentado antes de esta auditoría, impacto
  ALTO): `generarHTMLFinal` (`templates.ts`) sí lo usa de verdad vía
  `getOrdenSeccionesEfectivo` para decidir el orden real de las secciones -- un admin
  que reordenaba secciones con los botones ↑/↓ y compartía el link, el invitado veía
  el orden default del paquete, nunca el que el admin configuró y vio en su propio
  editor. Silencioso: nada avisaba que el preview del admin y lo que recibe el
  invitado podían divergir.
- **`estiloCajasSecciones`** (gap ya conocido, ver nota "Formato de galería..." más
  abajo -- confirmado que seguía sin arreglarse).

**Arreglado**: agregados `ordenSecciones: "os"` y `estiloCajasSecciones: "ec"` a
`KEY_MAP`. Ambos campos son valores simples (`string[]` y un literal de 3 opciones)
que ya caían en la rama genérica de `encodeState`/`decodeState` (no necesitaban
ningún manejo especial, a diferencia de `ceremonia`/`itinerario`/`invitados`) -- el
fix fue puramente agregar las 2 llaves cortas, sin tocar ninguna otra lógica.
Verificado en vivo (`npm run dev`, sin guardar nada en Supabase): reordené una
sección + cambié el estilo de cajas en el editor, generé el link, decodifiqué el
`d` param en consola -- ambos valores viajan correctamente (`os` con el orden real,
`ec: "solo_borde"`). `npm run lint` (`tsc --noEmit`) sigue con los mismos 6 errores
preexistentes de siempre (`ImportMeta.env`, no relacionados, confirmado comparando
contra el mismo lint ANTES del cambio con `git stash`) -- cero errores nuevos.

## Regla fija: mantener la guía de uso al día (pedido 2026-11-02)

Cada vez que se agregue, mueva o quite un botón/feature visible en el
editor (`src/App.tsx`), actualizar en el mismo cambio `docs/guia-de-uso.md`
y, si aplica, `public/manual.html` (copia servida en `/manual.html` desde
un botón del propio header — la fuente "maestra" históricamente vivía en
`D:\InvitaMX\invitamx-manual-usuario.html`, mantener los tres en sync).
No esperar a que el usuario lo pida cada vez.

## ⚠️ This is the canonical repo (as of 2026-07-27)

**`administradorinvitamx`** is the official, actively-maintained "Generador de Invitaciones XV". All new work goes here.

There are several other repos on `github.com/rbalta00` that started from the same Google AI Studio scaffold (`react-example` / "GENERADOR PRIVADO XV") and share most of this file structure, but they are **stale duplicates that diverged independently** — do not confuse them with this one and do not port features from here into them:

- `invitacionesmx` (deploys to Vercel project `invitacionmx-demo`, GitHub remote `invitacionmx`)
- `invitamx`
- `INVITAMXGEN`
- `admin-hanny`, `hanny-xv-admin` (client-specific forks for one customer, not the general product)

If asked to "open the generator" or "fix the generator" without a repo specified, assume this repo and its deployment at **https://administradorinvitamx.vercel.app** unless told otherwise.

**Scope discipline:** when working in this repo, stay inside it. Don't read from, write to, or cross-reference the duplicate repos listed above as if they shared state with this one — they don't (separate Supabase usage, separate deploys, separately diverged code), even though they started from the same template.

### Usability review pass (2026-11-02)

The owner asked for a review of the editor aimed at making it usable by someone new, with the explicit goal "que cualquiera entienda cómo generar las invitaciones que vamos a vender." Findings and fixes, in case the same questions come up again:

- **New end-user doc**: `docs/guia-de-uso.md` — there was previously zero documentation written for a non-developer operator (`README.md` was AI-Studio boilerplate, this file is dev/architecture-only). README now points to it at the top.
- **Fixed the `-650` invalid Tailwind shade** (`text-indigo-650`, `text-slate-650`, `bg-emerald-650`, `text-emerald-650`) in all ~14 remaining spots flagged as a known pending cleanup earlier in this file (see the "Found while building the above" bullet further down) — most visibly, the Móvil/Tablet/Escritorio device-preview toggle now actually shows its active-state color.
- **The 9-tab bar (`panelPestana`) overflows on normal screen widths** — only ~6 tabs fit, the rest (Álbum, Lista Pases, A Medida) were only reachable by dragging a native horizontal scrollbar with no visible affordance that more tabs existed. Added real `ChevronLeft`/`ChevronRight` buttons (`tabsScrollRef`) on both sides that scroll the tab strip on click.
- **The 11 action buttons** (`#control-panel-actions`) were already organized into 5 logical groups in code (with comments), but visually only separated by a 1px divider that becomes invisible the moment buttons wrap to a new row (happens often — 11 buttons in a narrow panel). Each group now has its own small uppercase label above it ("Esta invitación" / "Exportar / copiar" / "Ver todo" / "Cuenta / dispositivo"), and "Limpiar" (destructive) is pushed to its own corner with `ml-auto` so it's never visually adjacent to normal-use buttons.
- Not touched, flagged as a larger/riskier change not requested: splitting `App.tsx` (~6700+ lines, the entire editor UI inline, no per-tab components) into smaller files.

### Planned future work (not started — wait for explicit go-ahead)

The user's eventual plan (stated 2026-07-27, timeline not yet set):
1. Delete all the stale duplicate repos listed above once this repo fully replaces them operationally.
2. Create exactly **one** new repo, name **`app`**, meant to be an improved rebuild of this generator (not a from-scratch unrelated project) — likely covers gaps noted below (auth, broken-link class of bugs, automation).
3. Do not start on `app` or delete anything until the user explicitly says so in a future session — this note exists so that instruction isn't lost/forgotten between sessions.

### Pending decision: alternate itinerario/portada formats (proposed 2026-08-04, not started)

The user asked for design alternatives to preview before committing to any implementation. Both were mocked up as standalone HTML (not wired into `templates.ts`) so they could be judged on layout/composition alone, using the Dorado Clásico theme's real colors and the actual icon-selection logic as reference. **Wait for the user to pick which (if any) before touching `generarHTMLFinal`.**

- **Itinerario** — current is a connected timeline (icon badges + vertical gradient line + card per event). Three alternates mocked: **B) Agenda compacta** (single card, divided list rows — doesn't grow tall with long itineraries, best for 7-10+ eventos); **C) Franja editorial** (large serif hora on the left, alternating zebra tint — most "revista/elegante", but wider per-row so long evento names feel tight); **D) Tarjetas en cuadrícula** (2-column grid — most "Pinterest/moderno", but uneven with an odd item count or long evento text).
- **Portada** — current is a centered circular photo + floating glass date card, with blob/ring/float animations (the busiest of the four options). Three alternates mocked: **B) Foto de fondo completa** (full-bleed photo with a bottom scrim, name overlaid — most "portada de revista", needs a decent vertical photo or it falls back to the same theme gradient as today); **C) Monograma clásico** (no photo at all — ornamental double-ring frame around the name's first initial — most formal/boutique, best fallback for clients without a good photo, but loses the personal photo touch); **D) Panel dividido** (top color block with name, bottom full-width photo, a date badge straddling the seam — most "graphic/poster", needs a decent-quality photo more than A does).
- If implemented, follow the existing `estiloCajasSecciones` pattern (`App.tsx`/`data.ts`/`templates.ts`): a per-invitación field (`estiloItinerario` / `estiloPortada`) defaulting to the current look, selectable in the editor, read inside `generarHTMLFinal` to pick which markup branch to render — keep old links rendering exactly as before (no default-behavior change) same as that precedent.
- **Business-side conclusion from this conversation (2026-08-05):** these format options are an admin tool, not a client-facing catalog choice — tema + paquete stays the only thing offered to the client, keeps the sales funnel simple. Also clarified: `mostrarFotoPortada` (off-toggle for the cover photo, falls back to a themed emoji badge) already exists and covers the "cliente sin foto" case today — the catalog just never demos that state, which is a communication gap, not a missing feature.
- **Next candidates queued for the same HTML-mockup-first treatment** (not started, picked 2026-08-05, continue "mañana" from that date): **Galería de fotos** (grid actual vs. carrusel vs. mosaico/collage de tamaños distintos); **Familia/Padrinos** (tarjetas actuales vs. listado protocolario más formal tipo boda clásica); **Confirmación (RSVP)** (formulario completo actual vs. formato mínimo de solo botón de WhatsApp); **Ceremonia/Recepción** (dos tarjetas separadas actuales vs. una sola tarjeta tipo itinerario, o más peso al mapa). Same rule applies: mock up in standalone HTML first, wait for the user to pick before touching `templates.ts`.

### Manual access block on guest/intake links (added 2026-08-02)

Supersedes the old "Pending decision" note below (kept as history: this is exactly what that note flagged as the harder half of the problem — now built). Explicitly **100% manual, nothing automatic**: the user was clear across the design conversation that they alone decide when a link gets closed, no timer or date field ever does it on its own — same philosophy as every other admin control in this app (pases, pagos, estatus).

- **Two new columns on `invitaciones`**: `bloqueada boolean default false` and `motivo_bloqueo text` (`evento_pasado` | `cancelado` | `falta_pago` | `solicitud_cliente` | `otro` — see `MOTIVOS_BLOQUEO` in `App.tsx`). The motivo is **admin-only bookkeeping**, never shown to the guest/client — the block screen only differs in *tone*, not in exposing the reason (see below).
- **"Mis Invitaciones" UI**: each row has a motivo `<select>` + a "🔒 Apagar acceso" / "🔓 Encender acceso" toggle (`handleActualizarBloqueoInvitacion`), right below the existing (still-cosmetic) "Activa hasta" date field — that field was left untouched, this is a separate, actually-enforced mechanism.
- **How the guest view (`?v=1&d=...`) enforces it — the architecturally interesting part**: the link's `InvitacionDatos` blob (`d` param) is still 100% static/offline by design (see "State, sharing, and persistence" above) — blocking can't come from decoding `d`. Instead, `App.tsx` reads `iid` (already present on any link generated *after* the invitación was first saved — see `getShareUrl`) and does a live `supabaseClient.from("invitaciones").select("bloqueada, motivo_bloqueo").eq("id", iid)` lookup before rendering (`bloqueoCheck` state, right next to the existing `muestraExpirada` logic which is the pattern this was modeled on). **Consequence:** a guest link shared before the invitación was ever saved to Supabase (no `iid`) cannot be blocked this way — treated as never-blocked, same accepted gap noted for the RSVP `iid` tracking above.
- **Intake form (`?intake=1&iid=...`)** checks `bloqueada` in its existing row fetch and shows the same "no longer available" message via its existing `error` state — no new UI needed there.
- **Two message tones, motivo stays internal**: `motivo_bloqueo === "evento_pasado"` shows a warm "Gracias por ser parte de este día tan especial" screen; every other motivo shows a neutral "Esta invitación ya no está disponible, contacta a quien te compartió este link." The specific reason (e.g. a payment dispute) is never surfaced to whoever opens the link.
- **Fully reversible, always**: turning it back on is the same toggle — since the state is a plain boolean written once (not continuously re-evaluated against a date), there's no risk of an automatic process silently re-blocking a link the admin just reopened.
- **Deliberately NOT built** (see design conversation, out of scope for now): a QR-code door check-in system, and any automatic purge/hard-delete of long-dormant blocked invitaciones (the latter was explicitly discussed and deferred — data cost is negligible since `datos_completos` is text/jsonb, not photos; the real reason to eventually purge is privacy, not storage, and it should stay a manual, backup-first process using the existing "🗄️ Respaldo completo" export, not automated).

<details>
<summary>Original pending-decision note (2026-07-31), kept for history</summary>

Explicitly deferred, not started — user said "por ahora déjalo pendiente" (leave it pending for now):

- Today, both the guest invitation link (`?v=1&d=...`) and the client intake-form link (`?intake=1&iid=...`) are **open to anyone who has the URL**, indefinitely. The editor itself got a real server-side login on 2026-07-31 (see `middleware.ts` below), but the guest-facing and client-facing links deliberately were not touched.
- Why this is harder than it sounds: the guest invitation link is **self-contained by design** — the entire `InvitacionDatos` is base64-encoded in the `d` param and rendered client-side with zero Supabase dependency (see "State, sharing, and persistence" below). Adding real expiration to it means either (a) making guest view mode depend on a live Supabase lookup (`iid`-based, like the intake form already does), which changes a load-bearing architectural property (offline-shareable, no backend dependency to view), or (b) some other mechanism — this needs a real design conversation, not a quick patch.
- The intake-form link (`?intake=1&iid=...`) already depends on Supabase, so locking *that one* specifically (e.g. respecting `activo_hasta` or a dedicated expiry column, returning a "this link is no longer active" screen from `IntakeForm`) would be comparatively easy and low-risk — worth doing first if/when this gets picked back up, independent of the harder guest-link problem.
- Do not build either half of this until the user explicitly asks — this note exists purely so the open item isn't lost between sessions.

</details>

### Self-service password recovery by email (added 2026-09-02, needs setup before it works)

A second, friendlier way to reset `ADMIN_PASSWORD` besides `scripts/reset-admin-password.mjs` — that script needs the Vercel CLI logged in on whatever machine runs it; this one is a page in the app itself, gated by a one-time code emailed to the owner, so it works from anywhere.

- **Flow (`?recuperar=1`, `RecoveryPage` in `App.tsx`):** click "Enviarme un código" → `api/recovery/request.ts` emails a 6-digit code (via Resend) to `ADMIN_RECOVERY_EMAIL` and returns a signed token (HMAC'd with `ADMIN_RECOVERY_SECRET`, contains only the code's hash + expiry — the code itself never round-trips to the browser except by email) → user types the code → `api/recovery/confirm.ts` verifies it, generates a new password the same way the CLI script does, and applies it directly via the **Vercel REST API**: lists the project's env vars (`GET /v10/projects/{id}/env`), `PATCH`es the `ADMIN_PASSWORD` row(s), then finds the latest production deployment (`GET /v7/deployments`) and redeploys from it (`POST /v13/deployments` with `deploymentId`) so the new password takes effect — same net effect as `vercel env rm/add` + `vercel --prod` in the script, just called from a serverless function instead of a local CLI session.
- **`middleware.ts` had to add `?recuperar=1` to the public bypass list** — this route exists specifically for when you're locked out, so it can't itself require the password it's meant to reset. Its own security is the emailed one-time code (10-minute expiry, 5 wrong-guess limit via an HttpOnly cookie, 60-second cooldown between requests) instead of Basic Auth.
- **Four new env vars required in Vercel** (none set yet as of 2026-09-02 — the feature is built but inert until these exist): `ADMIN_RECOVERY_EMAIL` (only address allowed to receive the code — set to the owner's email), `ADMIN_RECOVERY_SECRET` (any long random string, only used to sign the one-time-code token), `RESEND_API_KEY` (from resend.com — free tier is plenty; using the default `onboarding@resend.dev` sender works fine as long as the recipient is the Resend account's own email, no domain verification needed for that case), `VERCEL_API_TOKEN` (Vercel → Account Settings → Tokens — **this is the most sensitive secret in the app**, since whoever holds it can rewrite this project's env vars and trigger deploys; scope it as narrowly as the Vercel UI allows, ideally to just this project/team). See `.env.example` for the full list with inline notes.
- **Accepted risk, same shape as any "reset via email" flow anywhere:** whoever controls the `ADMIN_RECOVERY_EMAIL` inbox can regenerate `ADMIN_PASSWORD` at will. That's the intended tradeoff (self-service recovery > needing Claude or CLI access every time), not an oversight — same risk-acceptance style as the guest-link/intake-link UUID model elsewhere in this doc.
- `PROJECT_ID`/`TEAM_ID` are hardcoded as constants at the top of `api/recovery/confirm.ts` (copied from `.vercel/project.json`, which is already committed) — they identify the project, they're not secrets, no env var needed for those two.

### Formato de galería en carrusel + acomodo de mesas (added 2026-09-02)

Two small additions to the "pases" system, both requested after a quick competitor scan (PartyPass, Invitame OK — both sell "acomodo de mesas" as a headline feature) turned up gaps against the market. Neither changes default behavior for existing saved invitaciones.

- **Galería en carrusel** (`estiloGaleria?: "grid" | "carrusel"` in `types.ts`, picker in the editor next to "Estilo de Contenedores de Sección"): alternate to the photo grid, a single horizontally-scrolling row instead of columns that grow tall — picked over the other two mockup options (cuadrícula actual, mosaico) after reviewing all three as standalone HTML. Reuses the exact same lightbox as the grid (`onclick="abrirLightbox(index)"`), only the container layout changes. **`generarHTMLFinal` gained a `paraExportarPDF` option** that always forces grid regardless of `estiloGaleria` — `handleDescargarPDF` captures the iframe with `html2canvas` at a fixed width, and a carousel's `overflow-x-auto` content would get silently cut to whatever fits in that width (found and fixed before this shipped, not caught by any test — worth remembering if another horizontally-scrolling section gets added later, same html2canvas limitation would apply).
- **Acomodo de mesas** (`invitados[].mesa?: string`, free text, editable per-family in the "Pases" tab listado): if set, shows as a small "Mesa" badge on that family's digital pase (`pase-mesa-bloque` in `templates.ts`, next to "Pases Reservados"); if empty, nothing renders — same accepted-gap pattern as everything else optional in this app. Deliberately **not** added to the bulk-paste importer (`parsearLineaInvitado`) — parsing "Familia Pérez, 4, Mesa 5" reliably alongside the existing formats risked breaking that regex for little benefit, since assigning tables is naturally a one-at-a-time admin task done after the guest list already exists, not at import time.
- Both fields got aliases in `KEY_MAP` (`eg`, and `m` inside the existing `invitados` sub-encoding) so they survive `encodeState`/`decodeState` and travel in shared guest links — unlike `estiloCajasSecciones` (the precedent this followed), which is **not** in `KEY_MAP` and so silently does NOT survive a shared link today. Not fixed here (out of scope), but real — flagged in case it causes a support question later.

### Telegram notifications to the admin (live since 2026-08-01)

Fully working end-to-end — confirmed live (a real "ping" reached the admin's Telegram):

- `api/notify-telegram.ts` is a Vercel serverless function. **Important:** it uses the classic Node handler signature `(req: IncomingMessage, res: ServerResponse)`, NOT the Web-standard `(request: Request) => Response` style used in `middleware.ts` — those are different execution contexts (Edge Middleware vs. Node serverless Function). Using the Request/Response signature here made the function hang forever with no response (confirmed live: GET/POST both timed out, Vercel eventually returned 504) because nothing ever called `res.end()`. If touching this file again, keep the `(req, res)` signature.
- It silently no-ops (returns 200) if `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` env vars aren't set in Vercel.
- `notificarAdminTelegram(mensaje: string)` (module-scope helper in `App.tsx`, right after `subirImagenPublica`) does a fire-and-forget `fetch("/api/notify-telegram", ...)`. Wired into three places: `IntakeForm`'s `handleEnviarAvisoPago` (cliente avisa pago), `IntakeForm`'s `handleEnviar` (cliente llena/guarda su formulario de datos), and `enviarRSVPWhatsApp()` in `templates.ts` (invitado confirma asistencia). Also used by the catalog's personalized demo flow.
- `vercel.json`'s catch-all rewrite to `/index.html` is narrowed to `/((?!api/).*)` so it doesn't shadow this API route.
- `middleware.ts`'s matcher excludes `/api/*` from the Basic Auth check (except `/api/admin/*`, added 2026-08-01 — see below) — **public API routes must stay excluded**, since anonymous visitors (guest RSVP, intake form, catalog demo) call this endpoint directly and never carry Basic Auth credentials. Without this exclusion the middleware returns 401 before the function ever runs (confirmed live — this was broken from when the feature first shipped until 2026-08-01).
- Bot: username `invitqmxbot` (created via @BotFather, first_name "Invitamxbot"). Token and chat_id are set as `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` in Vercel (production + preview).

### "Control de Acceso QR" — à la carte add-on, requires pases (added 2026-08-02)

$150 MXN flat (any package, not tiered like pases) — but **can only be sold on top of an invitación that already has "pases" active**, never standalone: without a curated `invitados` list there's no identity to check in against. Business rule enforced at the UI level, not the DB.

- **Two independent flags, different jobs.** `invitaciones.checkin_pagado` (new boolean column) is pure bookkeeping for the admin — same non-enforcing pattern as `pases_pagado`/`pdf_pagado`, doesn't gate anything by itself. What actually turns the feature on is `datos_completos.controlAccesoQR` (new field on `InvitacionDatos`, alias `cq` in `KEY_MAP`) — an editor-side toggle right below `SeccionesToggleList` (`App.tsx`) that's disabled unless "pases" is currently enabled, and gets baked into the guest link like every other editor setting the next time the invitación is generated/saved. Turning "pases" off auto-clears `controlAccesoQR` too (`toggleSeccion`), so it can't silently reappear if pases gets re-enabled later without the admin re-confirming.
- **No QR-scanning library was added — the QR is just a link.** Each pase (`mostrarPaseFijo()` in `templates.ts`) that has `controlAccesoQR` on renders an `<img>` whose `src` is `https://api.qrserver.com/v1/create-qr-code/?...&data=<checkin URL>` (free public QR-image service, zero new dependencies) — same "call an external service directly" pattern already used for Cloudinary/WhatsApp elsewhere in this app. Any phone's native camera can open that link directly; there's no in-app camera/decoding code to maintain or that can go stale across browsers.
- **The QR encodes a direct confirm URL, not a generic scanner:** `/?checkin=1&iid=<invitación id>&fam=<nombre de la familia>`. Opening it goes straight to a "¿Confirmar entrada de [familia]?" screen (`CheckinPage` in `App.tsx`, new public mode) — no separate scan-then-lookup step.
- **`CheckinPage` has two views off the same component**, both public (added to `middleware.ts`'s bypass list and `esVistaPublica`): with `&fam=` it's the single-family confirm screen (reads `datos_completos.invitados` + the `checkins` table by name, lets the door person enter how many people are arriving *right now* — not forced to match the assigned pase count, since families sometimes split up — and inserts a row); without `&fam=` it's a searchable list of every family with a live `X/Y pases registrados` counter, where tapping a row just navigates into the same `&fam=` confirm screen (no separate insert code path). Gated by checking `datos_completos.controlAccesoQR` via the anon key by `iid`, same risk-tier as the rest of this app's public-by-UUID links — shows "esta función no está disponible" if false or missing.
- **New table `checkins`** (`invitacion_id`, `invitado_nombre`, `personas_registradas`, `creado_en`) — intentionally allows multiple rows per family (partial arrivals) rather than one row updated in place. RLS is "allow all" (anon key writes directly, same model as `confirmaciones`), with a `rl_checkins` rate-limit trigger mirroring `rl_confirmaciones`'s pattern but with much higher thresholds (300/10min per invitación, 150/5min global) since a real event can have dozens of families arriving within the same short window — the existing `confirmaciones` thresholds (15/10min) would have been too tight for this use case.
- **Sending the link is 100% manual, no stored contact.** The admin generates the general check-in link from "Mis Invitaciones" (only shown once `checkin_pagado` is checked) and either copies it or types in a phone number on the spot to send via WhatsApp (`handleEnviarLinkCheckin`/`telefonoCheckinPorInvitacion` state) — deliberately **not** `row.telefono_whatsapp` (the client's own number), since the door person is usually someone else (an assistant, planner) and the client's number field shouldn't be repurposed for a different recipient.

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
- `npm run reset-admin-password` — generates a new random `ADMIN_PASSWORD`, uploads it to Vercel (production + preview), and redeploys. Pass `-- "MiContraseña123"` to set a specific password instead of a random one (rejects anything under 8 chars). Self-service recovery for the editor's Basic Auth login (added 2026-08-03) — `ADMIN_PASSWORD` is marked "sensitive" in Vercel, so once set it can never be viewed again (not even in the dashboard), only replaced. Requires the Vercel CLI already logged in (`npx vercel login`).

There is no test suite in this repo.

## Architecture

The app is almost entirely contained in five files under `src/`:

- `src/types.ts` — the core data shapes: `InvitacionDatos` (all invitation content: event details, ceremony/reception, itinerary, guest list, photos, theme, package, etc.), `PaqueteConfig`, `TemaConfig`.
- `src/data.ts` — static content: the 3 `paquetes` (basico/premium/deluxe — each defines which sections are enabled and max photo count), the `temas` array (14 visual themes, each with its own font/color/gradient/custom CSS), placeholder photo sets per theme (`fotosFicticiasDefault` / `getFotosPorTema`), and `datosDefault` (default invitation data per package, used as the diffing baseline for URL state — see below).
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
- `vercel.json`'s `headers` sets a `Content-Security-Policy: frame-ancestors ...` allow-listing `invitacionmx-catalogo.vercel.app`, `invitacionmx-landing.vercel.app`/`invitamx.online`/`invitamx.app` (agregado 2026-11-20, el dominio nuevo de la landing -- `invitamx.online` se deja en la lista a propósito, sigue redirigiendo ahí hasta junio de 2027, no se quita), and localhost dev ports — inherited from the same fork; revisit if this app's catalog needs to be embedded elsewhere.

### Adding a new theme

A theme requires: an entry in `temas` in `data.ts` (colors, fonts, `customStyle` CSS, `decorativeEmoji`), a matching case in `getColorSugeridoPorTema` in `App.tsx` if it needs specific suggested dress colors, and ideally an entry in `fotosFicticiasDefault` in `data.ts` for catalog/placeholder photos. Themes with special opening-animation styling are special-cased by id inside `generarHTMLFinal` in `templates.ts` (e.g. the envelope-opening animation is only used for a specific list of theme ids).

### Adding/removing a section

Sections (e.g. `ceremonia`, `galeria`, `regalos`) are plain string ids listed per-package in `paquetes[...].secciones` in `data.ts`, human-labeled in `NOMBRES_SECCIONES` in `App.tsx`, individually toggleable per-invitation via `seccionesExcluidas`. Each section's HTML is a standalone `const xSeccionHTML = isSectionActive("x") ? \`...\` : "";` in `generarHTMLFinal` (`templates.ts`) — a new section needs one of these plus a matching entry in the `SECCIONES_CONTENIDO_HTML` map right below them.

### Section order

`"apertura"` (opening screen) and `"cierre"` (closing footer) always render first/last. The other 14 "content" sections render in a per-invitation order: `datos.ordenSecciones` (an array of section ids) if set, else each package's default order from `paquetes[...].secciones`. `getOrdenSeccionesEfectivo(paquete, ordenSecciones)` in `data.ts` is the single source of truth for this — it validates the stored order against whatever sections the current package actually has (dropping ones no longer available, appending any missing ones at the end) — and is used both by the editor's reorder UI (`SeccionesToggleList`'s ↑/↓ buttons, `moverSeccion` in `App.tsx`) and by `generarHTMLFinal` when joining `SECCIONES_CONTENIDO_HTML` into the final output. Always go through this helper rather than reading `ordenSecciones` directly — package switches and stale/missing entries are exactly what it's meant to handle safely.

## Business/pricing policy (2026-07-27, precios/nombres rediseñados 2026-11-18)

- **2026-11-18 — rediseño de precios y nombres, auditado end-to-end** tras un pedido explícito del usuario ("yo veo por ejemplo los precios no se cambiaron... audita que de verdad todo coincida para que tampoco los colaboradores se confundan"): la landing (`invitacionmx-landing`) ya había cambiado a la nueva estructura en un encargo anterior, pero este repo (el generador real) se había quedado con los nombres/precios viejos. Las llaves internas de `paquetes`/`datosDefault` en `data.ts` **NO cambiaron** (siguen siendo `"basico"`/`"premium"`/`"deluxe"`, a propósito, para no romper invitaciones ya guardadas en Supabase) — solo cambió lo que se MUESTRA:
  - `basico` → se muestra como **"Básico" $299 MXN** (antes $499).
  - `premium` → se muestra como **"Estándar" $499 MXN** (antes "Premium" $799).
  - `deluxe` → se muestra como **"Premium" $799 MXN** (antes "Deluxe" $1,199–1,499).
  - La estructura de secciones por default YA estaba correcta desde un fix anterior (`datosDefault.basico.seccionesExcluidas = ["pases","familia","regalos"]`, `.premium` solo `["pases"]`, `.deluxe` ninguna) -- lo único que hacía falta corregir ahí era `SECCIONES_EXCLUSIVAS_PREMIUM` en `App.tsx` (usado al CAMBIAR el paquete de una invitación ya existente, no al crear una nueva), que todavía incluía `hashtag`/`calendario` como exclusivas -- se redujo a solo `["familia","regalos"]`.
  - Textos de la UI corregidos (ya no dicen "Deluxe" ni "Premium/Deluxe"): el tooltip del botón de PDF, el badge "Exclusiva Estándar/Premium" de las secciones condicionadas.
  - `ventas/plantillas-whatsapp.txt` (el script que SÍ copian los colaboradores para vender), `docs/guia-de-uso.md` y `public/manual.html` (el manual servido en `/manual.html`) -- las 3 reescritas con la estructura/precios nuevos. `ventas/campana-anuncios.txt`/`campana-12-temas.txt`/`anuncios-2026-08-02-avatar-quinceanera.txt` (material de campañas de anuncios, menos "vivo" que el script de WhatsApp) también actualizados -- precios viejos vueltos a `$299`/nombres nuevos, conteo de temas a 14. `ventas/registro-anuncios.txt` (bitácora histórica de anuncios ya corridos) deliberadamente NO se tocó -- es un registro de qué se llamaba cómo en el momento en que ese anuncio corrió, reescribirlo falsearía el historial.
- **Turning sections off per invitation (`seccionesExcluidas` / the "Personalizar Secciones Habilitadas" toggles) does NOT warrant a discount.** Sections have no marginal cost — they're just content blocks. What's actually paid for per package tier is the resources: `maxFotos`, the "pases" (per-guest ticket count) feature, the PDF download, and the package-exclusive sections (familia, regalos in Estándar/Premium — hashtag/calendario moved to Básico 2026-11-18, see above). A client asking to hide sections to simplify their design should be accommodated at full package price — this already happened once (a client got the full package with several sections hidden, still charged full price) and is the correct call, not a one-off exception.
- **Package tiers as of 2026-11-18:** Básico $299 MXN (4 fotos, 13 secciones), Estándar $499 MXN (8 fotos, 15 secciones — internal key `premium`), Premium $799 MXN (14 fotos, 16 secciones, pases+PDF incluidos — internal key `deluxe`). Section-count split is a deliberate value ladder (see the InvitaMX brief this redesign came from, 2026-11-18): calendar+hashtag are zero-marginal-cost so they went to Básico to make the entry tier feel complete; familia/padrinos (emotional value) + mesa de regalos (monetary value) are Estándar's hook; pases (real per-family admin labor) close the ladder at Premium.
- **Estándar vs. Premium differentiation (addressed 2026-07-31, renamed from "Premium vs. Deluxe" 2026-11-18):** Estándar and Premium still have identical `secciones` lists in `data.ts` on purpose — `maxFotos` is the structural difference, and "pases"/PDF being included-vs-à-la-carte is a *pricing* distinction, not a features-available one (both packages can technically use either). What was actually missing was the policy being visible anywhere in the editor: added pricing badges next to the "pases" toggle (`POLITICA_PASES` in `App.tsx`) and the PDF download button, so the admin sees "Incluido sin costo" vs "A la carte +$X MXN" per the current package — informational only, doesn't gate anything.
- **Pases personalizados — pricing policy (2026-07-27, precios sin cambio en el rediseño de 2026-11-18):** the real marginal cost of this feature isn't technical (fixed by the privacy patch below — no more URL-length ceiling), it's the admin's manual time: each personalized pass means adding the guest to the tool and individually generating+sending their link over WhatsApp. Policy:
  - **Premium (internal key `deluxe`):** pases included at no extra charge, up to **40 familias**. Beyond that, +$20 MXN per additional familia (unificado a un monto fijo en el rediseño 2026-11-18, antes era un rango "+$15–20").
  - **Estándar (internal key `premium`):** not included by default; à la carte add-on **+$180 MXN**, covers up to 20 familias, then +$20 MXN each beyond that.
  - **Básico:** not included by default; à la carte add-on **+$150 MXN**, covers up to 10 familias, then +$20 MXN each beyond that.
  - Toggling sections off (see the rule above) still never gets a discount — this policy is specifically about the pases feature's per-family cost, a separate axis from section visibility.
- **Control de Acceso QR — pricing policy (2026-08-02):** flat **+$150 MXN regardless of package**, always on top of whatever pases already costs (pases is required, sold separately or free on Premium) — never a standalone purchase, since without pases there's no per-family list to check in against. Priced flat unlike pases because the marginal admin cost is near-zero (the QR is generated automatically alongside the rest of the link, no per-family manual work) — the price reflects the feature's value (professional door control, fewer gate-crashers), not admin time.
- **Payment, delivery, and post-delivery policy (2026-07-28, aclarado 2026-11-18):**
  - **Deposit:** 50% up front to reserve the client's date and produce the final version (NOT "to start the design" — the free sample is what the client already saw before paying anything; the deposit is specifically to lock the date and produce the final, delivered link).
  - **Turnaround:** 24–48 hours after receiving all the client's data (photos, text, dates, etc.) — faster than the ~72h competitors advertise, worth using as a selling point.
  - **Free sample:** 5 days valid (bajado de 7 días en el rediseño 2026-11-18), sin anticipo.
  - **Post-delivery edits:** first 2 rounds of adjustments are free within 7 days of delivery; after that window or after 2 rounds, each additional edit costs a flat **$99 MXN** (unificado a precio fijo 2026-11-18, antes era un rango "$99–150").
  - These numbers are also baked into `ventas/plantillas-whatsapp.txt` (objection-handling templates) — if any of them change, update both places.

## Lista de funcionalidades para copy de venta / landing page (2026-07-31, revisada 2026-11-02)

Referencia rápida de TODO lo que el producto hace hoy, para escribir/actualizar copy en `invitacionmx-landing` u otro material de venta sin tener que releer el código. Organizado por lo que le importa a quien compra (la familia de la quinceañera), no por arquitectura técnica.

### La invitación digital en sí (lo que ve el invitado)

- **Ya no es solo para XV años (agregado 2026-11-19)**: el mismo generador (mismos temas, paquetes, precios y secciones) también sirve para Boda, Cumpleaños, Bautizo, Primera Comunión, Graduación, Baby Shower y Aniversario — solo cambian las palabras que ve el invitado (portada, apertura, etc.), nunca el diseño ni el precio. Ángulo de venta nuevo: el mismo catálogo de temas y paquetes ya no limita la oferta a un solo tipo de evento — **nota importante**: la landing (`invitacionmx-landing`) y el catálogo (`invitacionmx-catalogo`) siguen hablando exclusivamente de XV años (no se tocaron en este cambio, es trabajo aparte si se decide ofrecer esto públicamente) — este punto es sobre todo útil para ventas directas/a la medida por ahora.
- **14 temas de diseño listos** (confirmado contra `src/data.ts` el 2026-11-17), cada uno con tipografía, paleta y decoración propia: Dorado Clásico, Vuelo de Mariposas, Floral Acuarela, Místico Celestial (tema noche), Eucalipto Botánico, Glam Rose Oro, Rustique Boho Chic, Princesa Elegante (gala), Mármol & Oro Geométrico, Ciber Cyber Neon (glow), XV Coquette Listones Rose, XV Coquette Luxe, Aurora Boreal, Vino Elegante (clásico, rojo/vino). Buen ángulo: "hay un diseño para cada estilo de quinceañera, del clásico elegante al neón moderno".
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
- **Pases de entrada personalizados por invitado/familia** — cada familia puede tener su propio link con su nombre y número de pases asignados (control de quién entra). Incluido sin costo en Premium hasta 40 familias; complemento en Básico (+$150 MXN, hasta 10 familias) y Estándar (+$180 MXN, hasta 20 familias); +$20 MXN por familia extra arriba de esos topes en cualquier paquete.
- **Acomodo de mesas** — el admin puede asignarle una mesa (texto libre) a cada familia desde la lista de pases; si se asignó, el pase digital del invitado la muestra junto al número de pases.
- **Control de Acceso QR** (complemento à la carte, +$150 MXN, requiere tener pases contratado): cada pase trae un código QR — quien esté en la puerta lo escanea con la cámara normal de su celular y confirma la entrada de esa familia al instante, sin listas en papel.
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
- **3 paquetes según necesidad y presupuesto**: Básico $299 MXN (4 fotos, 13 secciones), Estándar $499 MXN (8 fotos, 15 secciones — agrega padres/padrinos y mesa de regalos), Premium $799 MXN (14 fotos, 16 secciones, pases y PDF incluidos sin costo extra) — precio confirmado flat contra `src/data.ts` y el manual de usuario, no un rango. Estructura vigente desde el rediseño de precios 2026-11-18 (antes: Básico $499/Premium $799/Deluxe $1,199 — mismos paquetes, nombres y precios distintos, ver "Business/pricing policy" arriba).
- **Pases personalizados por familia** disponibles en cualquier paquete (incluidos en Premium, complemento pagado en Básico/Estándar) — útil para bodas/XV con lista de invitados controlada.

### Lo que NO se debe prometer en copy (para no generar expectativas falsas)

- No hay pasarela de pago en línea (el cliente no "compra solo" con tarjeta en un carrito) — el proceso de venta y cobro sigue siendo manual (WhatsApp, transferencia, o un link de pago que genera el administrador a mano en Mercado Pago/PayPal).
- No hay una "app" descargable ni notificaciones push — todo es un link web.
- El envío de RSVP depende de que el invitado tenga WhatsApp; no hay confirmación por SMS/email.

Cuando el código cambie de forma que afecte esta lista (nueva sección, nuevo tema, cambio de paquete/precio), actualizar esta sección también.
