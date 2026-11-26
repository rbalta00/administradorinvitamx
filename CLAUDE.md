# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vista previa y demo en vivo con forma de celular real (2026-11-26, v5 del catálogo)

- Seguimiento directo de la v4 (2026-11-25, commit `4066a3d`): esa versión ya corrigió la proporción
  del marco de la tarjeta (210×456) y la escala de la portada por el lado que más aprieta, pero
  verificando en vivo contra el sitio real quedaron 2 defectos reales sin cerrar, diagnosticados
  por el propio usuario antes de escribir el prompt: (1) dentro de la tarjeta, la portada no
  llenaba el ancho del marco en los temas SIN foto de fondo completa (Dorado Clásico, Mármol &
  Oro, Floral Acuarela, Boho Chic...) -- quedaban bandas blancas verticales a los lados, y
  además la portada se recortaba por abajo con una barra de scroll interna (la altura se medía
  una sola vez, demasiado pronto: cuando `readyState` dejaba de ser `"loading"`, antes de que
  Tailwind/fuentes/foto terminaran de acomodar el documento). (2) "Ver Demo en Vivo" seguía
  cargando la invitación completa dentro de un iframe ANCHO de escritorio (~1,240px) -- la
  invitación quedaba como una columna angosta de ~490px flotando en medio de fondo vacío, nada
  parecido a cómo la vería la clienta real en su celular.
- **Punto B -- portada sin bandas blancas (`src/templates.ts`, SOLO dentro de `soloPortada`)**:
  antes solo el `<section data-section="portada">` llevaba el fondo/gradiente del tema -- `body`
  se quedaba blanco por default para cualquier tema que no usara el estilo "fondo" (foto de fondo
  completa). Se agregó un bloque CSS nuevo, activo solo cuando `soloPortada` es `true`, que fuerza
  `html,body{width:100%}` y pone en `body` el mismo fondo que tendría la portada (la foto principal
  con `cover`/`center 20%` para el estilo "fondo", o `tema.bgGradient` para el resto) -- a sangre
  completa, sin depender de que el `<section>` coincida exactamente con el ancho real del iframe.
  De paso, `<main>` deja de llevar `max-w-[480px] mx-auto` en este modo (pasa a `w-full`): la
  columna de contenido ya no puede quedar más angosta que el viewport virtual de 354px. Ninguno
  de los dos cambios toca el HTML cuando `soloPortada` es `false` (invitaciones reales, "Ver Demo
  en Vivo", exportar PDF) -- confirmado que `max-w-[480px] mx-auto` sigue intacto ahí.
- **Punto C -- medición del alto real, sin corte ni scroll (`src/App.tsx`, `LazyIframe`)**: la
  medición de `altoPortada` se separó en su propio efecto, disparado por el evento `load` del
  iframe (no por polling de `readyState`) -- al cargar, mide, espera `document.fonts.ready` del
  documento del iframe y vuelve a medir, y mide otra vez a los 300ms y a los 900ms; se conserva
  siempre la medición MAYOR de todas (el contenido de un tema solo puede crecer al terminar de
  acomodarse, nunca achicarse). El efecto que libera el turno de la cola de compilación de
  Tailwind se dejó intacto, sin esperar a fuentes/imagen (seguiría bloqueando la cola de las
  demás tarjetas sin necesidad). El `<iframe>` de la previa ahora lleva `scrolling="no"` y
  `overflow:hidden` en su propio estilo, y el `<body>` del HTML `soloPortada` lleva
  `overflow:hidden` -- nunca debe verse una barra de scroll dentro de la previa.
- **Punto A -- "Ver Demo en Vivo" dentro de un marco de celular (`src/App.tsx`)**: el `<div
  className="w-full h-[calc(100vh-260px)] ...">` que envolvía al iframe ancho se reemplazó por un
  marco de celular centrado (gemelo del de las tarjetas del catálogo: fondo `slate-100`, borde
  `slate-300`, esquinas redondeadas, muesca/isla dinámica superior) de hasta 400px de ancho y
  `min(86vh, 820px)` de alto. El iframe de `DemoEnVivoConCarga` llena el 100% del marco (ancho y
  alto) -- dentro, la invitación se renderiza nativamente a ancho de celular (~384px reales, sin
  columna angosta flotando en fondo vacío), y la portada (`min-h-[92vh]`, SIN TOCAR -- nunca pasa
  `soloPortada`) ocupa exactamente una pantalla del marco. En viewports de menos de 480px
  (`max-[480px]:...`, confirmado que Tailwind lo compila como un único `@media not all and
  (min-width:480px)`) el marco pierde borde/relleno/sombra/esquinas y el iframe pasa a ocupar
  100% del ancho con `82vh` de alto. Los controles (nombre/fecha, paquete, estilo de cajón) siguen
  FUERA y ENCIMA del marco, sin cambios -- ya estaban estructuralmente separados del contenedor
  del iframe. `templates.ts` NO se tocó para este caso: la invitación completa, con sus
  proporciones reales, nunca pasa `soloPortada`.
- **Verificado en vivo** (build + `npx serve` local, Chrome): las 14 tarjetas del catálogo
  (incluyendo Dorado Clásico, Mármol & Oro, Floral Acuarela, Boho Chic, Celestial, Neón, Coquette
  Pink, Coquette Luxe, Aurora Boreal, Vino Elegante) muestran la portada completa, sin bandas
  blancas, sin scroll ni corte inferior -- el texto/fecha final de cada portada es visible dentro
  del marco. "Ver Demo en Vivo" de Mármol & Oro confirmado por DOM (`getBoundingClientRect`) y
  visualmente: marco de celular centrado con notch, iframe interior renderizando la invitación a
  ~384px de ancho real (sin laterales vacíos), controles visibles arriba. CSS del `@media
  (max-width:480px)` confirmado compilado en `dist/assets/index-*.css` con las 7 reglas
  esperadas. `npx tsc --noEmit`/`npm run build` limpios (los mismos 6 errores preexistentes de
  `ImportMeta.env`, cero nuevos).

## Temas completos: itinerario por tema, 2 tipografías y 2 nombres/descripciones (2026-11-25, v1)

El usuario revisó los 14 temas completos (textos/tipografía/colores/nombres/descripciones) contra
el código real -- confirmado que colores y la mayoría de tipografías ya combinan bien, pero las 14
demos del catálogo compartían UN solo itinerario (el de `datosDefault.deluxe`, "Alfombra Azul de
Bienvenida"/"Banquete Imperial de Gala") que en realidad es el de Princesa Elegante -- una demo
Coquette rosa o Boho hablaba de alfombras azules y banquetes imperiales, sin combinar con su tema.

- **`ITINERARIO_POR_TEMA`** (nuevo, exportado en `data.ts`, junto al arreglo `temas`): un
  itinerario propio por cada uno de los 14 temas (mismas horas 18:00/20:30/21:00/22:00/23:00/23:30
  para todos, solo cambian los nombres de los momentos) + `personalizado`. **`princesa-elegante`
  NO tiene entrada a propósito** -- su itinerario de siempre YA es el compartido de
  `datosDefault.deluxe` (es, literalmente, de dónde salió ese default), así que cae solo al
  fallback existente sin duplicarlo. Conectado en `getDatosCatalogTema` (`App.tsx`), SOLO para
  `evento === "xv"` -- los itinerarios por evento (boda, cumpleaños...) que ya existían no se
  tocaron.
- **Código de vestimenta propio, solo 2 temas**: `VESTIMENTA_DEMO_CATALOGO_POR_TEMA` (`App.tsx`,
  junto a `NOMBRE_DEMO_CATALOGO_POR_EVENTO`) -- Neón ("Fiesta Neón — Casual Elegante con un Toque
  Neón") y Boho Chic ("Boho Chic — Vestido Fluido, Tonos Tierra y Flores"); los otros 12 temas
  conservan el `dressCode` default de `datosDefault.deluxe` ("Etiqueta Rigurosa / Black Tie..."),
  que sí les combina.
- **2 tipografías cursivas** (`data.ts`, campo `fontCursive`): Celestial `Monsieur La Doulaise` →
  `Great Vibes` (la fina casi no se leía sobre su fondo oscuro); Mármol & Oro `Sacramento` →
  `Pinyon Script` (no combinaba con su lujo art déco, de tipografía de encabezado `Syne`). Neón
  conserva `Sacramento` a propósito (imita el tubo de neón). Ambas fuentes ya estaban registradas
  en `FONT_URL_SEGMENTS` (`templates.ts`) -- sin carga nueva de Google Fonts.
- **Bug real encontrado y corregido durante la propia verificación, no reportado por el usuario**:
  cambiar `fontCursive` en el campo del tema NO bastaba -- tanto Celestial como Mármol & Oro tienen
  un `customStyle` (bloque de CSS crudo, por tema) con una regla `.cursive-text { font-family:
  '...' }` que trae la fuente vieja **hardcodeada**, pisando el campo `fontCursive` por
  especificidad/orden de cascada. Confirmado en vivo ("Ver Demo en Vivo", `getComputedStyle` real
  sobre el `<h1>` del nombre): con solo el campo cambiado, el nombre seguía rindiendo en la fuente
  vieja -- corregido actualizando también esas 2 reglas `.cursive-text` dentro de `customStyle`.
- **2 nombres pulidos** (`data.ts`, campo `nombre`, los `id` NO cambian): Neón
  "Ciber Cyber Neon ⚡ (Glow)" → "Cyber Neón ⚡" (decía lo mismo dos veces); Mármol & Oro
  "Mármol & Oro Geométrico 📐" → "Mármol & Oro ✨" (el emoji de escuadra abarataba el tema y
  "Geométrico" ya no describe su fondo de mármol blanco suave); Coquette Listones Rose
  "XV Coquette Listones Rose 🎀 (Glam & Sparkle)" → "XV Coquette Listones Rose 🎀" (quita el
  paréntesis repetitivo).
- **2 descripciones del catálogo** (`App.tsx`, bloque `descripcion` de las tarjetas): Neón
  "amarillo-bizarro" → "amarillo lima" (falso amigo); Mármol & Oro "costuras de oro pulido" →
  "vetas de oro pulido".
- **Verificado en vivo** (`npm run build` + `npx serve dist/`, Claude in Chrome, clics reales en
  "Ver Demo en Vivo" + lectura del DOM del iframe resultante vía JS, no solo revisión de código):
  Mármol & Oro y Celestial confirmados en `Pinyon Script`/`Great Vibes` real
  (`getComputedStyle(...).fontFamily`) con sus itinerarios correctos; Neón y Boho Chic con su
  itinerario Y su código de vestimenta propios; Princesa Elegante confirmada SIN cambios ("Alfombra
  Azul de Bienvenida..." intacta); Coquette Luxe con su itinerario rosa/oro propio; los 3 nombres
  nuevos ("Mármol & Oro ✨"/"Cyber Neón ⚡"/"XV Coquette Listones Rose 🎀") confirmados en las
  tarjetas del catálogo.
- `npm run lint`/`npm run build` limpios (mismos 6 errores preexistentes, cero nuevos). No se tocó
  ningún color, fondo, otra tipografía, otra descripción, `datosDefault`, los itinerarios por
  evento ya existentes (boda/cumpleaños), ni ninguna invitación real/muestra (el campo `itinerario`
  que cada clienta escribe en su propia invitación nunca pasa por `getDatosCatalogTema`, que es
  exclusivo de la demo del catálogo).

## Previa: maqueta de celular real, portada completa y foto fija (2026-11-25, v4 del catálogo)

Seguimiento directo de la entrada de abajo (v2, commit `65f630b`, mismo día). El usuario probó esa
versión y encontró dos cosas reales, confirmadas en código antes de tocar nada: (1) el v2 agrandó
la maqueta a 196×560 (alargada, ~2.8:1) para que la portada completa cupiera -- resolvió el
recorte, pero la maqueta ya no se parece a un celular; (2) la foto de portada de la previa/demo
del catálogo se elegía al azar (`Math.random()`) del pool de fotos del tema -- a veces salía la
festejada, a veces un salón vacío o un detalle suelto, malo para vender.

- **La maqueta vuelve a proporción real de celular (9:19.5, ~210×456px) y es la PORTADA la que se
  escala para caber entera** -- nunca al revés. `LazyIframe` (`App.tsx`) ahora mide
  `body.scrollHeight` real de cada demo (una vez, tras cargar) y calcula
  `escala = min(anchoInterior/354, altoInterior/altoReal)`, centrando el iframe escalado dentro
  del marco (`offsetX`/`offsetY`) -- el lado que más aprieta decide la escala; el otro lado queda
  con un margen parejo a los costados o arriba/abajo (nunca recorta, nunca estira el marco).
- **`min-h-[92vh]` se quita SOLO en modo `soloPortada`** (`templates.ts`, `claseMinAlturaPortada`):
  sin esto, los temas "fondo" (celestial/neon/aurora-boreal/vino-elegante/glam-rose, cuyo
  contenido compacto es corto) se forzaban a estirarse hasta el 92% de un iframe artificialmente
  alto (necesario para que quepan los temas con foto, hasta 992px) -- reintroduciendo huecos
  grandes específicamente en esos 5 temas dentro de la previa. Sin el piso, la altura real de cada
  uno es siempre la de su propio contenido, sin importar qué tan alto se declare el iframe. Las
  invitaciones reales y "Ver Demo en Vivo" conservan `min-h-[92vh]` intacto (confirmado por JS:
  `portada.className` en el editor real sigue trayendo `min-h-[92vh]`).
- **Foto de portada fija, no aleatoria**: `getDatosCatalogTema` (`App.tsx`) usaba
  `fotosTema[Math.floor(Math.random() * fotosTema.length)]`; ahora es siempre `fotosTema[0]` (el
  retrato principal del pool, confirmado por convención ya documentada en este mismo archivo --
  "la primera es la de cuerpo completo en jardín"). Misma foto en cada carga, en la previa y en el
  demo completo.
- **Verificado en vivo** (`npm run build` + `npx serve dist/`, Claude in Chrome): las 14 previas
  muestran la MISMA foto de Luna Isabella (recargado el catálogo completo, confirmado visualmente
  card por card -- nunca un salón vacío); el marco de cada tarjeta se ve proporcionado como un
  celular real, no alargado; Mármol & Oro (el tema más alto, 992px medido) cabe completo -- título,
  nombre, foto, fecha -- sin scroll interno, con letterboxing lateral (el que más aprieta ahí es el
  alto); los temas "fondo" (Místico Celestial, Glam Rose Oro) se ven compactos, sin huecos, con su
  foto de fondo llenando la mayor parte de la pantalla como están diseñados. Una invitación real
  (fuera del catálogo) confirmada con `min-h-[92vh]` intacto en su `data-section="portada"`.
- `npm run lint`/`npm run build` limpios (mismos 6 errores preexistentes, cero nuevos).
- **Pendiente de la misma conversación, no parte de este commit**: un prompt nuevo del usuario
  sobre itinerarios por tema (hoy las 14 demos comparten el itinerario de Princesa Elegante,
  "Alfombra Azul...", que no combina con los otros 13) + 2 tipografías cursivas a corregir
  (Celestial, Mármol) + 2 nombres/descripciones a pulir (Neón, Mármol) -- se implementa en la
  entrada siguiente de este mismo archivo (o revisar `git log` si ya se hizo).

## Portada sin huecos, foto sin cortes y previa completa (2026-11-25, v2 del catálogo)

Seguimiento directo de la entrada de abajo (v1, commit `b7632b5`, mismo día). Al abrir un demo en
pantalla grande (desktop/landing) la portada se veía "desconfigurada" -- pantallas enteras de
fondo vacío entre el título y el nombre/foto, y otra antes de la fecha. Diagnóstico de Muse,
confirmado en código: la sección de portada (`src/templates.ts`) es `min-h-[92vh] flex flex-col
justify-between` -- en un celular (donde el contenido casi llena 92vh) se ve bien, pero en un
iframe más alto (escritorio) `justify-between` reparte sus 3 bloques a lo largo de TODA esa
altura, dejando huecos enormes entre ellos. El contenido estaba completo, era un problema de
espaciado, no de datos.

- **Portada compacta a cualquier altura**: en las 2 variantes de portada (`fondo` y marco/arco/
  circular), `justify-between` → `justify-center` (el GRUPO de 3 bloques se centra como una sola
  unidad dentro de `min-h-[92vh]`, en vez de estirarse) y se quitó `my-auto` del bloque de
  nombre/foto (era lo que lo empujaba a usar TODO el espacio libre disponible, la causa real de
  los huecos). En celular, donde casi no sobra espacio, se ve igual que antes; en escritorio, los
  3 bloques quedan agrupados y legibles sin importar cuánto más alta sea la ventana. Verificado en
  vivo en el "Monitor de Invitación" (editor) en modo Escritorio con la invitación real "Emma
  Elizabeth": título → nombre → foto → fecha, todo junto, sin ningún hueco, y la sección de
  "cuenta regresiva" arranca justo después sin aire de más.
- **Foto de portada sin cortar cabezas**: los 3 `<img>` de `fotoPrincipalPortadaHTML` (arco/marco/
  circular) y el `background-position` de la variante `fondo` pasan de `center`/`object-cover` a
  `object-[center_20%]`/`background-position: center 20%` -- sesgo hacia arriba para no comerse
  la cabeza cuando el rostro está cerca del borde superior. Verificado con la foto real de Emma
  Elizabeth (arco, Vuelo de Mariposas) y con varias fotos del catálogo (Dorado Clásico, Mármol &
  Oro): cabeza completa visible en todas.
- **Previa del catálogo con la portada completa**: medido en vivo `body.scrollHeight` de los 14
  temas en modo `soloPortada` (con la portada ya compacta) -- el más alto (Mármol & Oro) llega a
  992px. El iframe de `LazyIframe` (`App.tsx`) sube su alto virtual de 630 a 1050px (margen sobre
  el máximo medido); la escala se deja igual (0.5226, calculada por el ANCHO para llenar la
  pantalla) y es la maqueta la que crece para que quepa entera: de 196×340px a 196×560px
  (contenedor de cabecera de `h-[400px]` a `h-[620px]`). Verificado en vivo: los 14 temas muestran
  la portada completa -- hasta la tarjeta de fecha -- sin ningún scroll interno visible.
- **Nombre de espécimen unificado**: "Título Principal" de las tarjetas pasó de "Sofía Valeria" a
  "Luna Isabella" (igual que el resto de la demo).
- **Legibilidad sobre fondos con imagen/flores**: la variante "fondo" ya tenía sombra de texto
  fuerte (sin cambios). A la variante marco/arco/circular (la que usan Floral Acuarela y Vuelo de
  Mariposas, los temas señalados) se le agregó `text-shadow` suave (`${tema.colors.dark}` con
  alpha hex bajo, `33`/`40`) al título del evento y al nombre, sin tocar colores ni tipografías.
  Verificado visualmente en Floral Acuarela: "MIS XV AÑOS" y "Luna Isabella" se leen bien sobre el
  fondo floral.
- **Build limpio** (mismos 6 errores preexistentes de `ImportMeta.env`/`unknown`, cero nuevos).
  Sin tocar ninguna sección fuera de la portada, ningún dato de las demos, ni los modos por evento
  del catálogo (xv/boda/cumpleaños, re-verificados en modo boda: el ajuste es genérico, no
  depende del tipo de evento).

## Catálogo: vista previa legible y carga rápida (2026-11-25, v1)

Pedido de Isaac tras ver una captura del catálogo (`?catalog=true`): las 14 previas se veían
diminutas/ilegibles y el catálogo cargaba lento. Diagnóstico de Muse (verificado en código antes
de tocar nada): cada tarjeta montaba un iframe VIVO con la invitación COMPLETA (16 secciones,
galería de 8 fotos a tamaño completo, Tailwind CDN JIT ~3s por iframe), escalada a 0.404 dentro
de una maqueta de celular de 154×262px -- se aplastaba toda la invitación (no solo la portada) en
un espacio minúsculo, y las últimas tarjetas esperaban decenas de segundos en la cola.

- **`generarHTMLFinal` gana una opción nueva `soloPortada`** (`templates.ts`) -- cuando está
  activa, `isSectionActive` solo deja pasar "portada" (ninguna otra sección, sin importar paquete/
  `seccionesExcluidas` reales de la demo) y las URLs de Cloudinary del fondo del tema
  (`fondoEfectivo`) y la foto de portada (`urlFotoPrincipalPortada`) se aligeran con
  `w_700,q_auto,f_auto` insertado tras `/upload/` (`aligerarUrlCloudinaria`, nueva -- si la URL no
  es de Cloudinary se deja intacta, nunca se inventa una URL rota). **Solo la usa `LazyIframe`**
  (la previa chica del grid, `App.tsx`) -- "Ver Demo en Vivo" (la invitación completa e
  interactiva, con sus controles de paquete/estilo de cajón) sigue con `esDemoDeCatalogo: true` a
  secas, sin `soloPortada`, y las invitaciones reales (`/v/<codigo>`) y el preview del editor
  tampoco la reciben nunca.
- **`LazyIframe` reescrita**: el temporizador de montaje (`setTimeout(150 + index*80)`, pedía
  turno para TODAS las tarjetas aunque no estuvieran a la vista) se reemplazó por un
  `IntersectionObserver` (`rootMargin: "400px"`) que solo pide turno cuando la tarjeta está por
  entrar a pantalla -- el orden real de carga ahora lo decide el scroll del usuario, no el índice
  de la tarjeta. `MAX_PREVIEWS_CATALOGO_SIMULTANEAS` subido de 1 a 2 (con la previa ahora mucho
  más ligera, Tailwind ya no compite tanto por el hilo principal -- probado en vivo con 2 sin que
  se repita el "renderer frozen" documentado cuando se intentó antes con la invitación completa).
- **Maqueta del celular agrandada**: de 154×262px a 196×340px (contenedor de cabecera de
  `h-80`/320px a `h-[400px]`), iframe real 354×630px con `scale(0.5226)` (antes 354×642 a 0.404)
  -- con solo la portada renderizada (mucho más corta que la invitación completa), el mismo
  tamaño de maqueta más grande ya muestra el nombre/fecha perfectamente legibles, sin aplastar
  nada extra.
- **"Ver Demo en Vivo" con indicador de carga**: componente nuevo `DemoEnVivoConCarga` (mismo
  criterio de `readyState` que ya usaba la cola de previas) muestra "Cargando tu demo…" con
  spinner mientras el iframe termina de parsear, luego se ve la invitación completa de siempre --
  el contenido/controles (paquete, estilo de cajón, WhatsApp) no cambiaron en nada.
- **Descripciones únicas**: 4 temas caían en el genérico "Un diseño lujoso y resplandeciente." sin
  tener la suya propia -- coquette-pink/coquette-luxe (el par que reportó el usuario, idénticas
  entre sí) y, encontrados en la misma auditoría del if/else de descripciones (no reportados
  explícitamente, pero el pedido decía "verificar que ningún otro tema quede con el texto genérico
  repetido"), aurora-boreal y vino-elegante. Los 14 temas ya tienen descripción propia.
- **Verificado en vivo** (`npm run build` + `npx serve dist/`, Claude in Chrome): en modo XV y en
  modo boda (`?catalog=true&evento=boda`) las previas cargan en cascada conforme se hace scroll
  (confirmado con `IntersectionObserver` real, no solo leído en código), muestran el nombre/fecha
  legibles en la maqueta grande, y se confirmó por JS (`iframe.contentDocument`) que cada previa
  trae `secciones: ["portada"]` exacto (nada de galería/confirmación/etc.) y que la imagen de
  portada SÍ trae `w_700,q_auto,f_auto` en la URL. El preview real del editor (`esVistaPreviaEditor`,
  invitación real "Emma Elizabeth", sin ningún parámetro de catálogo) se confirmó con las 14
  secciones completas y las imágenes SIN ninguna transformación agregada -- idéntico a como se veía
  antes de este cambio. "Ver Demo en Vivo" confirmado con las 14 secciones completas (el paquete
  Estándar de la demo excluye "pases" correctamente, comportamiento preexistente sin tocar). Las 4
  descripciones nuevas confirmadas visualmente, ya no repiten el texto genérico entre sí.
- `npm run lint`/`npm run build` limpios (mismos 6 errores preexistentes de `ImportMeta.env`/
  `unknown`, cero nuevos).
- Sin tocar: embed del catálogo de `invitacionmx-catalogo` (línea ~7168, `embedTema`, usado por su
  `ThemePreview`, fuera de alcance explícito del pedido), el demo de "estilo de cajas" (~línea
  7300), ni ninguna invitación real/link compartido.

## Cierre: la frase de despedida no se lee en temas de fondo oscuro (2026-11-24, v1)

Prompt del dueño (reporte real de la invitación de Luna Isabella, tema Celestial): en la sección
16 (CIERRE Y DESPEDIDA, `src/templates.ts`), la frase «¡Te espero para celebrar de mi soñado
día!» se pinta con `text-dark` (el color oscuro del tema) directo sobre `tema.bgGradient` (el
degradado oscuro del mismo tema, vía `style` inline del `<footer>`) -- oscuro sobre oscuro, no se
lee. El nombre (dorado, `text-accent`) y la línea final (`text-gray-400`, remapeada por el
bloque de contraste existente) sí se veían.

- **`TEMAS_DEGRADADO_OSCURO = ["celestial", "neon", "aurora-boreal"]`** (constante nueva, junto a
  `TEMAS_CON_TEXTURA_PAPEL`): única fuente de "qué temas tienen degradado oscuro de base" --
  reemplaza el chequeo manual `tema.id === "celestial" || tema.id === "neon"` que vivía repetido
  en 4 lugares del bloque "Soporte de accesibilidad y alto contraste para Temas Oscuros" (velo,
  tarjetas translúcidas, remapeo de grises) -- **aurora-boreal nunca entraba ahí**, aunque el
  propio comentario de `TEMAS_CON_TEXTURA_PAPEL` ya lo reconocía como oscuro desde antes. Con el
  fix, Aurora Boreal también recibe el remapeo de grises/velo/tarjetas cuando tiene foto de fondo
  personalizada (antes solo Celestial/Neón). Glam Rose (degradado claro) deliberadamente no entra.
- **Regla nueva, independiente del bloque anterior**: `[data-section="cierre"] .text-dark {
  color: #f1f5f9 !important; }`, acotada SOLO a esa sección, SIN depender de `fondoEfectivo` (a
  diferencia del bloque de arriba) -- el footer de cierre pinta su fondo con `tema.bgGradient`
  siempre, con o sin foto de fondo subida, así que el problema (y el fix) aplican sobre todo en
  el caso SIN foto, el más común. Los encabezados `.text-dark` de las demás secciones (van sobre
  tarjetas claras) no se tocaron -- el selector nunca los alcanza.
- **Errata corregida de paso**: «INIVTACIÓN DIGITAL PRIVADA • EXCLUSIVA» → «INVITACIÓN DIGITAL
  PRIVADA • EXCLUSIVA», misma línea del cierre.
- **Verificado en vivo** (`npm run dev`, importando `src/templates.ts`/`src/data.ts` directo
  desde la consola del navegador y renderizando `generarHTMLFinal` en iframes reales, sin tocar
  Supabase): Celestial/Neón/Aurora Boreal, SIN foto de fondo (el caso base) -- la frase del
  cierre pasó de color oscuro del tema a `rgb(241,245,249)` sobre el degradado oscuro real de
  cada uno, confirmado con `getComputedStyle`; Dorado Clásico y Glam Rose (control) sin cambio
  (`rgb(42,36,21)`/`rgb(59,34,38)`, oscuro sobre su degradado claro, como siempre); los 8
  encabezados `.text-dark` de otras secciones (Ceremonia/Recepción/Itinerario/etc.) confirmados
  sin cambio (`rgb(8,12,20)`, el oscuro del tema); con foto de fondo personalizada en Aurora
  Boreal, confirmado que ahora también hereda el remapeo de grises (`text-gray-400` →
  `rgb(203,213,225)`) que antes solo tenían Celestial/Neón. Cero errores de consola.
- `npm run lint`/`npm run build` limpios (mismos 6 errores preexistentes de `ImportMeta.env`,
  cero nuevos).
- **Sin commitear ni pushear** -- el prompt no lo pedía explícitamente.

## Fondos listos: set de Cumpleaños (2026-11-24, v1)

Prompt del dueño ("Prompt Fondos Listos — CUMPLEAÑOS v1"), alcance explícitamente acotado a un
solo archivo, espejo del set de fondos de Boda (`src/fondosListos.ts`, construido 2026-11-22).

- **6 entradas nuevas** agregadas a `FONDOS_LISTOS` con `evento: "cumpleanos"` (Rosa pastel,
  Espacial, Globos de colores, Jardín, Arcoíris pastel, Dorado fiesta), después de las 6 de Boda —
  sin tocar ninguna entrada existente. Las 6 URLs de Cloudinary verificadas HTTP 200 antes y
  después del cambio. Comentario del encabezado actualizado ("ya hay fondos de boda y de
  cumpleaños" en vez de "hoy solo hay fondos de boda").
- **Cero cambios de lógica**: `FondoListo`, `fondosListosPorEvento()`, `App.tsx`, `templates.ts`,
  `data.ts` y el resto del mecanismo de `fondosGaleriaPorEvento` (construido el 2026-11-22) se
  quedaron intactos — el catálogo nuevo se conecta solo porque ese mecanismo ya filtra
  genéricamente por `TipoEvento`.
- **Verificado en vivo** (build real servido estático, invitación real "Emma Elizabeth"
  respaldada en `localStorage` antes de tocar nada y restaurada al terminar, nunca se guardó en
  Supabase): al elegir Cumpleaños aparece "🎀 FONDOS LISTOS (CUMPLEAÑOS)" con las 6 miniaturas
  reales (no placeholders); aplicar "Espacial" lo guarda en
  `datos.fondosGaleriaPorEvento.cumpleanos` y lo embebe en la vista previa generada; cambiar a XV
  no contamina ni agrega ninguna clave de XV a ese objeto (sigue solo con `cumpleanos`); volver a
  Cumpleaños recuerda "Espacial" sola; "Quitar fondo de galería de este evento" lo limpia sin
  errores de consola; Boda sigue mostrando exactamente sus 6 fondos originales, sin cambios.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de siempre, cero nuevos).
  `docs/guia-de-uso.md` y `public/manual.html` actualizados (las menciones de "hoy solo hay fondos
  de Boda" pasaron a "hoy hay fondos de Boda y de Cumpleaños") — `D:\InvitaMX\invitamx-manual-usuario.html`
  deliberadamente no tocado, mismo precedente ya documentado varias veces en este archivo.

## Fotos listas: set de Cumpleaños, con dos sub-sets (niña/niño) (2026-11-24)

Prompt en 2 versiones del dueño, construidas en la misma pasada: v1 agregaba 8 fotos de
Cumpleaños sin distinguir; v2 (la aplicada, SUSTITUYE a v1) reemplaza ese set único por DOS sets
ficticios distintos -- niña (vestido rosa pastel, diadema de flores) y niño (tema espacial azul),
8 fotos cada uno -- porque el festejado de un cumpleaños puede ser cualquiera de los dos, y
mezclarlos en un solo botón habría puesto la portada equivocada la mitad de las veces.

- **Campo nuevo `grupo?: string`** en la interfaz `FotoLista` (`src/fotosListas.ts`): sin grupo =
  set único del evento (comportamiento de siempre, boda/XV sin cambios); con grupo, las fotos de
  ese evento se parten y se muestran/insertan por separado. Las 16 entradas de Cumpleaños
  (`evento: "cumpleanos"`) llevan `grupo: "niña"`/`grupo: "niño"`, cada una con su propia foto
  `esPortada`.
- **`handleInsertarSetFotosCompleto(grupo?: string)`** (`src/App.tsx`): ahora filtra el set del
  evento por `grupo` ANTES de insertar -- el resto del handler (límite por paquete, no duplicar,
  portada solo si estaba vacía, toast con el conteo real) no cambió, solo opera sobre la lista ya
  filtrada, así que la portada que busca es la del grupo insertado, nunca la del otro.
- **Bloque "Fotos listas" (Álbum)**: cuando el evento tiene grupos, se parte en sub-bloques
  (`grupos`, conservando el orden de aparición) -- cada uno con su propio subtítulo "Set {Grupo}"
  (p. ej. "Set Niña"/"Set Niño"), su propia cuadrícula de miniaturas (mismo componente/mismo
  marcado ✓ de siempre) y su propio botón "Insertar el set completo ({Grupo})". Un evento sin
  grupos (boda, XV) se sigue viendo exactamente igual que antes -- una sola cuadrícula, un solo
  botón "Insertar el set completo" sin sufijo.
- **Verificado en vivo** (build local + servidor estático efímero + Claude in Chrome, invitación
  de prueba desechable -- la real "Emma Elizabeth", cacheada en `localStorage` de este navegador
  en más de un puerto por sesiones anteriores, se respaldó y restauró en cada origen tocado):
  Cumpleaños + Estándar muestra "Set Niña" y "Set Niño" con 8 miniaturas cada uno; "Insertar el
  set completo (Niña)" deja 8/8 con la portada de niña, repetir el clic no duplica; limpiar álbum
  + "Insertar el set completo (Niño)" deja 8/8 con la portada de niño (la espacial), sin mezclar
  ninguna foto de niña; en Básico cada set se detiene en 4/4; Boda sigue con una sola cuadrícula,
  un solo botón sin sufijo, 8/8 y la portada de boda correctas; Bautizo sigue mostrando "Aún no
  hay fotos listas para este evento."
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de siempre, cero
  nuevos). `docs/guia-de-uso.md`/`public/manual.html` actualizados para mencionar el set de
  Cumpleaños y sus dos sub-sets -- **no se pudo actualizar** `D:\InvitaMX\invitamx-manual-usuario.html`
  (ya desactualizada desde antes, ver nota de la entrada de "Fondos listos" del 2026-11-22).
- Sin commitear ni pushear todavía -- ver si ya se hizo en una entrada posterior o `git log`.

## Fotos listas: agregado el set de XV años (2026-11-22, noche, v3)

Prompt v3 del dueño, continúa la v2 de abajo (ya aplicada y verificada) -- cambio acotado a un
solo archivo, `src/fotosListas.ts`: se agregaron las 12 entradas del set de XV (`evento: "xv"`),
después de las 8 de boda (intactas). Son las MISMAS 12 fotos ficticias de la quinceañera que ya
usaba `fotosFicticiasDefault`/`getFotosPorTema` en `data.ts` como respaldo automático -- aquí se
reutilizan tal cual, solo para que también sean elegibles a mano desde "Fotos listas". El bloque
"PARTE 3b" ya filtraba por evento (`fotosListasPorEvento`), así que no hizo falta tocar `App.tsx`
-- el set de XV aparece solo con ese evento, sin más cambios.
- **Verificado en vivo** (build local + servidor estático + Claude in Chrome, invitación
  placeholder sin datos reales -- nunca se tocó Supabase): XV + Estándar (máx. 8) → "Insertar el
  set completo" deja portada puesta y 8/8 (las primeras 8 del set de 12); XV + Premium (máx. 14)
  → 12/12 (el set completo, sin inventar las 2 que faltan para llegar a 14); XV + Básico (máx.
  4) → 4/4 (las primeras 4: Portada/Retrato de estudio/Detalle zapatilla/Con mamá); Cumpleaños
  → "Aún no hay fotos listas para este evento."; Boda → sus 8 miniaturas siguen igual, sin
  marcar, sin mezclarse con las fotos de XV ya insertadas en la galería (cambiar de evento nunca
  toca `datos.fotos`, confirmado).
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes). `docs/guia-de-uso.md`/
  `public/manual.html` actualizados para mencionar los dos sets (Boda 8 / XV 12). No se tocó
  `fotosFicticiasDefault`/`getFotosPorTema` en `data.ts`, la lógica de inserción de la v2, Fondos
  listos, paquetes/maxFotos, ni la demo "Valeria & Diego".

## Fotos listas por evento en el editor (2026-11-22, noche, v2 -- hermana de Fondos listos)

Prompt v2 del dueño (sustituye la v1 del mismo día, mecánica/URLs/límites idénticos -- v2 solo
deja escrito el PROPÓSITO): el set de 8 fotos de boda (misma pareja: portada/jardín/novia/novio/
anillos/baile/celebración/romántica) ya estaba generado y subido a Cloudinary, pero quedó
atrapado solo dentro de la invitación muestra ("Valeria & Diego", sofia-16x9) -- no había
catálogo reutilizable, cada invitación nueva de Boda nacía con el álbum vacío. Mecánica hermana
de Fondos listos (commits `76e026d`/`65d4313`), misma forma de catálogo por evento, pero **sin**
campo nuevo en `types.ts` -- diferencia clave pedida explícitamente en el prompt.

**Propósito (v2, explícito)**: estas son fotos de **MUESTRA** (relleno, una pareja ficticia),
nunca contenido de una invitación final de clienta real -- en la muestra gratis la prospecta
solo manda nombre/fecha/tema por WhatsApp, sin fotos, y el set viste la muestra en segundos para
que se vea lo más parecida posible a la final. Cuando se vuelve clienta y llegan sus fotos
reales, la invitación se arma con esas y el set de muestra deja de usarse -- no cambia nada del
mecanismo de link de muestra (`?muestra=1&exp=`), que ya existía. El comentario de cabecera de
`fotosListas.ts`, el bloque del editor (línea de ayuda "Fotos de MUESTRA para vestir esta
invitación -- se reemplazan por las fotos reales de la clienta") y la documentación (guía/manual)
dejan esto explícito; la mecánica de inserción es idéntica a la v1.

- **`src/fotosListas.ts`** (nuevo, espejo de `fondosListos.ts`): catálogo fijo `FOTOS_LISTAS:
  {nombre, evento, url, esPortada?}[]` -- hoy 8 fotos de boda (la primera con `esPortada: true`).
  `fotosListasPorEvento(evento)` filtra por tipo de evento.
- **`handleInsertarFotoLista(url)`** (`src/App.tsx`, junto a `handleEliminarFoto`): inserta UNA
  foto en el siguiente casillero libre de `datos.fotos` -- no duplica si la URL ya está (mismo
  criterio que "ya marcada ✓"), respeta `paquetes[datos.paquete].maxFotos` con el mismo toast de
  límite que ya usa la carga manual.
- **`handleInsertarSetFotosCompleto()`**: inserta el set completo del evento actual en orden,
  saltando URLs ya presentes, hasta llenar el máximo del paquete (cuenta cuántas entraron y
  cuántas quedaron fuera por el límite); si `datos.fotoPortada` está vacía, también pone la foto
  marcada `esPortada: true` del set -- si ya hay portada, NO la pisa. Toast final construido con
  lo que de verdad pasó (cuántas entraron, si hubo límite, si la portada se puso o ya existía).
- **Bloque nuevo "PARTE 3b: FOTOS LISTAS"** en la pestaña Álbum, justo debajo de la galería
  (PARTE 3) -- mismo estilo visual que Fondos listos (caja fucsia 🎀→📸), miniaturas marcadas ✓
  cuando la URL ya está en `datos.fotos`, botón "Insertar el set completo", y el mismo criterio
  de "Aún no hay fotos listas para este evento" cuando el evento no tiene set (hoy: todos menos
  Boda).
- **Sin campo nuevo en `datos`**: a diferencia de `fondosGaleriaPorEvento`, las URLs insertadas
  quedan escritas directo en `datos.fotoPortada`/`datos.fotos` -- EXACTAMENTE como si se hubieran
  subido a mano. No se recuerda nada por evento: cambiar el Tipo de Evento nunca borra ni
  reinserta fotos ya puestas.
- **Verificado en vivo** (build local + servidor estático + Claude in Chrome, invitación
  placeholder/demo sin datos reales cargados -- nunca se tocó Supabase ni se pulsó "Guardar en
  Supabase"): paquete Estándar (máx. 8) → "Insertar el set completo" deja portada puesta y
  8/8 en la galería, las 8 miniaturas marcadas ✓; paquete Básico (máx. 4), galería reiniciada →
  el mismo botón deja exactamente 4/4 (portada + jardín + novia + novio, en orden), las otras 4
  miniaturas sin marcar; clic individual en una miniatura YA insertada no duplica (mismo conteo);
  clic en una miniatura NO insertada con la galería ya llena no inserta nada (respeta el límite);
  quitar una foto insertada con el botón "Remover" de siempre baja el contador (3/4) -- confirma
  que son fotos normales, no un mecanismo aparte; cambiar el Tipo de Evento a XV Años deja el
  bloque en "Aún no hay fotos listas para este evento." sin tocar las fotos ya insertadas antes.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de siempre, cero
  nuevos). `docs/guia-de-uso.md`/`public/manual.html` actualizados. No se tocó
  `paquetes`/`maxFotos`, `handleCargarFotoGaleriaIndex`/`handleEstablecerFotoUrlIndex`/
  `handleEliminarFoto`, las PARTES 1/1b/2/3 de Álbum, Fondos listos, tipos de evento, ni la
  invitación muestra "Valeria & Diego" -- tal como pedía el prompt.

## Fondos listos: también junto al selector de Tipo de Evento (2026-11-22, noche, v1 de un prompt nuevo)

Prompt v1 del dueño, construido sobre el commit `76e026d` de la entrada de abajo (ésta queda
intacta en su lógica/datos -- es solo una mejora de UBICACIÓN de la vista). El problema real:
el bloque "Fondos listos" solo vivía en la pestaña Álbum (Gestión de Imágenes), pero el Tipo de
Evento se elige en la pestaña Quinceañera (Información Esencial) -- el admin ponía Boda ahí y
no veía la galería hasta cambiar de pestaña.

- **`BloqueFondosListos`** (`src/App.tsx`, componente nuevo, justo antes de `export default
  function App()`): extrae el bloque que antes vivía solo inline en PARTE 1b a un componente
  reutilizable -- recibe `datos`/`onAplicar`/`onQuitar` (mismos `handleAplicarFondoGaleria`/
  `handleQuitarFondoGaleria` de siempre, sin cambios) más dos props de presentación:
  `mostrarVacio` (si se debe mostrar la caja con "Aún no hay fondos listos para este evento"
  cuando el evento no tiene fondos, o no renderizar nada) y `ayudaExtra` (texto de ayuda a
  mostrar en vez del genérico).
- **Renderizado en DOS lugares, mismo estado/handlers** (seleccionar en uno se refleja en el
  otro de inmediato, porque ambos leen/escriben `datos.fondosGaleriaPorEvento`): (a) su lugar de
  siempre en Álbum/PARTE 1b, sin cambios de comportamiento (`mostrarVacio` default `true`); (b)
  **nuevo**, justo debajo del selector "Tipo de Evento" en Información Esencial, con
  `mostrarVacio={false}` (si el evento no tiene fondos -- hoy todos menos Boda -- no se muestra
  nada ahí, ni caja vacía ni texto) y `ayudaExtra="Elige el fondo de la invitación para este
  evento -- también está en Gestión de Imágenes."`.
- **Verificado en vivo** (build local + servidor estático + Claude in Chrome, invitación de
  prueba desechable -- en este caso el propio placeholder/demo que trae el proyecto sin datos
  reales cargados, nunca se tocó Supabase ni se pulsó "Guardar en Supabase"): con XV Años no
  aparece nada bajo el selector; al elegir Boda aparece ahí mismo "Fondos listos (Boda)" con las
  6 miniaturas; aplicar una la marca ✓ y la vista previa real (iframe) la muestra con la regla
  CSS exacta; la pestaña Álbum muestra la misma selección (mismo estado); "Quitar" desde Álbum
  se refleja también en Información Esencial; cambiar a Cumpleaños hace desaparecer el bloque
  de Información Esencial por completo; volver a Boda restaura sola la elección anterior.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de siempre, cero
  nuevos). `docs/guia-de-uso.md`/`public/manual.html` actualizados para mencionar el segundo
  lugar. No se tocó `src/fondosListos.ts`, `src/types.ts`, `src/templates.ts`
  (`resolverFondoEfectivo` y su prioridad), ni la configuración global/temas -- tal como pedía
  el prompt.
- Sin commitear ni pushear todavía -- el usuario no lo ha pedido en este prompt (a diferencia
  del v2 de abajo, que sí terminaba con "Commit y push a main").

## Fondos listos por evento en el editor (2026-11-22, noche, v2)

Prompt v2 del dueño (sustituye una v1 nunca ejecutada, `prompt-fondos-boda-en-editor.md`): ya
existían 6 fondos de boda generados y subidos a Cloudinary (cloud `dswrrm5u1`) sin forma de
aplicarlos salvo subiendo el archivo a mano en "Fondo de la Invitación". El v2 agrega la regla
clave que no traía el v1: el fondo de galería vive atado al TIPO DE EVENTO de la invitación, no
al tema, y jamás toca el catálogo de temas ni la fila global `fondos_personalizados`.

- **`src/fondosListos.ts`** (nuevo): catálogo fijo `FONDOS_LISTOS: {nombre, evento, url}[]` -- hoy
  6 fondos de boda, pensado para crecer (agregar un fondo o un evento nuevo es solo agregar una
  entrada aquí). `fondosListosPorEvento(evento)` filtra por tipo de evento.
- **`InvitacionDatos.fondosGaleriaPorEvento?`** (`types.ts`, nuevo) -- `Partial<Record<TipoEvento,
  string>>`, un fondo de galería elegido por cada tipo de evento que esta invitación haya usado,
  independiente de `bgImages` (el fondo subido a mano, por TEMA, que ya existía). Agregado a
  `KEY_MAP` (`fg`, `App.tsx`) para que sobreviva a un link largo compartido (`?v=1&d=...`) -- el
  camino real hoy (`/v/<codigoCorto>`) de cualquier forma lee `datos_completos` completo de
  Supabase, sin pasar por ese blob.
- **`resolverFondoEfectivo(datos, tema)`** (nuevo, exportado en `templates.ts`, junto a
  `resolverTemaEfectivo`): única fuente de la prioridad -- fondo de galería del EVENTO actual >
  fondo subido a mano para el TEMA actual > ninguno (cae al degradado del tema). `generarHTMLFinal`
  calcula `fondoEfectivo` una sola vez y reemplaza las 3 referencias que antes leían
  `datos.bgImages[tema.id]` directo -- mismo mecanismo para la vista previa del editor y el link
  público, nunca pueden desincronizarse.
- **Editor** (`App.tsx`, pestaña Álbum, bloque nuevo "Fondos listos (N)" justo debajo de "Fondo de
  la Invitación"): miniaturas con nombre de los fondos del evento ACTUAL de la invitación (o un
  aviso si ese evento no tiene ninguno todavía); clic aplica (`handleAplicarFondoGaleria`, marca
  "✓" sobre el elegido); botón "Quitar fondo de galería de este evento"
  (`handleQuitarFondoGaleria`) solo si hay uno elegido para el evento actual -- ninguno de los dos
  toca Supabase, es 100% estado local de la invitación (se persiste cuando la invitación misma se
  guarda, como cualquier otro campo). Aviso visible cuando el fondo de galería está activo,
  recordando que tiene prioridad sobre uno subido a mano.
- **Verificado en vivo** (build local + servidor estático efímero + Claude in Chrome, sobre una
  invitación de prueba desechable en `localStorage`, el real "Emma Elizabeth" respaldado antes y
  restaurado al terminar -- nunca se tocó Supabase): cambiar el evento a Boda mostró los 6 fondos
  reales; aplicar "Vino Elegante" lo embebió de inmediato en el HTML real de la vista previa
  (confirmado buscando la regla `background-image: url(...)` exacta, no solo el texto en
  cualquier parte de la página); se inyectó a mano un fondo "subido" falso para el mismo tema y se
  confirmó que el de galería lo sigue ganando (prioridad real, no solo visual); cambiar a XV Años
  dejó de usar el fondo de galería (cayó al fondo real del tema ya guardado en el catálogo) sin
  perder la elección de Boda; regresar a Boda la recuperó sola, sin tener que elegirla de nuevo.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de `ImportMeta.env`, cero
  nuevos). `docs/guia-de-uso.md`/`public/manual.html` actualizados con el bloque nuevo (regla fija
  de abajo) -- **no se pudo actualizar** `D:\InvitaMX\invitamx-manual-usuario.html` (tercera copia
  del manual, fuera de este repo) por un bloqueo del clasificador de auto mode sobre ediciones
  fuera del directorio de trabajo; pendiente que el usuario agregue ahí la misma línea si la
  quiere en sync, o lo autorice explícitamente.
- Commit `76e026d` en `main`, pusheado -- Vercel debería redesplegar solo.

## Cobro por WhatsApp v4: el paquete manda el precio, lista manual de links, complementos en un solo bloque (2026-11-22, noche)

Prompt v4 del dueño, sustituye v3/v2/v1 -- mismo alcance de siempre (pestaña "💳 Pagos" de "Administrar cliente"), con un solo punto nuevo (el 7, "Complementos juntos") y 6 puntos ya construidos en pasadas anteriores, reafirmados aquí.

- **1) El paquete manda el precio total** -- `handleCambiarPaqueteInvitacion` ahora también recalcula `precio_total = PRECIO_BASE_PAQUETE[nuevoPaquete] + suma(complementos ya agregados a esta invitación)` cada vez que se cambia de paquete en el menú de "💳 Pagos" (antes solo tocaba `datos_completos`, dejando el precio sin tocar). Sigue siendo editable a mano después, sin cambios ahí.
- **2-5) Bloque automático "✉️ Enviar link de pago"** (preview + botones, ya construido en el prompt anterior) -- se le agregó el punto 4 que faltaba: si ya no hay nada que cobrar (`anticipoCobrado && falta<=0`), el bloque muestra "✅ Esta invitación ya está pagada por completo -- no hay link por enviar" en vez de dejar los dos botones apagados sin ninguna explicación. El resto (preview de 3 variantes, aviso rojo si falta un link) queda igual.
- **6) Lista manual "📋 Links de pago -- envío manual (tú eliges)"**, nueva -- los 4 links de la configuración global (`anticipoBasico/anticipoEstandar/anticipoPremium/montoAbierto`), cada uno con su URL visible y un botón "💬 Enviar por WhatsApp" que abre WhatsApp con ESE link puesto (`handleEnviarLinkManual`, nuevo) -- nunca cambia ningún estado de cobro, solo abre WhatsApp, igual que los automáticos. El de monto abierto escribe en el mensaje el saldo pendiente (o el anticipo del total si el saldo ya es $0). Si un link está vacío en la config, su renglón dice "No configurado" y el botón queda deshabilitado.
- **7) Complementos en UN SOLO bloque, todos con su precio** -- las 3 casillas sueltas "Á la carte 'pases'/'PDF'/'Control de Acceso QR' pagado" que vivían al final de la pestaña, separadas de "🧩 Complementos", se quitaron como elementos aparte (sus mismos datos -- `pases_pagado`/`pdf_pagado`/`checkin_pagado` -- se siguen administrando, ahora solo desde el bloque único). El bloque muestra: lo ya agregado (igual que antes, con "Quitar"), lo incluido sin costo según el paquete (Pases/PDF en Premium → "Incluido"), lo bloqueado por un requisito faltante (QR sin Pases activo → nota, sin botón), una marca vieja de pagado sin su complemento registrado (datos de antes del 2026-11-22, cuando no existía la columna `complementos` -- "Marcado como pagado" + "Quitar marca", solo voltea el flag, no mueve dinero), y el catálogo completo de lo que todavía se puede agregar (`catalogoComplementosDisponibles`, SIN tocar -- única fuente de precio/disponibilidad), cada renglón con su precio a la vista y botón "+ Agregar" (con cantidad inline para Familia extra/Ajustes extra). Al final, la operación completa y visible: "Paquete {nombre}: ${base} + Complementos: ${suma} = Precio total: ${total}".
- **Nuevo helper, solo de presentación**: `filasExtraCatalogoComplementos(row)` -- agrega las filas "incluido"/"bloqueado"/"legacy" que `catalogoComplementosDisponibles` deliberadamente no cubre (esa sigue siendo la única fuente de qué es agregable AHORA y a qué precio). `PAQUETE_POR_LINK_ANTICIPO_KEY`/`LISTA_LINKS_MANUAL` (constantes nuevas, módulo) resuelven la lista fija de la sección 6.
- **Edge case encontrado durante la propia verificación, no corregido a propósito** (fuera de lo pedido): si a una invitación Básico/Estándar ya se le cobró "Pases" como complemento à la carte (ej. $150) y DESPUÉS se sube de paquete a Premium, el complemento viejo se queda en la lista (con su "Quitar" disponible) AL MISMO TIEMPO que Pases ya aparece como "Incluido" -- el admin ve ambos y puede quitar el cobro viejo a mano con el mismo botón de siempre. El encargo pidió sumar "los complementos ya agregados", no limpiar complementos que el nuevo paquete vuelve gratis -- se dejó tal cual, documentado aquí por si se pide cerrar ese hueco después.
- **Verificado en vivo contra Supabase real** (servidor estático + Claude in Chrome, mockeando `/api/admin/list-invitaciones` como proxy real vía `window.supabaseClient`, fila de prueba desechable clonada de los datos reales de Sofía con `codigoCorto`/paquete sobreescritos, borrada al terminar): cambiar Estándar→Básico recalculó precio_total 499→299 solo, con la vista previa anunciando "anticipo del paquete Básico ($150)" exacto; agregar Pases (+$150) de Básico dejó "$299 + $150 = $449" y la vista previa cambió a "monto abierto por $225 -- su total trae complementos" -- clic real en "Cobrar anticipo" (con `window.open` interceptado) mandó el mensaje EXACTO que anunció la vista previa; la lista manual mandó el link de "Anticipo Premium" (fijo, $400) aun con la invitación en Básico -- confirma que ahí el admin elige libre, sin depender del paquete real; marcar "Pagado hasta ahora" = total mostró "pagada por completo" con ambos botones apagados y el aviso nuevo. **Sofía (real, Premium, QR ya cobrado) revisada de SOLO LECTURA** (confirmado con SQL antes/después que `updated_at`/`precio_total` no cambiaron): el bloque mostró exacto "Paquete Premium: $799 + Complementos: $150 = Precio total: $949", con Pases/PDF como "Incluido" y QR como complemento activo -- el mismo ejemplo numérico del encargo.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de `ImportMeta.env`/`unknown` en la sección de fondos, cero nuevos -- un error de tipos propio sí apareció durante el desarrollo, en el `.concat()` de `LISTA_LINKS_MANUAL`, corregido con una anotación de tipo explícita antes de dar la tarea por terminada).
- **No se tocó**: `resolverLinkAnticipo`, `handleCobrarAnticipo`/`handleCobrarLiquidacion`, los mensajes de WhatsApp del envío automático, `catalogoComplementosDisponibles`, `handleAgregarComplemento`/`handleQuitarComplemento`, los precios del catálogo, ni ninguna otra pestaña de "Administrar cliente".

## Envío del link de pago VISIBLE en Administrar cliente → Pagos (2026-11-22, tarde)

Pedido tras una inspección visual fallida del propio Isaac (el panel no cargó en el navegador que intentó usar) -- a partir de leer el código directamente, confirmó que la lógica de cobro ya existía (`handleCobrarAnticipo`/`handleCobrarLiquidacion`, con selector automático de link ya implementado desde el 2026-11-21) pero dentro de "Administrar cliente" → "💳 Pagos" no había ninguna acción clara para enviarlo ni forma de saber qué link iba a salir antes de darle clic.

- **Solo presentación, cero lógica nueva**: los botones "💬 Cobrar anticipo"/"💬 Cobrar liquidación" (ya existían, único call-site de cada handler, confirmado por grep antes de tocar nada) se quedaron en el mismo lugar con los mismos handlers -- se les agregó un encabezado "✉️ Enviar link de pago por WhatsApp" y, ENCIMA de los botones, un renglón de vista previa calculado con el MISMO selector que ya usan los handlers (`resolverLinkAnticipo`/`calcularAnticipo`/`linksPago.montoAbierto`) -- nunca un cálculo aparte que pudiera desalinearse del mensaje real.
- **3 variantes de texto, exactas al pedido**: anticipo con el precio total = precio base del plan → "Se enviará el link de anticipo del paquete {Paquete} (${monto}) a {teléfono}"; anticipo con el total distinto (trae complementos) → "Se enviará el link de monto abierto por ${anticipo} — su total trae complementos — a {teléfono}"; liquidación → "Se enviará el link de monto abierto por ${saldo} a {teléfono}". Si el link que haría falta está vacío en la configuración, el renglón avisa en rojo ("⚠️ Falta configurar...") y el botón correspondiente se deshabilita (se agregó esa condición al `disabled` existente, sin tocar las reglas de hoy -- sin precio total, anticipo ya cubierto, o saldo en $0 siguen deshabilitando igual que antes).
- **Verificado en vivo contra producción real** (servidor estático + Claude in Chrome, mockeando solo `/api/admin/list-invitaciones` como proxy a Supabase real -- las escrituras de prueba corrieron sobre una fila desechable creada por SQL, nunca sobre un cliente real; se verificó con una consulta de solo lectura que Sofía, abierta de pasada durante la prueba, no sufrió ningún cambio accidental): con una invitación de prueba Estándar/$949/$0 pagado (simulando "Premium + complemento"), la vista previa dijo "monto abierto por $475 — su total trae complementos" (anticipo) y "monto abierto por $949" (liquidación) -- y se interceptó `window.open()` en ambos botones para confirmar que el link/monto/teléfono del mensaje real coinciden EXACTO con lo que la vista previa anunció, sin ninguna discrepancia. Con la misma fila cambiada a Básico/$299/$0 pagado (SQL directo, sin complementos), la vista previa dijo "link de anticipo del paquete Básico ($150)" -- exacto al ejemplo del encargo -- y el clic real abrió el link FIJO de Mercado Pago de ese paquete (uno distinto al de monto abierto usado en el otro escenario), sin la nota "(ingresa el monto...)", confirmando que el selector sí distingue ambos casos en la práctica, no solo en la vista previa. Fila de prueba borrada al terminar.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de `ImportMeta.env`, cero nuevos).
- **No se tocó**: los handlers, el selector de links, los mensajes de WhatsApp, los montos, ni ninguna otra pestaña de "Administrar cliente" (Mensajes/Confirmaciones/Vigencia y acceso) ni ningún botón en otras vistas.

## Folio de clienta en el administrador (2026-11-22, madrugada)

Pedido de Isaac: el administrador solo identifica invitaciones (su `codigoCorto`, el EVENTO) -- la
clienta (la mamá) no existe como tal, así que si regresa con otro evento, su nueva invitación
nace sin historial. Se agrega un folio de clienta corto (C-001, C-002...) ligado a su teléfono de
WhatsApp, que es su llave natural -- la invitación conserva su código, el folio identifica a la
PERSONA.

- **Tabla nueva `clientes`** (migración `add_clientes_table_y_folio`, proyecto `ahwcilcejffgddeeuiux`):
  `id` (uuid), `folio` (`generated always as identity`, nunca se reusa aunque se borre una
  clienta -- se muestra como `C-007` con `folioFormateado()`), `nombre`, `telefono_whatsapp`
  (único, normalizado), `creado_en`. RLS abierta, mismo modelo "Allow all" que el resto del
  proyecto. `invitaciones.cliente_id` (uuid, nullable, FK) liga cada invitación a su clienta.
- **Normalización del teléfono** (`normalizarTelefono()`, en `App.tsx`): se guarda y se compara
  solo por los ÚLTIMOS 10 dígitos -- así "5212345678" y "525212345678" (con o sin 52/código de
  país) empatan en la misma clienta, sin importar el formato con el que se haya capturado.
- **`resolverClienteId()`** (busca o crea la clienta por teléfono): se llama en `guardarEnSupabase`
  -- la ÚNICA función que escribe una invitación en este repo (alta Y actualización) -- así que
  un teléfono que cambia se vuelve a ligar solo, con la misma regla, en cualquier guardado futuro.
  Sin teléfono capturado, regresa `null` sin tronar nada (la invitación queda sin clienta, folio
  "—"). Maneja la carrera rara de 2 guardados casi simultáneos con el mismo teléfono nuevo
  (reintenta el SELECT si el INSERT choca con la unicidad de `telefono_whatsapp`).
- **Backfill aplicado en la misma migración**: agrupó las 15 invitaciones reales existentes por
  teléfono normalizado (excluyendo la fila de config global de fondos y las que no tienen
  teléfono), creó su clienta y asignó folios por antigüedad real (`fecha_creacion` de la
  invitación más vieja de cada teléfono) -- verificado que "Barra" (tel. `2217445410`, sin 52) y
  "Sofía" (tel. `522217445410`, con 52) quedaron correctamente ligadas a LA MISMA clienta.
- **Dónde se ve**: chip de folio junto al nombre en el renglón COLAPSADO de "Mis Invitaciones"
  (visible de un vistazo, sin expandir), y "· 🪪 Clienta C-007" en el encabezado expandido (que en
  este repo ES "Administrar cliente" -- no existe una pantalla separada, expandir la fila es
  abrir la ficha del cliente, así que ambos puntos del encargo apuntan al mismo lugar real).
  Sección nueva "🪪 Otras invitaciones de C-007" (solo si la clienta tiene más de una, derivada de
  `listaInvitaciones` ya cargada, sin consulta aparte) con un botón por cada una (nombre + código,
  extraído de `link_invitacion` ya que la lista ligera no trae `datos_completos`) --
  `handleAbrirInvitacionDesdeHistorial()` limpia cualquier filtro/búsqueda/pestaña que pudiera
  esconderla y expande esa fila (el mismo mecanismo de "abrir" que ya usa toda la lista).
- **API admin** (`list-invitaciones.ts`/`get-invitacion.ts`, service-role key): agregan `cliente_id`
  y el embed `clientes(folio, nombre, telefono_whatsapp)` -- PostgREST lo resuelve solo por la FK,
  sin una segunda consulta.
- **Explícitamente NO tocado**: el `codigoCorto`/las URLs públicas de cada invitación, la vista
  pública/check-in/formulario/cobros, y cualquier "recibo"/"Panel WhatsApp" -- esos viven en otro
  repo (según el propio encargo, "ya dejé los dos recibos del catálogo con `{{folioClienta}}`")
  y simplemente ya pueden leer `clientes.folio` de la misma base de datos; no había ningún
  generador de recibo que construir aquí, el alcance de este encargo era solo este repo.
- **Verificado en vivo, de punta a punta** (build local + servidor estático + Claude in Chrome,
  mockeando `/api/admin/list-invitaciones` como un proxy a la base REAL vía `window.supabaseClient`
  -- las escrituras corrieron 100% reales contra Supabase, limpiadas al final): se confirmó primero
  que los datos YA EXISTENTES (Sofía/Valentina/Barra/Luna Isabella, etc.) ya traían su folio
  correcto desde el backfill; se creó "Prueba Folio Uno" (tel. `529998887766`) vía "+ Nuevo
  Cliente" -- folio nuevo asignado (`C-009`); se creó "Prueba Folio Dos" con el MISMO teléfono
  pero SIN el 52 (`9998887766`) -- quedó con el MISMO folio `C-009`, y cada una mostró a la otra
  en su "Otras invitaciones de C-009", clic incluido (expande la otra fila, limpia filtros); se
  limpió el campo de WhatsApp de "Prueba Folio Dos" en el editor y se guardó -- se confirmó por
  SQL directo que quedó `cliente_id: null`/`telefono_whatsapp: ""` sin ningún error de consola, y
  la UI la mostró sin folio ni sección de historial, tal como pide el encargo. Las 2 invitaciones
  y la clienta de prueba se borraron al terminar (`DELETE ... RETURNING`), confirmado en 0.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de `ImportMeta.env`, cero
  nuevos).

## Link de revisión y pausa por falta de pago (2026-11-22, noche, regla de negocio nueva)

Regla de negocio nueva de Isaac ("revisión primero, entrega final al liquidar"): hoy el panel
entrega el link permanente en cuanto la invitación está armada, y la liquidación se cobra
después -- si la clienta no paga el saldo, ya se quedó con su invitación completa igual. Con
esta regla, la clienta revisa con un link temporal; el permanente (y el PDF) se entregan solo al
liquidar; y si no paga, su invitación se puede pausar desde el admin hasta que pague.

- **Link de revisión** (`resolverLinkRevisionFila`/`handleEnviarRevisionWhatsApp`/
  `REVISION_DIAS_VIGENCIA = 7`, junto a `getShareUrlDesdeFila`): mismo mecanismo exacto que el
  link de muestra (parámetros de URL sueltos fuera del blob `d`, mismo `exp` compartido -- nunca
  viajan juntos en un link real), pero la invitación se ve COMPLETA y SIN marca de agua (es
  clienta que ya pagó su anticipo, no un prospecto) -- solo una franja discreta arriba
  ("📝 Invitación en revisión — tu link final se libera al liquidar tu saldo"). Mismo criterio de
  "corto si hay `codigoCorto`, largo de respaldo si no" que el link de muestra corto (ver entrada
  de arriba). Fila nueva "Revisión" en "🔗 Links de la clienta" (entre "Invitación" y
  "Formulario"), con Generar y copiar / Generar y abrir / Enviar a revisión -- mismo patrón que
  "Vista previa".
- **Bug real encontrado y corregido durante la propia verificación en vivo, antes de llegar a
  producción**: `muestraExpirada` (la que dispara la pantalla "esta muestra ya expiró") se
  calculaba solo a partir de `exp` sin revisar `esVistaDeMuestra` -- como el link de revisión
  también usa `exp` (sin `muestra=1`), un link de revisión vencido caía en la pantalla de
  "muestra expirada" en vez de la de "revisión vencida" nueva. Corregido agregando
  `esVistaDeMuestra &&`/`esVistaDeRevision &&` a cada chequeo respectivo -- confirmado que
  ninguno de los dos (muestra y revisión) se confunde entre sí ni se rompió el caso ya existente
  de muestra expirada/vigente.
- **Pausa manual por falta de pago** (`pausada`/`pausada_en`/`motivo_pausa`, columnas nuevas --
  migración `add_pausa_columns_invitaciones` -- y `handleActualizarPausaInvitacion`, mismo patrón
  que `handleActualizarBloqueoInvitacion` pero **estado completamente separado**, nunca reutiliza
  `bloqueada`: esa sigue siendo la vigencia/acceso de siempre del editor, la pausa es
  específicamente por saldo pendiente). Bloque nuevo "⏸️ Pausa por falta de pago" en la pestaña
  "Vigencia y acceso" de "Administrar cliente", con el saldo pendiente (`calcularSaldoPendiente`)
  mostrado ahí mismo cuando es mayor a 0, motivo libre, y Pausar/Reactivar.
- **Nuevo `pausaCheck`** (estado `{listo, pausada}`), mismo patrón arquitectónico que
  `bloqueoCheck` ya existente: una consulta genérica keyed en `iidVista` (extendida para traer
  `pausada` en el mismo round-trip que `bloqueada`/`motivo_bloqueo`) y el resolver de
  `/v/<codigo>` (que también la fija de inmediato, antes de que la consulta genérica se vuelva a
  disparar, "para que la primera pintura ya sea la correcta" -- mismo comentario ya usado para
  bloqueoCheck). Pantalla nueva "⏸️ Esta invitación está en pausa." va PRIMERO en la cadena de
  guardias (antes incluso del bloqueo de acceso), sin mostrar ningún dato -- ni el nombre de la
  quinceañera. Gatea también el `useEffect` del `document.write`.
- **`CheckinPage`** (control de acceso, antes SIN ningún chequeo de bloqueo/pausa) y
  **`IntakeForm`** (que ya tenía su propio chequeo de `bloqueada`) ganaron su propio chequeo de
  `pausada`, primero que cualquier otro, cada uno con su propia consulta a Supabase (no comparten
  el `pausaCheck` de la vista pública, que vive en otro componente).
- **Verificado en vivo, de punta a punta** (build local + servidor estático efímero + Claude in
  Chrome, mocking solo `/api/admin/list-invitaciones` -- las escrituras reales corrieron contra
  Supabase real, project `ahwcilcejffgddeeuiux`, sobre una fila de prueba desechable creada con
  `INSERT ... RETURNING id` y borrada al final con `DELETE ... RETURNING id`, mismo método ya
  usado para Complementos): `/v/<codigo>?revision=1&exp=<futuro>` muestra la invitación completa
  con la franja teal y sin marca de agua; el mismo link sin `revision=1` (el permanente) se ve
  limpio, sin franja; con `exp` vencido muestra "Este link de revisión ya venció" (y, tras el fix
  de arriba, un link de MUESTRA vencido sigue mostrando "esta muestra ya expiró" -- confirmado
  que no se cruzan); se pausó la fila de prueba por SQL directo y se confirmó "Esta invitación
  está en pausa" sin ningún dato en las 3 rutas (`/v/<codigo>`, `/v/<codigo>?fam=...`,
  `/puerta/<codigo>`, `/datos/<codigo>`); se reactivó y las 3 rutas volvieron a su comportamiento
  normal (el control de acceso cayó correctamente al siguiente chequeo real, "función no
  disponible", porque la fila de prueba no tenía `controlAccesoQR` -- no relacionado a este
  cambio); desde la UI real de "Administrar cliente" (Vigencia y acceso), se pausó con un motivo
  escrito a mano y se reactivó, confirmando en ambos casos con una consulta directa a Supabase
  que el campo se escribió/borró de verdad, no solo en el estado local de React. El botón
  "Enviar a revisión"/"Generar y copiar"/"Generar y abrir" de la fila "Revisión" en "Links de la
  clienta" se probó sin errores de consola (la lectura del portapapeles y la apertura de pestaña
  nueva no se pudieron confirmar por limitaciones del navegador automatizado -- ninguna de las
  dos depende de código nuevo distinto al ya probado por separado con la navegación directa).
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de `ImportMeta.env`,
  cero nuevos).
- **No se tocó**: el link permanente y su comportamiento sin pausa/revisión, el link de muestra
  (marca de agua/5 días) ni el check-in en operación normal, el editor y su estado `bloqueada`
  (definitiva), los montos ni la lógica de "Cobrar anticipo"/"Cobrar liquidación". El catálogo de
  mensajes de WhatsApp (ya actualizado por el propio Isaac fuera de esta sesión, según indicó) no
  se tocó desde el código -- los mensajes de "Enviar a revisión"/control de acceso siguen siendo
  los que ya arma cada handler, no una plantilla nueva del catálogo.

## Link de muestra corto (2026-11-22, noche, aún más tarde)

Pedido explícito: todos los links de la clienta ya eran cortos (`/v/<codigo>`, `/puerta/<codigo>`,
`/datos/<codigo>`) menos el de MUESTRA desde el EDITOR -- el botón "Enviar por WhatsApp" con el
toggle "🎀 Muestra" activo seguía generando el blob largo clásico (`?v=1&d=...&iid=...&muestra=
1&exp=...`), justo el link que más se comparte (a cada prospecta) y el más largo/frágil de todos.

- **Causa real**: `getShareUrl()` (el que arma el link del editor) ya tenía desde el 2026-11-19
  la rama de link corto `/v/<codigo>[/<slug>]`, pero con una excepción explícita a propósito:
  `if (codigo && !esEnlaceMuestra)` -- en ese momento `/v/<codigo>` todavía no sabía leer
  `?muestra=1&exp=...`, así que se dejó el modo muestra siempre en el blob largo (comentario
  "deliberadamente no tocado por este cambio"). Esa excepción nunca se quitó cuando, en una
  sesión posterior (2026-11-19 "parte 2"), `/v/<codigo>` SÍ aprendió a entender `muestra`/`exp`
  (y `getShareUrlDesdeFila`, el generador de "Mis Invitaciones", SÍ se actualizó para usarlo --
  por eso ese otro botón de muestra ya salía corto, y el del editor no).
- **Fix de una línea real**: se quitó el `&& !esEnlaceMuestra` de `getShareUrl()` -- ahora, con
  código asignado, SIEMPRE devuelve el link corto sin importar el modo, muestra incluida. El
  formato largo se queda como estaba, solo como respaldo para invitaciones sin `codigoCorto`.
- **Bug nuevo que este fix habría introducido sin corregir aparte**: `aplicarModoMuestra(url)`
  (quien agrega `muestra=1&exp=...` DESPUÉS de `getShareUrl()`) asumía que `url` siempre traía ya
  un `?` puesto (cierto mientras el blob largo era la única forma posible en modo muestra) y
  pegaba el primer parámetro con `&` a secas -- sobre el link corto nuevo (`/v/<codigo>`, sin
  ningún `?`) eso habría dejado una URL rota (`/v/<codigo>&muestra=1...`, sin signo de
  interrogación). Corregido detectando `url.includes("?")` para decidir el separador correcto.
- **Punto 3 del encargo ("si alguna parte del modo muestra solo corría en la ruta clásica,
  extenderla"), confirmado por revisión de código que YA NO hacía falta nada más**: la
  resolución de `/v/<codigo>` (que preserva `muestra`/`exp` al hacer `replaceState` al link
  largo equivalente) y la lectura de `esVistaDeMuestra`/`muestraExpirada` (siempre desde
  `window.location.search` en vivo, sin importar por qué ruta se llegó) ya estaban completas
  desde la sesión de "links cortos, parte 2" -- el único hueco real era la GENERACIÓN del link
  en el editor, ya cerrado arriba.
- **No se tocó**: `MUESTRA_DIAS_VIGENCIA` (sigue en 5 días), el texto del mensaje de WhatsApp al
  enviar la muestra, el link permanente (`esEnlaceMuestra` en `false`, sin cambios), ni la
  resolución/compatibilidad de links largos ya compartidos (siguen funcionando igual).
- **Verificado en vivo contra producción real** (`invitaciones.invitamx.app`, solo lectura --
  se abrió la vista pública, nada se guardó/modificó): en el editor, con la invitación real
  "Emma Elizabeth" (`emma-elizabeth-8emn`) y el toggle "🎀 Muestra" activo, "Enlace de Invitación
  Resultante" mostró `https://invitaciones.invitamx.app/v/emma-elizabeth-8emn?muestra=1&exp=...`
  (corto, sin `d=` ni `iid=`); "Abrir link directo" abrió esa URL real y mostró la invitación con
  el banner "🎀 Esta es una MUESTRA..." y la marca de agua "VISTA PREVIA" de siempre, idéntica a
  como se veía con el link largo. Con el toggle en "Normal" el link volvió a su forma corta
  limpia (`/v/emma-elizabeth-8emn`, sin parámetros), confirmando que el modo permanente no
  cambió. `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de siempre).
- Commit y push pendientes al momento de escribir esta entrada -- ver `git log` si ya se hizo.

## Complementos (ventas adicionales) en "Administrar cliente" (2026-11-22, noche, más tarde)

Pedido explícito: `precio_total`/`precio_pagado` se editaban a mano y las casillas `pases_pagado`/
`pdf_pagado`/`checkin_pagado` solo prendían/apagaban la FUNCIÓN -- no sumaban nada al total, no
había catálogo, cantidades ni registro de qué se vendió aparte del paquete.

- **Columna nueva `complementos`** (jsonb, migración `add_complementos_column_invitaciones`
  aplicada al proyecto real "invita"): arreglo de `{clave, nombre, precio, cantidad, fecha}` por
  invitación. Agregada a `api/admin/list-invitaciones.ts` (`COLUMNAS_BASE`) y
  `api/admin/get-invitacion.ts`, y al tipo `InvitacionGuardadaRow`/`ComplementoInvitacion` nuevo.
- **Catálogo oficial con números reales** (antes solo existían como texto informativo
  `POLITICA_PASES`/`PRECIO_CONTROL_ACCESO_QR` -- se separaron en constantes numéricas
  `PRECIO_PASES_POR_PAQUETE`/`PRECIO_QR_ACCESO` de las que ahora derivan esos mismos textos, una
  sola fuente): Pases (Básico $150 / Estándar $180 / Premium incluido, no se ofrece), Control de
  Acceso QR ($150 plano, solo si pases ya está activo), PDF de Regalo ($99, Premium ya lo
  incluye), Familia extra ($20 c/u, con cantidad), Sección suelta ($99 c/u, solo Básico, una por
  cada sección de `SECCIONES_EXCLUSIVAS_PREMIUM` -- "familia"/"regalos" -- que todavía no esté
  desbloqueada), Ajustes extra ($99). `catalogoComplementosDisponibles(row)` recalcula qué
  ofrecer cada vez que se abre "+ Agregar complemento", para nunca re-ofrecer algo ya activo.
- **`handleAgregarComplemento`/`handleQuitarComplemento`**: mismo patrón "lee fresco de Supabase
  justo antes de escribir" que ya usa `handleRegistrarAbono` (para no pisar un cambio reciente
  desde otro lado) -- suman/restan precio×cantidad a `precio_total`, agregan/quitan el registro
  de `complementos`, y prenden/apagan el flag de cobro gemelo (`pases_pagado`/`checkin_pagado`/
  `pdf_pagado`) cuando el complemento tiene uno.
- **Hallazgo real durante la propia verificación en vivo** (no estaba en el diseño original):
  marcar solo el flag de cobro (como ya hacían las casillas de siempre) NO desbloqueaba la
  función real -- "pases"/"checkin" tienen su propio interruptor aparte DENTRO de
  `datos_completos` (`seccionesExcluidas`/`controlAccesoQR`) que es lo que de verdad decide si la
  sección se ve activa al abrir la invitación en el editor; antes de este hallazgo, agregar el
  complemento "Pases" prendía la casilla pero la sección seguía apagada hasta que el admin la
  prendiera a mano adentro del editor -- justo lo que el encargo pedía evitar ("la sección pases
  está desbloqueada" en la verificación). Se agregó `datosCompletosConFuncionDeComplemento()`
  (nueva, compartida por agregar/quitar) que además activa/desactiva esos interruptores reales
  para "pases"/"checkin"/"seccion-suelta:<id>" -- "pdf"/"familia-extra"/"ajustes-extra" no
  necesitan nada ahí (PDF nunca estuvo bloqueado por paquete/flag, es puramente informativo).
- **Guarda explícita del encargo**: no se puede quitar "Pases" mientras "Control de Acceso QR"
  siga activo -- revisa el FLAG (`row.checkin_pagado`), no solo si hay un registro de complemento
  "checkin" en la lista, para cubrir también el caso de un QR activado a mano con la casilla
  antes de este cambio.
- **Compatibilidad con lo que ya existe, por construcción, sin código extra**: una invitación con
  un flag prendido a mano SIN registro de complemento sigue viéndose activada (el catálogo nunca
  vuelve a ofrecer "Pases"/"PDF"/"Control de Acceso QR" si su flag ya está en `true`, los revisa
  directo) y su `precio_total` nunca se toca (el total solo cambia por una suma/resta explícita
  de agregar/quitar un complemento, nunca se recalcula desde cero a partir de los flags). Las
  casillas de siempre (`handleActualizarCampoInvitacion`) se dejaron intactas, siguen siendo
  editables a mano para corrección manual si hace falta.
- **El bug real que SÍ se encontró y arregló de paso, no relacionado al diseño de Complementos**:
  el input "Precio total ($ MXN)" es `defaultValue` (no controlado, para no pelear con lo que el
  admin esté tecleando) -- antes de este cambio, `precio_total` solo cambiaba por lo que el admin
  tecleaba ahí mismo, así que nunca hizo falta que se refrescara solo; con Complementos, el total
  también cambia DESDE AFUERA (agregar/quitar), y sin un `key` que fuerce el remount (mismo
  patrón que ya tenía "Pagado hasta ahora" al lado) el cuadro se quedaba mostrando el número
  viejo aunque "Falta pagar"/"Cobrar anticipo"/"Cobrar liquidación" ya reflejaran el correcto --
  encontrado al probar en vivo, corregido con el mismo `key={row.precio_total ?? "vacio"}`.
- **Verificado en vivo de punta a punta, con una fila de prueba REAL desechable** (creada por
  SQL directo -- `INSERT` en `invitaciones`, id `f9f1e824-...`, nombre "TEST COMPLEMENTOS
  BORRAR" -- en vez de una fila mockeada con id falso, porque la primera pasada con id falso no
  podía probar la ACUMULACIÓN real: cada "Agregar" leía "fresco" de una fila que no existe de
  verdad en Supabase, así que cada complemento nuevo pisaba al anterior en vez de sumarse --
  confirma que el patrón de lectura-fresca-antes-de-escribir solo se puede probar bien contra una
  fila real, nunca contra un id inventado): Básico $299 + Pases → $449 y sección "pases"
  desbloqueada en Supabase; + Control de Acceso QR → $599, `controlAccesoQR:true` en Supabase, el
  aviso de "activa el toggle" desaparece y aparece el campo de teléfono real; intentar quitar
  Pases con el QR puesto → bloqueado, nada cambia; quitar QR → $449, `controlAccesoQR:false`;
  quitar Pases → $299, `seccionesExcluidas` vuelve a traer "pases", ambos flags apagados;
  agregar Familia extra ×3 → +$60, línea "Familia extra ×3 — $60"; agregar Sección suelta:
  Padres y Padrinos → +$99, `seccionesExcluidas` ya no trae "familia". Fila de prueba eliminada
  de Supabase al terminar (`DELETE... returning id`, confirmado).
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de siempre, cero
  nuevos). Commit y push pendientes al momento de escribir esta entrada -- ver `git log` si ya
  se hizo.

## Consolidado: Links de la clienta (Copiar/Abrir/WhatsApp) + limpieza de botones repetidos (2026-11-22, noche)

Prompt consolidado que SUSTITUYE a los dos anteriores de la misma sesión (cobro por WhatsApp y
botón Abrir, ver las 2 entradas de abajo) -- "todo lo de ellos, corregido y junto, está aquí".
**Hallazgo al investigar antes de tocar nada**: la Parte 1 (links de pago de Mercado Pago
guardados globalmente por paquete + "Cobrar anticipo"/"Cobrar liquidación") **ya estaba
implementada por completo** desde la entrada de la tarde ("Cobrar por WhatsApp desde el admin",
commit `8915c4d`) -- `LinksPagoAdmin`/`LINKS_PAGO_VACIO`/`resolverLinkAnticipo`/
`handleCobrarAnticipo`/`handleCobrarLiquidacion`/el modal "💳 Links de pago" ya existían y
funcionan tal cual pide el encargo. Confirmado en vivo (modal abierto en el editor) que los 4
links reales de Mercado Pago del usuario ya están guardados y persistidos -- no se tocó ese
modal ni esos handlers, solo quedaba la Parte 1 pendiente: dejar de MOSTRAR el campo viejo de
`link_pago` pegado a mano por clienta.

- **Parte 1, lo único que faltaba**: se quitó de la pestaña "Pagos" de "Administrar cliente" el
  bloque completo "Link de pago (Mercado Pago, PayPal.me, etc.)" (input + botón "Enviar" +
  aviso de "ya no aplica, bórralo") y se eliminó `handleEnviarLinkPago` (su único handler,
  ahora sin ningún call site). La columna `link_pago` en Supabase, su tipo en
  `InvitacionGuardadaRow`, y el soporte genérico de `handleActualizarCampoInvitacion` para
  escribirla NO se tocaron -- el dato se queda intacto en la base, esta vista simplemente ya no
  lo lee ni lo muestra, tal como pedía el encargo explícitamente.
- **Parte 2, WhatsApp en cada link de "🔗 Links de la clienta"**: las filas Invitación/"link
  clásico"/Formulario/Control de acceso ya tenían Copiar+Abrir (de la entrada de la tarde) --
  se agregó un tercer botón verde "WhatsApp" a cada una:
  - **Invitación** y **"link clásico"**: `handleEnviarWhatsAppLinkInvitacionFila`/
    `handleEnviarWhatsAppLinkClasicoFila` (nuevas) reutilizan los resolvers ya existentes
    (`resolverLinkInvitacionFila`/`resolverLinkClasicoFila`, incluida la generación del código
    corto si todavía no existe) + un helper nuevo `enviarWhatsAppLinkClienta(row, url, intro)`
    que arma el mensaje y abre `api.whatsapp.com/send` al número de LA CLIENTA
    (`row.telefono_whatsapp`) -- mismo patrón de siempre, nunca lo manda solo.
  - **Formulario**: el botón WhatsApp reutiliza DIRECTO `handleEnviarFormularioDatos(row)` (ya
    existía, mandaba exactamente este link a este mismo número) -- sin duplicar nada nuevo.
  - **Control de acceso**: `handleEnviarWhatsAppLinkCheckinCliente` (nueva) manda el link al
    WhatsApp de LA CLIENTA (`row.telefono_whatsapp`), **deliberadamente distinto** de
    `handleEnviarLinkCheckin` (ya existía, manda al número del ENCARGADO de controlar la
    puerta, capturado aparte en `telefonoCheckinPorInvitacion` -- normalmente no es la clienta).
    No es un duplicado: destinatario y mensaje son distintos, los dos se quedan.
  - **Nueva fila "Vista previa"** en "Links de la clienta" (antes el link de muestra/preview
    solo existía como un botón de WhatsApp en la pestaña "Mensajes", sin Copiar ni Abrir): dos
    resolvers nuevos, `resolverLinkMuestraFila`/`handleCopiarLinkMuestraFila`/
    `handleAbrirLinkMuestraFila`, que reutilizan `getShareUrlDesdeFila` (ya existía, siempre
    agrega `&muestra=1&exp=...`) tras `asegurarDatosCompletos`. El WhatsApp de esta fila
    reutiliza `handleEnviarPreviewWhatsApp` (ya existía) sin cambios. Mismo patrón "Generar y
    copiar/abrir/enviar" que ya usaba la fila "Invitación" cuando el dato aún no está cargado.
  - **El pase por familia** (editor, "Lista Pases") ya tenía las tres acciones desde antes
    (Copiar/Abrir/WhatsApp vía `handleEnviarWhatsApp(index)`) -- confirmado por revisión, no
    necesitaba ningún cambio.
- **Parte 3, botones repetidos eliminados** (misma acción, mismo link, en dos lugares):
  - El bloque "📋 Enviar formulario de datos y fotos al cliente" + "👁️ Abrir" de la pestaña
    "Pagos" (llamaba exactamente `handleEnviarFormularioDatos`/`urlFormularioDatos(row)`, lo
    mismo que la fila "Formulario" de "Links de la clienta") -- eliminado completo; su texto
    explicativo ("El cliente llena fecha, ceremonia/recepción...") se movió como leyenda de esa
    fila en vez de perderse.
  - Los botones "Copiar"/"Abrir" del bloque de control de acceso en la pestaña "Pagos"
    (`handleCopiarLinkCheckin`/`handleAbrirLinkCheckin`, mismo link que la fila "Control de
    acceso") -- eliminados junto con esas dos funciones (sin call sites restantes). El input
    del teléfono del ENCARGADO + su botón "Enviar" (`handleEnviarLinkCheckin`) se quedó intacto
    -- es la única acción única real de ese bloque (destinatario distinto al de la clienta),
    renombrado el label a "Control de Acceso QR — avisar al encargado de la puerta" para
    reflejar que ya no es de donde se copia/abre el link.
  - La tarjeta "📤 Vista previa de su invitación" de la pestaña "Mensajes" (llamaba
    `handleEnviarPreviewWhatsApp`, ahora duplicado con la fila nueva "Vista previa") --
    eliminada; el resto de esa pestaña (textos predeterminados de `MENSAJES_PREDETERMINADOS`)
    sigue intacto, con una nota agregada avisando dónde quedó ese link ahora.
  - **No se tocó** ninguna acción única real: "Enlace de Invitación Resultante" del editor
    (Copiar + "🔗 Abrir link directo" + "Enviar por WhatsApp", ya cumplía desde antes, contexto
    distinto -- trabaja sobre la invitación ABIERTA en el editor, no sobre una fila guardada) ni
    los mensajes predeterminados genéricos, ni estados/abonos/archivar/notas.
- **Verificado en vivo** (servidor local efímero sirviendo `dist/` tras `npm run build`,
  `npm run lint` limpio -- mismos 6 errores preexistentes de siempre, cero nuevos): el modal
  "💳 Links de pago" del editor sigue mostrando los 4 links reales ya guardados (sin tocarlos).
  Como `/api/admin/list-invitaciones.ts` (función serverless) no corre bajo un `npx serve`
  estático, se interceptó `window.fetch` en el navegador para esa URL con una fila de prueba
  (datos de Sofía, de solo lectura, nunca escrita a Supabase) y así SÍ se pudo probar "Mis
  Invitaciones" de punta a punta con el código real: las 5 filas de "Links de la clienta"
  (Invitación/link clásico/Formulario/Control de acceso/Vista previa) se ven con sus 3 botones
  cada una; "Cobrar liquidación" y "Anticipo cobrado" (deshabilitado) calculan correcto con
  precio_total=$299/pagado=$150; el campo de Link de pago y el botón duplicado de Formulario ya
  no aparecen en "Pagos". Clic real en el nuevo botón "WhatsApp" de la fila "Control de acceso"
  abrió de verdad `api.whatsapp.com/send` con el número real de la clienta (+52 221 744 5410,
  tal cual está en Supabase) y el mensaje/link correctos -- confirmado visualmente en la propia
  pantalla de WhatsApp, sin enviar nada de verdad (no se le dio "Abrir aplicación"/"Continuar").
  Cero errores de consola en todo el recorrido.
- Commit y push pendientes al momento de escribir esta entrada -- ver `git log` si ya se hizo.

## Botón "Abrir" junto a cada "Copiar" en los links de la clienta (2026-11-22)

Pedido explícito: poder revisar un link antes de enviarlo, sin solo poder copiarlo. Alcance
confirmado grepeando TODOS los "Copiar"/"Copiar enlace" del panel: 6 lugares en `src/App.tsx`
tenían un link de cliente sin su "Abrir" -- se agregó junto a cada uno. Un 7° lugar ya lo
tenía desde antes ("Enlace de Invitación Resultante", pestaña Tema/Paquete: "Copiar enlace" +
"🔗 Abrir link directo" como botón aparte) -- no se tocó, ya cumplía el pedido.

- **Editor, pestaña "Lista Pases"** (link de pase por familia, `/v/<codigo>/<slug-familia>`):
  icono nuevo (flecha saliendo de un cuadro) junto al icono de "Copiar enlace personalizado" de
  cada invitado -- mismo `asegurarCodigoCortoParaEntregarLink()` + `getShareUrl(index, codigo)`
  que ya usa "Copiar", solo cambia el paso final (`window.open(..., "_blank", "noopener,noreferrer")`
  en vez de `navigator.clipboard.writeText(...)`) -- la URL nunca se reconstruye por otro camino.
- **"Mis Invitaciones", bloque "🔗 Links de la clienta"** (una fila por invitación guardada):
  - **Invitación** (`/v/<codigo>`): `resolverLinkInvitacionFila()` nueva -- antes
    `handleCopiarLinkInvitacionFila` resolvía el código (generándolo y guardándolo si la fila
    todavía no tenía uno) y copiaba, todo en una sola función; se separó en un resolver puro +
    dos acciones (copiar/abrir) que comparten exactamente la misma resolución, incluida la
    generación del código cuando falta ("Generar y copiar" ganó un "Generar y abrir" hermano).
  - **"Copiar link clásico (el de siempre)"** (el long-link `?v=1&d=...&iid=...`): mismo patrón,
    `resolverLinkClasicoFila()` + `handleAbrirLinkClasicoFila`.
  - **Formulario** (`/datos/<codigo>`) y **Control de acceso** (`/puerta/<codigo>`, solo si
    `row.checkin_pagado`): estos ya eran strings síncronas (`linkFormularioFila`/
    `linkCheckinFila`, de `urlFormularioDatos`/`urlControlAcceso`) -- "Abrir" nuevo es
    simplemente `abrirLinkClienta(url)` (helper nuevo, gemelo de `copiarLinkClienta`).
  - **Segunda ubicación del link de control de acceso** (pestaña "Vigencia y acceso" de la
    misma fila, junto a "Enviar"/"Copiar"): `handleAbrirLinkCheckin(row)` nuevo, misma
    `urlControlAcceso(row)` sin reconstruir nada.
- **Nada más cambió**: ninguna URL, texto ni comportamiento de "Copiar"; el resto de la app
  (invitación pública, formulario, check-in) no se tocó.
- **Verificado**: `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de
  siempre). En vivo (servidor local efímero sirviendo `dist/` tras el build, editando la
  invitación real "Emma Elizabeth" solo para ver la UI -- sin guardar ni tocar sus datos): el
  icono nuevo de "Abrir" aparece junto al de "Copiar enlace personalizado" en cada invitado de
  "Lista Pases", visualmente distinto (flecha-fuera-de-cuadro vs. el icono de copiar), y el
  clic no lanzó ningún error de consola. **El bloque de "Mis Invitaciones" no se pudo probar en
  vivo en este entorno** -- esa lista depende de `/api/admin/list-invitaciones.ts` (función
  serverless de Vercel), que no corre bajo un `npx serve` estático de `dist/` (mostró "No se
  pudieron cargar tus invitaciones", esperado en este entorno de prueba, no un bug del cambio).
  Esa parte se verificó solo por revisión de código -- reutiliza el mismo patrón ya probado y
  en producción de "Enlace de Invitación Resultante" (`asegurarCodigoCortoParaEntregarLink` +
  `window.open(..., "_blank", "noopener,noreferrer")`). Pendiente que el usuario confirme los
  botones de "Mis Invitaciones" en producción real.
- Commit y push pendientes al momento de escribir esta entrada -- ver `git log` si ya se hizo.

## El formulario de datos (IntakeForm) se viste con el tema de la invitación (2026-11-22)

Pedido explícito: `/datos/<codigo>` (y su equivalente largo `?intake=1&iid=...`) se veía como un
formulario administrativo genérico (fondo gris azulado, azul oscuro, píldoras verdes, cajas
lavanda/menta) sin nada del tema que la clienta compró -- la clienta pasaba de su invitación
espectacular a un formulario de oficina. Cambio puramente de presentación: ningún campo, orden,
interruptor, botón, texto funcional, lógica de guardado, tabla ni link cambió.

- **`resolverTemaEfectivo(datos, tema)`** (nueva, exportada en `templates.ts`): la lógica de
  overrides de "A Medida" (tema `personalizado`, o cualquier tema con `datos.personalizacion`)
  que antes vivía inline al inicio de `generarHTMLFinal` se extrajo a esta función pura, sin
  cambiar ni una línea de su comportamiento -- `generarHTMLFinal` ahora solo llama
  `tema = resolverTemaEfectivo(datos, tema)`. Esto es lo que permite que `IntakeForm` (`App.tsx`)
  calcule el tema EFECTIVO exacto de una invitación (colores/tipografía reales, con overrides
  si los tiene) sin duplicar esa lógica -- "reutilizando las MISMAS definiciones" es literal,
  no solo parecido. `construirUrlGoogleFonts(tema)` también se exportó (antes privada de
  `templates.ts`) para que `IntakeForm` pida exactamente las mismas familias de Google Fonts.
- **`IntakeForm`**: al cargar la invitación, busca su `tema` en el catálogo (`temas` de
  `data.ts`), calcula el efectivo con `resolverTemaEfectivo`, y lo guarda en `temaCliente`
  (estado nuevo) -- con `dorado-clasico` como respaldo elegante neutro ("crema y dorado
  genérico de InvitaMX", pedido explícito) si la invitación no tiene tema guardado o no coincide
  con ninguno del catálogo. `bgImageCliente` (nuevo) lee `datos_completos.bgImages[tema.id]` --
  la MISMA foto de fondo personalizada por tema que ya usa la invitación real (`templates.ts`,
  `datos.bgImages[tema.id]`), con el degradado del tema (`tema.bgGradient`) como respaldo si no
  hay foto. Un `useEffect` nuevo inyecta/actualiza un `<link rel="stylesheet">` con
  `construirUrlGoogleFonts(temaCliente)` en `document.head` en cuanto se conoce el tema real.
- **Todo el render del formulario** (antes Tailwind fijo: `bg-slate-50`/`text-slate-900`/
  `bg-indigo-*`/`bg-emerald-*`) ahora usa `style={{...}}` inline con los campos de
  `temaCliente` (mismo patrón ya establecido en este archivo para las miniaturas de "mini
  apertura" -- Tailwind no puede generar clases con un color que solo se conoce en tiempo de
  ejecución) más un `<style dangerouslySetInnerHTML>` con clases `.intake-*` (mismo patrón que
  `tema.customStyle` de `templates.ts`) para estados como `:focus`/`:hover` que no se pueden
  expresar con `style` inline. Encabezado nuevo arriba de todo: `{prefijoTitulo} {nombre}` (ej.
  "XV Años de Sofía", mismo texto exacto que ya arma `generarHTMLFinal` para el `<title>`/
  calendario) + la fecha ya guardada formateada ("Sábado, 22 de mayo de 2027") + un separador
  ornamental (líneas + el `decorativeEmoji` del tema). Títulos de sección sin emoji y sin azul
  oscuro (`Ceremonia`, `Recepción`, `Itinerario`, etc.); la caja de ayuda de interruptores y las
  3 cajas de estado (cotización/aperturas/confirmaciones) se restilizaron igual, conservando
  sus botones (`Ya pagué, avisar`, `Copiar recordatorio`) tal cual.
- **`IntakeSeccionToggle`** ganó un prop `colorAcento` -- el estado "Incluida" (píldora + pista
  del switch) se pinta con el acento del tema; "No incluida" se queda neutro a propósito (la
  función prendido/apagado debe leerse igual sin importar el tema).
- **Barra fija de guardar en celular** (`sm:hidden`, bajo el ancho 640px): mismo `onClick=
  {handleEnviar}` que el botón final, para no tener que bajar 4-5 pantallas de scroll. El
  contenedor raíz lleva `pb-28 sm:pb-6` para que esa barra nunca tape el último campo.
- **Confirmación al guardar, cambio de comportamiento explícito pedido**: antes, guardar con
  éxito reemplazaba TODO el formulario por una pantalla fija de "¡Gracias!" sin forma de seguir
  editando sin recargar. Ahora `enviado` ya no causa un `return` aparte -- se muestra un aviso
  inline con el estilo del tema ("¡Listo! Tu información quedó guardada. Puedes cerrar esta
  página o seguir editando cuando quieras con este mismo link.") arriba del formulario, que
  SIGUE completo y editable debajo. `handleEnviar` limpia `enviado` al iniciar un guardado nuevo,
  así no se queda un aviso de éxito viejo visible mientras un guardado más reciente está en
  vuelo o si ese nuevo guardado falla (el aviso de error, ya existente, sigue siendo rojo/rosa
  fijo -- no se tematizó a propósito, es la única excepción: un color de error reconocible
  universalmente es más seguro que uno que cambie con cada tema).
- **Verificado en vivo** (servidor local efímero sirviendo `dist/` tras `npm run build`, con la
  invitación real de Sofía -- `sofia-1fse`, tema Dorado Clásico, con una foto de fondo real
  ya guardada para ese tema): `/datos/sofia-1fse` se ve exactamente Dorado Clásico (fondo con
  foto + veladura, tarjeta crema, encabezado "XV Años de Sofía" + "Sábado, 22 de mayo de 2027"
  en Playfair Display dorado, toggles dorados, sin azul ni verde). Se guardó de verdad (clic
  real en "Guardar mi información") -- confirmado `intake_actualizado_en` actualizado en
  Supabase -- y el aviso de confirmación apareció con el formulario todavía completo y editable
  debajo, tal como pide el encargo. Barra fija de guardar confirmada visible en 390×844
  (celular) sin tapar el último campo, y correctamente oculta en 1100×700 (escritorio). **Se
  abrió también, solo en modo lectura (sin guardar nada)**, una invitación real distinta con
  tema "Vuelo de Mariposas" (`emma-elizabeth-kk3n`) -- se vistió automáticamente de morado/lavanda
  con su propia tipografía (Cormorant Garamond) y su propio fondo de mariposas, sin tocar ni una
  línea de código por tema, confirmando que aplica a los 15 temas del catálogo.
- `npm run build`/`npm run lint` limpios (mismos 6 errores preexistentes de `ImportMeta.env`,
  cero nuevos). Pendiente: commit y push (ver `git log` si ya se hizo en una entrada posterior).

## Escáner de QR embebido en el control de acceso + saludo genérico sin marca de puerta (2026-11-22)

Sustituye por completo cualquier intento anterior de este mismo arreglo (sin PIN ni claves --
la llave sigue siendo el link de control mismo, ver entradas de abajo). El usuario reportó dos
problemas reales con el control de acceso: (1) el link de control solo mostraba la lista, sin
forma de escanear sin salir a la cámara nativa del celular; (2) el QR del pase, escaneado por
CUALQUIERA (incluido el propio invitado con su celular), abría el registro de su familia y
permitía confirmar su propia entrada -- el pase trae el QR, así que un invitado podía
"registrarse" solo, sin pasar por la puerta.

- **"Marca de celular de puerta"** (`localStorage`, clave `puerta_ok_<invitacionId>` -- por
  `invitacionId`, no por `codigoCorto`, para que una sola marca cubra la ruta corta Y la larga
  sin duplicar lógica): abrir el control GENERAL de una invitación (`/puerta/<codigo>` o el
  largo `?checkin=1&iid=...`, SIN `&fam=`/slug de familia) marca ese navegador, dentro de
  `CheckinPage` (`src/App.tsx`), justo después de cargar los datos con éxito. Abrir el link de
  UNA familia (`/puerta/<codigo>/<slug>` o el largo con `&fam=...`) en un navegador SIN esa
  marca ya NO muestra el registro real -- muestra un saludo genérico ("¡Hola! Este es un pase de
  acceso: muéstralo en la puerta cuando llegues."), sin nombre de familia, sin pases, sin
  formulario y sin link al control general. Con la marca, se comporta exactamente igual que
  antes (sin cambios en esa ruta). El chequeo de la marca es deliberadamente conservador: si
  `localStorage` no está disponible (navegación privada estricta), se asume que NO hay marca
  (muestra el saludo) en vez de arriesgar mostrar datos reales por error. Cuando falta la marca,
  `CheckinPage` ni siquiera consulta Supabase -- por diseño, para que abrir/reenviar el propio
  pase nunca dispare ninguna lectura de datos de la familia o del evento.
- **Escáner embebido** (`EscanerPaseQR`, componente nuevo en `src/App.tsx`, justo antes de
  `CheckinPage`): botón "📷 Escanear pase" arriba de la lista general, abre un overlay de
  cámara a pantalla completa (`getUserMedia({video:{facingMode:"environment"}})`) SIN salir de
  la página. Decodifica con `BarcodeDetector` nativo cuando el navegador lo trae (Chrome/Android,
  más rápido, cero costo) y cae a `jsQR` (paquete nuevo, puro JS, instalado con
  `npm install jsqr`) dibujando cada frame en un `<canvas>` oculto cuando no existe -- Safari/iOS
  no lo trae en todas sus versiones, así que el respaldo es necesario, no opcional. Un
  "enfriamiento" de 1.5s por texto idéntico evita que el mismo QR dispare decenas de detecciones
  por segundo mientras sigue frente a la cámara. Si se niega el permiso de cámara, muestra un
  aviso y un botón "Usar la lista" -- la lista sigue siendo la vía alterna de siempre, sin
  cambios.
- **`resolverPaseEscaneado()`** (función pura nueva, módulo-nivel, junto a
  `resolverFamiliaPorSlug`): recibe el texto crudo decodificado y lo valida contra ESTA
  invitación -- acepta los dos formatos reales que puede traer un pase (`mostrarPaseFijo()` en
  `templates.ts`, sin tocar): el corto `/puerta/<codigoCorto>/<slug-familia>` (comparado contra
  el `codigoCorto` de esta invitación) y el largo `?checkin=1&iid=...&fam=...` (comparado contra
  este `invitacionId`). Si el código/iid no coincide, o la familia no existe en la lista, regresa
  `null` -- el escáner muestra "Ese pase no corresponde a este evento" (se borra solo a los 2.5s)
  y SIGUE escaneando, sin cerrar la cámara ni adivinar una coincidencia parcial. Si resuelve bien,
  cierra la cámara y muestra la ficha de esa familia DENTRO del mismo montaje de `CheckinPage`
  (estado nuevo `familiaEscaneada`, sin navegar a `/puerta/<codigo>/<slug>` -- así no hace falta
  otra carga de página ni otro viaje a Supabase, los invitados/registros ya están en memoria) --
  misma lógica de siempre de "pases asignados / ya se registraron X / confirmar entrada". Al
  confirmar, dos botones nuevos exclusivos de este flujo: "📷 Escanear siguiente pase" (limpia el
  estado y reabre la cámara) y "Volver a la lista" (limpia el estado, sin reabrir nada).
- **Nada de lo existente cambió de comportamiento**: `templates.ts` (el QR del pase) intacto;
  la tabla `checkins` y sus conteos/avisos de "ya se registraron X" sin tocar; `/v/<codigo>`,
  `/v/<codigo>/<slug>` y `/datos/<codigo>` sin tocar; abrir el link de una familia CON la marca
  (el celular de la puerta, de siempre) se sigue viendo exactamente igual que antes de este
  cambio, botón "← Ver lista completa" incluido, sin los botones nuevos del flujo de escaneo.
- **Verificado en vivo** (servidor local efímero sirviendo `dist/` tras `npm run build`, con el
  fixture real `sofia-1fse`/`cbbcf3aa-9424-4a76-ac57-b7727f92b218` ya conocido de la entrada de
  abajo): `/puerta/sofia-1fse` muestra el botón "Escanear pase" y marca el navegador
  (`localStorage.getItem('puerta_ok_<iid>')` queda en `"1"`); `/puerta/sofia-1fse/familia-garcia`
  con esa marca muestra el registro real de Familia García (4 pases, 1 ya registrado) sin
  cambios; tras `localStorage.clear()`, la MISMA ruta de familia muestra solo el saludo genérico,
  sin ningún dato. La resolución de `resolverPaseEscaneado()` se verificó aparte con Node
  (misma lógica exacta, 6 casos: corto válido, corto de otro evento, largo válido, largo con
  otro `iid`, texto que no es URL, URL sin ningún patrón conocido) -- los 6 resuelven como se
  espera. No se pudo probar la cámara real en el navegador automatizado (sin hardware de cámara
  en ese entorno) -- la decodificación en sí (`jsQR`/`BarcodeDetector`) no se tocó más allá de
  usarla tal cual, y el camino de validación que sí depende de este código (`resolverPaseEscaneado`)
  quedó cubierto por las pruebas de Node.
- `npm run lint`/`npm run build` limpios (mismos 6 errores preexistentes de `ImportMeta.env`,
  cero nuevos). Pendiente: commit y push (ver si ya se hizo en una entrada posterior o
  `git log`), y que el usuario confirme en un celular real que la cámara escanea el pase de
  Familia García y lo registra sin salir del control.

## QR del pase a 400x400 para que lo lea la cámara de un celular (2026-11-21 noche)

Seguimiento directo de la entrada de abajo (links cortos). El usuario probó escanear el QR del
control de acceso con la cámara de un celular y "no activó nada" -- no era un bug de la URL
(ya corta, ~55 caracteres), sino de densidad de imagen: el `<img>` del QR se muestra a 150px
pero la imagen se pedía a `api.qrserver.com` en `size=180x180` -- muy pocos píxeles por módulo
para que una cámara lo decodifique bien en pantalla o impreso, sin importar cuán corta sea la
URL codificada.

- **Fix de una línea** en `src/templates.ts` (el script del pase que genera el QR del control de
  acceso): `size=180x180` → `size=400x400`. El `<img id="qr-acceso-img" width="150" height="150">`
  no se tocó -- sigue mostrándose igual de chico, solo llega con más resolución.
- Verificado por código y por el bundle de producción (`grep` sobre `dist/assets/*.js` tras
  `npm run build`) que `size=400x400` queda embebido en el script generado. **No se pudo
  confirmar visualmente en vivo** (navegar a `/v/sofia-1fse/garcia` con un servidor local
  sirviendo `dist/`) por la misma flakiness de `document.write()` ya documentada en la entrada de
  abajo -- el init script del pase no corrió en absoluto en esa sesión de navegador automatizado
  (ni el nombre del invitado ni el bloque del QR se llenaron), no es algo nuevo de este cambio.
- Commit `78d91a5` en `main`, pusheado. Pendiente que el usuario confirme en producción real
  (no en este entorno de prueba) que el QR ya se deja leer por la cámara sin reintentos.

## Links cortos para puerta, pases por familia y formulario (2026-11-21)

Pedido explícito: todos los links del sistema (no solo la invitación) deben colgar del mismo
`codigoCorto` corto y fácil de dictar/compartir, sin romper ni un solo link largo ya entregado.

- **Rutas nuevas**: `/puerta/<codigoCorto>[/<slug-familia>]` (equivalente corto de
  `?checkin=1&iid=...[&fam=...]`), `/datos/<codigoCorto>` (equivalente de `?intake=1&iid=...`),
  y `/v/<codigoCorto>/<slug-familia>` (equivalente de `/v/<codigoCorto>?fam=...`, el pase por
  familia). Las tres se resuelven en `src/App.tsx` exactamente igual que `/v/<codigoCorto>`
  (agregado el 2026-11-19): un `useEffect` hace un SELECT a Supabase por `codigoCorto`, y al
  resolver hace `replaceState` al equivalente LARGO (`?checkin=1&iid=...`, etc.) -- de ahí en
  adelante `isCheckinMode`/`isIntakeMode` (que leen `queryParams`, recalculado cada render desde
  `window.location.search`) lo toman exactamente igual que si hubiera llegado por el link largo
  de siempre, sin tocar `CheckinPage`/`IntakeForm`. `vercel.json` ya reescribe cualquier ruta no
  -`/api/*` a `index.html` (sin cambios ahí); `middleware.ts` sí necesitó la misma excepción de
  Basic Auth que ya tenía `/v/` (agregado `/^\/puerta\//`/`/^\/datos\//`).
- **Slug de familia** (`slugFamilia`/`slugsDeInvitados`/`resolverFamiliaPorSlug`, nuevas,
  módulo-nivel en `App.tsx`, cerca de `generarCodigoCortoUnico`): minúsculas, sin acentos, todo
  lo que no sea letra/número colapsa a un guión. `slugsDeInvitados` calcula el slug de CADA
  invitado en el mismo orden del arreglo -- si dos producen el mismo slug base, el segundo (y
  siguientes) ganan un sufijo numérico estable ("-2", "-3"...) según su POSICIÓN, nunca por azar.
  Se recalcula en vivo en los dos sentidos (construir el link y resolver el slug de vuelta), sin
  persistir el slug en ningún lado -- si la lista de invitados cambia entre que se comparte un
  link y se abre, el slug se recalcula igual de consistente.
- **El QR del pase** (`mostrarPaseFijo()` en `templates.ts`) ahora codifica
  `/puerta/<codigo>/<slug>` en vez de `?checkin=1&iid=...&fam=...`, cuando la invitación tiene
  `codigoCorto` Y la página trae `?famSlug=` en la URL (puesto por `App.tsx` al resolver el
  link de la invitación, sea por `/v/<codigo>/<slug>` o por el `?fam=` de siempre) -- si falta
  cualquiera de los dos, cae al link largo de check-in de toda la vida. `famSlug` se decidió
  pasar por querystring en vez de recalcularlo ahí mismo porque `datosInvitacion.invitados` en
  ese contexto solo trae a ESTE invitado (ya recortado por privacidad), así que no podría
  desambiguar una colisión de slugs por su cuenta -- el slug ya resuelto viaja completo.
- **`getShareUrl()`** (el link de pase que genera/copia el editor): cuando hay `codigoCorto`,
  ahora arma `/v/<codigo>/<slug>` en vez de `/v/<codigo>?fam=...`; el fallback de blob largo
  (`?v=1&d=...&g=...`, invitaciones sin código) sigue igual pero ahora también agrega
  `&famSlug=` cuando la invitación ya tiene `codigoCorto` (puede pasar con una "muestra", que
  siempre usa el blob largo aunque la invitación real ya tenga código) -- así el QR del pase
  sale corto incluso cuando el link principal de esa vista salió largo por otra razón.
- **Botones del panel que ahora usan los links cortos** (`urlFormularioDatos`/`urlControlAcceso`,
  nuevos, con fallback automático al link largo si la fila no tiene `codigoCorto` todavía):
  "📋 Enviar formulario de datos y fotos al cliente" + su botón "👁️ Abrir" de previsualizar, los
  dos links de "Enviar control por WhatsApp"/"Copiar" del control de acceso, y los renglones
  "Formulario"/"Control de acceso" de "Links de la clienta" en "Mis Invitaciones". El QR de
  "Control de Acceso QR" del propio editor (junto a cada invitado en "Lista Pases") también usa
  el link corto cuando `datos.codigoCorto` existe.
- **`CheckinPage` (la pantalla pública de control de acceso) también se actualizó**: ahora
  guarda el `codigoCorto` de la fila que ya lee (`dc.codigoCorto`, gratis, viene en el mismo
  SELECT de siempre) y usa ese código para sus propios links internos ("← Ver lista completa",
  cada familia de la lista) -- **bug real encontrado y corregido antes de terminar**: sin esto,
  alguien que entra por `/puerta/<codigo>/<slug>` y da clic en "Ver lista completa" (un `<a
  href="?checkin=1&iid=...">` normal, recarga completa de página) hubiera vuelto a caer en la
  MISMA ruta `/puerta/<codigo>/<slug>` (el `href` relativo no toca el pathname) -- el resolver
  habría vuelto a resolver ESE MISMO slug de familia en vez de mostrar la lista general, dejando
  ese botón roto para cualquiera que hubiera entrado por la ruta corta. Verificado en vivo que
  ahora sí limpia la familia correctamente (ver abajo).
- **Bug real encontrado y corregido durante la implementación, no en la verificación**: la
  primera versión puso las guardias de "cargando"/"no encontrado" de `/puerta/`+`/datos/`
  inmediatamente después de la guardia de "modos combinados" ya existente -- eso causó
  `Error: Rendered more hooks than during the previous render` en cuanto `rutaCortaEstado` pasaba
  de "cargando" a "listo"/"no-encontrado" DENTRO del mismo montaje (hay más `useEffect`/`useState`
  declarados más abajo en el componente, como el de `isEmbedMode`, que solo se alcanzaban en
  UNO de los dos renders). Las guardias de `isViewMode`/`bloqueoCheck`/`linkCortoEstado` ya
  existentes son seguras porque `isViewMode` es constante durante toda la vida del montaje
  (siempre termina retornando en el mismo punto, sin importar el resto); la mía dependía de un
  estado que SÍ cambia durante la vida del montaje, así que se movió a después de TODOS los
  hooks del componente (justo antes de `isCheckinMode`/`isIntakeMode`, donde no hay ningún hook
  más abajo) -- mismo criterio que ya aplican esos dos bloques.
- **Compatibilidad hacia atrás, confirmada en vivo, no solo leída en el código**: los 4 formatos
  largos (`?checkin=1&iid=...`, `?checkin=1&iid=...&fam=...`, `?intake=1&iid=...`,
  `/v/<codigo>?fam=...`) siguen abriendo exactamente lo mismo que antes -- no se quitó ningún
  parseo existente, solo se agregaron casos nuevos en paralelo.
- **Verificado en vivo** (servidor local efímero puerto 5577, fila de prueba real insertada a
  mano en la tabla real de Supabase -- `codigoCorto` propio, 2 familias con el mismo slug base
  a propósito, "Familia García"/"Familia Garcia", para forzar la desambiguación -- borrada al
  terminar, confirmado con un SELECT después del DELETE): `/puerta/<codigo>` muestra la lista
  general con los 3 hrefs ya en formato corto y con "familia-garcia"/"familia-garcia-2"
  correctamente desambiguados; `/puerta/<codigo>/familia-garcia-2` resuelve la familia SIN
  acento (la segunda, no la primera); "← Ver lista completa" desde ahí vuelve a
  `/puerta/<codigo>` (sin familia) -- confirma el fix del bug de arriba; `/datos/<codigo>` abre
  el formulario de la invitación correcta; `/v/<codigo>/familia-lopez` resuelve el pase de esa
  familia y dicha URL queda con `&famSlug=familia-lopez` tal como se diseñó; los 2 formatos
  largos de compatibilidad (`?checkin=1&iid=...&fam=...` y `/v/<codigo>?fam=...`) siguen
  abriendo lo mismo que antes, y en el caso de `?checkin=1&iid=...`, "Ver lista completa" YA
  usa el link corto (porque `CheckinPage` ahora conoce el `codigoCorto` de la fila sin importar
  por dónde se entró) -- mejora adicional, no pedida explícitamente pero consistente con el
  objetivo. La construcción del `checkinUrl` corto/largo del QR del pase (en `templates.ts`) se
  verificó aparte con un script standalone de Node (el `document.write()` de la vista de
  invitado no refrescó su `DOMContentLoaded` de forma confiable en el navegador automatizado de
  esta sesión -- limitación ya documentada de esta técnica, no un bug de este cambio) -- los 3
  casos (código+slug, sin código, con código sin slug) dieron el resultado esperado.
  `npm run lint`/`npm run build` sin errores nuevos (los mismos 6 de siempre, confirmados antes
  y después). Sin cambios en `docs/guia-de-uso.md`/`public/manual.html` -- ningún botón visible
  cambió de nombre/comportamiento, solo el formato de la URL que ya generaban.
- Commit en `main`, pusheado -- Vercel debería redesplegar solo.

## Cobrar por WhatsApp desde el administrador: links de pago por invitación (2026-11-21)

Pedido explícito: el admin pega UNA sola vez sus links de pago (Mercado Pago/Clip), y cada
invitación guardada gana botones que abren WhatsApp con el mensaje de cobro ya armado y el link
correcto según su plan y su saldo.

- **Columna nueva en Supabase**: `invitaciones.links_pago` (jsonb), migración
  `add_links_pago_admin_column` aplicada al proyecto real (`ahwcilcejffgddeeuiux`). Vive en la
  MISMA fila global única (`FONDOS_ROW_ID`) que ya usa `fondos_personalizados` -- mismo patrón,
  no una tabla nueva. Confirmado que un upsert con `links_pago` en el payload (sin incluir
  `fondos_personalizados`) NUNCA toca esa otra columna -- PostgREST solo actualiza las columnas
  del payload, no la fila entera.
- **"💳 Links de pago"** (botón nuevo en la cabecera, grupo "Ver todo", junto a "💰 Ingresos"):
  modal con los 4 campos pedidos (anticipo Básico/Estándar/Premium, monto abierto). Se carga en
  la MISMA petición que ya trae `fondos_personalizados` al arrancar (una columna más del mismo
  select, sin viaje de red extra) y se guarda completo de un jalón (`handleGuardarLinksPago`) --
  a diferencia de `guardarFondoEnSupabase` (que SÍ necesita leer-mezclar-escribir porque es un
  objeto por tema), aquí el admin edita los 4 campos juntos en un solo formulario, así que
  reemplazar el objeto entero es lo correcto.
- **"💬 Cobrar anticipo"/"💬 Cobrar liquidación"** (dos botones nuevos en "Mis Invitaciones",
  pestaña "💳 Pagos" de cada fila, junto al "Falta pagar: $X"): mismo patrón que
  `handleEnviarLinkPago` ya existente -- solo ABREN WhatsApp con el mensaje y el link listos, el
  admin le sigue dando "Enviar" él mismo, y nunca tocan `precio_pagado`/abonos (eso se sigue
  registrando a mano cuando el pago se refleja). `resolverLinkAnticipo()` decide el link: si
  `precio_total` coincide EXACTO con el precio base del plan (`PRECIO_BASE_PAQUETE`: Básico $299/
  Estándar $499/Premium $799, ver "Business/pricing policy" más abajo), usa el link fijo de ese
  plan; si no (trae extras), usa el link de monto abierto y el mensaje agrega "(ingresa el monto
  de $X)" -- ese agregado no estaba en el texto literal del encargo para el caso de anticipo
  (sí para liquidación), pero el encargo pedía explícitamente "el mensaje dice el monto exacto a
  ingresar" para ese caso, así que se replicó la misma coletilla de la liquidación. "Cobrar
  anticipo" se deshabilita solo ("Anticipo cobrado") cuando lo pagado ya cubre el 50% calculado;
  "Cobrar liquidación" se deshabilita ("Liquidada") cuando el saldo llega a $0. Ambos avisan
  igual que los botones de WhatsApp ya existentes si la invitación no tiene `telefono_whatsapp`
  guardado, y avisan "Configura primero tus links de pago" si el link que necesitan está vacío.
- **Requisito #3 del encargo (mismos botones en el editor) -- revisado y NO aplica**: se
  confirmó leyendo el código que el editor (la pantalla donde se diseña la invitación) NO tiene
  ninguna "zona de datos del pedido/cliente" propia -- `precio_total`/`precio_pagado`/`estado`
  solo se gestionan dentro de "Mis Invitaciones" (y, aparte, dentro de `IntakeForm`, el formulario
  PÚBLICO del cliente -- un componente completamente distinto, no el editor del admin). El
  encargo decía "SI el editor ya muestra..." -- como no existe esa zona, no se agregó nada ahí
  para no inventar una pantalla nueva fuera de lo pedido.
- **Verificado en vivo contra el proyecto real de Supabase** (no un mock): se guardaron 4 links
  de prueba desde el modal real, confirmados con una consulta SQL directa (los 4 valores exactos,
  `fondos_personalizados` intacto); se recargó la página completa y el modal volvió a mostrar los
  4 links guardados (persistencia real confirmada, no solo estado de React). **Los links de
  prueba se borraron (`links_pago = null`) antes de terminar**, para no dejar URLs falsas
  (`mpago.test/...`) configuradas en el proyecto real. La lógica de cálculo/decisión
  (`calcularAnticipo`/`calcularSaldoPendiente`/`resolverLinkAnticipo`) se verificó aparte con los
  4 escenarios exactos del encargo (Estándar $499 sin pagos → anticipo $250 + link fijo; con
  extras → link abierto; abono parcial → saldo correcto; liquidada → deshabilitado) en un script
  standalone de Node, reproduciendo la función tal cual del archivo. No se pudo probar
  visualmente el renderizado real de los 2 botones nuevos en "Mis Invitaciones" contra datos
  reales -- el servidor de desarrollo local no sirve `/api/admin/list-invitaciones` (función
  serverless de Vercel), mismo límite ya documentado en la entrada de abajo.
- `npm run lint`/`npm run build` limpios (mismos 6 errores preexistentes de `ImportMeta.env`).
- `docs/guia-de-uso.md`, `public/manual.html` y `D:\InvitaMX\invitamx-manual-usuario.html`
  actualizados con los botones nuevos.
- Commit en `main`, pusheado.

## Botón "⟳ Actualizar" de la app (PWA) y error honesto en "Mis Invitaciones" (2026-11-21)

Dos defectos reales reportados (vistos en vivo en la PWA instalada en la PC, donde "Mis
Invitaciones" mostró "Aún no has guardado ninguna invitación" pese a tener 12 guardadas, mientras
Chrome normal sí las listaba):

1. **La ventana de la PWA instalada no tiene botón de recarga ni barra de direcciones** -- si
   arranca con estado/caché viejo, el admin no tiene forma de refrescarla. El "Actualizar" que ya
   existía DENTRO del modal de "Mis Invitaciones" solo vuelve a pedir la lista (`cargarListaInvitaciones`),
   nunca recarga la app completa.
2. **El estado vacío mentía cuando la carga de verdad FALLABA**: si el `fetch` a
   `/api/admin/list-invitaciones` fallaba (ej. un 401 de texto plano del middleware hace que
   `resp.json()` truene), `listaInvitaciones` se quedaba en `[]` y el modal mostraba el mensaje de
   "cuenta nueva sin datos" -- indistinguible de un error real de carga.

- **Fix 1**: botón nuevo, permanente, "⟳ Actualizar" en la barra principal del editor (grupo
  "Cuenta / dispositivo", justo después de "Instalar app") -- al pulsarlo: `registration.update()`
  si hay service worker registrado (sin esperar su resultado), borra cualquier Cache Storage
  (`caches.keys()`/`caches.delete()`, por defensa -- hoy `sw.js` no cachea nada), y
  `window.location.reload()`. No depende de `beforeinstallprompt` ni de si la app está instalada
  -- se ve y funciona igual en navegador normal y en modo standalone. `public/sw.js`,
  `public/manifest.json` y el registro del service worker en `index.html` NO se tocaron.
- **Fix 2**: estado nuevo `errorCargaInvitaciones` (`string | null`) -- `cargarListaInvitaciones`
  lo limpia al INICIO de cada carga y lo llena en su `catch` con el mensaje del error (el toast de
  error existente se queda igual, sin cambios). Tanto el modal de "Mis Invitaciones" como el
  Dashboard de Ingresos (que comparten el mismo `listaInvitaciones.length === 0` para el mismo
  mensaje) ahora revisan `errorCargaInvitaciones` ANTES que el mensaje de "vacío": si hay error,
  muestran un aviso claro con botón "Reintentar" (vuelve a llamar `cargarListaInvitaciones`) y
  NUNCA el mensaje de "Aún no has guardado ninguna invitación" en ese caso. No se tocó el
  endpoint, el middleware, los filtros/pestañas (sigue abriendo en "Activas") ni ningún otro panel.
- **Verificado en vivo, sin necesitar simular nada**: el servidor de desarrollo local no sirve
  `/api/admin/list-invitaciones` (es una función serverless de Vercel) -- abrir "Mis Invitaciones"
  ahí reproduce el fallo real de carga de punta a punta: apareció el aviso nuevo con "Reintentar",
  NUNCA el mensaje de "vacío"; "Reintentar" volvió a intentar (mismo toast de error de siempre) sin
  romper nada. El botón "⟳ Actualizar" nuevo se confirmó con un marcador en `window` (se perdió
  tras el clic, prueba de que SÍ fue un reload real, no solo un re-render) y sin errores de
  consola nuevos.
- `docs/guia-de-uso.md`, `public/manual.html` y `D:\InvitaMX\invitamx-manual-usuario.html`
  actualizados con el botón nuevo (regla fija de este archivo). El archivo de D: ya estaba
  desactualizado desde antes de este cambio (sigue diciendo "Deluxe", le faltan varios botones
  agregados en sesiones posteriores) -- no se corrigió esa deriva completa por estar fuera de
  alcance de este encargo puntual, solo se agregó la fila nueva en el mismo lugar que las otras 2
  copias.
- `npm run lint`/`npm run build` limpios (mismos 6 errores preexistentes de `ImportMeta.env`).
- Commit en `main`, pusheado.

## Set nuevo de fotos de muestra (ficticias), sin marca de agua (2026-11-20)

Pedido explícito: las 12 fotos de `fotosFicticiasDefault` (`src/data.ts`) -- las que ven portada
y galería de CUALQUIER invitación/muestra cuando la clienta no sube sus propias fotos -- eran
vistas previas de stock, 8 de 12 con marca de agua visible de "dreamstime" y PNG de hasta 8.9 MB.
El usuario ya generó un set nuevo coherente (una misma quinceañera ficticia, mismo vestido
rosa/dorado) y ya lo subió al Cloudinary del proyecto (cloud `dswrrm5u1`).

- **Cambio de solo datos**: las 12 URLs viejas reemplazadas por las 12 nuevas (`.webp`), mismo
  orden exacto en ambas llaves (`"dorado-clasico"`/`"mariposas"`, que ya compartían la misma
  lista) -- el orden importa: la primera es la de cuerpo completo en jardín (la que usa la
  portada), Básico solo muestra las primeras 4. No se tocó `getFotosPorTema()` ni qué temas caen
  a qué llave, ni los cortes de galería por plan (`maxFotos`), ni ninguna otra constante/tema/
  fondo/flujo. Las fotos viejas NO se borraron de Cloudinary, solo dejaron de referenciarse.
- Verificado que las 12 URLs nuevas responden HTTP 200 antes de usarlas.
- **Verificación real hecha con la función real** (`generarHTMLFinal`), no con el modo catálogo:
  `?catalog=true&tema=X` resultó ser una vía de prueba engañosa para esto -- `getDatosCatalogTema`
  (App.tsx) elige a propósito una `fotoPortada` ALEATORIA para la demo del catálogo (variedad
  entre vistas, código preexistente, no tocado), que tiene prioridad sobre `fotosFiltradas[0]` --
  confirmado dos corridas seguidas del mismo tema devolviendo portadas distintas, antes de darme
  cuenta de la causa real. La prueba correcta (la que describe el propio encargo, "invitación SIN
  subir fotos") es una invitación real (`datos.fotos: []`, sin `fotoPortada`), donde
  `generarHTMLFinal` cae a `getFotosPorTema(tema.id)` directo (`templates.ts`, sin aleatoriedad) --
  probado importando el módulo real desde la consola del navegador (servidor de desarrollo local,
  `import('/src/templates.ts')`) con un `datos` de prueba (`datosDefault.basico` con `fotos: []`):
  la portada usa exactamente la foto 1 (cuerpo completo en jardín) y la galería trae exactamente
  las primeras 4 fotos nuevas, en el orden correcto -- confirmado con `DOMParser` sobre el HTML
  real generado, no solo leyendo el código. Revisada a ojo la foto 1 directo en Cloudinary: sin
  marca de agua, coherente con la descripción (quinceañera, vestido rosa/dorado, jardín).
- `npm run lint`/`npm run build` limpios (mismos 6 errores preexistentes de `ImportMeta.env`).
- Commit en `main`, pusheado.

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
- Commit `6095fb9` en `main`, pusheado.

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
- Commit `6095fb9` en `main`, pusheado.

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
- Commit `6095fb9` en `main`, pusheado.

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
