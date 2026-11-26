import { InvitacionDatos, TemaConfig } from "./types";
import { paquetes, getFotosPorTema, getOrdenSeccionesEfectivo, getColoresEfectivos } from "./data";

export type TipoEvento = NonNullable<InvitacionDatos["tipoEvento"]>;

// Todos los textos visibles por el INVITADO que cambian según el tipo de evento (2026-11-19) --
// centralizados aquí a propósito (en vez de ternarios sueltos por todo el archivo) para que
// agregar un tipo de evento nuevo, o corregir una frase, sea tocar un solo lugar. Resuelto UNA
// vez en generarHTMLFinal (ver `textosEvento` ahí) y usado en cada lugar listado en el reporte
// del cambio. Ningún tema, paquete, precio, sección ni fondo cambia por tipo de evento -- SOLO
// las palabras. La columna "xv" es el texto literal que ya existía antes de este campo.
export interface TextosEvento {
  /** Apertura "sobre": título chico arriba del nombre, dentro de la carta. */
  tituloSobre: string;
  /** Apertura "cortina": marca de agua grande en ambos paneles de tela. */
  marcaAgua: string;
  /** Apertura "cortina": texto del sello central (debajo del emoji del tema). */
  selloCortina: string;
  /** Apertura "cortina": encabezado bajo el sello, antes del nombre. */
  encabezadoCortina: string;
  /** Aperturas "tarjeta"/"destellos": primera línea ("Estás cordialmente invitado..."). */
  tarjetaLinea1: string;
  /** Aperturas "tarjeta"/"destellos": segunda línea, justo antes del nombre. */
  tarjetaLinea2: string;
  /** Portada: orla decorativa superior Y el badge de las 3 variantes "sin foto" (circular/
   *  arco/marco) -- mismo texto en ambos casos para cada tipo de evento. */
  orlaPortada: string;
  /** Portada: línea de bienvenida, justo arriba del nombre. */
  bienvenidaPortada: string;
  /** Portada: "pastilla" decorativa debajo del nombre. */
  pastillaPortada: string;
  /** Sección "Mensaje": título chico arriba de mensajeBienvenida (dato del cliente, no se
   *  reescribe -- solo este título fijo). */
  tituloMensaje: string;
  /** Sección "Familia": encabezado del bloque de padres. */
  padresBendicion: string;
  /** Sección "Familia": encabezado del bloque de padrinos (solo se usa si hay padrinos). */
  padrinosTexto: string;
  /** Prefijo usado en el <title> del HTML y en el nombre del evento de "Agregar a calendario"
   *  -- ambos lugares son literalmente "{prefijoTitulo} {nombre}". */
  prefijoTitulo: string;
  /** Detalle de "Agregar a calendario" (el cuerpo del evento). */
  detalleCalendario: string;
  /** Conector usado en el aviso de confirmación de RSVP por Telegram al admin:
   *  "... confirmó: SÍ asistirá (N pases) {fraseConfirmacion} {nombre}". También reutilizado
   *  (ver App.tsx IntakeForm) para el mensaje que el cliente copia para recordarle a un
   *  invitado que confirme. */
  fraseConfirmacion: string;
}

export const TEXTOS_POR_EVENTO: Record<TipoEvento, TextosEvento> = {
  xv: {
    tituloSobre: "Mis Quince Años",
    marcaAgua: "XV",
    selloCortina: "Gala XV",
    encabezadoCortina: "Pase de Gala Oficial",
    tarjetaLinea1: "Estás cordialmente invitado a los",
    tarjetaLinea2: "XV Años de",
    orlaPortada: "Mis XV Años",
    bienvenidaPortada: "¡Bienvenidos a mi celebración especial!",
    pastillaPortada: "⚜️ 15 Primaveras ⚜️",
    tituloMensaje: "Mi Agradecimiento",
    padresBendicion: "Con la Bendición de Mis Padres",
    padrinosTexto: "Y de mis amados Padrinos",
    prefijoTitulo: "XV Años de",
    detalleCalendario: "¡Te espero con gran alegría para celebrar juntos mis 15 años! Trae tu invitación digital.",
    fraseConfirmacion: "a los XV de"
  },
  boda: {
    tituloSobre: "¡Nos Casamos!",
    marcaAgua: "💍",
    selloCortina: "Nuestra Boda",
    encabezadoCortina: "¡Nos Casamos!",
    tarjetaLinea1: "Estás cordialmente invitado a la",
    tarjetaLinea2: "Boda de",
    orlaPortada: "Nuestra Boda",
    bienvenidaPortada: "¡Bienvenidos a nuestra celebración!",
    pastillaPortada: "💍 ¡Nos Casamos! 💍",
    tituloMensaje: "Nuestro Agradecimiento",
    padresBendicion: "Con la Bendición de Nuestros Padres",
    padrinosTexto: "Y de nuestros amados Padrinos",
    prefijoTitulo: "Boda de",
    detalleCalendario: "¡Los esperamos con gran alegría para celebrar juntos nuestra boda! Trae tu invitación digital.",
    fraseConfirmacion: "a la boda de"
  },
  cumpleanos: {
    tituloSobre: "¡Mi Cumpleaños!",
    marcaAgua: "🎂",
    selloCortina: "Mi Cumpleaños",
    encabezadoCortina: "¡Mi Cumpleaños!",
    tarjetaLinea1: "Estás cordialmente invitado a",
    tarjetaLinea2: "Mi Cumpleaños",
    orlaPortada: "Mi Cumpleaños",
    bienvenidaPortada: "¡Bienvenidos a mi celebración especial!",
    pastillaPortada: "🎂 ¡A Celebrar! 🎂",
    tituloMensaje: "Mi Agradecimiento",
    padresBendicion: "Con la Bendición de Mis Padres",
    padrinosTexto: "Y de mis amados Padrinos",
    prefijoTitulo: "Cumpleaños de",
    detalleCalendario: "¡Te espero con gran alegría para celebrar juntos mi cumpleaños! Trae tu invitación digital.",
    fraseConfirmacion: "al cumpleaños de"
  },
  bautizo: {
    tituloSobre: "¡Mi Bautizo!",
    marcaAgua: "🕊️",
    selloCortina: "Mi Bautizo",
    encabezadoCortina: "¡Mi Bautizo!",
    tarjetaLinea1: "Estás cordialmente invitado al",
    tarjetaLinea2: "Bautizo de",
    orlaPortada: "Mi Bautizo",
    bienvenidaPortada: "¡Bienvenidos a esta celebración tan especial!",
    pastillaPortada: "🕊️ ¡Mi Bautizo! 🕊️",
    tituloMensaje: "Nuestro Agradecimiento",
    padresBendicion: "Con la Bendición de Mis Padres",
    padrinosTexto: "Y de mis amados Padrinos",
    prefijoTitulo: "Bautizo de",
    detalleCalendario: "¡Te esperamos con gran alegría para celebrar juntos el bautizo de nuestro bebé! Trae tu invitación digital.",
    fraseConfirmacion: "al bautizo de"
  },
  "primera-comunion": {
    tituloSobre: "¡Mi Primera Comunión!",
    marcaAgua: "🕊️",
    selloCortina: "Mi Primera Comunión",
    encabezadoCortina: "¡Mi Primera Comunión!",
    tarjetaLinea1: "Estás cordialmente invitado a mi",
    tarjetaLinea2: "Primera Comunión",
    orlaPortada: "Mi Primera Comunión",
    bienvenidaPortada: "¡Bienvenidos a mi celebración especial!",
    pastillaPortada: "🕊️ ¡Mi Primera Comunión! 🕊️",
    tituloMensaje: "Mi Agradecimiento",
    padresBendicion: "Con la Bendición de Mis Padres",
    padrinosTexto: "Y de mis amados Padrinos",
    prefijoTitulo: "Primera Comunión de",
    detalleCalendario: "¡Te espero con gran alegría para celebrar juntos mi Primera Comunión! Trae tu invitación digital.",
    fraseConfirmacion: "a la primera comunión de"
  },
  graduacion: {
    tituloSobre: "¡Mi Graduación!",
    marcaAgua: "🎓",
    selloCortina: "Mi Graduación",
    encabezadoCortina: "¡Mi Graduación!",
    tarjetaLinea1: "Estás cordialmente invitado a mi",
    tarjetaLinea2: "Graduación",
    orlaPortada: "Mi Graduación",
    bienvenidaPortada: "¡Bienvenidos a mi celebración especial!",
    pastillaPortada: "🎓 ¡Lo Logré! 🎓",
    tituloMensaje: "Mi Agradecimiento",
    padresBendicion: "Con la Bendición de Mis Padres",
    padrinosTexto: "Y de mis amados Padrinos",
    prefijoTitulo: "Graduación de",
    detalleCalendario: "¡Te espero con gran alegría para celebrar juntos mi graduación! Trae tu invitación digital.",
    fraseConfirmacion: "a la graduación de"
  },
  "baby-shower": {
    tituloSobre: "¡Mi Baby Shower!",
    marcaAgua: "👶",
    selloCortina: "Mi Baby Shower",
    encabezadoCortina: "¡Mi Baby Shower!",
    tarjetaLinea1: "Estás cordialmente invitado al",
    tarjetaLinea2: "Baby Shower de",
    orlaPortada: "Mi Baby Shower",
    bienvenidaPortada: "¡Bienvenidos a esta celebración tan especial!",
    pastillaPortada: "👶 ¡Ya Casi Llego! 👶",
    tituloMensaje: "Nuestro Agradecimiento",
    padresBendicion: "Los Futuros Papás",
    padrinosTexto: "Y de nuestros amados Padrinos",
    prefijoTitulo: "Baby Shower de",
    detalleCalendario: "¡Te esperamos con gran alegría para celebrar juntos nuestro baby shower! Trae tu invitación digital.",
    fraseConfirmacion: "al baby shower de"
  },
  aniversario: {
    tituloSobre: "¡Nuestro Aniversario!",
    marcaAgua: "💍",
    selloCortina: "Nuestro Aniversario",
    encabezadoCortina: "¡Nuestro Aniversario!",
    tarjetaLinea1: "Estás cordialmente invitado a nuestro",
    tarjetaLinea2: "Aniversario",
    orlaPortada: "Nuestro Aniversario",
    bienvenidaPortada: "¡Bienvenidos a nuestra celebración!",
    pastillaPortada: "💍 ¡Nuestro Aniversario! 💍",
    tituloMensaje: "Nuestro Agradecimiento",
    padresBendicion: "Con la Bendición de Nuestros Padres",
    padrinosTexto: "Y de nuestros amados Padrinos",
    prefijoTitulo: "Aniversario de",
    detalleCalendario: "¡Los esperamos con gran alegría para celebrar juntos nuestro aniversario! Trae tu invitación digital.",
    fraseConfirmacion: "al aniversario de"
  }
};

// Campo ausente o con un valor desconocido (invitación guardada antes de este campo) = "xv" --
// el comportamiento de siempre, sin excepción.
export const textosEventoDe = (tipo: InvitacionDatos["tipoEvento"] | undefined | null): TextosEvento =>
  TEXTOS_POR_EVENTO[(tipo && TEXTOS_POR_EVENTO[tipo]) ? tipo : "xv"];

// Parámetros exactos de Google Fonts (pesos/itálicas) para cada familia usada por algún tema.
// Antes se pedían las ~17 familias de TODOS los temas en cada invitación; ahora solo se piden
// las 2-3 que el tema actual realmente usa (fontHeading/fontBody/fontCursive), lo que reduce
// bastante el peso de la primera carga de cualquier invitación o demo del catálogo.
const FONT_URL_SEGMENTS: Record<string, string> = {
  "Orbitron": "Orbitron:wght@400;700;900",
  "Alex Brush": "Alex+Brush",
  "Cinzel": "Cinzel:wght@400;600;700",
  "Cormorant Garamond": "Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400",
  "Great Vibes": "Great+Vibes",
  "Inter": "Inter:wght@300;400;500;600;700",
  "Lora": "Lora:ital,wght@0,400;0,600;1,400",
  "Monsieur La Doulaise": "Monsieur+La+Doulaise",
  "Outfit": "Outfit:wght@300;400;600;700",
  "Parisienne": "Parisienne",
  "Pinyon Script": "Pinyon+Script",
  "Petit Formal Script": "Petit+Formal+Script",
  "Playfair Display": "Playfair+Display:ital,wght@0,400;0,600;0,700;1,400",
  "Sacramento": "Sacramento",
  "Syne": "Syne:wght@400;700;800",
  "WindSong": "WindSong:wght@400;500",
  "Dancing Script": "Dancing+Script:wght@400;600;700",
  // Agregadas 2026-11-19 para FUENTES_TEXTO (App.tsx) -- overrides de fuente/paleta ahora
  // aplican a cualquier tema, no solo "personalizado" (ver generarHTMLFinal).
  "Poppins": "Poppins:wght@300;400;500;600;700",
  "Montserrat": "Montserrat:wght@300;400;500;600;700",
  "Jost": "Jost:wght@300;400;500;600;700",
};

// Exportada (2026-11-22) para que el formulario de datos del cliente (IntakeForm en App.tsx)
// pueda pedir las MISMAS familias de Google Fonts del tema de la invitación -- una sola fuente
// de verdad para "qué fuentes necesita este tema", en vez de duplicar FONT_URL_SEGMENTS.
export const construirUrlGoogleFonts = (tema: TemaConfig): string => {
  const familias = new Set<string>();
  [tema.fontHeading, tema.fontBody, tema.fontCursive].forEach(f => {
    if (f) familias.add(f);
  });
  const segmentos = Array.from(familias)
    .map(f => FONT_URL_SEGMENTS[f] || f.replace(/\s+/g, '+'))
    .join('&family=');
  return `https://fonts.googleapis.com/css2?family=${segmentos}&display=swap`;
};

// Textura de papel sutil ("grano"/perlado), 2026-11-20, pedido explícito del usuario: que la
// invitación se sienta como una tarjeta de papel real. Generada 100% por código (ruido SVG vía
// feTurbulence, data-URI) -- sin imágenes externas, sin librerías, sin peticiones de red, sin
// JS, menos de 1 KB. La opacidad (0.05, dentro del rango 0.04-0.08 pedido) va horneada en el
// propio SVG -- así cualquier superficie que la use solo necesita agregar este data-URI como
// una capa más de su `background` (fondo compuesto) + `background-blend-mode: multiply` para
// oscurecerla sutilmente (multiply nunca aclara, a diferencia de una superposición normal),
// sin necesitar un elemento/pseudo-elemento nuevo. `tile` 180px, se repite (`repeat`).
const TEXTURA_PAPEL_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)' opacity='0.05'/></svg>";
const TEXTURA_PAPEL_DATAURI = `url("data:image/svg+xml,${encodeURIComponent(TEXTURA_PAPEL_SVG)}")`;
// CSS que compone la textura con el fondo YA existente de una superficie -- `fondoBase` es el
// valor que esa superficie ya traía en su propiedad `background` (color sólido o gradiente), tal
// cual, para no perderlo. `background-image` solo acepta <image> (gradiente/url), NUNCA un color
// plano -- un color ahí (ej. "white", "${tema.colors.light}") invalida la declaración ENTERA y el
// navegador la descarta por completo (bug real encontrado verificando en vivo: envelope-container/
// envelope-letter, que pasan un color plano, se quedaban sin ningún fondo). Por eso un color
// plano se deja en `background-color` aparte (el noise se compone contra él igual, vía
// `background-blend-mode`, que blendea también contra background-color, no solo entre capas de
// background-image) y un gradiente real se compone como segunda capa de background-image.
const texturaPapelSobre = (fondoBase: string): string => {
  const esGradienteOImagen = /^(linear-gradient|radial-gradient|conic-gradient|url)\(/i.test(fondoBase.trim());
  return esGradienteOImagen
    ? `background-image: ${TEXTURA_PAPEL_DATAURI}, ${fondoBase}; background-repeat: repeat, no-repeat; background-blend-mode: multiply, normal;`
    : `background-color: ${fondoBase}; background-image: ${TEXTURA_PAPEL_DATAURI}; background-repeat: repeat; background-blend-mode: multiply;`;
};

// Temas "de papel" (elegantes, fondo claro) donde SÍ aplica la textura -- en los de brillo/
// oscuro (celestial, neon, aurora-boreal, glam-rose) y en "personalizado" (sin identidad visual
// fija) la textura les mata el efecto luminoso, así que se excluyen a propósito. Decidido por el
// tema EFECTIVO de la invitación (mismo criterio que tipoAperturaEfectivo más abajo), nunca por
// una personalización del cliente -- no hay control nuevo en el editor, es automático por tema.
const TEMAS_CON_TEXTURA_PAPEL = [
  "dorado-clasico", "mariposas", "floral-acuarela", "botanico", "boho-chic",
  "princesa-elegante", "marmol-oro", "coquette-pink", "coquette-luxe", "vino-elegante",
];

// Temas de degradado OSCURO (fondo oscuro de base, sin foto -- celestial #070B19→#111B30, neon
// #05050B→#150E28, aurora-boreal #050f2d→#1a0a3f). Única fuente de esta clasificación -- antes
// el bloque "Soporte de accesibilidad y alto contraste para Temas Oscuros" (más abajo) revisaba
// `tema.id === "celestial" || tema.id === "neon"` a mano en 3 lugares distintos y aurora-boreal
// nunca entraba ahí, aunque el comentario de `TEMAS_CON_TEXTURA_PAPEL` arriba ya lo reconocía
// como oscuro. Encontrado y corregido 2026-11-24 (ver prompt "Cierre: la frase de despedida no
// se lee en temas de fondo oscuro"): glam-rose NO entra aquí a propósito -- su degradado
// (`#FAF3F4→#F5E3E6`) es claro, no necesita este remapeo.
const TEMAS_DEGRADADO_OSCURO = ["celestial", "neon", "aurora-boreal"];

// Invitaciones 100% a la medida: el tema "personalizado" acepta overrides de tipografía,
// paleta de color y tipo de apertura definidos por el admin para ESA invitación en particular.
// El resto de temas del catálogo no se ven afectados por esto. Extraída como función aparte
// (2026-11-22, antes vivía inline al inicio de generarHTMLFinal) para que el formulario de
// datos del cliente (IntakeForm en App.tsx) pueda calcular el MISMO tema efectivo -- colores,
// tipografía, customStyle -- que ve el invitado en su invitación real, sin duplicar esta lógica.
export function resolverTemaEfectivo(datos: InvitacionDatos, tema: TemaConfig): TemaConfig {
  if (tema.id === "personalizado") {
    const p = datos.personalizacion || {};
    tema = {
      ...tema,
      fontHeading: p.fontHeading || tema.fontHeading,
      fontBody: p.fontBody || tema.fontBody,
      fontCursive: p.fontCursive || tema.fontCursive,
      colors: getColoresEfectivos(tema, p.paletaColor)
    };
    // A diferencia de los otros 12 temas, "personalizado" no tiene una identidad visual fija,
    // así que su customStyle (.cursive-text/.heading-text/.gold-card/.theme-container) se
    // genera aquí mismo a partir de sus valores EFECTIVOS (ya con los overrides de arriba
    // aplicados) en vez de venir hardcodeado en data.ts — si no, esas clases quedaban sin
    // definir y el texto (ej. el nombre en cursiva) caía en la fuente por default del navegador.
    tema = {
      ...tema,
      customStyle: `
      .theme-container {
        font-family: '${tema.fontBody}', sans-serif;
        background-color: ${tema.colors.bg};
        color: ${tema.colors.dark};
      }
      .heading-text {
        font-family: '${tema.fontHeading}', serif;
        color: ${tema.colors.accent};
        letter-spacing: 0.05em;
      }
      .cursive-text {
        font-family: '${tema.fontCursive}', cursive;
        color: ${tema.colors.primary};
      }
      .gold-card {
        border: 1px solid ${tema.colors.border};
        background: linear-gradient(145deg, #FFFFFF, ${tema.colors.light});
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
      }
    `
    };
  } else if (datos.personalizacion?.fontHeading || datos.personalizacion?.fontBody || datos.personalizacion?.fontCursive || datos.personalizacion?.paletaColor) {
    // 2026-11-19: los mismos 4 overrides de "personalizado" ahora también aplican a cualquier
    // tema del catálogo, si la invitación trae su propio override -- antes el panel de "A
    // Medida" se veía igual pero no hacía nada fuera del tema "personalizado". Reutiliza
    // getColoresEfectivos (misma función que personalizado, sin duplicar lógica).
    // Reasignar tema.colors/fontHeading/fontBody/fontCursive aquí (antes de que el resto de
    // generarHTMLFinal lea esos campos) hace que TODO el resto del archivo -- cada
    // `${tema.colors.accent}` que aparece decenas de veces más abajo -- ya use el override
    // automáticamente, sin tocar nada más. Solo el customStyle (3 clases fijas, texto plano
    // generado en data.ts) necesita un parche aparte: se agrega ENCIMA del customStyle propio
    // del tema (no se reemplaza) para no perder detalles finos de ese tema en particular (ej.
    // el font-weight/border-radius extra que algunos temas sí traen y "personalizado" no).
    const p = datos.personalizacion;
    const coloresEfectivos = p.paletaColor ? getColoresEfectivos(tema, p.paletaColor) : tema.colors;
    const fontHeadingEfectiva = p.fontHeading || tema.fontHeading;
    const fontBodyEfectiva = p.fontBody || tema.fontBody;
    const fontCursivaEfectiva = p.fontCursive || tema.fontCursive;
    tema = {
      ...tema,
      fontHeading: fontHeadingEfectiva,
      fontBody: fontBodyEfectiva,
      fontCursive: fontCursivaEfectiva,
      colors: coloresEfectivos,
      customStyle: `
      ${tema.customStyle || ""}
      /* Override de fuente/paleta para este tema en particular (A Medida, 2026-11-19) */
      .theme-container { font-family: '${fontBodyEfectiva}', sans-serif !important; }
      .heading-text { font-family: '${fontHeadingEfectiva}', serif !important; ${p.paletaColor ? `color: ${coloresEfectivos.accent} !important;` : ""} }
      .cursive-text { font-family: '${fontCursivaEfectiva}', cursive !important; ${p.paletaColor ? `color: ${coloresEfectivos.primary} !important;` : ""} }
      ${p.paletaColor ? `.gold-card { border-color: ${coloresEfectivos.border} !important; background: linear-gradient(145deg, #FFFFFF, ${coloresEfectivos.light}) !important; }` : ""}
    `
    };
  }
  return tema;
}

// Fondo efectivo de una invitación (2026-11-22) -- ver tipos.ts (`fondosGaleriaPorEvento`) y
// `fondosListos.ts`. Dos mecanismos conviven, cada uno con su propio alcance:
//   - `bgImages[tema.id]`: fondo subido A MANO por el admin, por TEMA (ver "Fondo de la
//     Invitación" en el editor) -- ya existía, nunca cambió de comportamiento por este cambio.
//   - `fondosGaleriaPorEvento[tipoEvento]`: fondo elegido de una galería de fondos "listos" por
//     EVENTO (hoy solo hay fondos de boda) -- nuevo, vive solo dentro de esta invitación,
//     atado a SU evento actual. Al cambiar el tipo de evento, cada uno de sus fondos de
//     galería se recuerda por separado (uno por evento, nunca se mezclan).
// Prioridad: galería del evento actual > fondo subido a mano para el tema actual > ninguno
// (cae al degradado normal del tema). Nunca toca el catálogo de temas (`data.ts`) ni la fila
// global `fondos_personalizados` -- es puro cálculo de lectura sobre los datos de ESTA
// invitación, exportada para que App.tsx (la galería "Fondos listos" del editor) pueda saber
// qué está mostrándose de verdad sin duplicar esta lógica.
export function resolverFondoEfectivo(datos: InvitacionDatos, tema: TemaConfig): string | undefined {
  const tipoActual: TipoEvento = (datos.tipoEvento && TEXTOS_POR_EVENTO[datos.tipoEvento]) ? datos.tipoEvento : "xv";
  const fondoGaleria = datos.fondosGaleriaPorEvento?.[tipoActual];
  if (fondoGaleria) return fondoGaleria;
  return datos.bgImages?.[tema.id];
}

export function generarHTMLFinal(datos: InvitacionDatos, tema: TemaConfig, opciones?: { esDemoDeCatalogo?: boolean; esVistaPreviaEditor?: boolean; paraExportarPDF?: boolean; soloPortada?: boolean }): string {
  const esDemoDeCatalogo = opciones?.esDemoDeCatalogo === true;
  const paraExportarPDF = opciones?.paraExportarPDF === true;
  // El monitor de invitación del propio editor (App.tsx: actualizarVistaPrevia) renderiza este
  // mismo HTML mientras el admin edita -- no es un invitado real abriendo su link. Se agrupa
  // con esDemoDeCatalogo abajo (mismo candado, misma razón: sin esto, cada recarga del preview
  // se auto-scrolleaba a "pases" 1.2s después, arrastrando al admin lejos de donde editaba).
  const esVistaPreviaEditor = opciones?.esVistaPreviaEditor === true;
  // Vista previa diminuta del catálogo (2026-11-25, LazyIframe en App.tsx): solo la portada,
  // nunca el demo completo "Ver Demo en Vivo" (ese sigue con esDemoDeCatalogo normal, sin esta
  // bandera) -- las 14 tarjetas del grid cargaban antes la invitación COMPLETA (galería de 8
  // fotos, Tailwind CDN entero) solo para mostrarla aplastada en un celular de 154px, lo que
  // hacía el catálogo lento e ilegible. Con soloPortada, isSectionActive más abajo excluye todo
  // menos "portada" sin importar el paquete/seccionesExcluidas reales de la demo.
  const soloPortada = opciones?.soloPortada === true;
  // Cloudinary ya acepta encadenar una transformación como primer segmento después de "/upload/"
  // (ej. ".../upload/w_700,q_auto,f_auto/v123.../archivo.jpg") -- si la URL no es de Cloudinary
  // (u otra variante sin "/upload/"), se deja intacta, nunca se inventa una URL rota. Solo se usa
  // en modo soloPortada; las invitaciones reales y "Ver Demo en Vivo" siguen a tamaño completo.
  const aligerarUrlCloudinaria = (url: string | undefined): string | undefined => {
    if (!soloPortada || !url) return url;
    const marcador = "/upload/";
    const idx = url.indexOf(marcador);
    if (idx === -1) return url;
    return `${url.slice(0, idx + marcador.length)}w_700,q_auto,f_auto/${url.slice(idx + marcador.length)}`;
  };
  // Textos visibles por el invitado según el tipo de evento (2026-11-19) -- ver TEXTOS_POR_EVENTO
  // arriba. Resuelto una sola vez aquí y usado en todos los lugares de este archivo que antes
  // tenían el texto de XV años fijo.
  const textosEvento = textosEventoDe(datos.tipoEvento);
  tema = resolverTemaEfectivo(datos, tema);
  // Fondo efectivo de esta invitación (2026-11-22, ver resolverFondoEfectivo abajo): el fondo
  // "listo" de galería elegido para el EVENTO actual manda sobre el fondo subido a mano por
  // TEMA; si no hay ninguno de los dos, no hay fondo personalizado y se usa el degradado del
  // tema como siempre.
  const fondoEfectivo = aligerarUrlCloudinaria(resolverFondoEfectivo(datos, tema));

  // Aseguramos que existan fotos válidas, si no, tomamos las ficticias del tema
  const fotosValidas = (datos.fotos || []).filter(f => f && typeof f === "string" && f.trim() !== "");
  const listadoFotos = fotosValidas.length > 0 
    ? fotosValidas 
    : getFotosPorTema(tema.id);

  const configPaquete = paquetes[datos.paquete];
  const maxFotosPermitidas = configPaquete.maxFotos;
  const fotosFiltradas = listadoFotos.slice(0, maxFotosPermitidas);

  // Generamos el listado de secciones del paquete, excluyendo las que el usuario haya desactivado manualmente
  const seccionesActivas = configPaquete.secciones.filter(sec => !datos.seccionesExcluidas?.includes(sec));

  // Icono representativo por palabra clave del evento -- compartido por los 3 estilos de
  // itinerario (clásica/editorial/minimalista, ver estiloItinerarioEfectivo más abajo). Antes
  // vivía embebido dentro del .map() de la clásica; se extrajo tal cual (mismas palabras clave,
  // mismos SVG) para no duplicarlo 3 veces. `claseTamano` deja que cada estilo pida su propio
  // tamaño de ícono (ej. minimalista lo quiere más chico) sin tocar los paths.
  const iconoItinerarioPorEvento = (evento: string, claseTamano: string = "w-5 h-5"): string => {
    const evLower = evento.toLowerCase();
    if (evLower.includes("misa") || evLower.includes("iglesia") || evLower.includes("ceremonia") || evLower.includes("templo")) {
      return `<svg class="${claseTamano}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`;
    }
    if (evLower.includes("brindis") || evLower.includes("cena") || evLower.includes("banquete") || evLower.includes("comida")) {
      return `<svg class="${claseTamano}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 5a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`;
    }
    if (evLower.includes("recepcion") || evLower.includes("coctel") || evLower.includes("salón") || evLower.includes("salon")) {
      return `<svg class="${claseTamano}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`;
    }
    if (evLower.includes("baile") || evLower.includes("vals") || evLower.includes("show")) {
      return `<svg class="${claseTamano}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>`;
    }
    return `<svg class="${claseTamano}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  };

  // Estilo visual del itinerario (2026-11-19): si no está definido o trae un valor desconocido
  // (invitación guardada antes de esta función), cae a "clasica" -- el diseño de siempre, sin
  // cambiar ni una clase. Mismo patrón que tipoAperturaEfectivo.
  const estiloItinerarioEfectivo: "clasica" | "editorial" | "minimalista" =
    datos.personalizacion?.estiloItinerario === "editorial" || datos.personalizacion?.estiloItinerario === "minimalista"
      ? datos.personalizacion.estiloItinerario
      : "clasica";

  // Timeline elegante (diseño original, intacto -- es el default "clasica").
  const itinerarioClasicaHTML = (datos.itinerario || [])
    .map((item, index) => `
      <div class="relative pl-10 pb-10 last:pb-0 itinerario-item">
        <div class="absolute left-0 top-2 bg-white border-[3px] border-[${tema.colors.primary}] rounded-full p-1.5 z-10 text-[${tema.colors.accent}] shadow-md">
          ${iconoItinerarioPorEvento(item.evento)}
        </div>
        ${index < datos.itinerario.length - 1 ? `<div class="absolute left-4 top-10 bottom-0 w-1 bg-gradient-to-b from-[${tema.colors.primary}] to-[${tema.colors.primary}]/30"></div>` : ""}
        <div class="bg-white p-5 rounded-2xl shadow-md border-l-4 border-[${tema.colors.primary}] transform hover:scale-[1.03] hover:shadow-lg transition duration-300 backdrop-blur">
          <div class="flex items-baseline gap-3">
            <span class="inline-block px-4 py-2 bg-gradient-to-r from-[${tema.colors.light}] to-[${tema.colors.secondary}] text-[${tema.colors.primary}] font-bold text-sm rounded-full min-w-fit shadow-sm">
              ${item.hora} hrs
            </span>
            <h4 class="font-semibold text-gray-800 text-[16px] flex-1">${item.evento}</h4>
          </div>
        </div>
      </div>`)
    .join("");

  // Editorial: sin línea vertical, tarjetas amplias con fondo del tema (nunca blanco fijo),
  // hora grande en la fuente de encabezado, medallón con el ícono -- "programa impreso de gala".
  // La clase itinerario-editorial-card queda en la lista de estiloCajasEfectivo (más abajo) para
  // que "Sin cajón"/"Solo borde" también la transparenten, igual que el resto de las secciones.
  const itinerarioEditorialHTML = (datos.itinerario || [])
    .map(item => `
      <div class="itinerario-editorial-card" style="display:flex; align-items:center; gap:16px; background:${tema.colors.light}; border:1px solid ${tema.colors.border}55; border-radius:1.25rem; padding:18px 20px; margin-bottom:16px; box-shadow:0 3px 14px rgba(0,0,0,0.05);">
        <div style="width:50px; height:50px; border-radius:50%; border:2px solid ${tema.colors.accent}; display:flex; align-items:center; justify-content:center; color:${tema.colors.accent}; flex-shrink:0;">
          ${iconoItinerarioPorEvento(item.evento)}
        </div>
        <div style="min-width:0; flex:1;">
          <span class="heading-text" style="display:block; font-size:1.6rem; line-height:1.15;">${item.hora}</span>
          <span style="display:block; font-family:${tema.fontBody}; color:${tema.textDark}; font-size:0.92rem; margin-top:3px; line-height:1.35;">${item.evento}</span>
        </div>
      </div>`)
    .join("");

  // Minimalista: sin tarjetas ni línea gruesa, filas limpias con línea de puntos guía (texto,
  // no border-trick, para que nunca se desborde sin importar qué tan largo sea el evento --
  // simplemente hace salto de línea como cualquier párrafo). Solo colores del tema, pensado
  // para leerse bien sobre fondos oscuros (Neón/Celestial).
  const itinerarioMinimalistaHTML = (datos.itinerario || [])
    .map((item, index) => `
      <div style="display:flex; align-items:flex-start; gap:10px; padding:11px 2px; ${index < datos.itinerario.length - 1 ? `border-bottom:1px dashed ${tema.colors.border}55;` : ""}">
        <span style="color:${tema.colors.accent}; flex-shrink:0; margin-top:2px;">
          ${iconoItinerarioPorEvento(item.evento, "w-3.5 h-3.5")}
        </span>
        <p style="margin:0; flex:1; min-width:0; line-height:1.4;">
          <span style="font-weight:700; color:${tema.colors.accent}; font-size:0.85rem;">${item.hora} hrs</span>
          <span style="color:${tema.colors.border}; letter-spacing:2px; font-size:0.8rem;"> ···········</span>
          <span style="color:${tema.textDark}; font-size:0.9rem; font-family:${tema.fontBody};"> ${item.evento}</span>
        </p>
      </div>`)
    .join("");

  const itinerarioHTML =
    estiloItinerarioEfectivo === "editorial" ? itinerarioEditorialHTML :
    estiloItinerarioEfectivo === "minimalista" ? itinerarioMinimalistaHTML :
    itinerarioClasicaHTML;

  // Colores sugeridos
  const colorBubblesHTML = (datos.colorSugerido || [])
    .map(color => `
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 rounded-full border-2 border-white shadow-md transform hover:scale-110 transition cursor-pointer" style="background-color: ${color};"></div>
        <span class="text-xs font-mono text-gray-500 mt-1">${color.toUpperCase()}</span>
      </div>`)
    .join("");

  // Galería de fotos con efecto premium
  const galeriaFotosHTML = fotosFiltradas
    .map((foto, index) => `
      <div class="group relative overflow-hidden rounded-3xl shadow-lg aspect-3/4 bg-gradient-to-br from-gray-200 to-gray-300 cursor-pointer galeria-foto transform hover:-translate-y-2 transition-all duration-300" onclick="abrirLightbox(${index})">
        <img src="${foto}" alt="Foto ${index + 1}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 loading='lazy'" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
          <div class="backdrop-blur-sm bg-white/20 p-4 rounded-full border border-white/40 shadow-xl">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path></svg>
          </div>
        </div>
        <div class="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-md opacity-0 group-hover:opacity-100 transition duration-300">
          ${index + 1}/${fotosFiltradas.length}
        </div>
      </div>`)
    .join("");

  // Variante "carrusel" de la misma galería: una fila que se desliza en vez de crecer en alto.
  // Mismas tarjetas/hover/onclick que la cuadrícula (reutiliza el lightbox de abajo tal cual),
  // solo cambia el layout del contenedor -- ver "Formato de la Galería de Fotos" en el editor.
  const galeriaFotosCarruselHTML = fotosFiltradas
    .map((foto, index) => `
      <div class="group relative overflow-hidden rounded-3xl shadow-lg aspect-3/4 min-w-[72%] sm:min-w-[46%] snap-center shrink-0 bg-gradient-to-br from-gray-200 to-gray-300 cursor-pointer galeria-foto transition-all duration-300" onclick="abrirLightbox(${index})">
        <img src="${foto}" alt="Foto ${index + 1}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 loading='lazy'" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
          <div class="backdrop-blur-sm bg-white/20 p-4 rounded-full border border-white/40 shadow-xl">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path></svg>
          </div>
        </div>
        <div class="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-md opacity-0 group-hover:opacity-100 transition duration-300">
          ${index + 1}/${fotosFiltradas.length}
        </div>
      </div>`)
    .join("");

  // Variante "polaroid" de la galería (2026-11-19): fotos instantáneas con marco blanco y borde
  // inferior ancho, rotación alternada -2deg/+2deg/-1.5deg/+1.5deg (ciclo de 4, para que no se
  // repita el mismo ángulo cada 2 fotos). Mismo lightbox/fotos que grid y carrusel.
  const ROTACIONES_POLAROID = [-3, 3, -2, 2.5];
  const galeriaFotosPolaroidHTML = fotosFiltradas
    .map((foto, index) => `
      <div class="group relative bg-white p-2.5 pb-7 shadow-lg cursor-pointer galeria-foto-polaroid" style="--rot: ${ROTACIONES_POLAROID[index % ROTACIONES_POLAROID.length]}deg; width: 150px;" onclick="abrirLightbox(${index})">
        <div class="overflow-hidden aspect-square bg-gradient-to-br from-gray-200 to-gray-300">
          <img src="${foto}" alt="Foto ${index + 1}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
        </div>
      </div>`)
    .join("");

  // Lista de padres y padrinos con mejor formato
  const padresHTML = (datos.padres || [])
    .map(p => `<div class="py-2 px-4 bg-white/60 rounded-xl border border-borderTheme/20 backdrop-blur-sm"><p class="text-gray-800 font-semibold text-[15px]">${p}</p></div>`)
    .join("");
  const padrinosHTML = (datos.padrinos || [])
    .map(p => `<div class="py-2.5 px-4 bg-gradient-to-r from-[${tema.colors.light}] to-white rounded-xl border border-[${tema.colors.border}]/40 shadow-sm backdrop-blur-sm"><p class="text-gray-800 font-semibold text-[15px]">${p}</p></div>`)
    .join("");

  // Escapamos "<" para que un valor con "</script>" (ej. en un nombre de invitado) no pueda
  // cerrar prematuramente el <script> donde se inyecta este JSON y romper la página del invitado.
  const JSONDatosString = JSON.stringify(datos, null, 2).replace(/</g, '\\u003c');

  // Escapa un valor para insertarlo de forma segura dentro de un template literal `...` del
  // script generado, evitando que backticks o ${...} en un campo de texto rompan la sintaxis JS.
  const escBacktick = (str: any): string =>
    String(str ?? '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  // Igual que escBacktick, pero para insertar dentro de un string "..." del script generado.
  const escDoubleQuote = (str: any): string =>
    String(str ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Definimos de forma segura la visibilidad inicial de las secciones en base al paquete
  const isSectionActive = (secName: string) => soloPortada ? secName === "portada" : seccionesActivas.includes(secName);

  // Textura de papel sutil (2026-11-20, ver TEMAS_CON_TEXTURA_PAPEL/texturaPapelSobre arriba):
  // decidida por el tema EFECTIVO (ya resuelto el override de "personalizado" más arriba),
  // nunca por datos.personalizacion -- no existe ningún control de esto en el editor.
  const temaTieneTexturaPapel = TEMAS_CON_TEXTURA_PAPEL.includes(tema.id);

  // Tipo de pantalla de apertura ("carta"): cada tema trae un tipo por defecto, pero el
  // control "Tipo de Apertura" del editor lo puede sobreescribir para cualquier tema, ya
  // que sobre/cortina/tarjeta se pintan con los colores del tema activo, no con CSS fijo.
  // "puertas"/"destellos" agregados 2026-11-19 -- debe coincidir exactamente con
  // tipoAperturaPorDefectoDelTema en App.tsx (misma lista de temas, mismo orden de prioridad).
  const tipoAperturaEfectivo: "sobre" | "cortina" | "tarjeta" | "puertas" | "destellos" | "caligrafia" =
    datos.personalizacion?.tipoApertura
      ? datos.personalizacion.tipoApertura
      : ["mariposas", "floral-acuarela", "boho-chic", "coquette-pink", "coquette-luxe"].includes(tema.id)
        ? "sobre"
        : ["princesa-elegante"].includes(tema.id)
          ? "cortina"
          : ["celestial", "neon"].includes(tema.id)
            ? "destellos"
            : ["dorado-clasico", "marmol-oro"].includes(tema.id)
              ? "puertas"
              : "tarjeta";

  // Estilo de los cajones/tarjetas de sección: si ya se eligió con los botones nuevos, se
  // respeta; si no, se deriva del boolean legacy `mostrarCajasSecciones` para no cambiarle el
  // look a invitaciones guardadas antes de este campo.
  const estiloCajasEfectivo: "normal" | "sin_cajon" | "solo_borde" =
    datos.estiloCajasSecciones || (datos.mostrarCajasSecciones === false ? "sin_cajon" : "normal");

  // Inicial de la festejada (sello del sobre, medallón de puertas) -- cae a un corazón si no
  // hay nombre capturado todavía (demos/catálogo antes de llenar datos).
  const inicialNombre = (datos.nombre || "").trim().charAt(0).toUpperCase() || "♥";
  const fuenteCursivaTema = tema.fontCursive || tema.fontHeading;

  // Pantalla "PARA / Familia" + botón "TOCA PARA ABRIR" (2026-11-20, delta sobre las aperturas
  // Verbena-style ya existentes) -- compartidos por las 6 pantallas de apertura, solo cambia en
  // qué punto de cada una se insertan y qué color de texto usan (depende del fondo de cada
  // apertura). El nombre de la familia NO se conoce en tiempo de generación: depende del
  // parámetro ?fam= del link, que solo existe en el navegador del invitado -- se resuelve en
  // runtime vía mostrarParaFamiliaEnApertura() más abajo, leyendo datosInvitacion.invitados[0]
  // (el mismo dato que ya usa mostrarPaseFijo() para esa misma familia -- no se inventa un
  // mecanismo nuevo de resolución). Si el link no trae ?fam= o no resuelve a un invitado real,
  // el bloque se queda oculto y la apertura se ve exactamente como antes de este cambio.
  const aperturaParaFamiliaHTML = (colorTexto: string) => `
    <div id="apertura-para-familia" class="apertura-para-familia hidden" style="color: ${colorTexto};" onclick="event.stopPropagation()">
      <p class="apertura-para-etiqueta">PARA</p>
      <p class="apertura-para-nombre" id="apertura-para-familia-nombre" style="font-family: ${fuenteCursivaTema};"></p>
    </div>`;
  const botonTocaParaAbrirHTML = (onclickFn: string) => `
    <button onclick="${onclickFn}" class="apertura-boton-brillo relative mt-5 px-8 py-3.5 text-white font-serif tracking-[0.2em] text-[11px] uppercase rounded-full shadow-lg cursor-pointer transform hover:scale-105 active:scale-95 transition-all" style="background: ${tema.colors.accent};">
      TOCA PARA ABRIR
    </button>`;
  // Agregado dentro del <style> propio de cada una de las 6 pantallas (cada branch del if/else
  // de abajo tiene el suyo) -- no se crea un <style> global aparte para no reestructurar el resto.
  const aperturaEstiloCompartidoCSS = `
      .apertura-para-familia { margin-bottom: 14px; text-align: center; }
      .apertura-para-etiqueta { font-size: 9px; letter-spacing: 0.35em; text-transform: uppercase; font-family: sans-serif; opacity: 0.8; margin: 0; color: inherit; }
      .apertura-para-nombre { font-size: 1.7rem; line-height: 1.2; margin: 2px 0 0; color: inherit; }
      .apertura-boton-brillo { position: relative; overflow: hidden; }
      .apertura-boton-brillo::after {
        content: '';
        position: absolute;
        top: 0; left: -75%;
        width: 50%; height: 100%;
        background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%);
        animation: aperturaBotonBrillo 3.2s ease-in-out infinite;
      }
      @keyframes aperturaBotonBrillo { 0% { left: -75%; } 55%, 100% { left: 140%; } }`;

  let aperturaHTML = "";
  if (isSectionActive("apertura")) {
    if (tipoAperturaEfectivo === "sobre") {
      aperturaHTML = `
  <div id="pantalla-apertura" class="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 transition-all duration-1000" style="background: ${tema.bgGradient};" onclick="comenzarExperienciaEnvoltura()">
    <style>
      .envelope-container {
        position: relative;
        width: 310px;
        height: 210px;
        ${temaTieneTexturaPapel ? texturaPapelSobre(tema.colors.light) : `background: ${tema.colors.light};`}
        border-radius: 0 0 16px 16px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.18);
        margin-top: 20px;
        transition: box-shadow 1.1s ease;
        perspective: 1000px;
      }
      .envelope-flap {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        border-left: 155px solid transparent;
        border-right: 155px solid transparent;
        border-top: 105px solid ${tema.colors.border};
        /* La textura (si aplica) solo se ve en las 2 esquinas donde el borde transparente deja
           pasar el fondo -- el grueso del triángulo es border-top SOLIDO (sin textura posible
           ahí, es borde, no fondo), limitación del propio truco CSS, no algo pendiente. */
        ${temaTieneTexturaPapel
          ? texturaPapelSobre(`linear-gradient(135deg, ${tema.colors.border} 0%, ${tema.colors.accent} 55%, ${tema.colors.border} 100%)`)
          : `background: linear-gradient(135deg, ${tema.colors.border} 0%, ${tema.colors.accent} 55%, ${tema.colors.border} 100%);`}
        box-shadow: inset 0 -6px 10px rgba(0,0,0,0.12);
        transform-origin: top;
        transition: transform 1.1s cubic-bezier(0.65, 0, 0.35, 1);
        backface-visibility: hidden;
        z-index: 30;
      }
      /* Forro interior: mismo triángulo, pre-rotado 180° y oculto por backface-visibility --
         al abrirse el flap principal (también backface-visibility: hidden) desaparece y este
         forro queda de frente, revelando un color contrastante. */
      .envelope-flap::before {
        content: '';
        position: absolute;
        top: 0; left: -155px;
        width: 0; height: 0;
        border-left: 155px solid transparent;
        border-right: 155px solid transparent;
        border-top: 105px solid ${tema.colors.light};
        backface-visibility: hidden;
        transform: rotateX(180deg);
      }
      .envelope-pocket {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        ${temaTieneTexturaPapel
          ? texturaPapelSobre(`linear-gradient(180deg, ${tema.colors.bg} 0%, ${tema.colors.light} 100%)`)
          : `background: linear-gradient(180deg, ${tema.colors.bg} 0%, ${tema.colors.light} 100%);`}
        box-shadow: inset 0 10px 18px rgba(0,0,0,0.07), inset 0 -4px 8px rgba(0,0,0,0.05);
        border-radius: 0 0 16px 16px;
        border: 2px solid ${tema.colors.border};
        z-index: 20;
        overflow: hidden;
      }
      .envelope-pocket::after {
        content: '';
        position: absolute;
        left: 50%; top: 0; bottom: 0; width: 1px;
        background: linear-gradient(180deg, transparent, ${tema.colors.border}aa, transparent);
        transform: translateX(-50%);
      }
      .envelope-letter {
        position: absolute;
        bottom: 10px;
        left: 15px;
        right: 15px;
        height: 170px;
        ${temaTieneTexturaPapel ? texturaPapelSobre("white") : "background: white;"}
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        border: 1.5px solid ${tema.colors.accent}55;
        padding: 16px 12px;
        text-align: center;
        transition: transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 1.1s ease;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .envelope-wax-seal {
        position: absolute;
        top: 90px;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        z-index: 40;
        cursor: pointer;
        transition: transform 0.4s ease;
      }
      .envelope-wax-seal:hover {
        transform: translate(-50%, -50%) scale(1.08);
      }
      /* Lacre que se parte en dos (2026-11-20): el disco se arma con 2 mitades superpuestas,
         cada una recortada con un borde irregular (grieta) via clip-path -- al tocar, cada
         mitad se traslada/rota hacia su lado y se desvanece. El laurel decorativo (SVG, detrás
         de las mitades) se desvanece junto con ellas. Solo transform/opacity, como pide el
         encargo. */
      .sello-laurel {
        position: absolute;
        inset: -14px;
        z-index: 39;
        pointer-events: none;
        opacity: 0.85;
        transition: opacity 0.5s ease 0.1s;
      }
      .sello-mitad {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 35% 30%, ${tema.colors.accent}, ${tema.colors.dark} 115%);
        color: ${tema.textLight};
        border-radius: 48% 52% 50% 50% / 54% 48% 52% 46%;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -4px 6px rgba(0,0,0,0.3);
        border: 2px solid white;
        font-size: 26px;
        font-family: ${fuenteCursivaTema};
        transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.45s ease 0.08s;
      }
      .sello-mitad-izq { clip-path: polygon(0 0, 46% 0, 52% 12%, 44% 26%, 55% 40%, 42% 54%, 56% 68%, 45% 82%, 50% 100%, 0 100%); }
      .sello-mitad-der { clip-path: polygon(100% 0, 54% 0, 48% 12%, 56% 26%, 45% 40%, 58% 54%, 44% 68%, 55% 82%, 50% 100%, 100% 100%); }
      .envelope-wax-seal.sello-rompiendo .sello-laurel { opacity: 0; }
      .envelope-wax-seal.sello-rompiendo .sello-mitad-izq { transform: translate(-11px, 8px) rotate(-16deg); opacity: 0; }
      .envelope-wax-seal.sello-rompiendo .sello-mitad-der { transform: translate(11px, 10px) rotate(18deg); opacity: 0; }
      .envelope-container.open {
        box-shadow: 0 30px 60px rgba(0,0,0,0.28);
      }
      .envelope-container.open .envelope-flap {
        transform: rotateX(180deg);
        z-index: 5;
      }
      .envelope-container.open .envelope-letter {
        transform: translateY(-110px) scale(1.12);
        box-shadow: 0 25px 45px rgba(0,0,0,0.18);
        z-index: 25;
      }
      .envelope-container.open .envelope-wax-seal {
        opacity: 0;
        pointer-events: none;
      }
      ${aperturaEstiloCompartidoCSS}
    </style>

    <div class="max-w-md w-full flex flex-col items-center animate-float" onclick="event.stopPropagation()">
      ${aperturaParaFamiliaHTML(tema.colors.accent)}
      <p class="text-xs uppercase tracking-[0.25em] font-serif mb-2" style="color: ${tema.colors.accent}; font-weight: 600;">💌 Tienes una invitación exclusiva</p>

      <div class="envelope-container" id="sobre-interactivo" onclick="comenzarExperienciaEnvoltura()">
        <div class="envelope-flap"></div>
        <div class="envelope-letter font-sans">
          <span class="text-3xl mb-1">${tema.decorativeEmoji}</span>
          <h4 class="font-serif text-[9px] uppercase tracking-wider text-gray-500">${textosEvento.tituloSobre}</h4>
          <h3 class="font-cursive text-3.5xl text-accent my-1 font-serif font-black" style="font-family: ${tema.fontHeading}">${datos.nombre}</h3>
          <p class="text-[9px] text-gray-400 font-sans italic">Es un honor invitarte</p>
        </div>
        <div class="envelope-pocket"></div>
        <div class="envelope-wax-seal" id="sobre-sello">
          <svg class="sello-laurel" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <g fill="none" stroke="${tema.colors.accent}" stroke-width="2.4" stroke-linecap="round">
              <path d="M14 50 Q10 36 18 24" />
              <path d="M86 50 Q90 36 82 24" />
            </g>
            <g fill="${tema.colors.accent}">
              <ellipse cx="13" cy="46" rx="5" ry="2.6" transform="rotate(-35 13 46)" />
              <ellipse cx="11" cy="37" rx="5" ry="2.6" transform="rotate(-55 11 37)" />
              <ellipse cx="14" cy="28" rx="5" ry="2.6" transform="rotate(-75 14 28)" />
              <ellipse cx="87" cy="46" rx="5" ry="2.6" transform="rotate(35 87 46)" />
              <ellipse cx="89" cy="37" rx="5" ry="2.6" transform="rotate(55 89 37)" />
              <ellipse cx="86" cy="28" rx="5" ry="2.6" transform="rotate(75 86 28)" />
            </g>
          </svg>
          <div class="sello-mitad sello-mitad-izq"><span>${inicialNombre}</span></div>
          <div class="sello-mitad sello-mitad-der"><span>${inicialNombre}</span></div>
        </div>
      </div>

      <p class="text-[10px] text-gray-500 mt-6 font-light font-sans">Haz clic en el sobre o el sello para abrir la invitación 🌸</p>
      ${botonTocaParaAbrirHTML("comenzarExperienciaEnvoltura()")}
    </div>
  </div>`;
    } else if (tipoAperturaEfectivo === "cortina") {
      const ribbonColor = tema.id === "neon" ? "#FF007F" : tema.colors.accent;
      const oppositeColor = tema.id === "neon" ? "#00F0FF" : tema.colors.border;
      const telaBase = tema.id === "neon" ? "#0d0a1a" : tema.colors.dark;
      aperturaHTML = `
  <div id="pantalla-apertura" class="fixed inset-0 z-50 flex overflow-hidden select-none" style="background: ${tema.colors.bg};" onclick="comenzarExperienciaCortina()">
    <style>
      .curtain-glow {
        position: absolute;
        top: 50%; left: 50%;
        width: 140vw; height: 140vh;
        transform: translate(-50%, -50%) scale(0.4);
        background: radial-gradient(circle, ${tema.colors.accent}55 0%, transparent 60%);
        opacity: 0;
        transition: opacity 1s ease 0.3s, transform 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.3s;
        z-index: 10;
        pointer-events: none;
      }
      .curtains-opened .curtain-glow {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      .curtain-cenefa {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 34px;
        background: linear-gradient(180deg, ${ribbonColor} 0%, ${tema.colors.dark} 100%);
        z-index: 70;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        background-image:
          linear-gradient(180deg, ${ribbonColor} 0%, ${tema.colors.dark} 100%),
          repeating-linear-gradient(90deg, transparent 0 14px, rgba(0,0,0,0.18) 14px 16px);
        transition: transform 0.9s ease 0.5s, opacity 0.6s ease 0.5s;
      }
      .curtains-opened .curtain-cenefa {
        transform: translateY(-40px);
        opacity: 0;
      }
      .curtain-panel {
        position: absolute;
        top: 34px;
        bottom: 0;
        width: 52%;
        background: linear-gradient(to bottom, ${telaBase} 0%, ${(tema.colors.light === "#FCF9F2" ? "#1A150B" : telaBase)} 100%),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 10px, rgba(0,0,0,0.12) 10px 22px);
        background-blend-mode: normal, overlay;
        transition: transform 1.2s cubic-bezier(0.77, 0, 0.175, 1);
        transform-origin: center;
        z-index: 50;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border-right: 3px solid ${ribbonColor};
      }
      .curtain-left {
        left: 0;
        box-shadow: 15px 0 40px rgba(0,0,0,0.65);
      }
      .curtain-right {
        right: 0;
        border-right: none;
        border-left: 3px solid ${oppositeColor};
        box-shadow: -15px 0 40px rgba(0,0,0,0.65);
      }
      .curtain-seal-container {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 60;
        text-align: center;
        width: 100%;
        pointer-events: none;
        transition: all 0.6s ease;
      }
      .curtain-seal-circle {
        width: 100px;
        height: 100px;
        background: ${tema.id === "neon" ? "#120D21" : "white"};
        border: 3px solid ${ribbonColor};
        outline: 2px solid ${oppositeColor}66;
        outline-offset: 4px;
        color: ${oppositeColor};
        border-radius: 50%;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 25px ${tema.id === "neon" ? "rgba(255,0,127,0.7)" : "rgba(0,0,0,0.4)"};
        animation: pulse-glow 2s infinite ease-in-out;
        pointer-events: auto;
        cursor: pointer;
      }
      @keyframes pulse-glow {
        0%, 100% { transform: scale(1); box-shadow: 0 0 18px ${tema.id === "neon" ? "rgba(255,0,127,0.5)" : "rgba(218,165,32,0.4)"}; }
        50% { transform: scale(1.06); box-shadow: 0 0 35px ${tema.id === "neon" ? "rgba(0,240,255,0.8)" : "rgba(218,165,32,0.7)"}; }
      }
      .curtains-opened .curtain-left {
        transform: translateX(-102%) scaleX(0.72);
      }
      .curtains-opened .curtain-right {
        transform: translateX(102%) scaleX(0.72);
      }
      .curtains-opened .curtain-seal-container {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0);
      }
      ${aperturaEstiloCompartidoCSS}
    </style>

    <div class="curtain-glow"></div>
    <div class="curtain-cenefa"></div>

    <div class="curtain-panel curtain-left">
      <div class="pr-6 text-right w-full font-serif font-black" style="opacity: 0.12; font-size: 80px; color: ${ribbonColor}; line-height: 100px;">${textosEvento.marcaAgua}</div>
    </div>

    <div class="curtain-panel curtain-right">
      <div class="pl-6 text-left w-full font-serif font-black" style="opacity: 0.12; font-size: 80px; color: ${oppositeColor}; line-height: 100px;">${textosEvento.marcaAgua}</div>
    </div>

    <div class="curtain-seal-container" id="contenedor-sello">
      ${aperturaParaFamiliaHTML("white")}
      <div class="curtain-seal-circle" onclick="comenzarExperienciaCortina()">
        <span class="text-3xl animate-bounce" style="margin-top: 4px;">${tema.decorativeEmoji}</span>
        <span class="text-[9px] uppercase tracking-wider font-extrabold mt-1 font-sans">${textosEvento.selloCortina}</span>
        <span class="text-[8px] opacity-75 font-sans font-medium">Entrar</span>
      </div>
      <div class="mt-8 px-6">
        <h2 class="text-xs uppercase tracking-[0.3em] font-semibold font-sans mb-2 text-white/90 drop-shadow-md">${textosEvento.encabezadoCortina}</h2>
        <h1 class="font-cursive text-5xl text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] my-1">${datos.nombre}</h1>
        <p class="text-[9px] text-gray-300 tracking-widest font-sans uppercase">Toca el sello para descorrer el telón 🎭</p>
        ${botonTocaParaAbrirHTML("comenzarExperienciaCortina()")}
      </div>
    </div>
  </div>`;
    } else if (tipoAperturaEfectivo === "puertas") {
      const marcoColor = tema.colors.border;
      const hojaBase = tema.colors.dark;
      aperturaHTML = `
  <div id="pantalla-apertura" class="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden select-none" style="background: ${tema.colors.dark};" onclick="comenzarExperienciaPuertas()">
    <style>
      .puertas-glow {
        position: absolute;
        top: 50%; left: 50%;
        width: 120vw; height: 120vh;
        transform: translate(-50%, -50%) scale(0.3);
        background: radial-gradient(circle, ${tema.colors.accent}66 0%, transparent 62%);
        opacity: 0;
        transition: opacity 1.1s ease 0.2s, transform 1.3s cubic-bezier(0.22, 1, 0.36, 1) 0.2s;
        z-index: 5;
        pointer-events: none;
      }
      .puertas-glow.activo {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      .puertas-escenario {
        position: relative;
        width: min(320px, 78vw);
        height: min(420px, 56vh);
        perspective: 1500px;
        z-index: 20;
      }
      .puerta-hoja {
        position: absolute;
        top: 0;
        height: 100%;
        width: 50%;
        transition: transform 1.15s cubic-bezier(0.68, -0.15, 0.27, 1.1);
        transform-style: preserve-3d;
      }
      .puerta-izq { left: 0; transform-origin: left center; }
      .puerta-der { right: 0; transform-origin: right center; }
      .puerta-panel {
        position: absolute;
        inset: 4px;
        background: linear-gradient(135deg, ${hojaBase} 0%, ${tema.colors.accent}33 50%, ${hojaBase} 100%);
        border: 2px solid ${marcoColor};
        box-shadow: inset 0 0 0 6px rgba(0,0,0,0.25), inset 0 10px 20px rgba(0,0,0,0.3), 0 10px 30px rgba(0,0,0,0.5);
      }
      .puerta-izq .puerta-panel { border-right-width: 1px; }
      .puerta-der .puerta-panel { border-left-width: 1px; }
      .puerta-panel::before {
        content: '';
        position: absolute;
        inset: 14px;
        border: 1.5px solid ${marcoColor}99;
      }
      .puertas-medallon {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 72px; height: 72px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 30%, ${tema.colors.accent}, ${tema.colors.dark} 115%);
        border: 3px solid white;
        outline: 2px solid ${marcoColor};
        outline-offset: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ${fuenteCursivaTema};
        font-size: 28px;
        color: ${tema.textLight};
        box-shadow: 0 0 25px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.35);
        z-index: 30;
        cursor: pointer;
        animation: pulse-soft 2.6s ease-in-out infinite;
        transition: opacity 0.5s ease, transform 0.5s ease;
      }
      .puertas-escenario.abiertas .puerta-izq { transform: rotateY(-112deg); }
      .puertas-escenario.abiertas .puerta-der { transform: rotateY(112deg); }
      .puertas-escenario.abiertas .puertas-medallon {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0);
      }
      .puertas-texto {
        margin-top: 28px;
        text-align: center;
        z-index: 20;
        transition: opacity 0.5s ease;
      }
      .puertas-escenario.abiertas + .puertas-texto {
        opacity: 0;
      }
      ${aperturaEstiloCompartidoCSS}
    </style>

    ${aperturaParaFamiliaHTML("white")}
    <div class="puertas-glow" id="puertas-glow"></div>

    <div class="puertas-escenario" id="puertas-escenario" onclick="event.stopPropagation(); comenzarExperienciaPuertas()">
      <div class="puerta-hoja puerta-izq"><div class="puerta-panel"></div></div>
      <div class="puerta-hoja puerta-der"><div class="puerta-panel"></div></div>
      <div class="puertas-medallon">${inicialNombre}</div>
    </div>

    <div class="puertas-texto">
      <h2 class="text-xs uppercase tracking-[0.3em] font-semibold font-sans mb-2" style="color: ${tema.colors.accent};">Puertas de Gala</h2>
      <h1 class="font-cursive text-4xl my-1" style="color: white; font-family: ${fuenteCursivaTema};">${datos.nombre}</h1>
      <p class="text-[10px] text-gray-300 tracking-widest font-sans uppercase mt-2">Toca las puertas para entrar 🚪</p>
      ${botonTocaParaAbrirHTML("comenzarExperienciaPuertas()")}
    </div>
  </div>`;
    } else if (tipoAperturaEfectivo === "destellos") {
      aperturaHTML = `
  <div id="pantalla-apertura" class="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center overflow-hidden select-none" style="background: ${tema.bgGradient};" onclick="comenzarExperienciaDestellos()">
    <style>
      .destellos-expansor {
        position: absolute;
        top: 50%; left: 50%;
        width: 16px; height: 16px;
        border-radius: 50%;
        background: radial-gradient(circle, white 0%, ${tema.colors.accent} 55%, transparent 100%);
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
        z-index: 5;
        pointer-events: none;
      }
      #pantalla-apertura.destellos-abriendo .destellos-expansor {
        transition: transform 1s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.9s ease-out;
        transform: translate(-50%, -50%) scale(70);
        opacity: 1;
      }
      #pantalla-apertura.destellos-abriendo .destellos-contenido {
        transition: opacity 0.45s ease, transform 0.45s ease;
        opacity: 0;
        transform: scale(1.08);
      }
      ${aperturaEstiloCompartidoCSS}
    </style>

    <div class="destellos-expansor"></div>

    <div class="destellos-contenido max-w-md w-full flex flex-col items-center animate-float" style="position: relative; z-index: 10;" onclick="event.stopPropagation()">
      ${aperturaParaFamiliaHTML(tema.textDark)}
      <span class="text-4xl mb-3 animate-pulse" style="color: ${tema.colors.accent};">${tema.decorativeEmoji}</span>
      <h2 class="font-serif text-xs uppercase tracking-[0.25em] mb-2" style="color: ${tema.colors.accent};">${textosEvento.tarjetaLinea1}</h2>
      <h1 class="font-cursive text-5xl my-2" style="color: ${tema.colors.accent}; font-family: ${fuenteCursivaTema};">${textosEvento.tarjetaLinea2}</h1>
      <h3 class="font-serif text-3xl font-bold tracking-tight mb-6" style="color: ${tema.textDark};">${datos.nombre}</h3>
      ${botonTocaParaAbrirHTML("comenzarExperienciaDestellos()")}
    </div>
  </div>`;
    } else if (tipoAperturaEfectivo === "tarjeta") {
      aperturaHTML = `
  <div id="pantalla-apertura" class="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center transition-all duration-1000" style="background: ${tema.bgGradient};" onclick="comenzarExperienciaTarjeta()">
    <style>
      .tarjeta-interactiva {
        position: relative;
        transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease 0.1s;
        border-radius: 1.5rem;
        padding: 2px;
        background: linear-gradient(135deg, ${tema.colors.accent}, ${tema.colors.border}, ${tema.colors.accent});
        overflow: hidden;
      }
      .tarjeta-interactiva::before {
        content: '';
        position: absolute;
        top: -50%; left: -60%;
        width: 40%; height: 220%;
        background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%);
        transform: rotate(18deg);
        animation: tarjetaBrillo 4.5s ease-in-out infinite;
        z-index: 5;
        pointer-events: none;
      }
      @keyframes tarjetaBrillo {
        0% { left: -60%; }
        55%, 100% { left: 140%; }
      }
      .tarjeta-interactiva-fondo {
        position: relative;
        border-radius: calc(1.5rem - 2px);
        overflow: hidden;
      }
      ${(datos.fotoPortada && datos.fotoPortada.trim() !== "") ? `
      .tarjeta-foto-fondo {
        position: absolute;
        inset: -10%;
        background-image: url('${datos.fotoPortada.trim()}');
        background-size: cover;
        background-position: center;
        filter: blur(18px) brightness(0.75) saturate(1.1);
        transform: scale(1.15);
        z-index: 1;
      }
      ` : ``}
      .tarjeta-interactiva.abriendo {
        transform: translateY(-26px) scale(1.07);
        opacity: 0;
      }
      ${aperturaEstiloCompartidoCSS}
    </style>

    <div class="max-w-md w-full tarjeta-interactiva shadow-2xl" id="tarjeta-interactiva">
      <div class="tarjeta-interactiva-fondo bg-white/75 backdrop-blur-md p-8 border border-borderTheme/40 flex flex-col items-center animate-float">
        ${(datos.fotoPortada && datos.fotoPortada.trim() !== "") ? `<div class="tarjeta-foto-fondo"></div>` : ``}
        <div style="position: relative; z-index: 10;" class="flex flex-col items-center">
          ${aperturaParaFamiliaHTML(tema.textDark)}
          <span class="text-4xl mb-4 text-accent animate-pulse">${tema.decorativeEmoji}</span>
          <h2 class="font-serif text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">${textosEvento.tarjetaLinea1}</h2>
          <h1 class="font-cursive text-5xl text-accent my-3">${textosEvento.tarjetaLinea2}</h1>
          <h3 class="font-serif text-3xl font-bold tracking-tight text-dark mb-6">${datos.nombre}</h3>
          <p class="text-xs text-gray-600 mb-8 font-light italic">Por favor activa el sonido antes de entrar para disfrutar de una mejor experiencia.</p>
          ${botonTocaParaAbrirHTML("comenzarExperienciaTarjeta()")}
        </div>
      </div>
    </div>
  </div>`;
    } else if (tipoAperturaEfectivo === "caligrafia") {
      aperturaHTML = `
  <div id="pantalla-apertura" class="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center overflow-hidden select-none" style="background: ${tema.bgGradient};" onclick="comenzarExperienciaCaligrafia()">
    <style>
      .caligrafia-nombre {
        display: block;
        font-family: ${fuenteCursivaTema};
        color: ${tema.colors.accent};
        font-size: clamp(2.4rem, 11vw, 4rem);
        line-height: 1.1;
        opacity: 1;
        clip-path: inset(0 0 0 0);
      }
      .caligrafia-nombre.caligrafia-animando {
        opacity: 0;
        clip-path: inset(0 100% 0 0);
        animation: caligrafiaEscritura 1.7s cubic-bezier(0.65, 0, 0.35, 1) 0.25s forwards;
      }
      @keyframes caligrafiaEscritura {
        0% { opacity: 1; clip-path: inset(0 100% 0 0); }
        6% { opacity: 1; }
        100% { opacity: 1; clip-path: inset(0 0% 0 0); }
      }
      .caligrafia-contenido {
        transition: opacity 0.45s ease, transform 0.45s ease;
      }
      #pantalla-apertura.caligrafia-cerrando .caligrafia-contenido {
        opacity: 0;
        transform: scale(1.06);
      }
      ${aperturaEstiloCompartidoCSS}
    </style>

    <div class="caligrafia-contenido max-w-md w-full flex flex-col items-center" style="position: relative; z-index: 10;" onclick="event.stopPropagation()">
      ${aperturaParaFamiliaHTML(tema.textDark)}
      <span class="text-3xl mb-3" style="color: ${tema.colors.accent};">${tema.decorativeEmoji}</span>
      <h1 class="caligrafia-nombre" id="caligrafia-nombre">${datos.nombre}</h1>
      <p class="font-serif text-xs uppercase tracking-[0.25em] mt-3" style="color: ${tema.textDark};">${textosEvento.tituloSobre}</p>
      ${botonTocaParaAbrirHTML("comenzarExperienciaCaligrafia()")}
    </div>
  </div>`;
    }
  }

  // Estilo visual de la Portada (2026-11-19): mismo patrón que tipoAperturaEfectivo/
  // estiloItinerarioEfectivo -- si no está definido o trae un valor desconocido, cae al
  // DISEÑO POR DEFECTO DEL TEMA (ver más abajo; antes siempre caía a "circular" fijo, pedido
  // 2026-11-19 para que la portada ya no se vea igual sin importar el tema). La elección
  // explícita del admin en el editor SIEMPRE manda sobre ese default, incluyendo si elige
  // "circular" a propósito en un tema cuyo default sea otro -- por eso el check de abajo
  // valida los 4 valores posibles, no solo los 3 "no circular" como antes. "fondo" requiere
  // una foto real (es la foto misma la que se usa de fondo); sin foto, o con "Mostrar foto de
  // portada" apagado, cae a "circular" también -- nunca se queda a medias.
  const hayFotoPrincipalPortada = (datos.fotoPortada && datos.fotoPortada.trim() !== "") || fotosFiltradas.length > 0;
  const urlFotoPrincipalPortada = aligerarUrlCloudinaria((datos.fotoPortada && datos.fotoPortada.trim() !== "") ? datos.fotoPortada.trim() : (fotosFiltradas[0] || "")) || "";
  // Debe coincidir exactamente con estiloPortadaPorDefectoDelTema en App.tsx (misma lista de
  // temas, mismo orden de prioridad).
  const estiloPortadaPorDefectoDelTemaActivo: "circular" | "arco" | "fondo" | "marco" =
    ["dorado-clasico", "marmol-oro"].includes(tema.id)
      ? "marco"
      : ["floral-acuarela", "botanico", "boho-chic", "princesa-elegante", "mariposas", "coquette-pink", "coquette-luxe"].includes(tema.id)
        ? "arco"
        : ["celestial", "neon", "aurora-boreal", "vino-elegante", "glam-rose"].includes(tema.id)
          ? "fondo"
          : "circular";
  const estiloPortadaElegido: "circular" | "arco" | "fondo" | "marco" =
    datos.personalizacion?.estiloPortada === "circular" || datos.personalizacion?.estiloPortada === "arco" || datos.personalizacion?.estiloPortada === "fondo" || datos.personalizacion?.estiloPortada === "marco"
      ? datos.personalizacion.estiloPortada
      : estiloPortadaPorDefectoDelTemaActivo;
  const estiloPortadaEfectivo: "circular" | "arco" | "fondo" | "marco" =
    estiloPortadaElegido === "fondo" && (!hayFotoPrincipalPortada || datos.mostrarFotoPortada === false)
      ? "circular"
      : estiloPortadaElegido;

  // Bloque de foto principal para "circular"/"arco"/"marco" -- "fondo" no lo usa (la foto va
  // en el fondo de toda la sección, ver más abajo). Respeta "Mostrar foto de portada" (si está
  // apagado, cae al placeholder con el emoji del tema) igual que el diseño original.
  const fotoPrincipalPortadaHTML = (() => {
    if (datos.mostrarFotoPortada === false) {
      return `
          <div class="w-56 h-56 mx-auto rounded-full bg-gradient-to-br from-[${tema.colors.light}] to-[${tema.colors.secondary}] border-4 border-white flex items-center justify-center mb-6 shadow-2xl animate-float ring-4 ring-primary/10">
            <div class="text-center p-4">
              <span class="text-7xl block mb-2 animate-bounce">${tema.decorativeEmoji}</span>
              <span class="font-serif text-[10px] uppercase tracking-widest text-accent text-xs">${textosEvento.orlaPortada}</span>
            </div>
          </div>`;
    }
    if (estiloPortadaEfectivo === "arco") {
      return hayFotoPrincipalPortada ? `
          <div class="relative w-64 h-72 mx-auto mb-6 overflow-hidden animate-float" style="border-radius: 50% 50% 14px 14px / 55% 55% 14px 14px; box-shadow: 0 0 0 4px white, 0 0 0 8px ${tema.colors.accent}, 0 18px 35px rgba(0,0,0,0.2);">
            <img src="${urlFotoPrincipalPortada}" alt="${datos.nombre}" class="w-full h-full object-cover object-[center_20%]">
            <div class="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent"></div>
          </div>` : `
          <div class="mx-auto mb-6 flex items-center justify-center shadow-2xl animate-float" style="width:224px;height:252px;border-radius: 50% 50% 14px 14px / 55% 55% 14px 14px; background: linear-gradient(145deg, ${tema.colors.light}, ${tema.colors.secondary}); box-shadow: 0 0 0 4px white, 0 0 0 8px ${tema.colors.accent};">
            <div class="text-center p-4">
              <span class="text-7xl block mb-2 animate-bounce">${tema.decorativeEmoji}</span>
              <span class="font-serif text-[10px] uppercase tracking-widest text-accent text-xs">${textosEvento.orlaPortada}</span>
            </div>
          </div>`;
    }
    if (estiloPortadaEfectivo === "marco") {
      return hayFotoPrincipalPortada ? `
          <div class="relative w-60 h-72 mx-auto mb-6 animate-float" style="padding:10px; border:2px solid ${tema.colors.accent}; background:white; box-shadow:0 15px 35px rgba(0,0,0,0.18);">
            <span class="absolute -top-2.5 -left-2.5 text-lg" style="color:${tema.colors.accent};">${tema.decorativeEmoji}</span>
            <span class="absolute -top-2.5 -right-2.5 text-lg" style="color:${tema.colors.accent};">${tema.decorativeEmoji}</span>
            <span class="absolute -bottom-2.5 -left-2.5 text-lg" style="color:${tema.colors.accent};">${tema.decorativeEmoji}</span>
            <span class="absolute -bottom-2.5 -right-2.5 text-lg" style="color:${tema.colors.accent};">${tema.decorativeEmoji}</span>
            <div class="w-full h-full overflow-hidden" style="border:1px solid ${tema.colors.border};">
              <img src="${urlFotoPrincipalPortada}" alt="${datos.nombre}" class="w-full h-full object-cover object-[center_20%]">
            </div>
          </div>` : `
          <div class="relative mx-auto mb-6 flex items-center justify-center animate-float" style="width:224px;height:272px;padding:10px;border:2px solid ${tema.colors.accent};background:white;box-shadow:0 15px 35px rgba(0,0,0,0.18);">
            <span class="absolute -top-2.5 -left-2.5 text-lg" style="color:${tema.colors.accent};">${tema.decorativeEmoji}</span>
            <span class="absolute -top-2.5 -right-2.5 text-lg" style="color:${tema.colors.accent};">${tema.decorativeEmoji}</span>
            <span class="absolute -bottom-2.5 -left-2.5 text-lg" style="color:${tema.colors.accent};">${tema.decorativeEmoji}</span>
            <span class="absolute -bottom-2.5 -right-2.5 text-lg" style="color:${tema.colors.accent};">${tema.decorativeEmoji}</span>
            <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(145deg, ${tema.colors.light}, ${tema.colors.secondary}); border:1px solid ${tema.colors.border};">
              <span class="text-6xl animate-bounce">${tema.decorativeEmoji}</span>
            </div>
          </div>`;
    }
    // circular -- diseño original, intacto
    return hayFotoPrincipalPortada ? `
          <div class="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-white shadow-2xl mb-6 ring-4 ring-primary/20 animate-float">
            <img src="${urlFotoPrincipalPortada}" alt="${datos.nombre}" class="w-full h-full object-cover object-[center_20%]">
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
          </div>` : `
          <div class="w-56 h-56 mx-auto rounded-full bg-gradient-to-br from-[${tema.colors.light}] to-[${tema.colors.secondary}] border-4 border-white flex items-center justify-center mb-6 shadow-2xl animate-float ring-4 ring-primary/10">
            <div class="text-center p-4">
              <span class="text-7xl block mb-2 animate-bounce">${tema.decorativeEmoji}</span>
              <span class="font-serif text-[10px] uppercase tracking-widest text-accent text-xs">${textosEvento.orlaPortada}</span>
            </div>
          </div>`;
  })();

  // Sección de contenido: portada
  const portadaSeccionHTML = !isSectionActive("portada") ? "" :
    estiloPortadaEfectivo === "fondo" ? (() => {
      // "fondo": la foto ocupa toda la sección, con el velo del tema encima (mismo mecanismo/
      // opacidad que "Nitidez del fondo" para la imagen de fondo global) para que el texto se
      // siga leyendo -- más sombra de texto directa como refuerzo adicional.
      const esOscuro = tema.id === "celestial" || tema.id === "neon";
      const opacidadVelo = datos.fondoVeloOpacidad ?? (esOscuro ? 0.65 : 0.55);
      const colorVelo = esOscuro ? `rgba(8, 6, 16, ${opacidadVelo})` : `rgba(20, 16, 10, ${opacidadVelo * 0.6})`;
      const sombraTexto = "text-shadow: 0 2px 10px rgba(0,0,0,0.45);";
      return `
    <section data-section="portada" class="relative min-h-[92vh] flex flex-col justify-center p-6 text-center overflow-hidden border-b border-borderTheme/10" style="background-image: url('${urlFotoPrincipalPortada}'); background-size: cover; background-position: center 20%;">
      <div class="absolute inset-0" style="background: ${colorVelo};"></div>

      <div class="mt-10 z-10 animate-fade-in">
        <p class="text-xs uppercase tracking-[0.3em] font-serif mb-2" style="color:white; ${sombraTexto}">${textosEvento.orlaPortada}</p>
        <div class="flex justify-center items-center gap-3 mb-1">
          <div class="w-12 h-[1px] bg-gradient-to-r from-transparent to-white/60"></div>
          <span style="color:white; ${sombraTexto}">${tema.decorativeEmoji}</span>
          <div class="w-12 h-[1px] bg-gradient-to-l from-transparent to-white/60"></div>
        </div>
      </div>

      <div class="z-10 py-6 animate-fade-in" style="animation-delay: 0.2s;">
        <p class="text-sm font-serif italic mb-3 tracking-wide" style="color:white; ${sombraTexto}">${textosEvento.bienvenidaPortada}</p>
        <h1 class="cursive-text text-6xl md:text-7xl mb-5" style="color:white; text-shadow: 0 4px 18px rgba(0,0,0,0.55);">${datos.nombre}</h1>
        <div class="flex items-center justify-center gap-3 mb-2">
          <span class="w-12 h-[1px] bg-gradient-to-r from-transparent to-white/60"></span>
          <span class="text-[11px] tracking-widest uppercase font-semibold px-4 py-2 bg-white/20 backdrop-blur rounded-full border border-white/50" style="color:white; ${sombraTexto}">${textosEvento.pastillaPortada}</span>
          <span class="w-12 h-[1px] bg-gradient-to-l from-transparent to-white/60"></span>
        </div>
      </div>

      <div class="mb-6 z-10 backdrop-blur-lg bg-black/30 p-5 rounded-2xl border border-white/30 shadow-lg animate-fade-in" style="animation-delay: 0.4s;">
        <h2 id="portada-fecha-visible" class="font-serif text-lg tracking-wider font-semibold" style="color:white; ${sombraTexto}"></h2>
        <div id="event-year" class="text-xs tracking-widest font-mono mt-1.5 font-semibold" style="color:white; ${sombraTexto}">2026</div>
        <div class="mt-5 animate-bounce" style="color:white;">
          <svg class="w-6 h-6 mx-auto drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-6l-7 7-7-7"></path></svg>
        </div>
      </div>
    </section>
    `;
    })() : `
    <section data-section="portada" class="relative min-h-[92vh] flex flex-col justify-center p-6 text-center overflow-hidden border-b border-borderTheme/10" style="background: ${tema.bgGradient};">
      <!-- Decorativos de fondo premium -->
      <div class="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-primary/15 blur-3xl animate-pulse-slow"></div>
      <div class="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-accent/10 blur-3xl animate-pulse-slow" style="animation-delay: 1s;"></div>
      <div class="absolute top-1/3 right-10 w-32 h-32 rounded-full bg-secondary/10 blur-2xl"></div>

      <!-- Orla Decorativa Superior Premium -->
      <div class="mt-10 z-10 animate-fade-in">
        <p class="text-xs uppercase tracking-[0.3em] font-serif text-gray-500 mb-2" style="text-shadow: 0 1px 4px ${tema.colors.dark}33;">${textosEvento.orlaPortada}</p>
        <div class="flex justify-center items-center gap-3 mb-1">
          <div class="w-12 h-[1px] bg-gradient-to-r from-transparent to-primary/60"></div>
          <span class="text-accent/80">${tema.decorativeEmoji}</span>
          <div class="w-12 h-[1px] bg-gradient-to-l from-transparent to-primary/60"></div>
        </div>
      </div>

      <!-- Nombre central de la festejada/el evento, con animación -->
      <div class="z-10 py-6 animate-fade-in" style="animation-delay: 0.2s;">
        <p class="text-sm font-serif text-gray-500 italic mb-3 tracking-wide">${textosEvento.bienvenidaPortada}</p>
        <h1 class="cursive-text text-6xl md:text-7xl mb-5 drop-shadow-lg" style="text-shadow: 0 2px 8px ${tema.colors.dark}40;">${datos.nombre}</h1>
        <div class="flex items-center justify-center gap-3 mb-8">
          <span class="w-12 h-[1px] bg-gradient-to-r from-transparent to-borderTheme/60"></span>
          <span class="text-accent text-[11px] tracking-widest uppercase font-semibold px-4 py-2 bg-white/30 backdrop-blur rounded-full border border-white/50">${textosEvento.pastillaPortada}</span>
          <span class="w-12 h-[1px] bg-gradient-to-l from-transparent to-borderTheme/60"></span>
        </div>

        <!-- Foto Principal con efecto premium -->
        ${fotoPrincipalPortadaHTML}
      </div>

      <!-- Fecha y llamada a scroll elegante -->
      <div class="mb-6 z-10 backdrop-blur-lg bg-white/40 p-5 rounded-2xl border border-white/70 shadow-lg animate-fade-in" style="animation-delay: 0.4s;">
        <h2 id="portada-fecha-visible" class="font-serif text-lg tracking-wider text-dark font-semibold"></h2>
        <div id="event-year" class="text-xs tracking-widest font-mono text-gray-600 mt-1.5 font-semibold">2026</div>
        <div class="mt-5 animate-bounce text-gray-500">
          <svg class="w-6 h-6 mx-auto drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-6l-7 7-7-7"></path></svg>
        </div>
      </div>
    </section>
    `;

  // Sección de contenido: cuenta
  // Estilo visual de la Cuenta Regresiva (2026-11-19) -- mismo patrón de siempre: si no está
  // definido o es desconocido, cae a "cajas" (el diseño original, intacto). Los 3 estilos
  // conservan los mismos 4 ids (countdown-days/hours/minutes/seconds) que ya actualiza
  // iniciarCuentaRegresiva() -- el conteo en vivo sigue funcionando igual en los tres.
  const estiloCuentaEfectivo: "cajas" | "elegante" | "linea" =
    datos.personalizacion?.estiloCuenta === "elegante" || datos.personalizacion?.estiloCuenta === "linea"
      ? datos.personalizacion.estiloCuenta
      : "cajas";
  const cuentaSeccionHTML = !isSectionActive("cuenta") ? "" :
    estiloCuentaEfectivo === "elegante" ? `
    <section data-section="cuenta" class="p-6 text-center bg-transparent">
      <h3 class="font-serif text-xs uppercase tracking-[0.2em] text-gray-400 mb-4">Solo Faltan</h3>
      <div class="flex items-start justify-center gap-1.5 max-w-sm mx-auto">
        <div class="flex flex-col items-center">
          <span id="countdown-days" class="heading-text block text-4xl font-bold leading-none">00</span>
          <span class="text-[9px] text-gray-500 uppercase tracking-wider font-light mt-1.5">Días</span>
        </div>
        <span class="heading-text text-3xl leading-none opacity-50">:</span>
        <div class="flex flex-col items-center">
          <span id="countdown-hours" class="heading-text block text-4xl font-bold leading-none">00</span>
          <span class="text-[9px] text-gray-500 uppercase tracking-wider font-light mt-1.5">Hrs</span>
        </div>
        <span class="heading-text text-3xl leading-none opacity-50">:</span>
        <div class="flex flex-col items-center">
          <span id="countdown-minutes" class="heading-text block text-4xl font-bold leading-none">00</span>
          <span class="text-[9px] text-gray-500 uppercase tracking-wider font-light mt-1.5">Min</span>
        </div>
        <span class="heading-text text-3xl leading-none opacity-50">:</span>
        <div class="flex flex-col items-center">
          <span id="countdown-seconds" class="heading-text block text-4xl font-bold leading-none">00</span>
          <span class="text-[9px] text-gray-500 uppercase tracking-wider font-light mt-1.5">Seg</span>
        </div>
      </div>
    </section>
    ` : estiloCuentaEfectivo === "linea" ? `
    <section data-section="cuenta" class="p-6 text-center bg-transparent">
      <h3 class="font-serif text-xs uppercase tracking-[0.2em] text-gray-400 mb-4">Solo Faltan</h3>
      <div class="inline-flex items-center gap-2 px-5 py-3 rounded-full mx-auto flex-wrap justify-center" style="background: ${tema.colors.light}66; border: 1px solid ${tema.colors.border}77; backdrop-filter: blur(6px);">
        <span class="text-xs font-bold" style="color:${tema.colors.accent};"><span id="countdown-days">00</span> días</span>
        <span style="color:${tema.colors.border};">·</span>
        <span class="text-xs font-bold" style="color:${tema.colors.accent};"><span id="countdown-hours">00</span> hrs</span>
        <span style="color:${tema.colors.border};">·</span>
        <span class="text-xs font-bold" style="color:${tema.colors.accent};"><span id="countdown-minutes">00</span> min</span>
        <span style="color:${tema.colors.border};">·</span>
        <span class="text-xs font-bold" style="color:${tema.colors.accent};"><span id="countdown-seconds">00</span> seg</span>
      </div>
    </section>
    ` : `
    <section data-section="cuenta" class="p-6 text-center bg-transparent">
      <h3 class="font-serif text-xs uppercase tracking-[0.2em] text-gray-400 mb-4">Solo Faltan</h3>
      <div class="grid grid-cols-4 gap-2 max-w-xs mx-auto">
        <div class="bg-[${tema.colors.light}] p-3 rounded-2xl border border-borderTheme/25">
          <span id="countdown-days" class="block text-2xl font-serif font-bold text-accent">00</span>
          <span class="text-[10px] text-gray-500 uppercase tracking-wider font-light">Días</span>
        </div>
        <div class="bg-[${tema.colors.light}] p-3 rounded-2xl border border-borderTheme/25">
          <span id="countdown-hours" class="block text-2xl font-serif font-bold text-accent">00</span>
          <span class="text-[10px] text-gray-500 uppercase tracking-wider font-light">Hrs</span>
        </div>
        <div class="bg-[${tema.colors.light}] p-3 rounded-2xl border border-borderTheme/25">
          <span id="countdown-minutes" class="block text-2xl font-serif font-bold text-accent">00</span>
          <span class="text-[10px] text-gray-500 uppercase tracking-wider font-light">Min</span>
        </div>
        <div class="bg-[${tema.colors.light}] p-3 rounded-2xl border border-borderTheme/25">
          <span id="countdown-seconds" class="block text-2xl font-serif font-bold text-accent">00</span>
          <span class="text-[10px] text-gray-500 uppercase tracking-wider font-light">Seg</span>
        </div>
      </div>
    </section>
    `;

  // Sección de contenido: mensaje
  const mensajeSeccionHTML = isSectionActive("mensaje") ? `
    <section data-section="mensaje" class="p-8 text-center bg-transparent relative">
      <div class="absolute inset-x-0 top-0 flex justify-center transform -translate-y-1/2">
        <span class="bg-white px-4 py-1.5 border border-borderTheme/40 rounded-full shadow-xs text-accent text-sm font-semibold">${tema.decorativeEmoji}</span>
      </div>
      <div class="max-w-xs mx-auto py-4">
        <span class="font-cursive text-3xl text-primary/80 block mb-1">${textosEvento.tituloMensaje}</span>
        <p class="text-sm italic leading-relaxed text-gray-600 font-light">
          "${datos.mensajeBienvenida}"
        </p>
      </div>
    </section>
    ` : "";

  // Sección de contenido: ceremonia
  const ceremoniaSeccionHTML = isSectionActive("ceremonia") ? `
    <section data-section="ceremonia" class="p-6">
      <div class="gold-card rounded-3xl p-6 text-center">
        <div class="flex justify-center mb-3">
          <span class="${tema.iconStyle}">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </span>
        </div>
        <h3 class="font-serif text-xl text-dark font-semibold">Ceremonia Religiosa</h3>
        <p class="text-xs text-accent uppercase tracking-widest font-semibold mt-1 mb-4">Acción de Gracias</p>
        
        <div class="space-y-2 border-t border-b border-borderTheme/20 py-4 my-4">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Lugar</span>
            <span class="text-sm font-semibold text-gray-800">${datos.ceremonia.lugar}</span>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Hora</span>
            <span class="text-sm font-semibold text-gray-800">${datos.ceremonia.hora} hrs</span>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Dirección</span>
            <span class="text-xs text-gray-600 font-light block line-clamp-2 px-4">${datos.ceremonia.direccion}</span>
          </div>
        </div>

        ${datos.ceremonia.maps ? `
        <a href="${datos.ceremonia.maps}" target="_blank" class="inline-flex items-center gap-1.5 px-6 py-2.5 bg-accent text-white text-xs font-semibold uppercase tracking-wider rounded-full shadow-md hover:bg-accent/95 transition transform active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Ver mapa de ubicación
        </a>
        ` : ""}
      </div>
    </section>
    ` : "";

  // Sección de contenido: recepcion
  const recepcionSeccionHTML = isSectionActive("recepcion") ? `
    <section data-section="recepcion" class="p-6 pt-2">
      <div class="gold-card rounded-3xl p-6 text-center">
        <div class="flex justify-center mb-3">
          <span class="${tema.iconStyle}">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 5a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          </span>
        </div>
        <h3 class="font-serif text-xl text-dark font-semibold">Gran Banquete</h3>
        <p class="text-xs text-accent uppercase tracking-widest font-semibold mt-1 mb-4">Recepción & Fiesta</p>
        
        <div class="space-y-2 border-t border-b border-borderTheme/20 py-4 my-4">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Salón</span>
            <span class="text-sm font-semibold text-gray-800">${datos.recepcion.lugar}</span>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Hora</span>
            <span class="text-sm font-semibold text-gray-800">${datos.recepcion.hora} hrs</span>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Dirección</span>
            <span class="text-xs text-gray-600 font-light block line-clamp-2 px-4">${datos.recepcion.direccion}</span>
          </div>
        </div>

        ${datos.recepcion.maps ? `
        <a href="${datos.recepcion.maps}" target="_blank" class="inline-flex items-center gap-1.5 px-6 py-2.5 bg-accent text-white text-xs font-semibold uppercase tracking-wider rounded-full shadow-md hover:bg-accent/95 transition transform active:scale-95">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Ver mapa de ubicación
        </a>
        ` : ""}
      </div>
    </section>
    ` : "";

  // Sección de contenido: itinerario
  const itinerarioSeccionHTML = isSectionActive("itinerario") ? `
    <section data-section="itinerario" class="p-6">
      <div class="text-center mb-6">
        <span class="cursive-text text-3xl text-primary/80">Cronograma del Día</span>
        <h3 class="font-serif text-xl text-dark">Nuestro Itinerario</h3>
        <p class="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">Para no perderte de nada</p>
      </div>

      <div class="max-w-sm mx-auto pl-2 pr-2">
        ${itinerarioHTML}
      </div>
    </section>
    ` : "";

  // Sección de contenido: vestimenta
  const vestimentaSeccionHTML = isSectionActive("vestimenta") ? `
    <section data-section="vestimenta" class="p-6 text-center">
      <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs">
        <div class="flex justify-center mb-3 text-accent animate-pulse-soft">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 8.25c0-2-3-2.75-3-2.75V5a3 3 0 10-6 0v.5M3 8.25c0-2 3-2.75 3-2.75V5a3 3 0 106 0v.5m-3-1l.7 10h1.6m4-10l-.7 10h-1.6"></path></svg>
        </div>
        <h3 class="font-serif text-lg text-dark font-bold mb-1">Código de Vestimenta</h3>
        <p class="text-xs text-gray-500 font-light uppercase tracking-wider mb-3">Dress Code</p>
        <p class="text-sm font-medium text-gray-700 italic px-4">
          "${datos.dressCode}"
        </p>

        ${datos.colorSugerido && datos.colorSugerido.length > 0 ? `
        <div class="mt-6 border-t border-gray-100 pt-5">
          <h4 class="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-3">Colores sugeridos e inspiración</h4>
          <div class="flex justify-center gap-4">
            ${colorBubblesHTML}
          </div>
        </div>
        ` : ""}
      </div>
    </section>
    ` : "";

  // Sección de contenido: familia
  const familiaSeccionHTML = isSectionActive("familia") ? `
    <section data-section="familia" class="p-6 pb-2 text-center">
      <div class="gold-card rounded-3xl p-6">
        <span class="text-2xl text-accent mb-2 block">⚜️</span>
        <h3 class="font-serif text-lg text-dark mb-1">${textosEvento.padresBendicion}</h3>
        <div class="py-2 mb-4">
          ${padresHTML}
        </div>

        ${padrinosHTML.length > 0 ? `
        <div class="border-t border-borderTheme/20 pt-4 mt-2">
          <h4 class="font-serif text-md text-accent italic mb-2">${textosEvento.padrinosTexto}</h4>
          ${padrinosHTML}
        </div>
        ` : ""}
      </div>
    </section>
    ` : "";

  // Sección de contenido: regalos premium
  const regalosSeccionHTML = isSectionActive("regalos") ? `
    <section data-section="regalos" class="p-6 text-center">
      <div class="gold-card rounded-3xl p-7 border border-borderTheme/30 shadow-lg">
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-[${tema.colors.light}] to-[${tema.colors.secondary}] flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-8 h-8 text-[${tema.colors.accent}]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
          </div>
        </div>
        <h3 class="font-serif text-xl text-dark font-bold mb-2">Caja de Regalos</h3>
        <p class="text-xs text-gray-500 font-light uppercase tracking-wider mb-5">Muestras de Afecto</p>

        <p class="text-sm text-gray-700 font-light mb-6 leading-relaxed">El obsequio más grande es tu presencia en este día tan especial, pero si deseas hacerme un detalle, te dejo mis opciones disponibles:</p>

        <div class="space-y-3">
          ${datos.mesaRegalos ? `
          <div class="bg-gradient-to-r from-[${tema.colors.light}] to-white rounded-2xl p-5 border-2 border-borderTheme/25 text-left shadow-sm hover:shadow-md transition">
            <span class="text-[10px] uppercase font-bold tracking-widest text-[${tema.colors.accent}] block mb-2">🎁 Mesa de Regalos</span>
            <p class="text-sm font-semibold text-gray-800">${datos.mesaRegalos}</p>
          </div>
          ` : ""}

          ${datos.datosBancarios ? `
          <div class="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border-2 border-gray-200 text-left shadow-sm hover:shadow-md transition">
            <span class="text-[10px] uppercase font-bold tracking-widest text-gray-600 block mb-2">💳 Transferencia Bancaria</span>
            <p id="banco-info" class="text-xs font-mono text-gray-800 whitespace-pre-line leading-relaxed font-semibold bg-white/60 p-3 rounded-lg">${datos.datosBancarios}</p>

            <button onclick="copiarDatosTransferencia()" class="mt-4 w-full py-2.5 bg-gradient-to-r from-[${tema.colors.primary}] to-[${tema.colors.accent}] text-white text-[12px] font-bold flex items-center justify-center gap-2 border border-white/30 rounded-xl hover:shadow-lg transition cursor-pointer active:scale-95 transform duration-200">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
              Copiar Datos Bancarios
            </button>
          </div>
          ` : ""}
        </div>
      </div>
    </section>
    ` : "";

  // Formato de la sección de galería: "grid" (de siempre), "carrusel" (fila que se desliza, no
  // crece en alto) o "polaroid" (2026-11-19, fotos instantáneas con rotación) -- ver
  // "estiloGaleria" en el editor. Si no está definido o es desconocido se usa "grid" para no
  // cambiarle el look a invitaciones guardadas antes de este campo.
  // paraExportarPDF SIEMPRE fuerza "grid" sin importar lo elegido: el PDF de regalo captura el
  // iframe con html2canvas a un ancho fijo (ver handleDescargarPDF en App.tsx) -- un carrusel con
  // overflow-x-auto solo mostraría la primera foto (y media) en esa captura, el resto del álbum
  // quedaría cortado en silencio, y "polaroid" tiene fotos de ancho fijo que no se acomodarían
  // bien en una cuadrícula angosta de captura. Un PDF tampoco puede "deslizarse", así que grid
  // es lo correcto ahí de todas formas, no solo un parche para el bug de la captura.
  const estiloGaleriaEfectivo: "grid" | "carrusel" | "polaroid" =
    paraExportarPDF ? "grid" : (datos.estiloGaleria === "carrusel" || datos.estiloGaleria === "polaroid") ? datos.estiloGaleria : "grid";

  // Sección de contenido: galeria premium
  const galeriaSeccionHTML = isSectionActive("galeria") && fotosFiltradas.length > 0 ? `
    <section data-section="galeria" class="p-6">
      <div class="text-center mb-8">
        <span class="cursive-text text-3xl text-primary/80">Recuerdos Inolvidables</span>
        <h3 class="font-serif text-xl text-dark font-bold">Mi Álbum de Fotos</h3>
        <p class="text-[10px] uppercase tracking-widest text-gray-400 mt-1">✨ Capturando momentos especiales ✨</p>
      </div>

      ${estiloGaleriaEfectivo === "carrusel" ? `
      <div class="flex justify-end items-center gap-1 text-[10px] uppercase tracking-widest text-gray-400 max-w-2xl mx-auto mb-2 pr-1">
        deslizar →
      </div>
      <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 max-w-2xl mx-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        ${galeriaFotosCarruselHTML}
      </div>
      ` : estiloGaleriaEfectivo === "polaroid" ? `
      <div class="flex flex-wrap justify-center gap-x-4 gap-y-6 max-w-2xl mx-auto py-2">
        ${galeriaFotosPolaroidHTML}
      </div>
      ` : `
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        ${galeriaFotosHTML}
      </div>
      `}
    </section>
    ` : "";

  // Sección de contenido: hashtag
  const hashtagSeccionHTML = isSectionActive("hashtag") && datos.hashtag ? `
    <section data-section="hashtag" class="p-6 text-center">
      <div class="bg-[${tema.colors.light}] rounded-3xl p-6 border border-borderTheme/30">
        <span class="text-2xl mb-1 block">📸</span>
        <h4 class="font-serif text-md text-dark mb-1">¡Comparte tus capturas!</h4>
        <p class="text-xs text-gray-500 mb-4">Etiqueta mis historias usando mi hashtag oficial:</p>
        <span class="inline-block px-5 py-2 bg-white text-accent font-mono font-bold tracking-wide rounded-full border border-borderTheme/60 shadow-xs text-sm transform hover:scale-105 transition">
          ${datos.hashtag}
        </span>
      </div>
    </section>
    ` : "";

  // Sección de contenido: calendario
  const calendarioSeccionHTML = isSectionActive("calendario") ? `
    <section data-section="calendario" class="p-6 text-center">
      <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs">
        <div class="flex justify-center mb-3">
          <span class="${tema.iconStyle}">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </span>
        </div>
        <h3 class="font-serif text-lg text-dark font-bold mb-1">¿Deseas reservarlo?</h3>
        <p class="text-xs text-gray-400 font-light uppercase tracking-wider mb-4">Agenda el evento</p>
        <button onclick="agregarAlCalendario()" class="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white text-xs font-semibold uppercase tracking-wider rounded-full shadow-md hover:bg-accent/95 cursor-pointer transform active:scale-95 transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Agregar a Google Calendar
        </button>
      </div>
    </section>
    ` : "";

  // Sección de contenido: pases. Muestra el pase FIJO del invitado incluido en este link —
  // ya no hay buscador: cada link personalizado solo trae los datos de UN invitado (ver
  // getShareUrl en App.tsx), así que no hay lista de nadie más que buscar/exponer.
  const pasesSeccionHTML = isSectionActive("pases") ? `
    <section data-section="pases" class="p-6">
      <div class="gold-card rounded-3xl p-6 text-center relative overflow-hidden">
        <span class="text-3xl text-accent/80 block mb-3 animate-float">${tema.decorativeEmoji}</span>
        <h3 class="font-serif text-xl text-dark font-bold">Pases de Entrada</h3>
        <p class="text-xs text-gray-500 font-light uppercase tracking-wider mb-4">Acceso Exclusivo</p>

        <!-- Tarjeta de pase fijo -->
        <div id="resultado-pase-bloque" class="hidden max-w-xs mx-auto p-4 rounded-2xl bg-[${tema.colors.light}] border border-borderTheme/50 mt-4 text-center animate-pulse-soft">
          <span class="text-[9px] uppercase tracking-widest text-[#B89D4B] font-bold block">Pase de Invitación</span>
          <div class="h-[1px] bg-borderTheme/30 my-2"></div>
          <p id="pase-nombre-invitado" class="text-md font-serif text-dark font-semibold"></p>
          <div class="my-3 bg-white py-2 rounded-xl border border-gray-150 inline-block px-5">
            <span class="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block">Pases Reservados</span>
            <span id="pase-cantidad" class="text-3xl font-bold text-accent font-serif">2</span>
          </div>
          <div id="pase-mesa-bloque" class="hidden mb-2">
            <span class="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Mesa</span>
            <span id="pase-mesa-texto" class="ml-1.5 text-sm font-bold text-dark font-serif"></span>
          </div>
          <p class="text-[10px] text-gray-400 italic font-mono mt-1">Presenta esta invitación digital para tu ingreso</p>
          <div id="qr-acceso-bloque" class="hidden mt-4 pt-3 border-t border-borderTheme/30">
            <img id="qr-acceso-img" src="" alt="Código QR de acceso" width="150" height="150" class="mx-auto rounded-xl border border-gray-200 bg-white p-1.5" />
            <p class="text-[9px] text-gray-400 mt-1.5">Muestra este código QR en la entrada</p>
          </div>
        </div>

        <div id="sin-coincidencia-pases" class="hidden text-xs text-gray-500 italic mt-3">
          Esta invitación no tiene un pase asignado. Contacta a los anfitriones para más información.
        </div>
      </div>
    </section>
    ` : "";

  // Sección de contenido: confirmacion mejorada
  const confirmacionSeccionHTML = isSectionActive("confirmacion") ? `
    <section data-section="confirmacion" class="p-6 text-center">
      <div class="gold-card rounded-3xl p-7 border border-borderTheme/30 shadow-lg backdrop-blur">
        <div class="flex justify-center mb-4">
          <div class="text-4xl drop-shadow-lg animate-pulse-soft">💌</div>
        </div>
        <h3 class="font-serif text-xl text-dark font-bold mb-1">Confirmación de Asistencia</h3>
        <p class="text-xs text-gray-500 font-light uppercase tracking-wider mb-5">Tu lugar es especial para nosotros</p>

        <p class="text-sm text-gray-700 font-light mb-7 px-4 leading-relaxed">Por favor, envíanos tu confirmación de asistencia lo antes posible. Tus datos nos ayudarán a preparar el mejor evento:</p>

        <div class="space-y-3 max-w-xs mx-auto">
          <div class="relative">
            <input type="text" id="rsvp-nombre" placeholder="Nombre completo o Familia..." class="w-full px-5 py-3 text-sm text-gray-700 bg-white rounded-full border-2 border-borderTheme/40 focus:border-[${tema.colors.primary}] focus:bg-white outline-none transition shadow-sm placeholder-gray-400" />
            <svg class="absolute right-4 top-3.5 w-5 h-5 text-gray-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          </div>

          <div class="relative">
            <select id="rsvp-asistencia" class="w-full px-5 py-3 text-sm text-gray-700 bg-white rounded-full border-2 border-borderTheme/40 focus:border-[${tema.colors.primary}] focus:bg-white outline-none transition shadow-sm appearance-none cursor-pointer">
              <option value="si">✅ Sí, asistiré con gusto</option>
              <option value="no">❌ Lamentablemente no podré asistir</option>
            </select>
            <svg class="absolute right-4 top-3.5 w-5 h-5 text-gray-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          </div>

          <div class="relative">
            <input type="number" id="rsvp-pases" placeholder="Número de personas..." min="1" max="10" class="w-full px-5 py-3 text-sm text-gray-700 bg-white rounded-full border-2 border-borderTheme/40 focus:border-[${tema.colors.primary}] focus:bg-white outline-none transition shadow-sm placeholder-gray-400" />
            <svg class="absolute right-4 top-3.5 w-5 h-5 text-gray-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20H1v-2a6 6 0 016-6v0"></path></svg>
          </div>

          <button onclick="enviarRSVPWhatsApp()" class="mt-5 w-full py-3.5 bg-gradient-to-r from-[#25D366] to-[#20ba56] text-white font-serif font-bold uppercase tracking-widest text-sm rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer transform active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 border border-white/30">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.864.001-2.641-1.026-5.124-2.89-6.991C16.576 1.884 14.09 1.856 11.997 1.856c-5.444 0-9.87 4.414-9.873 9.866-.001 1.768.487 3.491 1.417 5.011L2.553 21.05l4.094-1.074z"/></svg>
            Confirmar por WhatsApp
          </button>
        </div>
      </div>
    </section>
    ` : "";

  // Orden dinámico de las secciones de contenido (todas menos "apertura"/"cierre", que
  // siempre quedan fijas al inicio y al final de la invitación).
  const ordenSeccionesEfectivo = getOrdenSeccionesEfectivo(datos.paquete, datos.ordenSecciones);
  const SECCIONES_CONTENIDO_HTML: Record<string, string> = {
    portada: portadaSeccionHTML,
    cuenta: cuentaSeccionHTML,
    mensaje: mensajeSeccionHTML,
    ceremonia: ceremoniaSeccionHTML,
    recepcion: recepcionSeccionHTML,
    itinerario: itinerarioSeccionHTML,
    vestimenta: vestimentaSeccionHTML,
    familia: familiaSeccionHTML,
    regalos: regalosSeccionHTML,
    galeria: galeriaSeccionHTML,
    hashtag: hashtagSeccionHTML,
    calendario: calendarioSeccionHTML,
    pases: pasesSeccionHTML,
    confirmacion: confirmacionSeccionHTML
  };
  const contenidoSeccionesHTML = ordenSeccionesEfectivo.map(id => SECCIONES_CONTENIDO_HTML[id] || "").join("");


  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${textosEvento.prefijoTitulo} ${datos.nombre}</title>
  
  <!-- Google Fonts importados para el tema -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${construirUrlGoogleFonts(tema)}" rel="stylesheet">
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <script>
    // Configuración dinámica de fuentes y estilos para Tailwind
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['${tema.fontBody === "Inter" ? "Inter" : tema.fontBody}', 'sans-serif'],
            serif: ['${tema.fontHeading}', 'serif'],
            cursive: ['${tema.fontCursive || "Great Vibes"}', 'cursive']
          },
          colors: {
            primary: '${tema.colors.primary}',
            secondary: '${tema.colors.secondary}',
            accent: '${tema.colors.accent}',
            dark: '${tema.colors.dark}',
            light: '${tema.colors.light}',
            borderTheme: '${tema.colors.border}',
            textThemeDark: '${tema.textDark}',
            textThemeLight: '${tema.textLight}'
          },
          aspectRatio: {
            '3/4': '3 / 4',
            '4/3': '4 / 3'
          }
        }
      }
    }
  </script>

  <style>
    /* Estilos personalizados del tema elegido */
    ${tema.customStyle || ""}

    /* Ocultar el fondo y el contenido de la invitación antes de abrir el sobre */
    body:not(.experiencia-iniciada) {
      overflow: hidden !important;
      height: 100vh !important;
      background: ${tema.bgGradient} !important;
      background-image: none !important;
    }
    body:not(.experiencia-iniciada)::after {
      background-image: none !important;
      display: none !important;
    }
    body:not(.experiencia-iniciada) > *:not(#pantalla-apertura):not(script) {
      opacity: 0 !important;
      pointer-events: none !important;
      visibility: hidden !important;
    }

    body.experiencia-iniciada > *:not(#pantalla-apertura):not(script) {
      animation: fadeInContent 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeInContent {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Estilo del sobre o pantalla de apertura (siempre sólido hasta que se abra) */
    #pantalla-apertura {
      background-image: none !important;
      background: ${tema.bgGradient} !important;
      background-color: ${tema.colors.bg} !important;
      z-index: 50;
    }

    /* Textura de papel sutil del FONDO GENERAL (2026-11-20, ver TEMAS_CON_TEXTURA_PAPEL arriba)
       -- caso SIN foto de fondo personalizada (el default): se agrega solo background-image +
       background-blend-mode, SIN tocar background-color -- el color de fondo de cada tema ya lo
       pone tema.customStyle (".theme-container { background-color: ... }", arriba) y se compone
       con esta capa automáticamente. No hace falta ningún guard para que no aparezca antes de
       abrir el sobre/apertura: la regla "body:not(.experiencia-iniciada) { background-image:
       none !important; }" de arriba ya la apaga por su cuenta (gana por !important). El caso
       CON foto de fondo personalizada se resuelve aparte, dentro del bloque de bgImages de abajo
       (ahí la textura se agrega como una capa más del "background-image" que ya existe). */
    ${temaTieneTexturaPapel ? `
    .theme-container {
      background-image: ${TEXTURA_PAPEL_DATAURI};
      background-repeat: repeat;
      background-blend-mode: multiply;
    }` : ""}

    ${fondoEfectivo ? `
    /* Imagen de fondo de esta invitación (solo se muestra al abrir el sobre) -- ya sea subida a
       mano por tema, o un fondo "listo" de galería elegido para el evento actual (2026-11-22,
       ver resolverFondoEfectivo arriba, el que manda cuando hay ambos). El fondo de respaldo
       usa el degradado real del tema (no transparent) -- si esta imagen en particular se cae
       (link roto, borrada del hosting, etc.), la invitación no se queda en blanco: se ve el
       degradado normal del tema por debajo mientras se resuelve. */
    html {
      background: ${tema.bgGradient} !important;
    }
    body.experiencia-iniciada {
      background: ${tema.bgGradient} !important;
    }
    body.experiencia-iniciada, body.experiencia-iniciada.theme-container {
      ${temaTieneTexturaPapel ? `
      /* Textura de papel (2026-11-20) como una capa MÁS del fondo -- misma textura que el
         fondo general sin foto, agregada aquí como un segundo layer (en vez de un ::after
         aparte) porque body ya usa su ::before/::after para el velo/respaldo de abajo. Cada
         propiedad lleva un valor por capa (textura primero, foto después) para que
         background-size:cover no le aplique también al tile de 180px de la textura. */
      background-image: ${TEXTURA_PAPEL_DATAURI}, url('${fondoEfectivo}') !important;
      background-size: 180px 180px, cover !important;
      background-position: 0 0, center !important;
      background-repeat: repeat, no-repeat !important;
      background-attachment: fixed, fixed !important;
      background-blend-mode: multiply, normal !important;
      ` : `
      background-image: url('${fondoEfectivo}') !important;
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
      background-attachment: fixed !important;
      `}
    }
    /* Capa de fondo fija de respaldo para cobertura total garantizada en smartphones */
    body.experiencia-iniciada::after, body.experiencia-iniciada.theme-container::after {
      content: "";
      position: fixed;
      inset: 0;
      background-image: url('${fondoEfectivo}') !important;
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
      z-index: -1;
      pointer-events: none;
    }
    /* Hacer el fondo de portada y cierre transparentes para que luzca la imagen global. */
    [data-section="portada"], footer[data-section="cierre"] {
      background: transparent !important;
      background-image: none !important;
    }
    /* Agregar un velo sutil que de soporte a los temas claros/oscuros.
       Opacidad ajustable desde el editor (control "Nitidez del fondo"); si el usuario
       no lo ha tocado, se usa el valor por defecto original de cada tipo de tema. */
    body.experiencia-iniciada::before, body.experiencia-iniciada.theme-container::before {
      content: "";
      position: fixed;
      inset: 0;
      background: ${(() => {
        const esOscuro = TEMAS_DEGRADADO_OSCURO.includes(tema.id);
        const opacidad = datos.fondoVeloOpacidad ?? (esOscuro ? 0.65 : 0.55);
        return esOscuro ? `rgba(8, 6, 16, ${opacidad})` : `rgba(255, 255, 255, ${opacidad})`;
      })()};
      pointer-events: none;
      z-index: 1;
    }
    /* Elevar todo el contenido sobre el velo */
    .theme-container > * {
      position: relative;
      z-index: 5;
    }
    
    /* Cajones y tarjetas translúcidas cuando hay imagen de fondo */
    .theme-container .bg-white.rounded-3xl, 
    .theme-container .gold-card,
    .theme-container [data-section] > .bg-white,
    .theme-container [data-section] > .rounded-3xl {
      background-color: ${TEMAS_DEGRADADO_OSCURO.includes(tema.id) ? "rgba(15, 23, 42, 0.90)" : "rgba(255, 255, 255, 0.93)"} !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      border: 1px solid ${TEMAS_DEGRADADO_OSCURO.includes(tema.id) ? "rgba(255,255,255,0.18)" : "rgba(255, 255, 255, 0.65)"} !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08) !important;
    }

    /* Soporte de accesibilidad y alto contraste para Temas Oscuros en textos grises */
    ${TEMAS_DEGRADADO_OSCURO.includes(tema.id) ? `
    .theme-container {
      color: #f1f5f9 !important;
    }
    .theme-container .text-gray-800 { color: #f8fafc !important; }
    .theme-container .text-gray-700 { color: #f1f5f9 !important; }
    .theme-container .text-gray-600 { color: #cbd5e1 !important; }
    .theme-container .text-gray-500 { color: #94a3b8 !important; }
    .theme-container .text-gray-400 { color: #cbd5e1 !important; }
    .theme-container .text-gray-300 { color: #94a3b8 !important; }
    .theme-container .bg-gray-50 { background-color: rgba(30, 41, 59, 0.4) !important; color: #f1f5f9 !important; border-color: rgba(255,255,255,0.1) !important; }
    .theme-container input, .theme-container select { background-color: rgba(30, 41, 59, 0.6) !important; color: #ffffff !important; border-color: rgba(255,255,255,0.2) !important; }
    .theme-container input::placeholder { color: #94a3b8 !important; }
    ` : ""}
    ` : ""}

    /* Contraste del cierre en temas de degradado oscuro (2026-11-24, ver prompt "Cierre: la frase
       de despedida no se lee en temas de fondo oscuro"): a diferencia del bloque de arriba, esta
       regla NO depende de 'fondoEfectivo' -- el footer de cierre pinta su fondo directo con
       'tema.bgGradient' (style inline, sin pasar por el sistema de velo/fondo global) sin importar
       si la invitación tiene o no una foto de fondo subida, así que el problema (texto oscuro de
       '.text-dark' sobre el degradado oscuro del mismo tema) ocurre también -- de hecho sobre todo
       -- cuando NO hay foto de fondo, el caso más común. Acotada a [data-section="cierre"] para
       no tocar los encabezados '.text-dark' de ninguna otra sección (van sobre tarjetas/fondos
       claros y se leen bien). Los temas claros (incluido Glam Rose, degradado claro) nunca entran
       aquí -- su cierre se sigue viendo oscuro sobre degradado claro, como siempre. */
    ${TEMAS_DEGRADADO_OSCURO.includes(tema.id) ? `
    [data-section="cierre"] .text-dark { color: #f1f5f9 !important; }
    ` : ""}

    /* Ocultar/Apagar cajas del fondo de los textos de las secciones si el cliente lo prefiere */
    ${estiloCajasEfectivo !== "normal" ? `
    /* Transparentar contenedores y tarjetas internas p/integrar con el fondo original */
    .theme-container .bg-white.rounded-3xl,
    .theme-container .gold-card,
    .theme-container .itinerario-editorial-card,
    .theme-container [data-section] > .bg-white,
    .theme-container [data-section] > .rounded-3xl,
    .theme-container .bg-white\\/45,
    .theme-container [data-section="cuenta"] > div,
    .theme-container [data-section] .bg-white,
    .theme-container [data-section] .bg-gray-50,
    .theme-container [data-section] .bg-rose-50\\/20,
    .theme-container [data-section] .bg-[\\#FCF9F2],
    .theme-container [data-section] .bg-[\\#FCF5FE],
    .theme-container [data-section] .bg-[\\#FCF6F7],
    .theme-container [data-section] .bg-[\\#111B30],
    .theme-container [data-section] .bg-[\\#F4F7F5] {
      background-color: transparent !important;
      background: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow: none !important;
      ${estiloCajasEfectivo === "sin_cajon" ? "border: none !important;" : ""}
    }

    /* Respetar color de acento y colores específicos legibles en el fondo natural */
    .theme-container .text-accent,
    .theme-container [id^="countdown-"] {
      color: ${tema.colors.accent} !important;
    }

    .theme-container .text-primary {
      color: ${tema.colors.primary} !important;
    }

    .theme-container .cursive-text,
    .theme-container .font-cursive {
      color: ${tema.colors.accent} !important;
    }

    /* Asegurar botones con fondo de acento permanezcan coloridos y visibles */
    .theme-container a.bg-accent,
    .theme-container button.bg-accent {
      background-color: ${tema.colors.accent} !important;
      color: #FFFFFF !important;
    }
    ` : ""}

    /* Animaciones sutiles y florituras */
    @keyframes floaty {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-12px) rotate(2deg); }
    }
    .animate-float {
      animation: floaty 5s ease-in-out infinite;
    }

    @keyframes pulse-soft {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.08); opacity: 1; }
    }
    .animate-pulse-soft {
      animation: pulse-soft 3s ease-in-out infinite;
    }

    @keyframes pulse-slow {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    .animate-pulse-slow {
      animation: pulse-slow 4s ease-in-out infinite;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in {
      animation: fade-in 1s ease-in-out forwards;
    }

    /* Estilos mejorados para elementos premium */
    .itinerario-item {
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .itinerario-item:hover {
      transform: translateX(8px);
    }

    .galeria-foto {
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .galeria-foto:hover {
      filter: brightness(1.05);
    }

    /* Estilo "polaroid" de la galería (2026-11-19, ver estiloGaleria === "polaroid") -- la
       rotación alternada de cada foto es un ángulo fijo por elemento (--rot, puesto inline por
       foto), no se puede expresar con una sola regla, así que se guarda en variable CSS. */
    .galeria-foto-polaroid {
      transform: rotate(var(--rot, 0deg));
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
    }
    .galeria-foto-polaroid:hover {
      transform: rotate(0deg) scale(1.05);
      box-shadow: 0 12px 30px rgba(0,0,0,0.2);
    }

    /* Scroll suave */
    html {
      scroll-behavior: smooth;
    }

    /* Ocultar secciones inactivas del paquete */
    section {
      width: 100%;
    }

    /* Animación de caída de elementos decorativos (pétalos, estrellas, moños, etc.) */
    @keyframes fallAndSway {
      0% {
        transform: translateY(-20px) rotate(0deg) translateX(0);
        opacity: 0;
      }
      10% {
        opacity: 0.8;
      }
      50% {
        transform: translateY(50vh) rotate(180deg) translateX(25px);
      }
      90% {
        opacity: 0.8;
      }
      100% {
        transform: translateY(110vh) rotate(360deg) translateX(-20px);
        opacity: 0;
      }
    }
    .falling-particle {
      position: fixed;
      pointer-events: none;
      z-index: 99;
      will-change: transform, opacity;
      user-select: none;
    }

    /* Ráfaga corta de destellos al abrir cualquiera de las 5 aperturas (crearRafagaDestellos) --
       estalla desde el centro hacia --dx/--dy (en vw/vh, variable puesta por elemento en JS) y
       se desvanece, nada queda corriendo después. */
    @keyframes destelloEstallido {
      0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
      25% { opacity: 1; }
      100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1); opacity: 0; }
    }
  </style>
</head>
<body class="theme-container min-h-screen text-textThemeDark selection:bg-primary/20 selection:text-accent ${datos.seccionesExcluidas?.includes('apertura') ? 'experiencia-iniciada' : ''}">

  <!-- ==============================================
       1. SECCIÓN: APERTURA (TOCA PARA ENTRAR)
       ============================================== -->
  ${aperturaHTML}

  <!-- ==============================================
       REPRODUCTOR DE MÚSICA BACKGROUND
       ============================================== -->
  ${datos.cancion ? `
  <div id="music-widget" class="fixed top-4 right-4 z-40 hidden">
    <button onclick="toggleMusic()" class="p-3 bg-white/90 backdrop-blur-md border border-borderTheme/50 rounded-full shadow-lg text-accent hover:bg-white transition-all transform hover:scale-105" id="btn-audio-control">
      <span id="speaker-icon">
        <!-- Play / Mute SVG -->
        <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
      </span>
    </button>
    <audio id="musica-invitacion" loop>
      <source src="${datos.cancion}" type="audio/mpeg">
    </audio>
  </div>
  ` : ""}

  <!-- CONTENEDOR PRINCIPAL -->
  <main class="max-w-[480px] mx-auto min-h-screen bg-white/10 shadow-2xl relative overflow-x-hidden flex flex-col pb-12">

    ${contenidoSeccionesHTML}
    <!-- ==============================================
         16. SECCIÓN: CIERRE Y DESPEDIDA
         ============================================== -->
    ${isSectionActive("cierre") ? `
    <footer data-section="cierre" class="relative mt-12 py-12 px-6 text-center" style="background: ${tema.bgGradient};">
      <div class="absolute inset-x-0 top-0 h-[1px] bg-borderTheme/25"></div>
      
      <span class="text-4xl text-accent mb-4 animate-float block">${tema.decorativeEmoji}</span>
      <h3 class="cursive-text text-5xl mb-4 text-accent">${datos.nombre}</h3>
      <p class="font-serif text-xl tracking-tight text-dark">¡Te espero para celebrar de mi soñado día!</p>
      
      <div class="w-12 h-1px bg-borderTheme/50 mx-auto mt-6 mb-2"></div>
      <p class="text-[9px] font-mono tracking-widest text-gray-400">INVITACIÓN DIGITAL PRIVADA • EXCLUSIVA</p>
    </footer>
    ` : ""}

  </main>

  <!-- ==============================================
       LIGHTBOX CAROUSEL DE FOTOS
       ============================================== -->
  <div id="lightbox-carousel" class="fixed inset-0 bg-black/95 z-50 hidden flex-col items-center justify-between p-4 transition-all duration-300">
    <button onclick="cerrarLightbox()" class="self-end p-2 text-white/80 hover:text-white text-3xl font-light cursor-pointer select-none">&times;</button>
    
    <div class="relative w-full max-w-md my-auto aspect-3/4 flex items-center justify-center">
      <button onclick="navegarLightbox(-1)" class="absolute left-2 p-3 text-white/70 hover:text-white text-3xl select-none cursor-pointer">&lsaquo;</button>
      <img id="lightbox-imagen-activa" src="" class="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl" />
      <button onclick="navegarLightbox(1)" class="absolute right-2 p-3 text-white/70 hover:text-white text-3xl select-none cursor-pointer">&rsaquo;</button>
    </div>

    <div class="pb-6 text-white/60 font-mono text-xs" id="lightbox-indice"></div>
  </div>

  <!-- ==============================================
       DATA SOURCE / CONFIGURACIÓN DE INVITACIÓN
       ============================================== -->
  <script>
    // Inyectamos el objeto de datos original en el cliente
    const datosInvitacion = ${JSONDatosString};
    const fotosCarousel = ${JSON.stringify(fotosFiltradas)};
    let indiceLightbox = 0;

    // Ejecutar al cargar la página
    window.addEventListener('DOMContentLoaded', () => {
      // 1. Iniciar Cuenta Regresiva
      iniciarCuentaRegresiva("${escDoubleQuote(datos.fecha)}");

      // 2. Colocar Fecha en Portada legible de forma humana
      formatearFechaPortada("${escDoubleQuote(datos.fecha)}");

      // 3. Mostrar el pase fijo de este invitado (ya no hay buscador: cada link solo trae
      // los datos del invitado al que se le envió, por privacidad — ver getShareUrl en App.tsx)
      try {
        const huboPase = mostrarPaseFijo();
        // El auto-scroll a "pases" solo tiene sentido para un invitado real abriendo SU
        // invitación (le enseña su pase de volada) -- las demos del catálogo y el monitor de
        // invitación del editor siempre traen un invitado de muestra para poder enseñar esa
        // sección, así que sin este candado el scroll se disparaba solo ahí también: en las
        // demos alejándolas de la portada del tema, y en el editor arrastrando al admin lejos
        // de donde estaba editando cada vez que el preview se recargaba.
        if (huboPase && !${(esDemoDeCatalogo || esVistaPreviaEditor) ? "true" : "false"}) {
          // Hacer scroll suave hacia la sección de pases tras abrir la invitación
          setTimeout(() => {
            const pasesSection = document.querySelector('[data-section="pases"]');
            if (pasesSection) {
              pasesSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 1200);
        }
      } catch (err) {
        console.warn("Error mostrando pase:", err);
      }

      // 3.5. Pantalla "PARA / Familia" (2026-11-20): si el link trae ?fam= Y resuelve a un
      // invitado real (mismo dato que acaba de usar mostrarPaseFijo() arriba), se muestra arriba
      // del elemento principal de CUALQUIER tipo de apertura. Si no hay parámetro o no resuelve,
      // el bloque se queda oculto -- la apertura se ve exactamente igual que antes de este cambio.
      try {
        const famParam = new URLSearchParams(window.location.search).get('fam');
        const invitadoPara = (datosInvitacion.invitados || [])[0];
        if (famParam && invitadoPara && invitadoPara.nombre) {
          const bloquePara = document.getElementById('apertura-para-familia');
          const nombrePara = document.getElementById('apertura-para-familia-nombre');
          if (bloquePara && nombrePara) {
            nombrePara.innerText = invitadoPara.nombre;
            bloquePara.classList.remove('hidden');
          }
        }
      } catch (err) {
        console.warn("Error mostrando PARA/familia en apertura:", err);
      }

      // 3.6. Apertura "Caligrafía": el nombre se escribe solo al cargar, sin esperar ningún
      // toque (a diferencia de las otras 5 aperturas, que esperan el toque antes de animar nada).
      // Con "Reducir movimiento" activo se deja el nombre ya escrito (estado por default de
      // .caligrafia-nombre sin la clase .caligrafia-animando) y solo se espera el toque.
      try {
        const nombreCaligrafia = document.getElementById('caligrafia-nombre');
        if (nombreCaligrafia && !prefiereMenosMovimiento()) {
          nombreCaligrafia.classList.add('caligrafia-animando');
        }
      } catch (err) {
        console.warn("Error iniciando animación de Caligrafía:", err);
      }

      // Si no hay pantalla de apertura, activar la experiencia de inmediato
      if (!document.getElementById('pantalla-apertura')) {
        document.body.classList.add('experiencia-iniciada');
        const sw = document.getElementById('music-widget');
        if (sw) sw.classList.remove('hidden');
        iniciarAnimacionCaida();
      }

      // 4. Animación al hacer scroll (2026-11-19, "suave" -- default "ninguna" = comportamiento
      // de siempre). El estado oculto inicial se aplica AQUÍ, por JS, nunca por CSS estático --
      // si algo falla (navegador sin IntersectionObserver, excepción) el catch de abajo quita
      // cualquier estilo que se haya alcanzado a poner, para que el contenido jamás se quede
      // invisible. No toca la pantalla de apertura (no es un [data-section]) ni interfiere con
      // la animación de caída (particle-container, z-index aparte). Respeta "Reducir movimiento".
      if (${datos.personalizacion?.animacionScroll === "suave" ? "true" : "false"}) {
        try {
          if (!prefiereMenosMovimiento() && 'IntersectionObserver' in window) {
            const seccionesParaAnimar = document.querySelectorAll('main [data-section]');
            seccionesParaAnimar.forEach(function(sec) {
              sec.style.opacity = '0';
              sec.style.transform = 'translateY(24px)';
              sec.style.transition = 'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)';
              // Escalonado ligero entre hijos directos (máx. 4, 70ms entre cada uno) -- se
              // omite si la sección solo tiene 1 hijo envolvente (nada que escalonar).
              const hijos = Array.prototype.slice.call(sec.children, 0, 4);
              if (hijos.length > 1) {
                hijos.forEach(function(hijo, i) {
                  if (i === 0) return;
                  hijo.style.opacity = '0';
                  hijo.style.transform = 'translateY(14px)';
                  hijo.style.transition = 'opacity 0.6s ease ' + (i * 0.07) + 's, transform 0.6s ease ' + (i * 0.07) + 's';
                });
              }
            });
            const observadorScroll = new IntersectionObserver(function(entries) {
              entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                Array.prototype.slice.call(entry.target.children, 0, 4).forEach(function(hijo) {
                  hijo.style.opacity = '1';
                  hijo.style.transform = 'translateY(0)';
                });
                observadorScroll.unobserve(entry.target);
              });
            }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
            seccionesParaAnimar.forEach(function(sec) { observadorScroll.observe(sec); });
          }
        } catch (err) {
          console.warn("Animación al hacer scroll desactivada por un error:", err);
          document.querySelectorAll('main [data-section], main [data-section] > *').forEach(function(el) {
            el.style.opacity = '';
            el.style.transform = '';
          });
        }
      }
    });

    // 1. Manejo del reproductor de sonido
    const audioPlayer = document.getElementById('musica-invitacion');
    const speakerBtn = document.getElementById('btn-audio-control');
    const speakerWidget = document.getElementById('music-widget');
    let isPlaying = false;

    // Símbolos del tema (compartidos entre la lluvia continua de iniciarAnimacionCaida y la
    // ráfaga corta de apertura crearRafagaDestellos, para no duplicar la tabla dos veces).
    const SIMBOLOS_POR_TEMA = {
      'dorado-clasico': ['✨', '🌟', '🪙', '✨'],
      'mariposas': ['🦋', '🌸', '✨', '💜'],
      'floral-acuarela': ['🌸', '🌹', '🍃', '💮'],
      'celestial': ['⭐', '✨', '🌙', '🌌'],
      'coquette-pink': ['🎀', '💖', '🤍', '🌸'],
      'coquette-luxe': ['🎀', '✨', '💖', '⚜️'],
      'boho-chic': ['🍃', '🍂', '🌾', '✨'],
      'neon': ['⚡', '✨', '🎵', '💚', '💖', '💙'],
      'princesa-elegante': ['👑', '✨', '💖', '⭐'],
      'rose-gold': ['🌸', '✨', '🌹', '🌟'],
      'esmeralda': ['🍃', '✨', '💚', '🌟'],
      'vintage-garden': ['🌸', '🌹', '🍃', '🦋']
    };
    const simbolosOverrideApertura = ${(datos.personalizacion?.simbolosCaida && datos.personalizacion.simbolosCaida.length > 0) ? JSON.stringify(datos.personalizacion.simbolosCaida) : 'null'};
    const simbolosTemaActual = simbolosOverrideApertura || SIMBOLOS_POR_TEMA['${tema.id}'] || ['✨', '🌸', '🍃'];

    // Respeta "Reducir movimiento" del sistema/navegador: las 5 aperturas lo consultan antes de
    // iniciar su coreografía por etapas y, si está activo, saltan directo a comenzarExperiencia()
    // sin animación larga (la ráfaga de destellos tampoco se dispara en ese caso).
    function prefiereMenosMovimiento() {
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (e) {
        return false;
      }
    }

    // Ráfaga breve de destellos al momento de abrir cualquiera de las 5 aperturas (distinta de
    // la lluvia continua de iniciarAnimacionCaida): un puñado de símbolos del tema que estallan
    // desde el centro de la pantalla y se desvanecen en menos de 1 segundo, sin dejar nada
    // corriendo después. No se dispara si "Reducir movimiento" está activo.
    function crearRafagaDestellos() {
      if (prefiereMenosMovimiento()) return;
      const contenedor = document.createElement('div');
      contenedor.style.position = 'fixed';
      contenedor.style.top = '0';
      contenedor.style.left = '0';
      contenedor.style.width = '100vw';
      contenedor.style.height = '100vh';
      contenedor.style.pointerEvents = 'none';
      contenedor.style.zIndex = '98';
      contenedor.style.overflow = 'hidden';
      document.body.appendChild(contenedor);

      const total = 16;
      for (let i = 0; i < total; i++) {
        const d = document.createElement('div');
        d.innerText = simbolosTemaActual[Math.floor(Math.random() * simbolosTemaActual.length)];
        const angulo = (360 / total) * i + (Math.random() * 18 - 9);
        const distancia = 32 + Math.random() * 28;
        const dx = Math.cos(angulo * Math.PI / 180) * distancia;
        const dy = Math.sin(angulo * Math.PI / 180) * distancia;
        d.style.position = 'absolute';
        d.style.top = '50%';
        d.style.left = '50%';
        d.style.fontSize = (14 + Math.random() * 14) + 'px';
        d.style.setProperty('--dx', dx + 'vw');
        d.style.setProperty('--dy', dy + 'vh');
        d.style.animation = 'destelloEstallido ' + (0.7 + Math.random() * 0.4) + 's cubic-bezier(0.17, 0.89, 0.32, 1.28) forwards';
        contenedor.appendChild(d);
      }
      setTimeout(() => contenedor.remove(), 1300);
    }

    function comenzarExperienciaEnvoltura() {
      if (prefiereMenosMovimiento()) { comenzarExperiencia(); return; }
      const container = document.getElementById('sobre-interactivo');
      const sello = document.getElementById('sobre-sello');
      if (container) {
        if (container.classList.contains('open')) return;
        // Lacre partiéndose en dos mitades (2026-11-20) -- se deja correr ~600ms antes de abrir
        // la solapa, para que el corte/caída/desvanecido del lacre se vea completo primero.
        if (sello) sello.classList.add('sello-rompiendo');
        setTimeout(() => {
          container.classList.add('open');
          crearRafagaDestellos();
        }, 600);
      }
      setTimeout(() => {
        comenzarExperiencia();
      }, 2200);
    }

    function comenzarExperienciaCortina() {
      if (prefiereMenosMovimiento()) { comenzarExperiencia(); return; }
      const container = document.getElementById('pantalla-apertura');
      if (container) {
        if (container.classList.contains('curtains-opened')) return;
        container.classList.add('curtains-opened');
        crearRafagaDestellos();
      }
      setTimeout(() => {
        comenzarExperiencia();
      }, 1400);
    }

    function comenzarExperienciaTarjeta() {
      if (prefiereMenosMovimiento()) { comenzarExperiencia(); return; }
      const tarjeta = document.getElementById('tarjeta-interactiva');
      if (tarjeta) {
        if (tarjeta.classList.contains('abriendo')) return;
        tarjeta.classList.add('abriendo');
        crearRafagaDestellos();
      }
      setTimeout(() => {
        comenzarExperiencia();
      }, 650);
    }

    function comenzarExperienciaPuertas() {
      if (prefiereMenosMovimiento()) { comenzarExperiencia(); return; }
      const escenario = document.getElementById('puertas-escenario');
      if (escenario) {
        if (escenario.classList.contains('abiertas')) return;
        escenario.classList.add('abiertas');
        const glow = document.getElementById('puertas-glow');
        if (glow) glow.classList.add('activo');
        crearRafagaDestellos();
      }
      setTimeout(() => {
        comenzarExperiencia();
      }, 1300);
    }

    function comenzarExperienciaDestellos() {
      if (prefiereMenosMovimiento()) { comenzarExperiencia(); return; }
      const overlay = document.getElementById('pantalla-apertura');
      if (overlay) {
        if (overlay.classList.contains('destellos-abriendo')) return;
        overlay.classList.add('destellos-abriendo');
        crearRafagaDestellos();
      }
      setTimeout(() => {
        comenzarExperiencia();
      }, 950);
    }

    // Apertura "Caligrafía" (2026-11-20): la escritura del nombre corre sola al cargar (ver
    // paso 3.6 del DOMContentLoaded) -- tocar la pantalla o el botón "TOCA PARA ABRIR" solo
    // acelera/salta a la portada, sin esperar a que termine el trazo.
    function comenzarExperienciaCaligrafia() {
      const overlay = document.getElementById('pantalla-apertura');
      if (overlay) {
        if (overlay.classList.contains('caligrafia-cerrando')) return;
        overlay.classList.add('caligrafia-cerrando');
        crearRafagaDestellos();
      }
      setTimeout(() => {
        comenzarExperiencia();
      }, prefiereMenosMovimiento() ? 0 : 400);
    }

    function comenzarExperiencia() {
      // Activar clase para iniciar transición de contenidos y fondos
      document.body.classList.add('experiencia-iniciada');

      // Esconder pantalla de bienvenida
      const overlay = document.getElementById('pantalla-apertura');
      if (overlay) {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.remove(), 1000);
      }

      // Mostrar widget de control musical
      if (speakerWidget) speakerWidget.classList.remove('hidden');

      // Reproducir música
      if (audioPlayer) {
        audioPlayer.play().then(() => {
          isPlaying = true;
          actualizarIconoAltavoz();
        }).catch(err => {
          console.log("Auto-play blocked or error: ", err);
        });
      }
      iniciarAnimacionCaida();

      // Analítica de aperturas (2026-11-19): un registro mínimo y anónimo (solo invitacion_id +
      // fecha automática, nada de IP/dispositivo/ubicación) cada vez que un invitado real ABRE
      // la invitación -- no al cargar la página, aquí mismo, dentro de comenzarExperiencia().
      // Mismo patrón que el RSVP de arriba: "iid" (parámetro ?iid= del link, ver getShareUrl en
      // App.tsx) solo existe en un link de invitación YA GUARDADA -- no en catálogo, demos de
      // temas, ni el monitor de invitación del propio editor -- así que sirve igual aquí para
      // registrar solo en la invitación publicada real, nunca en una vista previa del admin.
      // Try/catch silencioso: si la tabla "aperturas" todavía no existe en Supabase (el SQL de
      // docs/sql/aperturas.sql lo corre el dueño por separado) o no hay red, esto nunca debe
      // detener ni mostrar un error en la invitación -- de ahí el .catch(() => {}) también.
      try {
        const iidApertura = new URLSearchParams(window.location.search).get('iid');
        if (iidApertura && SUPABASE_URL_RSVP && SUPABASE_ANON_KEY_RSVP) {
          fetch(SUPABASE_URL_RSVP + '/rest/v1/aperturas', {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY_RSVP,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY_RSVP,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ invitacion_id: iidApertura })
          }).catch(() => {});
        }
      } catch (e) { /* nunca debe impedir que la invitación abra normalmente */ }
    }

    let animacionIniciada = false;
    function iniciarAnimacionCaida() {
      if (animacionIniciada) return;
      if (${datos.mostrarAnimacionCaida === false}) return;
      animacionIniciada = true;

      const container = document.createElement('div');
      container.id = 'particle-container';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '99';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);

      // Reusa la misma tabla/override ya resuelto arriba (SIMBOLOS_POR_TEMA/simbolosTemaActual),
      // compartida con crearRafagaDestellos -- antes esta función tenía su propia copia.
      const simbolos = simbolosTemaActual;

      function crearParticula() {
        if (!document.getElementById('particle-container')) return;
        const p = document.createElement('div');
        p.className = 'falling-particle';
        p.innerText = simbolos[Math.floor(Math.random() * simbolos.length)];
        
        const startX = Math.random() * 100; // porcentaje
        const startY = -5; // arriba de la pantalla
        const size = Math.random() * 12 + 8; // más pequeñas y sutiles (entre 8px y 20px)
        const duration = Math.random() * 10 + 12; // caen más lento y suave (entre 12s y 22s)
        const delay = Math.random() * 6; // retraso de inicio distribuido
        const opacity = Math.random() * 0.3 + 0.15; // opacidad más tenue y elegante (entre 0.15 y 0.45)

        p.style.position = 'absolute';
        p.style.top = startY + 'vh';
        p.style.left = startX + 'vw';
        p.style.fontSize = size + 'px';
        p.style.opacity = opacity.toString();
        p.style.filter = 'drop-shadow(0 2px 5px rgba(0,0,0,0.1))';
        p.style.animation = "fallAndSway " + duration + "s linear " + delay + "s infinite";
        
        container.appendChild(p);

        // Remover la partícula después de que termine su ciclo para no saturar el DOM
        setTimeout(() => {
          p.remove();
        }, (duration + delay) * 1000);
      }

      // Generar lote inicial de partículas más reducido para que sea sutil
      for (let i = 0; i < 12; i++) {
        crearParticula();
      }

      // Seguir generando partículas a un ritmo más pausado
      const interval = setInterval(() => {
        if (!document.getElementById('particle-container')) {
          clearInterval(interval);
          return;
        }
        crearParticula();
      }, 950);
    }

    function toggleMusic() {
      if (!audioPlayer) return;
      if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        actualizarIconoAltavoz();
      } else {
        audioPlayer.play().then(() => {
          isPlaying = true;
          actualizarIconoAltavoz();
        }).catch(err => {
          console.log("No se pudo reanudar la música: ", err);
        });
      }
    }

    function actualizarIconoAltavoz() {
      const btn = document.getElementById('speaker-icon');
      if (!btn) return;
      if (isPlaying) {
        btn.innerHTML = \`<svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>\`;
      } else {
        btn.innerHTML = \`<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>\`;
      }
    }

    // 2. Lógica Cuenta Regresiva
    function iniciarCuentaRegresiva(fechaTargetStr) {
      if (!fechaTargetStr) return;
      const targetDate = new Date(fechaTargetStr).getTime();

      const timer = setInterval(() => {
        const now = new Date().getTime();
        const difference = targetDate - now;

        if (difference < 0) {
          clearInterval(timer);
          document.getElementById('countdown-days').innerText = "00";
          document.getElementById('countdown-hours').innerText = "00";
          document.getElementById('countdown-minutes').innerText = "00";
          document.getElementById('countdown-seconds').innerText = "00";
          return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        document.getElementById('countdown-days').innerText = String(days).padStart(2, '0');
        document.getElementById('countdown-hours').innerText = String(hours).padStart(2, '0');
        document.getElementById('countdown-minutes').innerText = String(minutes).padStart(2, '0');
        document.getElementById('countdown-seconds').innerText = String(seconds).padStart(2, '0');
      }, 1000);
    }

    // 3. Formateo de Fecha Portada
    function formatearFechaPortada(fechaStr) {
      if (!fechaStr) return;
      try {
        const d = new Date(fechaStr);
        const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        const diaNombre = diasSemana[d.getDay()];
        const diaNum = d.getDate();
        const mesNombre = meses[d.getMonth()];
        const anio = d.getFullYear();

        const elem = document.getElementById('portada-fecha-visible');
        if (elem) {
          elem.innerText = \`\${diaNombre} \${diaNum} de \${mesNombre}\`;
        }
        
        const yearElem = document.getElementById('event-year');
        if (yearElem) {
          yearElem.innerText = anio;
        }
      } catch (err) {
        console.error(err);
      }
    }

    // 4. Mostrar el pase fijo del invitado incluido en esta invitación. datosInvitacion.invitados
    // ya viene con como máximo UN elemento (el invitado al que se le generó este link específico
    // — ver getShareUrl en App.tsx), así que no hay nada que buscar ni ambigüedad posible.
    // Devuelve true si había un pase que mostrar (para decidir si hacer scroll a la sección).
    function mostrarPaseFijo() {
      const resultadoBloque = document.getElementById('resultado-pase-bloque');
      const sinCoincidencia = document.getElementById('sin-coincidencia-pases');
      if (!resultadoBloque || !sinCoincidencia) return false;

      const invitado = (datosInvitacion.invitados || [])[0];

      if (invitado) {
        document.getElementById('pase-nombre-invitado').innerText = invitado.nombre;
        document.getElementById('pase-cantidad').innerText = invitado.pases;
        resultadoBloque.classList.remove('hidden');
        sinCoincidencia.classList.add('hidden');

        // Acomodo de mesas: "mesa" es texto libre y opcional -- si no se asignó, el bloque se
        // queda oculto y el pase se ve exactamente igual que antes de este campo.
        const mesaBloque = document.getElementById('pase-mesa-bloque');
        const mesaTexto = document.getElementById('pase-mesa-texto');
        if (mesaBloque && mesaTexto) {
          if (invitado.mesa) {
            mesaTexto.innerText = invitado.mesa;
            mesaBloque.classList.remove('hidden');
          } else {
            mesaBloque.classList.add('hidden');
          }
        }

        // Complemento à la carte "Control de Acceso QR": el QR es solo un link de check-in
        // convertido a imagen por un servicio público -- no hay librería de generación de QR en
        // este proyecto ni falta hacerla. Requiere que el link traiga &iid= (invitación ya
        // guardada), igual que el registro de RSVP más abajo.
        if (${datos.controlAccesoQR ? "true" : "false"}) {
          const iid = new URLSearchParams(window.location.search).get('iid');
          const qrBloque = document.getElementById('qr-acceso-bloque');
          const qrImg = document.getElementById('qr-acceso-img');
          if (iid && qrBloque && qrImg) {
            // Link corto /puerta/<codigoCorto>/<slug-familia> (2026-11-21) cuando se conoce el
            // slug de esta familia (viaja en ?famSlug=, puesto por App.tsx al resolver el link
            // -- ver getShareUrl/resolución de /v/) y la invitación ya tiene codigoCorto. Si
            // falta cualquiera de los dos (invitación vieja sin código, o un link compartido
            // antes de este cambio sin famSlug), se cae al link largo de check-in de siempre,
            // que sigue funcionando igual.
            const codigoCortoQR = "${escDoubleQuote(datos.codigoCorto || "")}";
            const famSlugQR = new URLSearchParams(window.location.search).get('famSlug');
            const checkinUrl = (codigoCortoQR && famSlugQR)
              ? window.location.origin + '/puerta/' + encodeURIComponent(codigoCortoQR) + '/' + encodeURIComponent(famSlugQR)
              : window.location.origin + '/?checkin=1&iid=' + encodeURIComponent(iid) + '&fam=' + encodeURIComponent(invitado.nombre);
            // size=400x400 (2026-11-21 noche): la imagen se sigue mostrando a 150px (ver el
            // width/height del <img> arriba), pero pedirla con más píxeles por módulo es lo que
            // permite que una cámara la lea en el primer intento, en pantalla o impresa -- con
            // menos píxeles (180x180) el QR salía demasiado denso para decodificarse bien.
            qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(checkinUrl);
            qrBloque.classList.remove('hidden');
          }
        }

        return true;
      }

      resultadoBloque.classList.add('hidden');
      sinCoincidencia.classList.remove('hidden');
      return false;
    }

    // 5. RSVP por WhatsApp (+ registro silencioso en Supabase si la invitación ya se guardó)
    const SUPABASE_URL_RSVP = "${escDoubleQuote(import.meta.env.VITE_SUPABASE_URL || "")}";
    const SUPABASE_ANON_KEY_RSVP = "${escDoubleQuote(import.meta.env.VITE_SUPABASE_ANON_KEY || "")}";
    function enviarRSVPWhatsApp() {
      const nombre = document.getElementById('rsvp-nombre').value.trim();
      const asistencia = document.getElementById('rsvp-asistencia').value;
      // El input tiene min="1" max="10", pero eso es solo cosmético (HTML no impide escribir
      // fuera de ese rango, y nada impide llamar esta función o el REST de Supabase directo
      // sin pasar por el input). Se acota aquí de verdad para que un número absurdo no
      // descuadre el conteo real de "personas confirmadas" que ve la familia y el admin.
      const pasesNum = Math.min(Math.max(parseInt(document.getElementById('rsvp-pases').value, 10) || 1, 1), 10);
      const pases = String(pasesNum);

      if (!nombre) {
        alert("Por favor ingresa tu nombre para proceder con la confirmación de asistencia.");
        return;
      }

      // Registro silencioso en Supabase (mejor esfuerzo, no bloquea nada): asocia esta
      // respuesta con la fila de "Mis Invitaciones" via el parámetro ?iid= del link (ver
      // getShareUrl en App.tsx). Si el link no lleva iid (invitación nunca guardada) o falla
      // la escritura, el RSVP real sigue siendo el mensaje de WhatsApp de abajo -- esto es solo
      // para que el admin pueda ver un conteo de confirmaciones sin depender de leer WhatsApp.
      try {
        // "iid" solo existe en un link de invitación REAL ya guardada (ver getShareUrl en
        // App.tsx) -- las demos públicas (catálogo, Estilos de Presentación, demo
        // personalizada) nunca lo llevan, así que sirve para distinguir un RSVP de a de veras
        // de alguien nomás jugando con el formulario en una demo. Sin este filtro, cada quien
        // que probara "Confirmar Asistencia" en cualquier demo le mandaba un aviso de Telegram
        // al admin idéntico a un invitado real (confirmado -- era un bug real).
        const iid = new URLSearchParams(window.location.search).get('iid');
        if (iid && SUPABASE_URL_RSVP && SUPABASE_ANON_KEY_RSVP) {
          const headersRSVP = {
            'apikey': SUPABASE_ANON_KEY_RSVP,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY_RSVP,
            'Content-Type': 'application/json'
          };
          const bodyRSVP = JSON.stringify({
            invitacion_id: iid,
            nombre_invitado: nombre,
            asistencia: asistencia,
            num_personas: pasesNum
          });
          // Evita duplicar la fila si esta misma persona ya había confirmado antes (doble
          // clic, recargar la página, etc.) -- si ya existe una confirmación con el mismo
          // nombre para esta invitación, se actualiza esa fila en vez de insertar otra.
          fetch(SUPABASE_URL_RSVP + '/rest/v1/confirmaciones?invitacion_id=eq.' + encodeURIComponent(iid) + '&nombre_invitado=ilike.' + encodeURIComponent(nombre), {
            method: 'GET',
            headers: headersRSVP
          }).then(function (r) { return r.json(); }).then(function (existentes) {
            const existente = Array.isArray(existentes) && existentes[0];
            if (existente && existente.id) {
              return fetch(SUPABASE_URL_RSVP + '/rest/v1/confirmaciones?id=eq.' + existente.id, {
                method: 'PATCH',
                headers: Object.assign({}, headersRSVP, { 'Prefer': 'return=minimal' }),
                body: bodyRSVP
              });
            }
            return fetch(SUPABASE_URL_RSVP + '/rest/v1/confirmaciones', {
              method: 'POST',
              headers: Object.assign({}, headersRSVP, { 'Prefer': 'return=minimal' }),
              body: bodyRSVP
            });
          }).catch(() => {});
        }
        if (iid) {
          const txtEstadoAviso = asistencia === 'si' ? 'SÍ asistirá' : 'NO asistirá';
          fetch('/api/notify-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: '🎉 ' + nombre + ' confirmó: ' + txtEstadoAviso + ' (' + pases + ' pases) ${textosEvento.fraseConfirmacion} ${escBacktick(datos.nombre)}' })
          }).catch(() => {});
        }
      } catch (e) { /* nunca debe impedir que el RSVP por WhatsApp funcione */ }

      const txtAsistira = asistencia === 'si'
        ? "¡CONFIRMO con agrado mi asistencia!"
        : "Lamentablemente NO podré asistir en esta ocasión.";

      const cantPasesMsg = asistencia === 'si'
        ? \`\\n🎟️ Pases que confirmo: \${pases}\`
        : "";

      const msg = \`¡Hola ${escBacktick(datos.nombre)}! 👋\\nA través de tu invitación digital te confirmo lo siguiente:\\n\\n👤 Invitado: \${nombre}\\n💌 Estado: \${txtAsistira}\${cantPasesMsg}\\n\\n¡Muchas gracias por la invitación! ✨\`;

      const encodeMsg = encodeURIComponent(msg);
      window.open(\`https://api.whatsapp.com/send?phone=${escBacktick(datos.whatsappConfirmacion)}&text=\${encodeMsg}\`, '_blank');
    }

    // 6. Copiar Datos de Transferencia al Portapapeles
    function copiarDatosTransferencia() {
      const infoText = document.getElementById('banco-info').innerText;
      navigator.clipboard.writeText(infoText).then(() => {
        alert("¡Datos bancarios copiados correctamente en tu portapapeles! ⚜️");
      }).catch(err => {
        console.error("No se pudo copiar: ", err);
      });
    }

    // 7. Lógica Lightbox de Fotos Carousel
    function abrirLightbox(index) {
      if (!fotosCarousel || fotosCarousel.length === 0) return;
      indiceLightbox = index;
      document.getElementById('lightbox-imagen-activa').src = fotosCarousel[indiceLightbox];
      document.getElementById('lightbox-indice').innerText = \`Foto \${indiceLightbox + 1} de \${fotosCarousel.length}\`;
      document.getElementById('lightbox-carousel').classList.remove('hidden');
      document.getElementById('lightbox-carousel').classList.add('flex');
    }

    function cerrarLightbox() {
      document.getElementById('lightbox-carousel').classList.add('hidden');
      document.getElementById('lightbox-carousel').classList.remove('flex');
    }

    function navegarLightbox(direction) {
      if (!fotosCarousel || fotosCarousel.length === 0) return;
      indiceLightbox += direction;
      if (indiceLightbox < 0) {
        indiceLightbox = fotosCarousel.length - 1;
      } else if (indiceLightbox >= fotosCarousel.length) {
        indiceLightbox = 0;
      }
      document.getElementById('lightbox-imagen-activa').src = fotosCarousel[indiceLightbox];
      document.getElementById('lightbox-indice').innerText = \`Foto \${indiceLightbox + 1} de \${fotosCarousel.length}\`;
    }

    // 8. Crear Calendario de Eventos Google
    function agregarAlCalendario() {
      const name = "${textosEvento.prefijoTitulo} ${escDoubleQuote(datos.nombre)}";
      const location = "${escDoubleQuote(datos.ceremonia.lugar)} & ${escDoubleQuote(datos.recepcion.lugar)}";

      // Fecha en formato Google Cal UTC
      const eventDate = new Date("${escDoubleQuote(datos.fecha)}");
      const startDateUTC = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      
      // Sumamos 5 horas para estimar duración
      const endDate = new Date(eventDate.getTime() + (5 * 60 * 60 * 1000));
      const endDateUTC = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const details = "${textosEvento.detalleCalendario}";
      
      const link = \`https://calendar.google.com/calendar/render?action=TEMPLATE&text=\${encodeURIComponent(name)}&dates=\${startDateUTC}/\${endDateUTC}&details=\${encodeURIComponent(details)}&location=\${encodeURIComponent(location)}&sf=true&output=xml\`;
      
      window.open(link, '_blank');
    }
  </script>
</body>
</html>`;
}
