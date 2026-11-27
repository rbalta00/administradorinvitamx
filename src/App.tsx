import { useState, useEffect, useRef, ChangeEvent, MouseEvent, useMemo, useCallback, memo } from "react";
import {
  Sparkles,
  Settings,
  FileText,
  Clipboard,
  Trash2,
  Plus,
  Download,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Copy,
  Check,
  Upload,
  Layers,
  UserPlus,
  MapPin,
  Calendar,
  Gift,
  Music,
  Image as ImageIcon,
  Share2,
  ListOrdered,
  Eye,
  X,
  Palette,
  ArrowUp,
  ArrowDown,
  LogOut,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Camera,
  ScanLine
} from "lucide-react";
import jsQR from "jsqr";
import { createClient } from "@supabase/supabase-js";
import { InvitacionDatos, TemaConfig } from "./types";
import { temas, paquetes, datosDefault, getFotosPorTema, getOrdenSeccionesEfectivo, PALETAS_COLOR_PERSONALIZADO, ITINERARIO_POR_TEMA } from "./data";
import { generarHTMLFinal, TipoEvento, TEXTOS_POR_EVENTO, resolverTemaEfectivo, construirUrlGoogleFonts } from "./templates";
import { fondosListosPorEvento } from "./fondosListos";
import { fotosListasPorEvento, FotoLista } from "./fotosListas";

// Inicializar cliente de Supabase a partir de variables de entorno (Vite las inyecta en build time)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
if (supabaseUrl && supabaseAnonKey && typeof window !== "undefined") {
  window.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else if (typeof window !== "undefined") {
  console.warn("Supabase no configurado: faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

// Dirección pública fija del negocio (agregado 2026-11-20) -- conectar el dominio en Vercel no
// cambia cómo la app arma sus links; antes cada link salía con `window.location.origin` (la
// dirección donde esté abierto el panel en ese momento), así que si el admin entraba por
// costumbre a la URL vieja de `.vercel.app`, los links que le daba a sus clientes también
// salían con esa URL vieja, sin la marca nueva. Usar esta constante como base SOLO en los links
// que se ENTREGAN a la clienta o a los invitados (invitación, muestra, formulario de datos,
// control de acceso/pases) -- la navegación interna del panel (ej. "Enviar link a colaborador",
// el catálogo de demos) sigue construyéndose con `window.location.origin` a propósito, sin
// cambios, para que el admin pueda seguir entrando por cualquier dirección del proyecto.
const URL_PUBLICA_INVITAMX = "https://invitaciones.invitamx.app";

// Fila fija (columna `id` es uuid) usada para guardar/leer los fondos personalizados compartidos
const FONDOS_ROW_ID = "00000000-0000-0000-0000-000000000001";

// Forma de una fila de la tabla `invitaciones` tal como la usa el panel "Mis Invitaciones"
// (no son todas las columnas de la tabla, solo las que ese panel lee/muestra/edita).
//
// `datos_completos` es OPCIONAL (2026-11-19): la carga ligera de la lista (ver
// api/admin/list-invitaciones.ts) ya no lo trae de entrada para no arrastrar el jsonb
// completo (fotos/itinerario/etc.) de cada una de 200+ invitaciones solo para mostrar nombre y
// estatus -- queda `undefined` hasta que `asegurarDatosCompletos()` lo trae bajo demanda (y
// `null` después de ese fetch si la fila de verdad no tiene nada guardado ahí, el caso de una
// invitación guardada antes de que existiera esta columna). `paquete` sí viaja siempre en la
// carga ligera (extraído server-side de `datos_completos->>paquete`) porque la lista lo
// necesita para mostrarlo sin tener que pedir el jsonb entero.
// Un complemento à la carte agregado desde "Administrar cliente" (2026-11-22) -- ver
// `catalogoComplementosDisponibles`/`handleAgregarComplemento`/`handleQuitarComplemento` más
// abajo. `clave` identifica DE QUÉ complemento se trata ("pases"/"checkin"/"pdf"/
// "familia-extra"/"seccion-suelta:<id>"/"ajustes-extra") -- las primeras tres tienen un flag
// booleano gemelo en la fila (pases_pagado/checkin_pagado/pdf_pagado) que se prende/apaga junto
// con este registro; las otras tres son puramente financieras (familia-extra/ajustes-extra) o
// desbloquean una sección puntual (seccion-suelta), sin ningún flag booleano propio.
interface ComplementoInvitacion {
  clave: string;
  nombre: string;
  precio: number;
  cantidad: number;
  fecha: string;
}

interface InvitacionGuardadaRow {
  id: string;
  nombre_quinceanera: string | null;
  fecha_fiesta: string | null;
  tema_elegido: string | null;
  estado: string | null;
  activo_hasta: string | null;
  updated_at: string | null;
  link_invitacion: string | null;
  datos_completos?: InvitacionDatos | null;
  paquete?: "basico" | "premium" | "deluxe" | null;
  // Mismo mecanismo que `paquete` (2026-11-19): extraído server-side de
  // `datos_completos->>tipoEvento` para poder mostrar el ícono/filtrar por evento sin pedir el
  // jsonb completo. Ausente o desconocido = "xv" (ver tipoEventoDeFila más abajo).
  tipoEvento?: TipoEvento | null;
  telefono_whatsapp: string | null;
  precio_total: number | null;
  precio_pagado: number | null;
  pases_pagado: boolean;
  pdf_pagado: boolean;
  notas: string | null;
  link_pago: string | null;
  intake_actualizado_en: string | null;
  bloqueada: boolean;
  motivo_bloqueo: string | null;
  checkin_pagado: boolean;
  creado_por: string | null;
  complementos: ComplementoInvitacion[] | null;
  // Pausa manual por falta de pago (2026-11-22) -- estado NUEVO e independiente de "bloqueada"
  // (esa es la vigencia/acceso de siempre, del editor; esta es específicamente la pausa por
  // saldo pendiente pedida en "Link de revisión y pausa por falta de pago"). Mientras
  // `pausada` sea true, TODAS las rutas públicas de esta invitación deben mostrar una pantalla
  // genérica sin ningún dato -- ver pausaCheck en la vista pública y los chequeos propios de
  // CheckinPage/IntakeForm.
  pausada: boolean;
  pausada_en: string | null;
  motivo_pausa: string | null;
  // Folio de clienta (2026-11-22, "Folio de clienta en el administrador") -- liga a la tabla
  // `clientes` (la PERSONA, separada del evento/invitación). Null cuando esta invitación nunca
  // tuvo teléfono capturado. El embed `clientes(...)` lo trae PostgREST automáticamente por la
  // FK `cliente_id` en list-invitaciones.ts/get-invitacion.ts -- ver resolverClienteId en este
  // archivo para cómo se resuelve/crea al guardar.
  cliente_id: string | null;
  clientes: { folio: number; nombre: string | null; telefono_whatsapp: string } | null;
}

// Estatus del pedido (columna `estado`), en el orden en que normalmente avanza una venta.
const ESTATUS_PEDIDO: { id: string; label: string }[] = [
  { id: "cotizacion", label: "🗨️ Cotización" },
  { id: "anticipo_pagado", label: "💰 Anticipo pagado" },
  { id: "en_diseno", label: "🎨 En diseño" },
  { id: "entregada", label: "✅ Entregada" },
  { id: "evento_pasado", label: "🎉 Evento pasado" },
  { id: "archivada", label: "📦 Archivada" }
];

// Cobrar por WhatsApp desde el administrador (2026-11-21): el admin pega UNA sola vez sus links
// de pago (Mercado Pago/Clip) aquí, y cada invitación guardada gana botones "Cobrar anticipo"/
// "Cobrar liquidación" que abren WhatsApp con el mensaje y el link correctos, sin que tenga que
// armar nada a mano cada vez. Se guarda en la fila global única de Supabase (FONDOS_ROW_ID, el
// mismo patrón ya usado para `fondos_personalizados` -- ver cargarFondosDesdeSupabase/
// guardarFondoEnSupabase más abajo), no en localStorage, para que esté disponible igual en PC,
// PWA y celular.
interface LinksPagoAdmin {
  anticipoBasico: string;
  anticipoEstandar: string; // llave interna del paquete: "premium"
  anticipoPremium: string;  // llave interna del paquete: "deluxe"
  montoAbierto: string;     // liquidaciones y cualquier anticipo con extras (precio_total != precio base del plan)
}
const LINKS_PAGO_VACIO: LinksPagoAdmin = { anticipoBasico: "", anticipoEstandar: "", anticipoPremium: "", montoAbierto: "" };

// Precio BASE de cada plan, sin extras (ver "Business/pricing policy" en CLAUDE.md) -- decide si
// el anticipo de una invitación puntual usa el link FIJO de su plan (precio_total coincide exacto
// con el base) o el link de monto abierto (trae algo a la carte, el anticipo ya no es un monto
// fijo conocido de antemano).
const PRECIO_BASE_PAQUETE: Record<"basico" | "premium" | "deluxe", number> = {
  basico: 299,
  premium: 499,
  deluxe: 799,
};
const LINK_ANTICIPO_KEY_POR_PAQUETE: Record<"basico" | "premium" | "deluxe", keyof LinksPagoAdmin> = {
  basico: "anticipoBasico",
  premium: "anticipoEstandar",
  deluxe: "anticipoPremium",
};

const calcularAnticipo = (precioTotal: number | null | undefined): number => Math.round((precioTotal || 0) * 0.5);
const calcularSaldoPendiente = (precioTotal: number | null | undefined, precioPagado: number | null | undefined): number =>
  Math.round((precioTotal || 0) - (precioPagado || 0));

// Decide qué link de anticipo usar para una invitación puntual, y si es el link fijo de su plan
// o el de monto abierto (en cuyo caso el mensaje de WhatsApp debe decir el monto exacto a
// ingresar, ver handleCobrarAnticipo).
function resolverLinkAnticipo(
  row: { paquete?: "basico" | "premium" | "deluxe" | null; precio_total: number | null },
  linksPago: LinksPagoAdmin
): { link: string; esLinkAbierto: boolean } {
  const paquete = row.paquete || undefined;
  const coincideConBase = !!paquete && row.precio_total === PRECIO_BASE_PAQUETE[paquete];
  if (coincideConBase && paquete) {
    return { link: linksPago[LINK_ANTICIPO_KEY_POR_PAQUETE[paquete]], esLinkAbierto: false };
  }
  return { link: linksPago.montoAbierto, esLinkAbierto: true };
}

// Inverso de LINK_ANTICIPO_KEY_POR_PAQUETE -- de qué paquete es cada link de anticipo fijo,
// para la lista manual de abajo (2026-11-22 v4, "Links de pago -- envío manual (tú eliges)").
const PAQUETE_POR_LINK_ANTICIPO_KEY: Record<"anticipoBasico" | "anticipoEstandar" | "anticipoPremium", "basico" | "premium" | "deluxe"> = {
  anticipoBasico: "basico",
  anticipoEstandar: "premium",
  anticipoPremium: "deluxe",
};

// Lista fija de los 4 links de la configuración global, en el orden en que se muestran en
// "Links de pago -- envío manual (tú eliges)" (pedido explícito: "agrégame ahí los links de
// Mercado Pago y yo decida cuál enviarle" -- a diferencia de "Enviar link de pago por WhatsApp"
// arriba, que elige sola, aquí el admin elige el renglón). La etiqueta de cada anticipo lleva
// su monto (50% del precio base del plan, mismo cálculo que calcularAnticipo) para que el admin
// no tenga que ir a adivinarlo.
const LISTA_LINKS_MANUAL: { key: keyof LinksPagoAdmin; etiqueta: string }[] = (
  ["anticipoBasico", "anticipoEstandar", "anticipoPremium"] as const
).map((key): { key: keyof LinksPagoAdmin; etiqueta: string } => {
  const paquete = PAQUETE_POR_LINK_ANTICIPO_KEY[key];
  const monto = Math.round(PRECIO_BASE_PAQUETE[paquete] * 0.5);
  return { key, etiqueta: `Anticipo ${paquetes[paquete].nombre} — $${monto.toLocaleString("es-MX")}` };
}).concat([{ key: "montoAbierto", etiqueta: "Monto abierto (la clienta pone el monto)" }]);

// Motivos del bloqueo manual de acceso (columna `motivo_bloqueo`) -- puramente para que el
// admin filtre/reporte por qué se cerró cada link; nunca se le muestra el motivo específico
// al invitado (ver pantallas de bloqueo en isViewMode e IntakeForm más abajo). El bloqueo en
// sí es 100% manual y reversible -- nada en la app lo activa ni lo desactiva solo.
const MOTIVOS_BLOQUEO: Record<string, string> = {
  evento_pasado: "Evento ya pasó",
  cancelado: "Cancelado por el cliente",
  falta_pago: "Falta de pago / disputa",
  solicitud_cliente: "Cliente pidió cerrarlo",
  otro: "Otro motivo"
};

// Tipo de evento (2026-11-19) -- solo cambia las palabras que ve el invitado (ver
// TEXTOS_POR_EVENTO en templates.ts) y, aquí en el editor, la etiqueta del campo de nombre y el
// mensaje de bienvenida/itinerario por defecto de una invitación NUEVA. Ningún tema, paquete,
// precio ni sección cambia por esto.
const TIPOS_EVENTO: { id: TipoEvento; label: string; emoji: string }[] = [
  { id: "xv", label: "XV Años", emoji: "🎂" },
  { id: "boda", label: "Boda", emoji: "💍" },
  { id: "cumpleanos", label: "Cumpleaños", emoji: "🎉" },
  { id: "bautizo", label: "Bautizo", emoji: "🕊️" },
  { id: "primera-comunion", label: "Primera Comunión", emoji: "⛪" },
  { id: "graduacion", label: "Graduación", emoji: "🎓" },
  { id: "baby-shower", label: "Baby Shower", emoji: "👶" },
  { id: "aniversario", label: "Aniversario", emoji: "💍" }
];

// Resuelve el tipo de evento de una fila de "Mis Invitaciones" (campo ligero `tipoEvento`,
// extraído server-side en list-invitaciones.ts) -- ausente o desconocido = "xv", mismo criterio
// que templates.ts/textosEventoDe (toda invitación guardada antes de este campo es XV).
const tipoEventoDeFila = (row: InvitacionGuardadaRow): TipoEvento =>
  (row.tipoEvento && TIPOS_EVENTO.some(t => t.id === row.tipoEvento)) ? row.tipoEvento : "xv";

// Grupo del filtro "Todos/XV/Bodas/Cumpleaños/Otros" del panel "Mis Invitaciones" (pedido
// 2026-11-19) -- bautizo, primera comunión, graduación, baby shower y aniversario caen todos
// en "otros" para no llenar el filtro de opciones poco usadas.
type GrupoFiltroEvento = "xv" | "boda" | "cumpleanos" | "otros";
const grupoFiltroEventoDeFila = (row: InvitacionGuardadaRow): GrupoFiltroEvento => {
  const tipo = tipoEventoDeFila(row);
  return tipo === "xv" || tipo === "boda" || tipo === "cumpleanos" ? tipo : "otros";
};

// Etiqueta del campo "nombre" (usada como <label> del campo y en los mensajes de validación
// que antes decían "quinceañera" fijo) -- "xv" se queda igual que siempre.
const ETIQUETA_NOMBRE_POR_EVENTO: Record<TipoEvento, string> = {
  xv: "Quinceañera",
  boda: "Nombres de los novios",
  cumpleanos: "Nombre del festejado",
  bautizo: "Nombre del bebé",
  "primera-comunion": "Nombre del festejado",
  graduacion: "Nombre del festejado",
  "baby-shower": "Nombre del bebé (si ya se conoce)",
  aniversario: "Nombres de la pareja"
};

// Mismo criterio que ETIQUETA_NOMBRE_POR_EVENTO, para el encabezado "Padres de..." de la
// pestaña Familia -- no estaba en el pedido original, pero se encontró al revisar esa pestaña
// (decía "Padres de la Quinceañera" fijo, igual de descolocado que el campo de nombre en un
// evento que no es XV) y se adapta con el mismo mecanismo, sin agregar nada nuevo.
const ETIQUETA_PADRES_POR_EVENTO: Record<TipoEvento, string> = {
  xv: "Padres de la Quinceañera",
  boda: "Padres de los Novios",
  cumpleanos: "Padres del Festejado",
  bautizo: "Padres del Bebé",
  "primera-comunion": "Padres del Festejado",
  graduacion: "Padres del Festejado",
  "baby-shower": "Padres del Bebé",
  aniversario: "Padres de la Pareja"
};

// Mensaje de bienvenida por defecto para invitaciones NUEVAS, según el tipo elegido (no aplica
// a "xv": ese default ya varía por paquete en datosDefault/handleLimpiarFormulario, se deja tal
// cual). Se usa solo cuando el mensaje actual sigue siendo alguno de los defaults "de fábrica"
// conocidos -- ver handleSeleccionarTipoEvento: si el admin ya escribió/editó el mensaje, nunca
// se le pisa.
const MENSAJE_BIENVENIDA_POR_EVENTO: Partial<Record<TipoEvento, string>> = {
  boda: "Están invitados a compartir con nosotros la alegría de nuestra boda.",
  cumpleanos: "Están invitados a celebrar conmigo un año más de vida.",
  bautizo: "Están invitados a compartir con nosotros el bautizo de nuestro bebé.",
  "primera-comunion": "Están invitados a compartir conmigo este día tan especial de mi Primera Comunión.",
  graduacion: "Están invitados a celebrar conmigo el cierre de esta etapa.",
  "baby-shower": "Están invitados a celebrar con nosotros la próxima llegada de nuestro bebé.",
  aniversario: "Están invitados a celebrar con nosotros un año más de amor."
};

// Todos los mensajes de bienvenida "de fábrica" conocidos (los 3 de datosDefault por paquete +
// el de handleLimpiarFormulario + los 7 de arriba) -- si el mensaje actual es exactamente uno de
// estos, se considera "todavía sin editar por el admin" y es seguro reemplazarlo al cambiar el
// tipo de evento. Cualquier otro texto (lo haya escrito el admin o el cliente desde su propio
// formulario) nunca se toca.
const MENSAJES_BIENVENIDA_DEFAULT_CONOCIDOS: string[] = [
  datosDefault.basico.mensajeBienvenida,
  datosDefault.premium.mensajeBienvenida,
  datosDefault.deluxe.mensajeBienvenida,
  "Estás invitado a compartir conmigo la alegría de mis quince años.",
  ...Object.values(MENSAJE_BIENVENIDA_POR_EVENTO)
];

// Itinerario de ejemplo equivalente para Boda, un array por paquete para respetar la cantidad
// de eventos/horarios que ya trae el default de cada uno (ver datosDefault en data.ts) -- solo
// se usa como default de invitación NUEVA, igual que el mensaje de bienvenida de arriba. El
// prompt solo pidió este tipo (boda); los demás tipos no tienen itinerario propio todavía y se
// quedan con el itinerario que ya estuviera cargado.
const ITINERARIO_BODA_POR_PAQUETE: Record<"basico" | "premium" | "deluxe", { hora: string; evento: string }[]> = {
  basico: [
    { hora: "17:00", evento: "Ceremonia Religiosa" },
    { hora: "19:00", evento: "Recepción de Invitados en el Salón" },
    { hora: "20:00", evento: "Entrada de los Novios & Primer Baile" },
    { hora: "21:00", evento: "Cena de Gala" },
    { hora: "22:30", evento: "Brindis & Apertura de la Pista de Baile" }
  ],
  premium: [
    { hora: "16:30", evento: "Ceremonia Religiosa" },
    { hora: "18:00", evento: "Cóctel de Bienvenida" },
    { hora: "19:30", evento: "Entrada de los Novios & Primer Baile" },
    { hora: "20:30", evento: "Cena de Tres Tiempos" },
    { hora: "22:00", evento: "Brindis y Palabras de los Padrinos" },
    { hora: "22:30", evento: "DJ Live Set & Fiesta" }
  ],
  deluxe: [
    { hora: "18:00", evento: "Ceremonia Religiosa" },
    { hora: "20:30", evento: "Alfombra de Bienvenida" },
    { hora: "21:00", evento: "Entrada de los Novios & Primer Baile" },
    { hora: "22:00", evento: "Banquete de Gala" },
    { hora: "23:00", evento: "Brindis y Espectáculo de Fuegos Artificiales Fríos" },
    { hora: "23:30", evento: "Mariachi en Vivo & Gran Baile" }
  ]
};

// Los 3 itinerarios "de fábrica" conocidos, como JSON -- mismo criterio que
// MENSAJES_BIENVENIDA_DEFAULT_CONOCIDOS: si el itinerario actual es exactamente uno de estos
// (comparado por contenido, no por referencia), es seguro reemplazarlo; si el admin ya lo editó
// (agregó, quitó o renombró algo), nunca se toca.
const ITINERARIOS_DEFAULT_CONOCIDOS_JSON: string[] = [
  JSON.stringify(datosDefault.basico.itinerario),
  JSON.stringify(datosDefault.premium.itinerario),
  JSON.stringify(datosDefault.deluxe.itinerario)
];

// Una respuesta del formulario de RSVP dentro de una invitación (tabla `confirmaciones`)
interface ConfirmacionRSVP {
  id: string;
  nombre_invitado: string;
  asistencia: "si" | "no";
  num_personas: number;
  creado_en: string;
}

// Un pago individual registrado para una invitación (tabla `abonos`) -- el detalle auditable
// detrás del número acumulado en invitaciones.precio_pagado.
interface Abono {
  id: string;
  monto: number;
  nota: string | null;
  creado_en: string;
}

// Un aviso de pago mandado por el CLIENTE desde su propio link (tabla `avisos_pago`) -- todavía
// sin revisar/aprobar por el admin, no confundir con un Abono ya confirmado.
interface AvisoPago {
  id: string;
  monto: number | null;
  comprobante_url: string | null;
  nota: string | null;
  creado_en: string;
}

// Helper functions for UTF-8 safe and compact Base64 encoding/decoding of state in URLs
const KEY_MAP: Record<string, string> = {
  paquete: "p",
  tema: "t",
  nombre: "n",
  fecha: "f",
  mensajeBienvenida: "m",
  ceremonia: "c",
  recepcion: "r",
  itinerario: "i",
  dressCode: "d",
  colorSugerido: "s",
  padres: "x",
  padrinos: "y",
  mesaRegalos: "g",
  datosBancarios: "b",
  fotos: "k",
  bgImages: "bg",
  fondoVeloOpacidad: "fv",
  hashtag: "h",
  mostrarCajasSecciones: "mc",
  whatsappConfirmacion: "w",
  cancion: "a",
  linkPersonalizado: "l",
  invitados: "v",
  fotoPortada: "fp",
  mostrarFotoPortada: "mfp",
  seccionesExcluidas: "se",
  mostrarAnimacionCaida: "mac",
  personalizacion: "pz",
  controlAccesoQR: "cq",
  estiloGaleria: "eg",
  // Bug real encontrado en auditoria, 2026-11-10: estos 2 campos existian en
  // InvitacionDatos y SI se usaban de verdad (ordenSecciones lo lee
  // generarHTMLFinal via getOrdenSeccionesEfectivo para decidir el orden real de
  // las secciones; estiloCajasSecciones decide el estilo visual de cada caja) pero
  // NUNCA tuvieron alias aqui -- encodeState/decodeState los ignoraban en
  // silencio, asi que un link compartido (?v=1&d=...) SIEMPRE mostraba el orden
  // default del paquete, nunca el orden que el admin acomodo con los botones
  // ↑/↓ en su propio editor. Ya documentado como gap conocido para
  // estiloCajasSecciones (ver nota "Formato de galeria..." en CLAUDE.md); el de
  // ordenSecciones no estaba documentado y es de mayor impacto (cambia la
  // estructura completa de la invitacion, no solo el estilo de una caja).
  ordenSecciones: "os",
  estiloCajasSecciones: "ec",
  // Fondos listos de galería por evento (2026-11-22) -- ver fondosListos.ts/types.ts. Mismo
  // patrón que bgImages (objeto plano, sin sub-encoding especial), solo que aquí la llave es
  // el tipo de evento en vez del id del tema.
  fondosGaleriaPorEvento: "fg"
};

const SUB_KEY_MAP: Record<string, string> = {
  lugar: "lu",
  hora: "ho",
  direccion: "di",
  maps: "ma",
  evento: "ev"
};

const REVERSE_KEY_MAP: Record<string, string> = {};
const REVERSE_SUB_KEY_MAP: Record<string, string> = {};

for (const [k, v] of Object.entries(KEY_MAP)) {
  REVERSE_KEY_MAP[v] = k;
}
for (const [k, v] of Object.entries(SUB_KEY_MAP)) {
  REVERSE_SUB_KEY_MAP[v] = k;
}

const encodeState = (obj: any): string => {
  try {
    const copy = JSON.parse(JSON.stringify(obj));
    // Remove very large base64 images from URL state to prevent exceeding browser 2KB limits (which causes 414 URI Too Long errors)
    if (copy.fotos && copy.fotos.length > 0) {
      copy.fotos = copy.fotos.map((f: string) => {
        if (f && f.startsWith("data:image")) {
          // If it's a base64 local image, we replace it with "default" so it falls back to the beautiful matching theme design
          return "default";
        }
        return f;
      });
    }
    // Filter heavy base64 background images from state to guarantee short, clean, healthy sharing links
    if (copy.bgImages) {
      const filteredBg: Record<string, string> = {};
      for (const [k, v] of Object.entries(copy.bgImages)) {
        const bgVal = v as string;
        if (bgVal && !bgVal.startsWith("data:")) {
          filteredBg[k] = bgVal;
        }
      }
      copy.bgImages = filteredBg;
    }

    const paq = copy.paquete || "basico";
    const base = datosDefault[paq] || datosDefault.basico;

    // Create compact mini state
    const mini: any = {};
    mini.p = paq;
    if (copy.tema) mini.t = copy.tema;

    for (const [fullKey, shortKey] of Object.entries(KEY_MAP)) {
      if (fullKey === "paquete" || fullKey === "tema") continue;
      
      const val = copy[fullKey];
      const baseVal = (base as any)[fullKey];

      if (val === undefined || val === null) continue;

      // Skip identical default values to save massive amount of space
      if (JSON.stringify(val) === JSON.stringify(baseVal)) {
        continue;
      }

      if (fullKey === "ceremonia" || fullKey === "recepcion") {
        if (val && typeof val === "object") {
          const subMini: any = {};
          for (const [sk, sv] of Object.entries(val)) {
            const shortSk = SUB_KEY_MAP[sk] || sk;
            subMini[shortSk] = sv;
          }
          mini[shortKey] = subMini;
        }
      } else if (fullKey === "itinerario") {
        if (Array.isArray(val)) {
          mini[shortKey] = val.map((item: any) => ({
            ho: item.hora,
            ev: item.evento
          }));
        }
      } else if (fullKey === "invitados") {
        if (Array.isArray(val)) {
          mini[shortKey] = val.map((item: any) => ({
            n: item.nombre,
            p: item.pases,
            ...(item.mesa ? { m: item.mesa } : {})
          }));
        }
      } else {
        mini[shortKey] = val;
      }
    }

    const str = JSON.stringify(mini);
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error("Error al codificar estado para compartir:", e);
    return "";
  }
};

const decodeState = (str: string): any => {
  try {
    if (!str) return null;
    const decodedStr = decodeURIComponent(escape(atob(str)));
    const parsed = JSON.parse(decodedStr);

    // If legacy link (full JSON rather than compact format), return as is
    if (parsed.paquete) {
      return parsed;
    }

    const paq = parsed.p || "basico";
    const base = datosDefault[paq] || datosDefault.basico;

    // Start with default package structure
    const result = JSON.parse(JSON.stringify(base));
    result.paquete = paq;
    if (parsed.t) result.tema = parsed.t;

    for (const [shortKey, fullKey] of Object.entries(REVERSE_KEY_MAP)) {
      if (fullKey === "paquete" || fullKey === "tema") continue;

      const val = parsed[shortKey];
      if (val === undefined || val === null) continue;

      if (fullKey === "ceremonia" || fullKey === "recepcion") {
        const subObj: any = { lugar: "", hora: "", direccion: "", maps: "" };
        for (const [sk, sv] of Object.entries(val)) {
          const fullSk = REVERSE_SUB_KEY_MAP[sk] || sk;
          subObj[fullSk] = sv;
        }
        result[fullKey] = subObj;
      } else if (fullKey === "itinerario") {
        if (Array.isArray(val)) {
          result[fullKey] = val.map((item: any) => ({
            hora: item.ho || "",
            evento: item.ev || ""
          }));
        }
      } else if (fullKey === "invitados") {
        if (Array.isArray(val)) {
          result[fullKey] = val.map((item: any) => ({
            nombre: item.n || "",
            pases: item.p || 2,
            ...(item.m ? { mesa: item.m } : {})
          }));
        }
      } else {
        result[fullKey] = val;
      }
    }

    return result;
  } catch (e) {
    console.error("Error al decodificar estado desde compartir:", e);
    return null;
  }
};
// Genera un código corto único para el link `/v/<codigoCorto>` (2026-11-19): slug del nombre
// (minúsculas, sin acentos, espacios/símbolos -> guiones) + 4 caracteres aleatorios
// (letras/números). Verifica contra Supabase que ningún otro `datos_completos` tenga ya ese
// código antes de devolverlo (columna jsonb, filtrada con la misma sintaxis `->>` que ya usa
// list-invitaciones.ts) -- con colisión, reintenta con un sufijo nuevo hasta 8 veces (36^4 ≈
// 1.68 millones de combinaciones por slug, nunca debería agotarse en la práctica).
async function generarCodigoCortoUnico(supabase: any, nombre: string): Promise<string> {
  const slugBase = (nombre || "invitacion")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "invitacion";
  const alfabeto = "abcdefghijklmnopqrstuvwxyz0123456789";
  const sufijoAleatorio = () => Array.from({ length: 4 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join("");
  for (let intento = 0; intento < 8; intento++) {
    const candidato = `${slugBase}-${sufijoAleatorio()}`;
    try {
      const { data, error } = await supabase
        .from("invitaciones")
        .select("id")
        .eq("datos_completos->>codigoCorto", candidato)
        .maybeSingle();
      if (!error && !data) return candidato;
    } catch {
      // Si la consulta de colisión falla (red, etc.), seguimos intentando con otro sufijo en
      // vez de tronar -- más vale un código sin verificar que ningún código.
    }
  }
  // Fallback extremo, no debería alcanzarse nunca en la práctica.
  return `${slugBase}-${Date.now().toString(36).slice(-4)}`;
}

// Slug de familia para las rutas cortas /v/<codigoCorto>/<slug> y /puerta/<codigoCorto>/<slug>
// (2026-11-21): mismo criterio de normalización que generarCodigoCortoUnico arriba (minúsculas,
// sin acentos, todo lo que no sea letra/número colapsa a un solo guión), pero SIN sufijo
// aleatorio -- tiene que salir exactamente igual cada vez que se recalcula para el mismo
// nombre, porque un link que el admin ya compartió debe seguir resolviendo igual más adelante.
function slugFamilia(nombre: string): string {
  return (
    (nombre || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  ) || "familia";
}

// Calcula el slug de CADA invitado de la lista, en el mismo orden en que aparecen -- si dos
// producen el mismo slug base, el segundo (y siguientes) ganan un sufijo numérico estable
// ("-2", "-3"...) según su posición en el arreglo, nunca por azar ni por orden alfabético. Se
// usa tanto para CONSTRUIR el link de un invitado (getShareUrl, los botones de "Mis
// Invitaciones", el QR del editor) como para RESOLVERLO de vuelta (resolverFamiliaPorSlug) --
// mismo cálculo en los dos sentidos, nunca se persiste en ningún lado.
function slugsDeInvitados<T extends { nombre: string }>(invitados: T[]): string[] {
  const vistos = new Map<string, number>();
  return invitados.map(inv => {
    const base = slugFamilia(inv.nombre);
    const n = (vistos.get(base) || 0) + 1;
    vistos.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

// Resuelve un slug de la URL (`/v/<codigo>/<slug>` o `/puerta/<codigo>/<slug>`) contra la lista
// de invitados de ESA invitación -- recalcula los slugs en vivo (ver slugsDeInvitados) en vez
// de leer uno guardado, para no tener que migrar nada si la lista de invitados cambia entre que
// se comparte el link y que se abre.
function resolverFamiliaPorSlug<T extends { nombre: string }>(invitados: T[], slug: string): T | null {
  const slugs = slugsDeInvitados(invitados);
  const idx = slugs.indexOf(slug.toLowerCase());
  return idx >= 0 ? invitados[idx] : null;
}

// Resuelve el texto decodificado del QR de un pase (escáner inline del control de acceso,
// 2026-11-22) contra ESTA invitación -- acepta los dos formatos que puede traer un pase real:
// el corto `/puerta/<codigoCorto>/<slug-familia>` (templates.ts, pases nuevos) y el largo
// `?checkin=1&iid=<uuid>&fam=<nombre>` (pases ya compartidos antes del link corto, o reenviados
// con el link largo de toda la vida). Regresa el invitado real solo si el código/iid coincide
// con ESTA invitación Y la familia existe en su lista -- cualquier otra cosa (QR de otro evento,
// texto que no es ni siquiera una URL, familia que ya no está en la lista) regresa `null` para
// que el escáner muestre "Ese pase no corresponde a este evento" y siga escaneando, sin cerrar
// la cámara ni adivinar una coincidencia parcial.
function resolverPaseEscaneado<T extends { nombre: string }>(
  textoQR: string,
  ctx: { invitacionId: string | null; codigoCortoPuerta: string | null; invitados: T[] }
): T | null {
  let url: URL;
  try {
    url = new URL(textoQR, typeof window !== "undefined" ? window.location.origin : undefined);
  } catch {
    return null;
  }
  const matchCorto = url.pathname.match(/^\/puerta\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i);
  if (matchCorto) {
    const [, codigo, slug] = matchCorto;
    if (!ctx.codigoCortoPuerta || codigo.toLowerCase() !== ctx.codigoCortoPuerta.toLowerCase()) return null;
    return resolverFamiliaPorSlug(ctx.invitados, slug);
  }
  if (url.searchParams.get("checkin") === "1") {
    const iid = url.searchParams.get("iid");
    const fam = url.searchParams.get("fam");
    if (!iid || !fam || !ctx.invitacionId || iid !== ctx.invitacionId) return null;
    return ctx.invitados.find(i => i.nombre === fam) || null;
  }
  return null;
}

// Folio de clienta (2026-11-22, "Folio de clienta en el administrador"): identifica a la
// PERSONA que contrata (la mamá/clienta), separado del `codigoCorto` de cada invitación (el
// EVENTO). Llave natural: el teléfono de WhatsApp normalizado a sus últimos 10 dígitos, para que
// "5212345678" y "525212345678" (con o sin 52/código de país) empaten en la misma clienta.
function normalizarTelefono(tel: string | null | undefined): string {
  const soloDigitos = (tel || "").replace(/\D/g, "");
  return soloDigitos.length >= 10 ? soloDigitos.slice(-10) : "";
}

// "C-007" / "C-042" / "C-1000" (de 1000 en adelante, natural -- no se trunca a 3 dígitos).
function folioFormateado(folio: number | null | undefined): string {
  if (folio === null || folio === undefined) return "—";
  return `C-${String(folio).padStart(3, "0")}`;
}

// Encuentra o crea la clienta (tabla `clientes`) ligada a este teléfono -- null si no hay
// teléfono capturado, sin que nada truene (una invitación sin teléfono simplemente no tiene
// clienta). Se llama en CADA guardado, alta o actualización (ver `guardarEnSupabase` más abajo),
// para que un teléfono que cambia se vuelva a ligar con la misma regla -- el folio de una
// clienta, una vez asignado, nunca cambia (columna `identity`, nunca se reescribe aquí).
async function resolverClienteId(supabase: any, telefonoRaw: string, nombreSugerido: string): Promise<string | null> {
  const telNorm = normalizarTelefono(telefonoRaw);
  if (!telNorm) return null;
  try {
    const { data: existente } = await supabase
      .from("clientes")
      .select("id")
      .eq("telefono_whatsapp", telNorm)
      .maybeSingle();
    if (existente?.id) return existente.id;
    const { data: creada, error: errCrear } = await supabase
      .from("clientes")
      .insert([{ telefono_whatsapp: telNorm, nombre: nombreSugerido?.trim() || null }])
      .select("id")
      .maybeSingle();
    if (!errCrear && creada?.id) return creada.id;
    // Carrera (poco probable, pero posible con 2 pestañas guardando casi al mismo tiempo): otra
    // escritura ya creó esta misma clienta entre el select y el insert de aquí arriba --
    // `telefono_whatsapp` es unique, así que el insert de esta pestaña falló; se vuelve a leer
    // en vez de dejar la invitación sin clienta.
    const { data: reintento } = await supabase
      .from("clientes")
      .select("id")
      .eq("telefono_whatsapp", telNorm)
      .maybeSingle();
    return reintento?.id || null;
  } catch (err) {
    // Nunca debe tronar el guardado de la invitación por esto -- si algo sale mal resolviendo
    // la clienta, la invitación se guarda igual, simplemente sin `cliente_id` por ahora (se
    // vuelve a intentar ligar en el siguiente guardado).
    console.error("Error al resolver la clienta (folio):", err);
    return null;
  }
}

// Función para guardar en Supabase (agregar ANTES de export default function App)
// Si se pasa `existingId`, actualiza esa fila en vez de crear una nueva — evita que guardar
// varias veces mientras se edita la MISMA invitación acumule filas duplicadas en la tabla.
// `shareUrl` ya NO se usa (2026-11-19): `link_invitacion` ahora siempre se calcula aquí mismo
// como el link corto `/v/<codigoCorto>` -- se deja el parámetro en la firma para no tener que
// tocar los 3 call-sites que todavía lo mandan.
async function guardarEnSupabase(datosInvitacion: InvitacionDatos, temaActual: TemaConfig, shareUrl?: string, existingId?: string | null, creadoPor?: string | null) {
  // Verificar que Supabase esté cargado
  if (!window.supabaseClient) {
    throw new Error('Supabase no está disponible');
  }

  const supabase = window.supabaseClient;

  // Código corto / link `/v/<codigoCorto>` (2026-11-19): reemplaza al link largo como el link
  // PRINCIPAL que queda guardado en `link_invitacion` -- ver src/App.tsx (resolución del link
  // corto) y el prompt de este cambio. Una fila YA EXISTENTE (existingId) conserva para
  // siempre el código que ya tenía; una fila NUEVA (alta o "Duplicar como cliente nuevo")
  // siempre recibe uno propio, NUNCA el heredado de los datos que se le pasaron -- por eso se
  // ignora `datosInvitacion.codigoCorto` a propósito cuando no hay `existingId`, aunque venga
  // poblado (pasaría al duplicar una invitación que ya tenía código).
  let codigoCorto = existingId ? datosInvitacion.codigoCorto : undefined;
  if (!codigoCorto) {
    codigoCorto = await generarCodigoCortoUnico(supabase, datosInvitacion.nombre);
  }
  const datosConCodigo: InvitacionDatos = { ...datosInvitacion, codigoCorto };
  const linkCorto = `${URL_PUBLICA_INVITAMX}/v/${codigoCorto}`;

  // Folio de clienta (2026-11-22): se re-resuelve en CADA guardado (alta o actualización), no
  // solo al crear -- así, si el teléfono de una invitación cambia, se vuelve a ligar con la
  // misma regla (ver resolverClienteId). El folio de la clienta en sí nunca cambia una vez
  // asignado.
  const clienteId = await resolverClienteId(
    supabase,
    datosInvitacion.whatsappConfirmacion || '',
    (datosInvitacion.padres && datosInvitacion.padres[1]) || ''
  );

  const datosParaGuardar = {
    nombre_quinceanera: datosInvitacion.nombre || 'Sin nombre',
    apellido_quinceanera: '',
    edad: null,
    fecha_fiesta: datosInvitacion.fecha || null,
    hora_fiesta: null,
    lugar_fiesta: datosInvitacion.ceremonia?.lugar || '',
    foto_portada_url: datosInvitacion.fotoPortada || '',
    foto_galeria_urls: datosInvitacion.fotos || [],
    foto_familia_url: '',
    tema_elegido: temaActual.id,
    nombre_papa: (datosInvitacion.padres && datosInvitacion.padres[0]) || '',
    nombre_mama: (datosInvitacion.padres && datosInvitacion.padres[1]) || '',
    telefono_whatsapp: datosInvitacion.whatsappConfirmacion || '',
    cliente_id: clienteId,
    email_cliente: '',
    link_invitacion: linkCorto,
    fondos_personalizados: datosInvitacion.bgImages || {},
    // Estado completo (todos los campos de InvitacionDatos), aparte de las columnas de
    // resumen de arriba — es lo que permite reabrir esta invitación exacta en el editor
    // desde el panel "Mis Invitaciones" en vez de solo poder leer un resumen.
    datos_completos: datosConCodigo,
    estado: 'completada'
  };

  // Reintenta hasta 3 veces en total con espera creciente (1s, 2s) antes de rendirse -- antes,
  // cualquier error (de red o de Supabase) se tragaba aquí mismo con un console.error y esta
  // función devolvía undefined silenciosamente, así que los 3 lugares que la llaman (que SÍ
  // tienen try/catch esperando que esto pueda fallar) nunca se enteraban: el admin veía que el
  // botón "Guardar en Supabase" no hacía nada, sin ningún error ni aviso.
  const intentosTotales = 3;
  let ultimoError = new Error('Ocurrió un error al guardar en Supabase.');
  for (let intento = 1; intento <= intentosTotales; intento++) {
    try {
      // creado_por solo se manda al INSERTAR una fila nueva -- nunca en el update, para que
      // guardar cambios en una invitación ya existente no le "robe" la autoría a quien la creó
      // originalmente, sin importar quién sea el que la esté editando ahora.
      const query = existingId
        ? supabase.from('invitaciones').update(datosParaGuardar).eq('id', existingId).select()
        : supabase.from('invitaciones').insert([{ ...datosParaGuardar, creado_por: creadoPor || null }]).select();

      const { data, error } = await query;
      if (error) throw error;

      return data[0];
    } catch (err: any) {
      ultimoError = err instanceof Error ? err : new Error(err?.message || 'Ocurrió un error al guardar en Supabase.');
      if (intento < intentosTotales) {
        await new Promise(resolve => setTimeout(resolve, 1000 * intento));
      }
    }
  }
  throw ultimoError;
}

// Retorna los colores de vestimenta recomendados característicos de cada tema
const getColorSugeridoPorTema = (temaId: string, tColors: any): string[] => {
  if (temaId === "dorado-clasico") return ["#D4AF37", "#E9D295", "#FFFFFF"];
  if (temaId === "mariposas") return ["#C299B5", "#E8D7E3", "#FFFFFF"];
  if (temaId === "floral-acuarela") return ["#F1A7B4", "#FADCD9", "#FFFFFF"];
  if (temaId === "celestial") return ["#1E293B", "#D4AF37", "#E2E8F0"];
  if (temaId === "botanico") return ["#2D4A3E", "#A3B899", "#F1F5F9"];
  if (temaId === "glam-rose") return ["#E0A899", "#F3DCD4", "#FFFFFF"];
  if (temaId === "boho-chic") return ["#C87A53", "#E6C5B3", "#FDF6F0"];
  if (temaId === "princesa-elegante") return ["#4A1D36", "#C39E82", "#FDF6F0"];
  if (temaId === "marmol-oro") return ["#1E293B", "#D4AF37", "#F8FAFC"];
  if (temaId === "neon") return ["#EC4899", "#06B6D4", "#E2E8F0"];
  if (temaId === "coquette-pink") return ["#D9829B", "#F5D6DE", "#FFFFFF"];
  if (temaId === "coquette-luxe") return ["#C66B8F", "#D4AF37", "#FBF8F3"];
  if (temaId === "vino-elegante") return ["#7B1E3A", "#E8C4A0", "#FFFFFF"];
  return [tColors.primary, tColors.secondary, "#FFFFFF"];
};

// Nombre de pareja/festejado ficticio para la demo del catálogo cuando se pide un evento
// distinto a XV (?catalog=true&evento=boda) -- hoy solo boda, reutiliza la misma pareja
// ficticia del set de fotos de muestra de boda (FOTOS_LISTAS, "Boda · Portada" etc. en
// fotosListas.ts) para que el nombre coincida con las caras que se ven en la demo. Sin
// entrada para un evento, el nombre real del tier (datosDefault.deluxe.nombre, "Luna
// Isabella") se queda igual -- la demo de catálogo nunca dejó de ser XV por default.
const NOMBRE_DEMO_CATALOGO_POR_EVENTO: Partial<Record<TipoEvento, string>> = {
  boda: "Valeria & Diego"
};

// Itinerario de ejemplo para la demo de catálogo por evento -- reusa ITINERARIO_BODA_POR_PAQUETE
// (ya existe para capturar invitaciones nuevas de boda) con el tier deluxe, el mismo que usa
// toda demo de catálogo. Sin entrada para un evento, se deja el itinerario XV del default.
const ITINERARIO_DEMO_CATALOGO_POR_EVENTO: Partial<Record<TipoEvento, { hora: string; evento: string }[]>> = {
  boda: ITINERARIO_BODA_POR_PAQUETE.deluxe
};

// Código de vestimenta propio de la demo de catálogo, SOLO para los 2 temas donde el default
// compartido (datosDefault.deluxe.dressCode, "Etiqueta Rigurosa / Black Tie...") desentona de
// verdad -- Neón y Boho Chic. Los otros 12 temas conservan ese default, que sí les combina.
const VESTIMENTA_DEMO_CATALOGO_POR_TEMA: Partial<Record<string, string>> = {
  neon: "Fiesta Neón — Casual Elegante con un Toque Neón",
  "boho-chic": "Boho Chic — Vestido Fluido, Tonos Tierra y Flores"
};

// Genera un objeto de datos personalizado para el catálogo que garantiza que se muestren las características exactas del tema
// `evento` (2026-11-25): cuando el catálogo se pide en modo boda (?catalog=true&evento=boda,
// ver `?evento=` en getInitialState) cada demo se renderiza con tipoEvento:"boda" -- los
// textos que ve el invitado (apertura/portada/mensaje/RSVP) ya cambian solos vía
// textosEventoDe() en templates.ts con solo fijar ese campo; aquí solo hace falta pisar lo que
// SÍ sigue siendo "de fábrica XV" en el dato mismo: el nombre, el mensaje de bienvenida, el
// itinerario, y las fotos (las fotos por tema son de una quinceañera, nunca sirven para boda).
const getDatosCatalogTema = (baseDatos: any, t: any, evento: TipoEvento = "xv"): any => {
  const base = baseDatos || datosDefault.premium;
  const esXv = evento === "xv" || !TEXTOS_POR_EVENTO[evento];
  // Pool de fotos: para XV, las fotos reales del TEMA (como siempre); para otro evento, las
  // fotos de muestra de ESE evento (fotosListas.ts) -- el tema sigue siendo el mismo (colores/
  // tipografía), solo cambian las fotos para no mostrar a una quinceañera en una demo de boda.
  const fotosEventoCatalogo = esXv ? [] : fotosListasPorEvento(evento).map(f => f.url);
  const fotosTema = fotosEventoCatalogo.length ? fotosEventoCatalogo : getFotosPorTema(t.id);
  // Antes era aleatoria (Math.random()) -- en cada carga podía tocar una foto de ambiente/detalle
  // en vez de la festejada (ej. un salón vacío), mala para vender. Fija a la primera del pool
  // (el retrato principal, ver fotosListas.ts/data.ts) -- misma foto siempre, en la previa y en
  // el demo, en cada carga y cada visita.
  const fotoPortadaFija = fotosTema[0];

  return {
    ...base,
    tema: t.id,
    tipoEvento: evento,
    ...(esXv ? {
      // Itinerario propio por tema (2026-11-25, ver ITINERARIO_POR_TEMA en data.ts) -- antes
      // las 14 demos XV compartían el mismo itinerario (el de Princesa Elegante, "Alfombra
      // Azul..."), sin combinar con los otros 13 temas. Sin entrada para este tema (hoy solo
      // princesa-elegante, cuyo itinerario de siempre YA es ese), cae al de base sin cambios.
      itinerario: ITINERARIO_POR_TEMA[t.id] || base.itinerario,
      ...(VESTIMENTA_DEMO_CATALOGO_POR_TEMA[t.id] ? { dressCode: VESTIMENTA_DEMO_CATALOGO_POR_TEMA[t.id] } : {})
    } : {
      nombre: NOMBRE_DEMO_CATALOGO_POR_EVENTO[evento] || base.nombre,
      mensajeBienvenida: MENSAJE_BIENVENIDA_POR_EVENTO[evento] || base.mensajeBienvenida,
      itinerario: ITINERARIO_DEMO_CATALOGO_POR_EVENTO[evento] || base.itinerario
    }),
    // Para XV se deja vacío (como siempre) -- generarHTMLFinal cae sola a getFotosPorTema(tema)
    // cuando `fotos` está vacío, que es justo el fallback de fotos de quinceañera por tema que
    // SÍ queremos para XV. Para otro evento, ese mismo fallback seguiría trayendo fotos de
    // quinceañera (no sabe nada de tipoEvento) -- por eso aquí se llena `fotos` a mano con el
    // pool del evento, para que ese fallback nunca se dispare en modo boda.
    fotos: esXv ? [] : fotosTema,
    fotoPortada: fotoPortadaFija,
    colorSugerido: getColorSugeridoPorTema(t.id, t.colors)
  };
};

// Obtiene los datos del catálogo dando prioridad a diseños guardados por el usuario para cada tema específico
// `evento`: ver getDatosCatalogTema -- con un evento distinto a XV, el diseño guardado a mano
// por el admin para ese tema (localStorage, siempre pensado/guardado en contexto XV) se
// ignora a propósito, para que la demo de boda nunca se contamine con un nombre/foto de XV
// que el admin haya guardado ahí en otra sesión.
const getDatosVisualizacionCatalog = (t: any, currentDatos?: any, evento: TipoEvento = "xv"): any => {
  if (evento === "xv") {
    try {
      const saved = localStorage.getItem(`xv_diseño_guardado_tema_${t.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            ...parsed,
            tema: t.id,
            bgImages: {
              ...(parsed.bgImages || {}),
              ...(currentDatos?.bgImages || {})
            }
          };
        }
      }
    } catch (err) {
      console.error("Error al cargar diseño guardado del catálogo:", err);
    }
  }

  // Usamos el tier Deluxe como base para las demos del catálogo (en vez de Premium) para que
  // se vean TODAS las secciones posibles, incluida "Pases de Entrada" (exclusiva de Deluxe) —
  // así un cliente puede ver esa función antes de decidir qué paquete comprar.
  const baseData = getDatosCatalogTema(datosDefault.deluxe, t, evento);

  // Asegurar que los bgImages del usuario se incluyan siempre en el catálogo
  const allBgImages = {
    ...(baseData.bgImages || {}),
    ...(currentDatos?.bgImages || {})
  };

  // Si hay un fondo personalizado para este tema, usarlo
  const bgImagesWithUserBackground = {
    ...allBgImages,
    [t.id]: currentDatos?.bgImages?.[t.id] || allBgImages[t.id]
  };

  return {
    ...baseData,
    bgImages: bgImagesWithUserBackground
  };
};

// Fix "demo en vivo desajustado en celular" (2026-11-26, v2 -- ver CLAUDE.md): esta página
// (?catalog=true) se embebe en un <iframe> de ALTURA FIJA dentro de la landing
// (invitacionmx-landing, Themes.tsx -- 4100px, medida para que el GRID de 14 tarjetas quepa sin
// scroll interno). El marco de celular de la demo usa alturas en `vh` (línea ~7590, incluye un
// breakpoint móvil SIN tope, `max-[480px]:h-[82vh]`) que se calculan contra el alto del iframe
// (4100px), no contra la pantalla real del celular -- en móvil eso da un marco de ~3362px de
// alto, rompiendo el layout. La v1 de este fix abría la demo en una pestaña nueva (un paso
// extra, incómodo); esta v2 avisa al PADRE (la landing) por `postMessage` cada vez que se entra
// o se sale de la vista de un tema/estilo, para que la landing agrande el iframe al alto REAL
// de la pantalla del visitante mientras se ve la demo (y lo regrese a 4100px al volver al
// grid) -- así el `vh` de adentro calcula bien, sin pestaña nueva ni tocar la demo en sí.
const estaEmbebidoEnIframe = (() => {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    // Acceso bloqueado por el navegador (iframe de otro origen) -- confirma que SÍ hay un
    // iframe de por medio, aunque no se pueda leer `window.top` directamente.
    return true;
  }
})();

// Componente para cargar los iframes del catálogo de forma diferida (staggered), evitando bloquear el hilo principal (INP Issue)
// Cola de concurrencia para las 14 vistas previas del catálogo (?catalog=true): cada una
// incluye <script src="https://cdn.tailwindcss.com"> en su <head> (ver generarHTMLFinal en
// templates.ts -- el mismo script que usa la invitación real, para que la vista previa sea
// 1:1 idéntica), que es render-blocking y JIT-compila Tailwind contra todo el DOM en tiempo
// real. Con las 14 disparando ese script casi al mismo tiempo (el stagger de abajo es de solo
// 80ms entre una y otra), el navegador se atora -- confirmado en vivo: el `<head>` de cada
// iframe se quedaba parado esperando ese script, sin terminar de parsear nunca el `<body>`
// (readyState "loading" indefinidamente). Mismo patrón de cola ya probado y medido en
// invitacionmx-catalogo (ThemePreview/page.tsx), con un ajuste real encontrado al probarlo en
// vivo: el turno se libera con `DOMContentLoaded` del documento del iframe, NO con el evento
// nativo `onLoad` -- `onLoad` espera también a que terminen de bajar las imágenes de fondo
// (Cloudinary), y una sola de esas tardó hasta ~29s en una prueba real, lo que habría tenido
// un cupo de la cola ocupado sin necesidad mucho más tiempo del real cuello de botella (el
// script de Tailwind, que sí terminó en ~3s en esa misma prueba). Las imágenes no bloquean el
// parseo del documento ni compiten por el mismo recurso (JIT de CSS), así que no hace falta
// esperarlas para liberar el turno.
// En 1, no 2: probado en vivo con 2 -- el navegador quedó tan ocupado compilando Tailwind
// (JIT real, contra un DOM completo, 2 veces a la vez) que hasta las capturas de pantalla de
// la propia prueba empezaron a fallar por "renderer frozen or unresponsive" aunque la página
// seguía respondiendo a JS. Con 1 a la vez nunca hay dos compilaciones de Tailwind compitiendo
// por el hilo principal al mismo tiempo.
// Subido a 2 (2026-11-25): con la previa ahora en modo "solo portada" (ver soloPortada en
// templates.ts) el DOM que Tailwind tiene que compilar es una fracción del de antes (sin
// galería/secciones extra) -- vuelto a probar en vivo con 2 a la vez y ya no se repite el
// "renderer frozen", confirmado en la verificación de esta misma tarea.
const MAX_PREVIEWS_CATALOGO_SIMULTANEAS = 2;
let previewsCatalogoActivas = 0;
const colaPreviewsCatalogo: Array<() => void> = [];

function pedirTurnoPreviewCatalogo(): Promise<void> {
  if (previewsCatalogoActivas < MAX_PREVIEWS_CATALOGO_SIMULTANEAS) {
    previewsCatalogoActivas++;
    return Promise.resolve();
  }
  return new Promise((resolve) => colaPreviewsCatalogo.push(resolve));
}

function liberarTurnoPreviewCatalogo() {
  const siguiente = colaPreviewsCatalogo.shift();
  if (siguiente) {
    siguiente();
  } else {
    previewsCatalogoActivas = Math.max(0, previewsCatalogoActivas - 1);
  }
}

// Maqueta del celular de la previa (2026-11-25, v4 -- corrige la v2/v3 de este mismo día, que
// habían dejado el MARCO alargado para que cupiera la portada completa). El marco conserva la
// proporción real de un celular (~9:19.5, igual que el del hero); es la PORTADA la que se
// escala para caber entera dentro, centrada -- nunca al revés. Estas constantes deben coincidir
// con las clases w-[...]/h-[...]/p-[...]/border-[...] del marco en el JSX de la tarjeta de abajo.
const MAQUETA_ANCHO = 210;
const MAQUETA_ALTO = 456;
const MAQUETA_CHROME = 11; // padding 3.5px*2 + borde 2px*2
const MAQUETA_INTERIOR_ANCHO = MAQUETA_ANCHO - MAQUETA_CHROME;
const MAQUETA_INTERIOR_ALTO = MAQUETA_ALTO - MAQUETA_CHROME;
const IFRAME_ANCHO_VIRTUAL = 354;
// Estimado conservador antes de medir el alto real de cada demo (ver abajo) -- nunca se queda
// así, es solo el primer render mientras el iframe termina de cargar.
const ALTO_PORTADA_ESTIMADO = 700;

const LazyIframe = memo(({ t, index, datos, evento = "xv" }: { t: any; index: number; datos: any; evento?: TipoEvento }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [altoPortada, setAltoPortada] = useState(ALTO_PORTADA_ESTIMADO);
  const turnoActivo = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const soltarTurnoUnaVez = () => {
    if (turnoActivo.current) {
      turnoActivo.current = false;
      liberarTurnoPreviewCatalogo();
    }
  };

  // Antes era un temporizador de montaje (todas las tarjetas pedían su turno aunque estuvieran
  // lejos del scroll, estén o no a la vista). Ahora un IntersectionObserver pide el turno solo
  // cuando la tarjeta está por entrar a pantalla (rootMargin ~400px, para que ya esté lista
  // cuando el usuario llegue) -- `index` ya no decide el orden, el scroll real del usuario sí.
  useEffect(() => {
    let cancelado = false;
    const el = contenedorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(e => e.isIntersecting)) return;
      observer.disconnect();
      pedirTurnoPreviewCatalogo().then(() => {
        if (cancelado) { liberarTurnoPreviewCatalogo(); return; }
        turnoActivo.current = true;
        setShouldRender(true);
      });
    }, { rootMargin: "400px" });
    observer.observe(el);
    return () => {
      cancelado = true;
      observer.disconnect();
      soltarTurnoUnaVez();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id, index]);

  useEffect(() => {
    if (!shouldRender) return;
    // Libera el turno en cuanto el documento del iframe terminó de parsearse (readyState deja
    // de ser "loading"), que es cuando el script bloqueante de Tailwind ya corrió -- sin
    // esperar a las imágenes de fondo, que siguen bajando en paralelo sin competir por el
    // mismo recurso. Poll corto en vez de un listener de evento porque el documento del iframe
    // se reemplaza por completo al asignar `srcDoc` (un listener atado antes de ese reemplazo
    // nunca dispararía). 12s de respaldo por si algo raro impide que termine de parsear.
    // (La medición del alto real vive en el efecto de abajo -- aquí solo se libera el turno de
    // la cola de compilación de Tailwind, que no debe esperar a que fuentes/imágenes terminen.)
    let cancelado = false;
    const intervalo = setInterval(() => {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.readyState !== "loading") {
        clearInterval(intervalo);
        if (!cancelado) soltarTurnoUnaVez();
      }
    }, 150);
    const respaldo = setTimeout(() => {
      clearInterval(intervalo);
      if (!cancelado) soltarTurnoUnaVez();
    }, 12000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      clearTimeout(respaldo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender]);

  // Medición del alto real de la portada (v5, 2026-11-26 -- punto C.1 del prompt). Antes se
  // medía una sola vez, justo cuando el documento dejaba de estar "loading" -- demasiado
  // pronto: Tailwind, las fuentes (@font-face) y la foto de portada todavía no habían acomodado
  // el documento, así que la escala se calculaba con un alto más chico del real y la portada se
  // veía cortada por abajo con scroll interno. Ahora se espera el evento "load" del iframe +
  // document.fonts.ready, y se vuelve a medir a los 300ms y a los 900ms (fuentes/imagen pueden
  // seguir acomodando el layout un instante después) -- se conserva la medición MAYOR de todas
  // (el contenido solo puede crecer al terminar de cargar, nunca achicarse).
  useEffect(() => {
    if (!shouldRender) return;
    let cancelado = false;
    let mejorAlto = 0;
    const medir = () => {
      const doc = iframeRef.current?.contentDocument;
      const alto = doc?.body?.scrollHeight;
      if (alto && alto > mejorAlto) {
        mejorAlto = alto;
        if (!cancelado) setAltoPortada(mejorAlto);
      }
    };
    const alCargar = () => {
      medir();
      const fonts = (iframeRef.current?.contentDocument as any)?.fonts;
      Promise.resolve(fonts?.ready).catch(() => {}).then(() => { if (!cancelado) medir(); });
      setTimeout(() => { if (!cancelado) medir(); }, 300);
      setTimeout(() => { if (!cancelado) medir(); }, 900);
    };
    const iframeEl = iframeRef.current;
    iframeEl?.addEventListener("load", alCargar);
    return () => {
      cancelado = true;
      iframeEl?.removeEventListener("load", alCargar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender]);

  const srcDoc = useMemo(() => {
    if (!shouldRender) return "";
    // soloPortada (2026-11-25): la previa del catálogo ya no carga la invitación completa --
    // solo la portada (lo que la clienta de verdad compara entre temas), con imágenes ligeras
    // (ver aligerarUrlCloudinaria en templates.ts) -- el demo completo sigue siendo
    // "Ver Demo en Vivo", sin tocar.
    return generarHTMLFinal({ ...getDatosVisualizacionCatalog(t, datos, evento), seccionesExcluidas: [...(getDatosVisualizacionCatalog(t, datos, evento).seccionesExcluidas || []), "apertura"] }, t, { esDemoDeCatalogo: true, soloPortada: true });
  }, [shouldRender, t, datos, evento]);

  // Escala por el lado que más apriete (ancho o alto) -- nunca estira el marco, es la portada
  // la que se adapta. Con el alto REAL ya medido (altoPortada), esto converge exacto sin
  // recortar ni dejar scroll interno, para cualquier tema sin importar su altura real.
  const escala = Math.min(MAQUETA_INTERIOR_ANCHO / IFRAME_ANCHO_VIRTUAL, MAQUETA_INTERIOR_ALTO / altoPortada);
  const anchoEscalado = IFRAME_ANCHO_VIRTUAL * escala;
  const altoEscalado = altoPortada * escala;
  const offsetX = Math.max(0, (MAQUETA_INTERIOR_ANCHO - anchoEscalado) / 2);
  const offsetY = Math.max(0, (MAQUETA_INTERIOR_ALTO - altoEscalado) / 2);

  return (
    <div ref={contenedorRef} className="absolute inset-0">
      {!shouldRender ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-800 select-none pointer-events-none">
          <div className="animate-pulse flex flex-col items-center gap-1.5">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <span className="text-[8px] text-indigo-700/80 font-bold uppercase tracking-widest">Cargando...</span>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          scrolling="no"
          className="absolute border-0 pointer-events-none select-none"
          style={{
            width: `${IFRAME_ANCHO_VIRTUAL}px`,
            height: `${altoPortada}px`,
            overflow: "hidden",
            transform: `scale(${escala})`,
            transformOrigin: "top left",
            top: `${offsetY}px`,
            left: `${offsetX}px`,
          }}
          title={`Demo ${t.nombre}`}
        />
      )}
    </div>
  );
});

// "Ver Demo en Vivo" (invitación completa de un solo tema, con sus controles de paquete/estilo
// de cajón) -- a diferencia de LazyIframe, esta SÍ es la invitación completa, nunca soloPortada;
// solo le agrega un indicador de carga mientras el documento del iframe termina de parsearse
// (mismo criterio de readyState que ya usa la cola de previas del catálogo), para que no se vea
// en blanco durante el tiempo que tarda Tailwind CDN en compilar. 2026-11-25.
const DemoEnVivoConCarga = memo(({ srcDoc, title }: { srcDoc: string; title: string }) => {
  const [cargando, setCargando] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setCargando(true);
    let cancelado = false;
    const intervalo = setInterval(() => {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.readyState !== "loading") {
        clearInterval(intervalo);
        if (!cancelado) setCargando(false);
      }
    }, 150);
    const respaldo = setTimeout(() => {
      clearInterval(intervalo);
      if (!cancelado) setCargando(false);
    }, 12000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      clearTimeout(respaldo);
    };
  }, [srcDoc]);

  return (
    <div className="relative w-full h-full">
      {cargando && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-sm font-bold text-indigo-700">Cargando tu demo…</span>
        </div>
      )}
      <iframe ref={iframeRef} srcDoc={srcDoc} className="w-full h-full border-0" title={title} />
    </div>
  );
});

// Mapeo de IDs de secciones a nombres legibles en español con emojis
const NOMBRES_SECCIONES: Record<string, string> = {
  apertura: "Pantalla de apertura 🎀",
  portada: "Portada principal 🏰",
  cuenta: "Cuenta regresiva ⏳",
  mensaje: "Mensaje / Frase de bienvenida ✍️",
  ceremonia: "Ubicación de Ceremonia ⛪",
  recepcion: "Ubicación de Recepción 🏨",
  itinerario: "Itinerario / Programa 🗓️",
  vestimenta: "Código de Vestimenta 👗",
  familia: "Padres y Padrinos 👨‍👩‍👧",
  regalos: "Mesa de Regalos & Datos Bancarios 🎁",
  galeria: "Galería de Fotos 📸",
  hashtag: "Hashtag de Instagram 📱",
  calendario: "Añadir a Calendario 📅",
  pases: "Control de pases de invitados 🎟️",
  confirmacion: "Confirmación (RSVP) 💬",
  cierre: "Mensaje de cierre 🌸"
};

// Listas curadas de fuentes para la personalización a la medida (tema "personalizado"):
// son exactamente las fuentes que ya usan los 14 temas del catálogo, así que ya están
// cargadas y probadas — no hay riesgo de romper la carga de Google Fonts.
const FUENTES_ENCABEZADO = ["Playfair Display", "Cormorant Garamond", "Lora", "Cinzel", "Outfit", "Syne", "Orbitron"];
const FUENTES_TEXTO = ["Inter", "Garamond", "Poppins", "Montserrat", "Jost"];
const FUENTES_CURSIVA = ["Great Vibes", "Alex Brush", "Pinyon Script", "Monsieur La Doulaise", "Petit Formal Script", "WindSong", "Sacramento", "Parisienne", "Dancing Script"];

type TipoApertura = "sobre" | "cortina" | "tarjeta" | "puertas" | "destellos" | "caligrafia";

const TIPOS_APERTURA: { id: TipoApertura; nombre: string; desc: string }[] = [
  { id: "tarjeta", nombre: "Tarjeta 🎴", desc: "Tarjeta elegante con brillo metálico y botón para abrir" },
  { id: "sobre", nombre: "Sobre 💌", desc: "Sobre con sello de cera que se parte en dos al abrir" },
  { id: "cortina", nombre: "Cortina 🎭", desc: "Telón que se recoge hacia los lados" },
  { id: "puertas", nombre: "Puertas 🚪 (Puertas de gala)", desc: "Dos hojas que se abren hacia afuera, con luz desde el centro" },
  { id: "destellos", nombre: "Destellos ✨ (Lluvia de luz)", desc: "Explosión de luz y destellos que disuelve la pantalla" },
  { id: "caligrafia", nombre: "Caligrafía ✍️", desc: "El nombre se escribe solo en la pantalla antes de abrir" }
];

// Apertura por defecto de cada tema cuando el usuario no la sobreescribe manualmente.
// Debe coincidir exactamente con tipoAperturaEfectivo en templates.ts. "puertas"/"destellos"
// agregados 2026-11-19: "puertas" como default de Dorado Clásico/Mármol & Oro (antes caían al
// "tarjeta" genérico del else); "destellos" sustituyendo "cortina" en Neón/Celestial -- pedido
// explícito del encargo ("ideal para temas oscuros como Neón y Celestial").
const tipoAperturaPorDefectoDelTema = (temaId: string): TipoApertura =>
  ["mariposas", "floral-acuarela", "boho-chic", "coquette-pink", "coquette-luxe"].includes(temaId)
    ? "sobre"
    : ["princesa-elegante"].includes(temaId)
      ? "cortina"
      : ["celestial", "neon"].includes(temaId)
        ? "destellos"
        : ["dorado-clasico", "marmol-oro"].includes(temaId)
          ? "puertas"
          : "tarjeta";

// Diseño de portada por defecto de cada tema cuando el usuario no lo sobreescribe manualmente
// en personalizacion.estiloPortada -- mismo patrón que tipoAperturaPorDefectoDelTema de arriba.
// Debe coincidir exactamente con la lógica equivalente de estiloPortadaElegido en templates.ts
// (misma lista de temas, mismo orden de prioridad). Pedido 2026-11-19: antes todos los temas
// caían a "circular" por default, por lo que la portada se veía igual sin importar el tema.
const estiloPortadaPorDefectoDelTema = (temaId: string): "circular" | "arco" | "fondo" | "marco" =>
  ["dorado-clasico", "marmol-oro"].includes(temaId)
    ? "marco"
    : ["floral-acuarela", "botanico", "boho-chic", "princesa-elegante", "mariposas", "coquette-pink", "coquette-luxe"].includes(temaId)
      ? "arco"
      : ["celestial", "neon", "aurora-boreal", "vino-elegante", "glam-rose"].includes(temaId)
        ? "fondo"
        : "circular";

// Mini-vista previa animada (CSS puro, sin imágenes/GIFs) de cada tipo de apertura, pintada con
// los colores del tema activo -- reemplaza los botones de solo texto del panel "Tipo de
// Apertura" (pedido 2026-11-19). Son recreaciones a pequeña escala y en bucle suave, no las
// animaciones reales (esas solo corren una vez, al abrir la invitación real en templates.ts).
const MiniPreviewApertura = memo(({ tipo, tema }: { tipo: TipoApertura; tema: TemaConfig }) => {
  const c = tema.colors;
  const marco: { width: number; height: number } = { width: 56, height: 56 };
  const base = (
    <div
      className="absolute inset-0 rounded-lg overflow-hidden"
      style={{ background: tema.bgGradient }}
    />
  );
  if (tipo === "tarjeta") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg" style={marco}>
        {base}
        <div
          className="absolute inset-1.5 rounded-md border"
          style={{ background: "rgba(255,255,255,0.72)", borderColor: c.border }}
        />
        <div className="mini-apertura-brillo-tarjeta" style={{ background: `linear-gradient(100deg, transparent 0%, ${c.accent}99 50%, transparent 100%)` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[18px]" style={{ color: c.accent }}>{tema.decorativeEmoji}</span>
      </div>
    );
  }
  if (tipo === "sobre") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg" style={marco}>
        {base}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 34, height: 24 }}>
          <div className="w-full h-full rounded-[2px]" style={{ background: c.light, border: `1px solid ${c.border}` }} />
          <div
            className="mini-apertura-solapa absolute top-0 left-0 w-0 h-0"
            style={{ borderLeft: "17px solid transparent", borderRight: "17px solid transparent", borderTop: `12px solid ${c.accent}`, transformOrigin: "top" }}
          />
          <span className="absolute left-1/2 top-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ width: 11, height: 11, background: c.accent, color: tema.textLight, border: "1px solid white" }}>
            {(tema.decorativeEmoji || "♥").slice(0, 1)}
          </span>
        </div>
      </div>
    );
  }
  if (tipo === "cortina") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg" style={{ ...marco, background: c.dark }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle, " + c.accent + "55 0%, transparent 65%)" }} />
        <div className="mini-apertura-cortina-izq absolute top-0 bottom-0 left-0 w-1/2" style={{ background: c.dark, borderRight: `2px solid ${c.accent}` }} />
        <div className="mini-apertura-cortina-der absolute top-0 bottom-0 right-0 w-1/2" style={{ background: c.dark, borderLeft: `2px solid ${c.border}` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[14px] z-10">{tema.decorativeEmoji}</span>
      </div>
    );
  }
  if (tipo === "puertas") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg" style={{ ...marco, background: c.dark, perspective: "300px" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle, " + c.accent + "55 0%, transparent 65%)" }} />
        <div className="mini-apertura-puerta-izq absolute top-0 bottom-0 left-0 w-1/2" style={{ transformOrigin: "left center" }}>
          <div className="absolute inset-0.5 rounded-sm" style={{ background: c.dark, border: `1px solid ${c.border}` }} />
        </div>
        <div className="mini-apertura-puerta-der absolute top-0 bottom-0 right-0 w-1/2" style={{ transformOrigin: "right center" }}>
          <div className="absolute inset-0.5 rounded-sm" style={{ background: c.dark, border: `1px solid ${c.border}` }} />
        </div>
        <span className="absolute inset-0 flex items-center justify-center text-[14px] z-10" style={{ color: c.accent }}>{tema.decorativeEmoji}</span>
      </div>
    );
  }
  if (tipo === "destellos") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg" style={marco}>
        {base}
        <div className="mini-apertura-destello" style={{ background: `radial-gradient(circle, white 0%, ${c.accent} 55%, transparent 100%)` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[18px] z-10" style={{ color: c.accent }}>{tema.decorativeEmoji}</span>
      </div>
    );
  }
  // caligrafia
  return (
    <div className="relative shrink-0 overflow-hidden rounded-lg" style={marco}>
      {base}
      <svg viewBox="0 0 56 20" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 38, height: 14 }}>
        <path
          className="mini-apertura-caligrafia-trazo"
          d="M2 14 C 8 2, 14 2, 16 10 C 18 16, 24 4, 28 10 C 32 16, 38 2, 42 8 C 45 12, 50 6, 54 10"
          fill="none"
          stroke={c.accent}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});

// Panel visual "Tipo de Apertura" (reemplaza los botones de solo texto, pedido 2026-11-19):
// cada tarjeta trae su MiniPreviewApertura animada en bucle con los colores del tema activo.
// Extraído a un componente compartido porque el selector se renderiza en 2 lugares del editor
// (pestaña "Tema/Paquete" y pestaña "A Medida") -- antes de esto, los 2 lugares repetían el
// mismo JSX dos veces; ahora solo cambia el color de acento (purple/indigo) entre ambos.
const SelectorTipoApertura = memo(({ tema, valorActual, onSelect, colorAcento }: {
  tema: TemaConfig;
  valorActual: TipoApertura;
  onSelect: (id: TipoApertura) => void;
  colorAcento: "purple" | "indigo";
}) => {
  const borde = colorAcento === "purple" ? "border-purple-500 bg-purple-50/40" : "border-indigo-500 bg-indigo-50/40";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id={`selector-apertura-${colorAcento}`}>
      {TIPOS_APERTURA.map(t => {
        const isSelected = valorActual === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex items-center gap-2.5 text-left p-2 rounded-xl border-2 transition cursor-pointer ${isSelected ? borde : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <MiniPreviewApertura tipo={t.id} tema={tema} />
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                {t.nombre}
                {isSelected && <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${colorAcento === "purple" ? "bg-purple-600" : "bg-indigo-600"} text-white`}>✓ Elegido</span>}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">{t.desc}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

type EstiloItinerario = "clasica" | "editorial" | "minimalista";

const ESTILOS_ITINERARIO: { id: EstiloItinerario; nombre: string; desc: string }[] = [
  { id: "clasica", nombre: "Clásica 🕰️", desc: "Línea vertical con nodos e íconos (el diseño original)" },
  { id: "editorial", nombre: "Editorial 📜", desc: "Tarjetas amplias, hora grande -- como un programa de gala impreso" },
  { id: "minimalista", nombre: "Minimalista ⋯", desc: "Filas limpias con línea de puntos, ideal para temas oscuros" }
];

// Mini-vista previa del estilo de itinerario (mismo patrón que MiniPreviewApertura): recreación
// a pequeña escala en CSS puro, con los colores del tema activo, sin tarjeta/imagen externa.
const MiniPreviewItinerario = memo(({ estilo, tema }: { estilo: EstiloItinerario; tema: TemaConfig }) => {
  const c = tema.colors;
  const marco = { width: 56, height: 56 };
  if (estilo === "editorial") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg flex flex-col items-center justify-center gap-1 p-1.5" style={{ ...marco, background: tema.bgGradient }}>
        <div className="w-full rounded-sm flex items-center gap-1 px-1 py-1" style={{ background: c.light, border: `1px solid ${c.border}` }}>
          <span className="rounded-full shrink-0" style={{ width: 10, height: 10, border: `1.5px solid ${c.accent}` }} />
          <span className="block h-1.5 flex-1 rounded-full" style={{ background: c.accent }} />
        </div>
        <div className="w-full rounded-sm flex items-center gap-1 px-1 py-1" style={{ background: c.light, border: `1px solid ${c.border}` }}>
          <span className="rounded-full shrink-0" style={{ width: 10, height: 10, border: `1.5px solid ${c.accent}` }} />
          <span className="block h-1.5 flex-1 rounded-full" style={{ background: `${c.accent}80` }} />
        </div>
      </div>
    );
  }
  if (estilo === "minimalista") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg flex flex-col justify-center gap-1.5 p-2" style={{ ...marco, background: tema.colors.dark }}>
        {[1, 0.6, 0.85].map((op, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="block rounded-full shrink-0" style={{ width: 4, height: 4, background: c.accent }} />
            <span className="block h-[2px] rounded-full" style={{ width: 8, background: c.accent, opacity: op }} />
            <span className="block flex-1 h-[1px]" style={{ borderTop: `1px dotted ${c.light}99` }} />
            <span className="block h-[2px] rounded-full flex-1" style={{ background: `${c.light}cc`, maxWidth: 16 + i * 4 }} />
          </div>
        ))}
      </div>
    );
  }
  // clásica
  return (
    <div className="relative shrink-0 overflow-hidden rounded-lg flex items-center justify-center" style={{ ...marco, background: tema.bgGradient }}>
      <div className="relative flex flex-col items-start gap-2.5 py-1">
        <div className="absolute left-[5px] top-1 bottom-1 w-[2px]" style={{ background: `linear-gradient(to bottom, ${c.primary}, ${c.primary}40)` }} />
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-1.5 relative z-10">
            <span className="rounded-full shrink-0" style={{ width: 11, height: 11, background: "white", border: `2px solid ${c.primary}` }} />
            <span className="block h-2.5 rounded" style={{ width: 16 + i * 4, background: "white", border: `1px solid ${c.primary}`, borderLeftWidth: 2 }} />
          </div>
        ))}
      </div>
    </div>
  );
});

// Panel visual "Diseño del Itinerario" -- mismo patrón que SelectorTipoApertura: tarjetas con
// mini-vista previa animable (aquí estática, ya que cada estilo se distingue por composición más
// que por movimiento) en los colores del tema activo. Compartido entre los 2 lugares donde vive
// "Tipo de Apertura" para no duplicar el JSX.
const SelectorEstiloItinerario = memo(({ tema, valorActual, onSelect, colorAcento }: {
  tema: TemaConfig;
  valorActual: EstiloItinerario;
  onSelect: (id: EstiloItinerario) => void;
  colorAcento: "purple" | "indigo";
}) => {
  const borde = colorAcento === "purple" ? "border-purple-500 bg-purple-50/40" : "border-indigo-500 bg-indigo-50/40";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id={`selector-itinerario-${colorAcento}`}>
      {ESTILOS_ITINERARIO.map(e => {
        const isSelected = valorActual === e.id;
        return (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className={`flex items-center gap-2.5 text-left p-2 rounded-xl border-2 transition cursor-pointer ${isSelected ? borde : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <MiniPreviewItinerario estilo={e.id} tema={tema} />
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                {e.nombre}
                {isSelected && <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${colorAcento === "purple" ? "bg-purple-600" : "bg-indigo-600"} text-white`}>✓ Elegido</span>}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">{e.desc}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

type EstiloPortada = "circular" | "arco" | "fondo" | "marco";

const ESTILOS_PORTADA: { id: EstiloPortada; nombre: string; desc: string }[] = [
  { id: "circular", nombre: "Circular 🔘", desc: "Foto redonda con anillo y flotación (el diseño original)" },
  { id: "arco", nombre: "Arco 🪟", desc: "Foto tipo ventana, arco arriba, borde doble de acento" },
  { id: "fondo", nombre: "Fondo 🖼️", desc: "Tu foto ocupa toda la portada, con velo del tema encima" },
  { id: "marco", nombre: "Marco 🖼️", desc: "Foto rectangular con marco ornamental y esquinas decorativas" }
];

// Mini-vista previa del estilo de portada -- mismo patrón que MiniPreviewApertura/Itinerario:
// CSS puro, coloreado con el tema activo, sin imagen real (un bloque sólido representa la foto).
const MiniPreviewPortada = memo(({ estilo, tema }: { estilo: EstiloPortada; tema: TemaConfig }) => {
  const c = tema.colors;
  const marco = { width: 56, height: 56 };
  const fotoFalsa = { background: `linear-gradient(145deg, ${c.light}, ${c.secondary})` };
  if (estilo === "arco") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg flex items-center justify-center" style={{ ...marco, background: tema.bgGradient }}>
        <div style={{ width: 26, height: 32, borderRadius: "50% 50% 3px 3px / 55% 55% 3px 3px", boxShadow: `0 0 0 2px white, 0 0 0 4px ${c.accent}`, ...fotoFalsa }} />
      </div>
    );
  }
  if (estilo === "fondo") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg flex items-end justify-center p-1" style={{ ...marco, ...fotoFalsa }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />
        <span className="relative z-10 block w-7 h-1 rounded-full" style={{ background: "white" }} />
      </div>
    );
  }
  if (estilo === "marco") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg flex items-center justify-center" style={{ ...marco, background: tema.bgGradient }}>
        <div style={{ width: 28, height: 34, border: `2px solid ${c.accent}`, padding: 2, background: "white" }}>
          <div className="w-full h-full" style={fotoFalsa} />
        </div>
      </div>
    );
  }
  // circular
  return (
    <div className="relative shrink-0 overflow-hidden rounded-lg flex items-center justify-center" style={{ ...marco, background: tema.bgGradient }}>
      <div className="rounded-full" style={{ width: 30, height: 30, boxShadow: `0 0 0 2px white, 0 0 0 4px ${c.primary}33`, ...fotoFalsa }} />
    </div>
  );
});

// Panel visual "Diseño de la Portada" -- mismo patrón compartido que los selectores de arriba.
const SelectorEstiloPortada = memo(({ tema, valorActual, onSelect, colorAcento }: {
  tema: TemaConfig;
  valorActual: EstiloPortada;
  onSelect: (id: EstiloPortada) => void;
  colorAcento: "purple" | "indigo";
}) => {
  const borde = colorAcento === "purple" ? "border-purple-500 bg-purple-50/40" : "border-indigo-500 bg-indigo-50/40";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id={`selector-portada-${colorAcento}`}>
      {ESTILOS_PORTADA.map(e => {
        const isSelected = valorActual === e.id;
        return (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className={`flex items-center gap-2.5 text-left p-2 rounded-xl border-2 transition cursor-pointer ${isSelected ? borde : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <MiniPreviewPortada estilo={e.id} tema={tema} />
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                {e.nombre}
                {isSelected && <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${colorAcento === "purple" ? "bg-purple-600" : "bg-indigo-600"} text-white`}>✓ Elegido</span>}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">{e.desc}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

// Paletas de la lluvia decorativa ("Efecto de Animación de Caída"): conjuntos de emojis
// coordinados por estética, en vez de dejar elegir emoji por emoji.
const ESTILOS_CAJAS_SECCIONES: { id: "normal" | "sin_cajon" | "solo_borde"; nombre: string; desc: string }[] = [
  { id: "normal", nombre: "Con cajón", desc: "Fondo sólido/translúcido detrás del texto (como hoy)" },
  { id: "sin_cajon", nombre: "Sin cajón", desc: "El texto flota directo sobre el fondo del tema" },
  { id: "solo_borde", nombre: "Solo borde", desc: "Quita el relleno pero deja un marco delgado" }
];

type EstiloGaleria = "grid" | "carrusel" | "polaroid";
const ESTILOS_GALERIA: { id: EstiloGaleria; nombre: string; desc: string }[] = [
  { id: "grid", nombre: "Cuadrícula", desc: "Todas las fotos a la vista, en columnas (como hoy)" },
  { id: "carrusel", nombre: "Carrusel", desc: "Una fila que se desliza -- no crece en alto sin importar cuántas fotos tenga el álbum" },
  { id: "polaroid", nombre: "Polaroid 📸", desc: "Fotos instantáneas con marco blanco y rotación alternada, como pegadas en un álbum" }
];

// Mini-vista previa del estilo de galería -- mismo patrón CSS-puro que apertura/itinerario/
// portada, en los colores del tema activo (cada "foto" es un bloque sólido, no una imagen real).
const MiniPreviewGaleria = memo(({ estilo, tema }: { estilo: EstiloGaleria; tema: TemaConfig }) => {
  const c = tema.colors;
  const marco = { width: 56, height: 56 };
  const fotoFalsa = { background: `linear-gradient(145deg, ${c.secondary}, ${c.accent}99)` };
  if (estilo === "carrusel") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg flex items-center gap-1 p-1.5" style={{ ...marco, background: tema.bgGradient }}>
        <div className="rounded-sm shrink-0" style={{ width: 16, height: 36, ...fotoFalsa }} />
        <div className="rounded-sm shrink-0" style={{ width: 16, height: 36, ...fotoFalsa, opacity: 0.85 }} />
        <div className="rounded-sm shrink-0" style={{ width: 10, height: 36, ...fotoFalsa, opacity: 0.5 }} />
      </div>
    );
  }
  if (estilo === "polaroid") {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-lg flex items-center justify-center" style={{ ...marco, background: tema.bgGradient }}>
        <div className="absolute bg-white shadow-sm" style={{ width: 22, height: 26, transform: "rotate(-8deg)", padding: 2 }}>
          <div className="w-full" style={{ height: 16, ...fotoFalsa }} />
        </div>
        <div className="absolute bg-white shadow-sm" style={{ width: 22, height: 26, transform: "rotate(7deg) translateX(10px)", padding: 2 }}>
          <div className="w-full" style={{ height: 16, ...fotoFalsa }} />
        </div>
      </div>
    );
  }
  // grid
  return (
    <div className="relative shrink-0 overflow-hidden rounded-lg grid grid-cols-2 gap-1 p-1.5" style={{ ...marco, background: tema.bgGradient }}>
      <div className="rounded-sm" style={fotoFalsa} />
      <div className="rounded-sm" style={{ ...fotoFalsa, opacity: 0.85 }} />
      <div className="rounded-sm" style={{ ...fotoFalsa, opacity: 0.7 }} />
      <div className="rounded-sm" style={{ ...fotoFalsa, opacity: 0.55 }} />
    </div>
  );
});

// Panel visual "Formato de la Galería" -- antes botones de solo texto (pedido 2026-11-19:
// convertir al mismo patrón de tarjetas con mini-vista previa que apertura/itinerario/portada).
const SelectorEstiloGaleria = memo(({ tema, valorActual, onSelect }: {
  tema: TemaConfig;
  valorActual: EstiloGaleria;
  onSelect: (id: EstiloGaleria) => void;
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ESTILOS_GALERIA.map(e => {
        const isSelected = valorActual === e.id;
        return (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            className={`flex items-center gap-2.5 text-left p-2 rounded-xl border-2 transition cursor-pointer ${isSelected ? "border-pink-500 bg-pink-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <MiniPreviewGaleria estilo={e.id} tema={tema} />
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                {e.nombre}
                {isSelected && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-pink-600 text-white">✓ Elegido</span>}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">{e.desc}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

const ESTILOS_CUENTA: { id: "cajas" | "elegante" | "linea"; nombre: string; desc: string }[] = [
  { id: "cajas", nombre: "Cajas", desc: "4 cajas con fondo del tema (el diseño original)" },
  { id: "elegante", nombre: "Elegante", desc: "Sin cajas -- números grandes en la fuente de encabezado" },
  { id: "linea", nombre: "Línea", desc: "Una sola fila compacta en una pastilla translúcida -- ideal en temas oscuros" }
];

const PALETAS_ANIMACION: { id: string; nombre: string; simbolos: string[] }[] = [
  { id: "elegante", nombre: "Elegante ✨", simbolos: ["✨", "🌟", "🪙", "✨"] },
  { id: "floral", nombre: "Floral 🌸", simbolos: ["🌸", "🌹", "🍃", "💮"] },
  { id: "mariposas", nombre: "Mariposas 🦋", simbolos: ["🦋", "🌸", "✨", "💜"] },
  { id: "glam", nombre: "Glam 💖", simbolos: ["🎀", "💖", "🤍", "🌸"] },
  { id: "nocturno", nombre: "Nocturno 🌙", simbolos: ["⭐", "✨", "🌙", "🌌"] },
  { id: "boho", nombre: "Boho Natural 🍃", simbolos: ["🍃", "🍂", "🌾", "✨"] }
];

// Lista de toggles de secciones habilitadas/deshabilitadas, memoizada para no recalcularse
// cuando cambia un estado de la app no relacionado (ej. abrir un modal).
// Política de precios de "pases" por paquete (ver CLAUDE.md, sección "Pases personalizados").
// Premium (llave interna "deluxe") lo incluye sin costo extra; en Básico/Estándar es a la
// carte con su propio precio. Números separados del texto (2026-11-22, antes solo vivían
// embebidos en el string de abajo) para que el catálogo de "Complementos" de "Administrar
// cliente" los pueda sumar al precio_total -- una sola fuente, nunca puede desalinearse el
// monto mostrado aquí del que de verdad se cobra ahí.
const PRECIO_PASES_POR_PAQUETE: Record<"basico" | "premium" | "deluxe", number | null> = {
  basico: 150,
  premium: 180,
  deluxe: null, // incluido sin costo, no se ofrece como complemento
};
const POLITICA_PASES: Record<"basico" | "premium" | "deluxe", string> = {
  basico: `A la carte +$${PRECIO_PASES_POR_PAQUETE.basico} MXN`,
  premium: `A la carte +$${PRECIO_PASES_POR_PAQUETE.premium} MXN`,
  deluxe: "Incluido sin costo"
};

// Secciones exclusivas de Estándar/Premium (nombres mostrados; llaves internas siguen siendo
// "premium"/"deluxe", ver nota en data.ts) por política de negocio (ver "Business/pricing
// policy" en CLAUDE.md) -- en Básico existen en paquetes.basico.secciones (data.ts) y van
// apagadas por default (datosDefault.basico.seccionesExcluidas) solo para que el admin las
// pueda prender a mano si negoció una excepción puntual con el cliente, nunca por default.
// Corregido 2026-11-18 (rediseño de precios): "hashtag"/"calendario" bajaron a Básico (quedan
// incluidas por default ahí, ver datosDefault.basico) -- ya NO van en esta lista, solo quedan
// "familia"/"regalos" como exclusivas de Estándar en adelante. Antes esta lista seguía las 4
// originales, así que CAMBIAR el paquete de una invitación ya existente a Básico seguía
// apagando hashtag/calendario (inconsistente con lo que SÍ pasaba al crear una invitación
// Básico nueva, que ya las dejaba prendidas) -- hallazgo reportado por el usuario.
const SECCIONES_EXCLUSIVAS_PREMIUM = ["familia", "regalos"];

// Secciones cuyo estado prendido/apagado depende del paquete elegido (las exclusivas de
// Estándar/Premium de arriba, más "pases" vía POLITICA_PASES) -- agrupadas para poder recalcular
// su estado completo cada vez que se cambia de paquete (ver recalcularSeccionesPorPaquete).
const SECCIONES_CONDICIONADAS_POR_PAQUETE = [...SECCIONES_EXCLUSIVAS_PREMIUM, "pases"];

// De las secciones condicionadas arriba, cuáles NO vienen incluidas gratis en cada paquete --
// esas deben quedar apagadas por default hasta que el admin las prenda a mano porque el cliente
// la pagó aparte para ese nivel. Premium (llave interna "deluxe") no tiene ninguna: todo viene
// incluido sin costo.
function seccionesACartaPorPaquete(paqKey: "basico" | "premium" | "deluxe"): string[] {
  if (paqKey === "deluxe") return [];
  if (paqKey === "premium") return ["pases"];
  return SECCIONES_CONDICIONADAS_POR_PAQUETE;
}

// Recalcula seccionesExcluidas al cambiar de paquete: las secciones condicionadas (arriba) se
// resetean siempre a lo que corresponde al paquete nuevo -- incluidas gratis quedan prendidas,
// a la carte quedan apagadas -- sin importar cómo estaban antes del cambio. Si el admin las
// vuelve a prender después de elegir el paquete es porque el cliente las pagó aparte para ese
// nivel. El resto de seccionesExcluidas (secciones que no dependen del paquete, ej. que el
// admin apagó "Galería" a mano) se conserva intacto, nunca se toca aquí.
function recalcularSeccionesPorPaquete(excluidasActuales: string[] | undefined, paqKey: "basico" | "premium" | "deluxe"): string[] {
  const sinCondicionadas = (excluidasActuales || []).filter(s => !SECCIONES_CONDICIONADAS_POR_PAQUETE.includes(s));
  return Array.from(new Set([...sinCondicionadas, ...seccionesACartaPorPaquete(paqKey)]));
}

// Precio del complemento "Control de Acceso QR" (2026-08-02): plano, +$150 MXN sin importar
// el paquete -- a diferencia de pases, una vez construido el QR se genera solo junto con el
// resto del link (no hay trabajo manual extra por familia), así que no se escalona por
// paquete. Requiere que el cliente ya tenga pases activo -- sin una lista de familias no hay
// nada contra qué controlar el acceso.
const PRECIO_QR_ACCESO = 150;
const PRECIO_CONTROL_ACCESO_QR = `A la carte +$${PRECIO_QR_ACCESO} MXN`;

// Resto del catálogo de complementos à la carte (2026-11-22, ver "Business/pricing policy" en
// CLAUDE.md) -- números oficiales ya documentados ahí, ahora con una constante real para poder
// sumarlos al precio_total desde "Administrar cliente" → Complementos:
// - PDF de regalo: +$99, incluido sin costo solo en Premium (llave interna "deluxe").
// - Familia extra: +$20 cada una, por encima del tope de familias que ya trae cada paquete.
// - Sección suelta: +$99 cada una, solo ofrecible en Básico, para desbloquear una sección
//   exclusiva de Estándar/Premium (`SECCIONES_EXCLUSIVAS_PREMIUM`, ver abajo) una por una.
// - Ajustes extra: +$99 (mismo monto que un PDF o una sección suelta por coincidencia de
//   política de precios, pero es un concepto distinto -- una ronda de ajuste pagada fuera de
//   las 2 gratis de siempre, no desbloquea nada ni prende ningún flag).
const PRECIO_PDF_REGALO = 99;
const PRECIO_FAMILIA_EXTRA = 20;
const PRECIO_SECCION_SUELTA = 99;
const PRECIO_AJUSTES_EXTRA = 99;
// Nombre corto para mostrar cada sección ofrecible como "sección suelta" -- deliberadamente
// propio (no reusa NOMBRES_SECCIONES, que trae emoji pensado para la lista de toggles del
// editor) para que el renglón del catálogo de complementos se lea limpio.
const NOMBRE_CORTO_SECCION_SUELTA: Record<string, string> = {
  familia: "Padres y Padrinos",
  regalos: "Mesa de Regalos",
};

// Banco de mensajes predeterminados por cliente (pedido 2026-11-02: "mensajes predeterminados
// listos para WhatsApp... poderlos mandar desde acá"). Mismo patrón ya probado que
// handleEnviarFormularioDatos/handleCobrarAnticipo: cada uno abre api.whatsapp.com/send con
// el texto ya armado en el número guardado del cliente (row.telefono_whatsapp), el admin
// sigue teniendo que darle "Enviar" él mismo -- WhatsApp no deja mandarlo automático sin la
// API de Negocios de pago. `construir` regresa null cuando el mensaje no aplica para esa
// invitación en este momento (ej. recordatorio de saldo si ya no debe nada) -- en ese caso el
// botón no se muestra, en vez de dejar mandar un mensaje que no tiene sentido.
const MENSAJES_PREDETERMINADOS: { id: string; nombre: string; construir: (row: InvitacionGuardadaRow, falta: number) => string | null }[] = [
  {
    id: "lista_revisar",
    nombre: "✨ Invitación lista para revisar",
    construir: (row) => `¡Hola! 🌸 Ya está lista la vista previa de la invitación de XV Años de *${row.nombre_quinceanera || "tu evento"}*. Échale un ojo cuando puedas y me dices si quieres algún ajuste.`
  },
  {
    id: "saldo_pendiente",
    nombre: "💳 Recordatorio de saldo pendiente",
    construir: (row, falta) => falta > 0
      ? `¡Hola! 🌸 Solo para recordarte que tu invitación de XV Años de *${row.nombre_quinceanera || "tu evento"}* tiene un saldo pendiente de $${falta.toLocaleString("es-MX")} MXN. Cuando gustes me confirmas para seguir avanzando. ¡Gracias!`
      : null
  },
  {
    id: "faltan_datos",
    nombre: "📋 Recordatorio: faltan datos o fotos",
    construir: (row) => `¡Hola! 🌸 Para terminar tu invitación de *${row.nombre_quinceanera || "tu evento"}* todavía me faltan algunos datos o fotos. Cuando tengas chance los subes o me los pasas por aquí. ¡Gracias!`
  },
  {
    id: "evento_proximo",
    nombre: "🎉 Recordatorio: se acerca el evento",
    construir: (row) => row.fecha_fiesta
      ? `¡Hola! 🌸 Ya se acerca la fiesta de XV Años de *${row.nombre_quinceanera || "tu evento"}* (${new Date(row.fecha_fiesta + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" })}). Cualquier cambio de último momento en tu invitación, avísame con tiempo para actualizarla.`
      : null
  },
  {
    id: "agradecimiento",
    nombre: "🌸 Agradecimiento post-evento",
    construir: (row) => `¡Hola! 🌸 Esperamos que la fiesta de XV Años de *${row.nombre_quinceanera || "tu evento"}* haya sido un éxito. Fue un gusto ayudarte con tu invitación -- ¡gracias por tu confianza!`
  }
];

const SeccionesToggleList = memo(({ secciones, seccionesExcluidas, onToggle, onMover, paquete }: {
  secciones: string[];
  seccionesExcluidas: string[];
  onToggle: (secName: string) => void;
  onMover: (secName: string, direccion: 1 | -1) => void;
  paquete: "basico" | "premium" | "deluxe";
}) => {
  // "apertura" y "cierre" quedan fijas al inicio/final: no muestran flechas de reordenar.
  const movibles = secciones.filter(s => s !== "apertura" && s !== "cierre");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {secciones.map(secName => {
        const isExcluded = seccionesExcluidas?.includes(secName);
        const isEnabled = !isExcluded;
        const label = NOMBRES_SECCIONES[secName] || secName;
        const esMovible = secName !== "apertura" && secName !== "cierre";
        const idxMovible = movibles.indexOf(secName);
        return (
          <div
            key={secName}
            onClick={() => onToggle(secName)}
            className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none ${isEnabled ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50' : 'bg-slate-100/50 border-slate-200 opacity-60 hover:bg-slate-100'}`}
          >
            <span className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className={`text-[11px] font-bold ${isEnabled ? 'text-emerald-900' : 'text-slate-500'}`}>
                {label}
              </span>
              {secName === "pases" && (
                <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${paquete === "deluxe" ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-700"}`}>
                  {POLITICA_PASES[paquete]}
                </span>
              )}
              {paquete === "basico" && SECCIONES_EXCLUSIVAS_PREMIUM.includes(secName) && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap bg-amber-100 text-amber-700">
                  Exclusiva Estándar/Premium
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {esMovible && (
                <div className="flex items-center gap-0.5 mr-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMover(secName, -1); }}
                    disabled={idxMovible <= 0}
                    className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-white disabled:opacity-25 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition"
                    title="Mover arriba"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMover(secName, 1); }}
                    disabled={idxMovible === -1 || idxMovible >= movibles.length - 1}
                    className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-white disabled:opacity-25 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition"
                    title="Mover abajo"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              )}
              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {isEnabled ? "ON" : "OFF"}
              </span>
              <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transform duration-200 ease-in-out ${isEnabled ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

// Grid de selección de tema, memoizado por la misma razón que SeccionesToggleList.
const TemasGrid = memo(({ selectedTemaId, onSelect }: {
  selectedTemaId: string;
  onSelect: (temaId: string) => void;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="temas-grid">
      {temas.map((t) => {
        const isSelected = selectedTemaId === t.id;
        const isDarkTheme = t.id === "celestial" || t.id === "princesa-elegante" || t.id === "neon" || t.id === "aurora-boreal";
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer h-24 ${isSelected ? 'border-indigo-600 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'}`}
            style={{
              borderLeft: `4px solid ${t.colors.primary}`
            }}
          >
            <div className="w-full flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-800 block truncate">{t.nombre}</span>
              {isDarkTheme && (
                <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 rounded font-semibold">Noche</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-2 overflow-hidden w-full">
              <span className="text-xs text-slate-500 truncate">Fuente: {t.fontHeading}</span>
            </div>

            <div className="flex gap-1.5 mt-2">
              <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: t.colors.primary }}></span>
              <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: t.colors.accent }}></span>
              <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: t.colors.light }}></span>
              <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: t.colors.dark }}></span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

// Declarar tipo global para Supabase
declare global {
  interface Window {
    supabaseClient?: any;
  }
}

// Sube una imagen a Cloudinary sin depender de ningún estado del componente App -- la usan
// tanto el editor del admin como IntakeForm (formulario público sin sesión de cliente).
// Reintenta hasta 3 veces en total con espera creciente (1s, 2s) antes de rendirse: en
// conexiones móviles inestables (el caso típico del cliente subiendo fotos desde el celular)
// una subida que falla por un corte momentáneo casi siempre funciona al reintentarla, y antes
// esto obligaba al usuario a notar el error y darle "subir" de nuevo a mano.
const subirImagenPublica = async (file: File): Promise<string> => {
  const cloudName = "dswrrm5u1";
  const uploadPreset = "invitaciones-xv";
  const intentosTotales = 3;
  let ultimoError = new Error("Ocurrió un error al subir la imagen.");
  for (let intento = 1; intento <= intentosTotales; intento++) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || "Ocurrió un error al subir la imagen.");
      }
      const resData = await response.json();
      return resData.secure_url;
    } catch (err: any) {
      ultimoError = err instanceof Error ? err : new Error("Ocurrió un error al subir la imagen.");
      if (intento < intentosTotales) {
        await new Promise(resolve => setTimeout(resolve, 1000 * intento));
      }
    }
  }
  throw ultimoError;
};

// Avisa al admin por Telegram (mejor esfuerzo, nunca bloquea el flujo del cliente) cuando pasa
// algo que antes solo se veía si el admin abría "Mis Invitaciones" a revisar manualmente: un
// RSVP, un aviso de pago, o que el cliente llenó su formulario de datos. El endpoint vive en
// api/notify-telegram.ts y no hace nada si el admin no configuró el bot en Vercel.
const notificarAdminTelegram = (mensaje: string) => {
  fetch("/api/notify-telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje })
  }).catch(() => {});
};

// Secciones de contenido que este formulario le pregunta al cliente Y que puede apagar a su
// gusto (pedido 2026-11-02: "que lleve todo pero si no quiere padrinos que no active esa
// casilla"). Deben coincidir exactamente con las claves que entiende isSectionActive() en
// templates.ts -- cualquier sección nueva que se agregue aquí con un campo propio debe
// agregarse también a esta lista para que el apagado real funcione. Secciones que YA se
// ocultan solas cuando están vacías (galeria sin fotos, hashtag sin texto) no necesitan
// aparecer aquí -- un toggle sería redundante. "pases" queda fuera a propósito: ese lo
// administra el admin desde "Lista Pases", este formulario no toca la lista de invitados.
const SECCIONES_INTAKE_TOGGLEABLES = ["mensaje", "ceremonia", "recepcion", "itinerario", "vestimenta", "familia", "regalos"];

// Switch chico reutilizado por cada sección opcional del formulario público -- mismo patrón
// visual que SeccionesToggleList del editor, para que un cliente que también haya visto la
// demo del catálogo reconozca el control. `colorAcento` (2026-11-22): antes siempre era la
// píldora verde esmeralda fija -- ahora el estado "Incluida" se pinta con el acento del tema de
// la invitación de esta clienta (el "No incluida" se queda neutro a propósito, para que la
// función -- prendido/apagado -- se siga leyendo igual sin importar el tema).
function IntakeSeccionToggle({ activa, onToggle, colorAcento }: { activa: boolean; onToggle: () => void; colorAcento: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 flex items-center gap-1.5 cursor-pointer select-none"
      title={activa ? "Quitar esta sección de tu invitación" : "Incluir esta sección en tu invitación"}
    >
      <span
        className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
        style={activa ? { background: `${colorAcento}22`, color: colorAcento } : { background: "#E2E8F0", color: "#64748B" }}
      >
        {activa ? "Incluida" : "No incluida"}
      </span>
      <div className="w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out" style={{ background: activa ? colorAcento : "#CBD5E1" }}>
        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transform duration-200 ease-in-out ${activa ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
      </div>
    </button>
  );
}

// Formulario público (sin login) para que el cliente capture sus propios datos y fotos, en vez
// de que el admin tenga que escribirlo todo a mano. Se accede por ?intake=1&iid=<id de la fila
// en la tabla `invitaciones`> -- el middleware.ts del proyecto deja pasar este modo sin pedir la
// contraseña del editor. Lee y escribe DIRECTO esa fila de Supabase (no pasa por el blob `d` de
// URL como el resto de los modos), por eso el link puede ser cortito.
function IntakeForm({ invitacionId }: { invitacionId: string | null }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState<string | null>(null);
  const [nombreQuinceanera, setNombreQuinceanera] = useState("");
  // Tipo de evento de esta invitación (2026-11-19) -- solo se usa aquí para adaptar la frase
  // de "Copiar recordatorio" de abajo; el resto del formulario de intake no depende del tipo.
  const [tipoEventoCliente, setTipoEventoCliente] = useState<TipoEvento>("xv");
  const [maxFotos, setMaxFotos] = useState(4);
  // Secciones que SÍ vienen en el paquete/à la carte que compró (fijo, el cliente no puede
  // activar algo que no pagó) y, dentro de esas, cuáles decidió apagar él mismo -- pedido
  // 2026-11-02: que el formulario sea "personalizado de acuerdo al paquete que elija... que
  // al final lleve todo lo que compró, pero si no quiere alguna sección que no la active".
  const [seccionesDisponibles, setSeccionesDisponibles] = useState<string[]>([]);
  const [seccionesExcluidasCliente, setSeccionesExcluidasCliente] = useState<string[]>([]);
  // Resumen de confirmaciones (RSVP) de SUS invitados -- de solo lectura, para que el cliente
  // pueda ver quién ya confirmó sin depender de llevar la cuenta a mano leyendo WhatsApps
  // sueltos. Se recarga cada vez que abre este mismo link.
  const [confirmaciones, setConfirmaciones] = useState<ConfirmacionRSVP[] | null>(null);
  // Estatus del pedido y avance de pago -- de solo lectura, así el cliente sabe en qué va su
  // invitación y cuánto lleva pagado sin tener que preguntarte por WhatsApp.
  const [pedidoInfo, setPedidoInfo] = useState<{ estado: string | null; precioTotal: number | null; precioPagado: number | null } | null>(null);
  // Aviso de pago del cliente: le permite decir "ya pagué" y subir su comprobante, sin tener
  // que escribirle al admin por WhatsApp. El admin lo revisa y decide si lo registra como
  // abono real -- esto NO actualiza precio_pagado directamente.
  const [mostrarFormPago, setMostrarFormPago] = useState(false);
  const [montoAvisoPago, setMontoAvisoPago] = useState("");
  const [notaAvisoPago, setNotaAvisoPago] = useState("");
  const [comprobantePagoUrl, setComprobantePagoUrl] = useState("");
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [avisoPagoEnviado, setAvisoPagoEnviado] = useState(false);
  const [enviandoAvisoPago, setEnviandoAvisoPago] = useState(false);
  // Invitados con pases asignados (solo lectura aquí -- esa lista la administra el admin,
  // no este formulario) -- se usa para saber quién de la lista de pases todavía no ha
  // confirmado por RSVP, y poder copiarle un recordatorio.
  const [invitadosAsignados, setInvitadosAsignados] = useState<{ nombre: string; pases: number }[]>([]);
  // Conteo de aperturas, visible para la clienta SOLO en el paquete Premium (llave interna
  // "deluxe") -- pedido 2026-11-19. null = no se muestra nada (paquete sin este beneficio, o la
  // consulta falló/la tabla "aperturas" no existe todavía) -- a diferencia del panel admin, aquí
  // NUNCA se le muestra un "—" ni ningún error a la clienta, se oculta la línea en silencio.
  const [aperturasCliente, setAperturasCliente] = useState<number | null>(null);

  // El formulario se viste con el tema de ESTA invitación (2026-11-22) -- mismas definiciones
  // de colores/tipografía/fondo que usa `generarHTMLFinal` para la invitación real del
  // invitado, vía `resolverTemaEfectivo` (aplica también los overrides de "A Medida" si esta
  // invitación los trae). "dorado-clasico" es el respaldo cuando la invitación no tiene tema
  // guardado todavía (invitación muy vieja) o el id no coincide con ninguno del catálogo --
  // "crema y dorado genérico de InvitaMX", el respaldo elegante neutro pedido, nunca el gris
  // administrativo de antes. Se queda en el respaldo mientras `cargando` es true -- no hay
  // pantalla themeada hasta que el tema real ya se conoce.
  const temaRespaldo = temas.find(t => t.id === "dorado-clasico") || temas[0];
  const [temaCliente, setTemaCliente] = useState<TemaConfig>(temaRespaldo);
  // Foto de fondo propia de esta invitación para SU tema (si el admin le subió una) -- misma
  // fuente que usa el fondo de la invitación real (`datos.bgImages[tema.id]` en templates.ts).
  const [bgImageCliente, setBgImageCliente] = useState<string | null>(null);

  const [form, setForm] = useState({
    fecha: "",
    mensajeBienvenida: "",
    ceremoniaLugar: "", ceremoniaHora: "", ceremoniaDireccion: "", ceremoniaMaps: "",
    recepcionLugar: "", recepcionHora: "", recepcionDireccion: "", recepcionMaps: "",
    itinerario: [] as { hora: string; evento: string }[],
    dressCode: "",
    padres: ["", ""] as string[],
    padrinos: [] as string[],
    mesaRegalos: "",
    datosBancarios: "",
    hashtag: "",
    cancion: "",
    fotoPortada: "",
    fotos: [] as string[]
  });

  useEffect(() => {
    const cargar = async () => {
      if (!invitacionId || !window.supabaseClient) {
        setError("Este link no es válido.");
        setCargando(false);
        return;
      }
      try {
        const { data, error: err } = await window.supabaseClient
          .from("invitaciones")
          .select("nombre_quinceanera, datos_completos, estado, precio_total, precio_pagado, bloqueada, pausada")
          .eq("id", invitacionId)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          setError("No encontramos tu invitación. Pídele el link correcto a quien te lo compartió.");
          setCargando(false);
          return;
        }
        // Pausa manual por falta de pago (2026-11-22) -- va primero, antes incluso de
        // `bloqueada`: mientras esté pausada, el formulario no debe mostrar ningún dato.
        if (data.pausada) {
          setError("Esta invitación está en pausa.");
          setCargando(false);
          return;
        }
        if (data.bloqueada) {
          setError("Este formulario ya no está disponible. Contacta a quien te compartió este link para más información.");
          setCargando(false);
          return;
        }
        setNombreQuinceanera(data.nombre_quinceanera || "");
        setPedidoInfo({ estado: data.estado || null, precioTotal: data.precio_total ?? null, precioPagado: data.precio_pagado ?? null });
        const dc: Partial<InvitacionDatos> = data.datos_completos || {};
        setTipoEventoCliente((dc.tipoEvento && TEXTOS_POR_EVENTO[dc.tipoEvento]) ? dc.tipoEvento : "xv");
        // Tema de ESTA invitación (ver comentario de `temaCliente` arriba) -- se resuelve con
        // la misma función que usa la invitación real del invitado, para que el formulario se
        // vista exactamente igual (colores/tipografía, y los overrides de "A Medida" si los
        // trae esta invitación en particular).
        const temaBase = temas.find(t => t.id === dc.tema) || temaRespaldo;
        setTemaCliente(resolverTemaEfectivo(dc as InvitacionDatos, temaBase));
        setBgImageCliente((dc.bgImages && dc.bgImages[temaBase.id]) || null);
        const paqueteDelCliente = (dc.paquete as "basico" | "premium" | "deluxe") || "basico";
        setMaxFotos(paquetes[paqueteDelCliente]?.maxFotos || 4);
        setSeccionesDisponibles(paquetes[paqueteDelCliente]?.secciones || []);
        if (paqueteDelCliente === "deluxe") {
          // Try/catch propio, aparte del de todo `cargar()`: si esto falla (tabla "aperturas"
          // sin crear todavía, sin red, etc.) nunca debe tumbar la carga del resto del
          // formulario ni mostrarle nada a la clienta -- se queda simplemente sin esa línea.
          try {
            const { count, error: errAperturas } = await window.supabaseClient
              .from("aperturas")
              .select("id", { count: "exact", head: true })
              .eq("invitacion_id", invitacionId);
            if (!errAperturas) setAperturasCliente(count ?? 0);
          } catch { /* se queda en null, la línea simplemente no aparece */ }
        }
        // Lo que ya venía excluido (ej. "pases" si no lo compró a la carte) no se toca aquí --
        // handleEnviar lo preserva aparte. Esto solo rescata, de las secciones que SÍ puede
        // tocar este formulario, cuáles había apagado él mismo en una visita anterior.
        setSeccionesExcluidasCliente((dc.seccionesExcluidas || []).filter(s => SECCIONES_INTAKE_TOGGLEABLES.includes(s)));
        setInvitadosAsignados(dc.invitados || []);
        setForm(prev => ({
          ...prev,
          fecha: dc.fecha || "",
          mensajeBienvenida: dc.mensajeBienvenida || "",
          ceremoniaLugar: dc.ceremonia?.lugar || "",
          ceremoniaHora: dc.ceremonia?.hora || "",
          ceremoniaDireccion: dc.ceremonia?.direccion || "",
          ceremoniaMaps: dc.ceremonia?.maps || "",
          recepcionLugar: dc.recepcion?.lugar || "",
          recepcionHora: dc.recepcion?.hora || "",
          recepcionDireccion: dc.recepcion?.direccion || "",
          recepcionMaps: dc.recepcion?.maps || "",
          itinerario: dc.itinerario?.length ? dc.itinerario : [],
          dressCode: dc.dressCode || "",
          padres: dc.padres?.length ? dc.padres : ["", ""],
          padrinos: dc.padrinos || [],
          mesaRegalos: dc.mesaRegalos || "",
          datosBancarios: dc.datosBancarios || "",
          hashtag: dc.hashtag || "",
          cancion: dc.cancion || "",
          fotoPortada: dc.fotoPortada || "",
          fotos: dc.fotos || []
        }));
      } catch (e: any) {
        setError("Ocurrió un error al cargar tu invitación: " + e.message);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [invitacionId]);

  useEffect(() => {
    const cargarConfirmaciones = async () => {
      if (!invitacionId || !window.supabaseClient) return;
      const { data, error: err } = await window.supabaseClient
        .from("confirmaciones")
        .select("id, nombre_invitado, asistencia, num_personas, creado_en")
        .eq("invitacion_id", invitacionId)
        .order("creado_en", { ascending: false });
      if (!err) setConfirmaciones((data || []) as ConfirmacionRSVP[]);
    };
    cargarConfirmaciones();
  }, [invitacionId]);

  // Las fuentes del tema (Google Fonts) se piden dinámicamente cuando ya se conoce el tema real
  // de esta invitación -- misma URL/familias que ya pide `generarHTMLFinal` (construirUrlGoogleFonts),
  // así el formulario usa EXACTAMENTE la misma tipografía que la invitación real, sin duplicar
  // la lista de familias. Un <link> fijo por id, reemplazado si el tema cambia (nunca debería
  // pasar dentro de la misma carga de este formulario, pero cubre el caso por si acaso).
  useEffect(() => {
    const idLink = "intake-google-fonts";
    let link = document.getElementById(idLink) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = idLink;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = construirUrlGoogleFonts(temaCliente);
    // El <link> se deja en document.head al desmontar (es un recurso compartido, no hay nada
    // que limpiar que vaya a chocar con otra pantalla -- las demás rutas de esta app no usan
    // este mismo id).
  }, [temaCliente]);

  const actualizar = (campo: keyof typeof form, valor: any) => setForm(prev => ({ ...prev, [campo]: valor }));

  // Una sección solo se pregunta si de verdad viene en lo que compró (paquete + à la carte) --
  // nunca se le muestra al cliente un campo de algo que no pagó.
  const seccionDisponible = (sec: string) => seccionesDisponibles.includes(sec);
  const seccionActivaParaCliente = (sec: string) => !seccionesExcluidasCliente.includes(sec);
  const toggleSeccionCliente = (sec: string) =>
    setSeccionesExcluidasCliente(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);

  const agregarItinerario = () => actualizar("itinerario", [...form.itinerario, { hora: "", evento: "" }]);
  const quitarItinerario = (i: number) => actualizar("itinerario", form.itinerario.filter((_, idx) => idx !== i));
  const actualizarItinerario = (i: number, campo: "hora" | "evento", valor: string) =>
    actualizar("itinerario", form.itinerario.map((item, idx) => idx === i ? { ...item, [campo]: valor } : item));

  const agregarPadrino = () => actualizar("padrinos", [...form.padrinos, ""]);
  const quitarPadrino = (i: number) => actualizar("padrinos", form.padrinos.filter((_, idx) => idx !== i));
  const actualizarPadrino = (i: number, valor: string) =>
    actualizar("padrinos", form.padrinos.map((p, idx) => idx === i ? valor : p));

  const handleSubirPortada = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoFoto("portada");
    try {
      const url = await subirImagenPublica(file);
      actualizar("fotoPortada", url);
    } catch (err: any) {
      setError("Error al subir la foto de portada: " + err.message);
    } finally {
      setSubiendoFoto(null);
    }
  };

  const handleSubirGaleria = async (e: ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSubiendoFoto("galeria");
    try {
      const espacioDisponible = maxFotos - form.fotos.length;
      const aSubir = files.slice(0, Math.max(espacioDisponible, 0));
      const urls: string[] = [];
      for (const file of aSubir) {
        urls.push(await subirImagenPublica(file));
      }
      actualizar("fotos", [...form.fotos, ...urls]);
    } catch (err: any) {
      setError("Error al subir fotos: " + err.message);
    } finally {
      setSubiendoFoto(null);
    }
  };

  const handleSubirComprobante = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoComprobante(true);
    try {
      const url = await subirImagenPublica(file);
      setComprobantePagoUrl(url);
    } catch (err: any) {
      setError("Error al subir el comprobante: " + err.message);
    } finally {
      setSubiendoComprobante(false);
    }
  };

  const handleEnviarAvisoPago = async () => {
    if (!invitacionId || !window.supabaseClient) return;
    if (!montoAvisoPago && !comprobantePagoUrl) {
      setError("Ingresa el monto que pagaste o sube tu comprobante.");
      return;
    }
    setEnviandoAvisoPago(true);
    setError(null);
    try {
      const { error: errInsert } = await window.supabaseClient.from("avisos_pago").insert([{
        invitacion_id: invitacionId,
        monto: montoAvisoPago ? Number(montoAvisoPago) : null,
        comprobante_url: comprobantePagoUrl || null,
        nota: notaAvisoPago.trim() || null
      }]);
      if (errInsert) throw errInsert;
      setAvisoPagoEnviado(true);
      setMostrarFormPago(false);
      const montoTxt = montoAvisoPago ? `$${Number(montoAvisoPago).toLocaleString("es-MX")} MXN` : "un pago (sin monto especificado)";
      notificarAdminTelegram(`💵 ${nombreQuinceanera || "Un cliente"} avisó que pagó ${montoTxt}.`);
    } catch (err: any) {
      setError("No se pudo enviar tu aviso de pago: " + err.message);
    } finally {
      setEnviandoAvisoPago(false);
    }
  };

  const handleEnviar = async () => {
    if (!invitacionId || !window.supabaseClient) return;
    setEnviando(true);
    setError(null);
    // Se limpia la confirmación de un guardado anterior mientras este nuevo guardado está en
    // vuelo -- si falla, el aviso de error (ver abajo) la sustituye; si tiene éxito, vuelve a
    // aparecer con los datos ya actualizados.
    setEnviado(false);
    try {
      const { data: actual, error: errLectura } = await window.supabaseClient
        .from("invitaciones")
        .select("datos_completos")
        .eq("id", invitacionId)
        .maybeSingle();
      if (errLectura) throw errLectura;
      const base: Partial<InvitacionDatos> = actual?.datos_completos || {};
      // El cliente solo manda (o apaga) las secciones que SÍ vienen en lo que compró -- lo
      // que el admin ya tenía excluido por otra razón (ej. "pases" si no lo pagó a la carte)
      // se conserva intacto. Así, en cuanto el admin reabra esta invitación en el editor, el
      // toggle de cada sección (SeccionesToggleList, pestaña "Tema/Paquete") ya refleja
      // exactamente lo que el cliente decidió -- paquete contratado aparte.
      const seccionesNoGestionadasPorElCliente = (base.seccionesExcluidas || []).filter(
        s => !SECCIONES_INTAKE_TOGGLEABLES.includes(s)
      );
      const seccionesExcluidasFinal = [
        ...seccionesNoGestionadasPorElCliente,
        ...seccionesExcluidasCliente.filter(s => seccionesDisponibles.includes(s))
      ];
      const actualizado: Partial<InvitacionDatos> = {
        ...base,
        fecha: form.fecha,
        mensajeBienvenida: form.mensajeBienvenida,
        ceremonia: { lugar: form.ceremoniaLugar, hora: form.ceremoniaHora, direccion: form.ceremoniaDireccion, maps: form.ceremoniaMaps },
        recepcion: { lugar: form.recepcionLugar, hora: form.recepcionHora, direccion: form.recepcionDireccion, maps: form.recepcionMaps },
        itinerario: form.itinerario.filter(i => i.hora || i.evento),
        dressCode: form.dressCode,
        padres: form.padres.filter(p => p.trim()),
        padrinos: form.padrinos.filter(p => p.trim()),
        mesaRegalos: form.mesaRegalos,
        datosBancarios: form.datosBancarios,
        hashtag: form.hashtag,
        cancion: form.cancion,
        fotoPortada: form.fotoPortada,
        fotos: form.fotos,
        seccionesExcluidas: seccionesExcluidasFinal
      };
      const { error: errUpdate } = await window.supabaseClient
        .from("invitaciones")
        .update({
          datos_completos: actualizado,
          fecha_fiesta: form.fecha ? form.fecha.substring(0, 10) : null,
          foto_portada_url: form.fotoPortada || "",
          foto_galeria_urls: form.fotos,
          // Marca cuándo fue la última vez que EL CLIENTE (no el admin) guardó desde este
          // formulario, para que en "Mis Invitaciones" se vea claramente que ya respondió.
          intake_actualizado_en: new Date().toISOString()
        })
        .eq("id", invitacionId);
      if (errUpdate) throw errUpdate;
      setEnviado(true);
      notificarAdminTelegram(`📋 ${nombreQuinceanera || "Un cliente"} llenó su formulario de datos y fotos.`);
    } catch (e: any) {
      setError("No se pudo guardar tu información: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  // `t` = tema efectivo de esta invitación (ver `temaCliente`/`bgImageCliente` arriba) -- todo
  // el estilo de aquí en adelante sale de sus campos, nunca de clases de color fijas.
  const t = temaCliente;
  const inputClass = "intake-input w-full px-3 py-2.5 rounded-lg text-sm outline-none transition";
  const labelClass = "intake-label block text-xs font-semibold mb-1";
  const tituloSeccionClass = "intake-heading text-xs font-extrabold uppercase tracking-wide";
  const dividerClass = "border-t pt-4 intake-divider";

  // Fecha ya guardada, en el encabezado ("Sábado 22 de mayo de 2027") -- misma fuente
  // (`form.fecha`) que el campo de abajo, solo formateada para lectura.
  let fechaBonitaHeader = "";
  if (form.fecha) {
    try {
      const d = new Date(form.fecha);
      if (!isNaN(d.getTime())) {
        const txt = d.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        fechaBonitaHeader = txt.charAt(0).toUpperCase() + txt.slice(1);
      }
    } catch { /* fecha incompleta todavía, sin subtítulo -- no es un error */ }
  }

  if (cargando) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
        <p className="text-xs text-slate-500 font-medium font-sans">Cargando tu formulario...</p>
      </div>
    );
  }

  if (error && !nombreQuinceanera) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 px-6 text-center gap-2">
        <span className="text-4xl mb-2">🌸</span>
        <p className="text-sm font-semibold text-slate-700">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-6 px-4 pb-28 sm:pb-6"
      style={bgImageCliente
        ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${bgImageCliente}')`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }
        : { background: t.bgGradient }}
    >
      {/* Estilos derivados del tema -- mismo patrón que `tema.customStyle` en templates.ts,
          pero scoped a clases propias de este formulario (intake-*) para no chocar con nada
          del resto de la app. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .intake-heading { font-family: '${t.fontHeading}', serif; color: ${t.colors.accent}; }
        .intake-label { color: ${t.textDark}; opacity: 0.82; }
        .intake-divider { border-color: ${t.colors.border}; }
        .intake-input { font-family: '${t.fontBody}', sans-serif; background: #FFFFFF; border: 1px solid ${t.colors.border}; color: ${t.textDark}; }
        .intake-input:focus { border-color: ${t.colors.accent}; box-shadow: 0 0 0 3px ${t.colors.accent}26; }
        .intake-dropzone { border: 2px dashed ${t.colors.border}; color: ${t.colors.accent}; font-family: '${t.fontBody}', sans-serif; }
        .intake-dropzone:hover { background: ${t.colors.light}; }
        .intake-btn-accent { background: ${t.colors.accent}; color: ${t.textLight}; font-family: '${t.fontBody}', sans-serif; }
        .intake-btn-accent:hover:not(:disabled) { filter: brightness(0.93); }
        .intake-btn-accent:disabled { opacity: 0.5; cursor: default; }
        .intake-link-accent { color: ${t.colors.accent}; }
        .intake-link-accent:hover { opacity: 0.8; }
      ` }} />

      <div
        className="max-w-xl mx-auto rounded-3xl p-6"
        style={{ background: t.colors.light, border: `1px solid ${t.colors.border}`, boxShadow: "0 25px 50px rgba(0,0,0,0.18)", fontFamily: `'${t.fontBody}', sans-serif`, color: t.textDark }}
      >
        <div className="text-center mb-5">
          <h1 className="intake-heading text-2xl font-bold" style={{ letterSpacing: "0.02em" }}>
            {TEXTOS_POR_EVENTO[tipoEventoCliente].prefijoTitulo} {nombreQuinceanera}
          </h1>
          {fechaBonitaHeader && (
            <p className="text-xs mt-1" style={{ color: t.textDark, opacity: 0.75 }}>{fechaBonitaHeader}</p>
          )}
          <div className="flex items-center justify-center gap-2 my-3" aria-hidden="true">
            <span style={{ height: 1, width: 44, background: t.colors.border }} />
            <span style={{ color: t.colors.accent, fontSize: 14 }}>{t.decorativeEmoji}</span>
            <span style={{ height: 1, width: 44, background: t.colors.border }} />
          </div>
          <p className="text-xs" style={{ opacity: 0.85 }}>Hola{nombreQuinceanera ? `, ${nombreQuinceanera}` : ""} — llena lo que tengas listo y súbelo. Puedes volver a este mismo link después si te falta algo.</p>
          <p className="text-[11px] rounded-lg px-2.5 py-2 mt-3 text-left" style={{ background: `${t.colors.accent}14`, border: `1px solid ${t.colors.border}`, color: t.textDark }}>
            💡 Cada sección trae un interruptor <span className="font-bold">Incluida / No incluida</span>. Todas las que ves aquí vienen en lo que compraste — si alguna no te interesa (ej. no quieres poner padrinos), apágala y tu invitación final no la va a mostrar.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-[11px] text-rose-700 font-semibold">{error}</div>
        )}

        {enviado && (
          <div className="mb-4 p-3 rounded-xl text-[12px] font-semibold text-center" style={{ background: `${t.colors.accent}14`, border: `1px solid ${t.colors.accent}`, color: t.colors.accent }}>
            ¡Listo! Tu información quedó guardada. Puedes cerrar esta página o seguir editando cuando quieras con este mismo link.
          </div>
        )}

        {pedidoInfo && (pedidoInfo.estado || pedidoInfo.precioTotal) && (() => {
          const estatusLabel = ESTATUS_PEDIDO.find(e => e.id === (pedidoInfo.estado || "cotizacion"))?.label || "🗨️ Cotización";
          const falta = pedidoInfo.precioTotal != null ? pedidoInfo.precioTotal - (pedidoInfo.precioPagado || 0) : null;
          return (
            <div className="mb-6 p-4 rounded-2xl" style={{ background: `${t.colors.accent}10`, border: `1px solid ${t.colors.border}` }}>
              <h3 className={tituloSeccionClass + " mb-1"}>Estado de tu invitación</h3>
              <p className="text-[13px] font-bold mb-1" style={{ color: t.textDark }}>{estatusLabel}</p>
              {pedidoInfo.precioTotal != null && (
                <p className="text-[11px] mb-2" style={{ color: t.textDark, opacity: 0.8 }}>
                  Pagado: ${(pedidoInfo.precioPagado || 0).toLocaleString("es-MX")} de ${pedidoInfo.precioTotal.toLocaleString("es-MX")} MXN
                  {falta && falta > 0 ? ` · Falta: $${falta.toLocaleString("es-MX")} MXN` : " · ✅ Pagado por completo"}
                </p>
              )}

              {avisoPagoEnviado ? (
                <p className="text-[11px] font-bold rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${t.colors.border}`, color: t.textDark }}>✅ ¡Gracias! Ya recibimos tu aviso de pago, lo vamos a revisar.</p>
              ) : !mostrarFormPago ? (
                <button
                  onClick={() => setMostrarFormPago(true)}
                  className="intake-link-accent text-[11px] font-bold underline"
                >
                  💳 Ya pagué, avisar
                </button>
              ) : (
                <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${t.colors.border}` }}>
                  <input
                    type="number"
                    placeholder="¿Cuánto pagaste? (opcional)"
                    value={montoAvisoPago}
                    onChange={(e) => setMontoAvisoPago(e.target.value)}
                    className="intake-input w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Nota (opcional, ej. 'Pagué por transferencia')"
                    value={notaAvisoPago}
                    onChange={(e) => setNotaAvisoPago(e.target.value)}
                    className="intake-input w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                  />
                  {comprobantePagoUrl ? (
                    <img src={comprobantePagoUrl} alt="Comprobante" className="h-24 rounded-lg" style={{ border: `1px solid ${t.colors.border}` }} referrerPolicy="no-referrer" />
                  ) : (
                    <label className="intake-dropzone flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition">
                      <span className="text-[11px] font-bold">{subiendoComprobante ? "Subiendo..." : "📎 Subir foto de tu comprobante (opcional)"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleSubirComprobante} disabled={subiendoComprobante} />
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMostrarFormPago(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEnviarAvisoPago}
                      disabled={enviandoAvisoPago || subiendoComprobante}
                      className="intake-btn-accent flex-1 px-3 py-1.5 text-[11px] font-bold rounded-lg transition"
                    >
                      {enviandoAvisoPago ? "Enviando..." : "Enviar aviso de pago"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {aperturasCliente !== null && (
          <div className="mb-6 p-4 rounded-2xl" style={{ background: `${t.colors.accent}10`, border: `1px solid ${t.colors.border}` }}>
            <p className="text-[13px] font-bold" style={{ color: t.textDark }}>
              📊 Tu invitación se ha abierto <span style={{ color: t.colors.accent }}>{aperturasCliente}</span> {aperturasCliente === 1 ? "vez" : "veces"}
            </p>
          </div>
        )}

        {confirmaciones !== null && (confirmaciones.length > 0 || invitadosAsignados.length > 0) && (() => {
          const siConfirman = confirmaciones.filter(c => c.asistencia === "si");
          const totalPersonas = siConfirman.reduce((acc, c) => acc + (c.num_personas || 1), 0);
          // Reconciliación aproximada por nombre (coincidencia exacta, sin mayúsculas/espacios):
          // familias con pases asignados que todavía no aparecen en la tabla de confirmaciones.
          const sinConfirmar = invitadosAsignados.filter(inv =>
            !confirmaciones.some(c => c.nombre_invitado.trim().toLowerCase() === inv.nombre.trim().toLowerCase())
          );
          const copiarRecordatorio = (nombreInvitado: string) => {
            const msg = `¡Hola ${nombreInvitado}! 🌸 Nos encantaría contar con tu confirmación de asistencia ${TEXTOS_POR_EVENTO[tipoEventoCliente].fraseConfirmacion} ${nombreQuinceanera || "nuestra fiesta"}. ¿Nos confirmas cuando puedas? ¡Gracias!`;
            navigator.clipboard.writeText(msg).catch(() => {});
          };
          return (
            <div className="mb-6 p-4 rounded-2xl" style={{ background: `${t.colors.accent}10`, border: `1px solid ${t.colors.border}` }}>
              <h3 className={tituloSeccionClass + " mb-1"}>Confirmaciones de tus invitados</h3>
              {confirmaciones.length > 0 && (
                <>
                  <p className="text-[11px] font-bold mb-3" style={{ color: t.textDark }}>
                    ✅ {siConfirman.length} familia(s) confirmaron ({totalPersonas} personas) · ❌ {confirmaciones.length - siConfirman.length} no van
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
                    {confirmaciones.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-[11px] rounded-lg px-2.5 py-1.5" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${t.colors.border}` }}>
                        <span className="font-semibold" style={{ color: t.textDark }}>{c.nombre_invitado}</span>
                        <span className={c.asistencia === "si" ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                          {c.asistencia === "si" ? `✅ ${c.num_personas} persona(s)` : "❌ No asiste"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {sinConfirmar.length > 0 && (
                <div className="pt-3" style={{ borderTop: `1px solid ${t.colors.border}` }}>
                  <p className="text-[11px] font-bold text-amber-700 mb-2">⏳ {sinConfirmar.length} familia(s) con pases asignados que aún no responden:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {sinConfirmar.map((inv, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-[11px] rounded-lg px-2.5 py-1.5" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${t.colors.border}` }}>
                        <span className="font-semibold truncate" style={{ color: t.textDark }}>{inv.nombre} <span className="font-normal" style={{ opacity: 0.6 }}>({inv.pases} pase(s))</span></span>
                        <button
                          onClick={() => copiarRecordatorio(inv.nombre)}
                          className="intake-link-accent shrink-0 text-[10px] font-bold"
                        >
                          📋 Copiar recordatorio
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] mt-1.5" style={{ opacity: 0.6 }}>Copia el mensaje y mándaselo por el medio que uses con ellos (WhatsApp, mensaje directo, etc.).</p>
                </div>
              )}
            </div>
          );
        })()}

        <div className="space-y-5">
          <div>
            <label className={labelClass}>Fecha y hora del evento</label>
            <input type="datetime-local" value={form.fecha} onChange={(e) => actualizar("fecha", e.target.value)} className={inputClass} />
          </div>

          {seccionDisponible("mensaje") && (
            <div className={dividerClass}>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + " mb-0"}>Mensaje de bienvenida</label>
                <IntakeSeccionToggle activa={seccionActivaParaCliente("mensaje")} onToggle={() => toggleSeccionCliente("mensaje")} colorAcento={t.colors.accent} />
              </div>
              {seccionActivaParaCliente("mensaje") && (
                <textarea value={form.mensajeBienvenida} onChange={(e) => actualizar("mensajeBienvenida", e.target.value)} rows={2} placeholder="Ej. Hay momentos que son inolvidables..." className={inputClass + " resize-none"} />
              )}
            </div>
          )}

          {seccionDisponible("ceremonia") && (
            <div className={dividerClass}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={tituloSeccionClass}>Ceremonia</h3>
                <IntakeSeccionToggle activa={seccionActivaParaCliente("ceremonia")} onToggle={() => toggleSeccionCliente("ceremonia")} colorAcento={t.colors.accent} />
              </div>
              {seccionActivaParaCliente("ceremonia") && (
                <div className="space-y-2">
                  <input type="text" value={form.ceremoniaLugar} onChange={(e) => actualizar("ceremoniaLugar", e.target.value)} placeholder="Lugar" className={inputClass} />
                  <input type="time" value={form.ceremoniaHora} onChange={(e) => actualizar("ceremoniaHora", e.target.value)} className={inputClass} />
                  <input type="text" value={form.ceremoniaDireccion} onChange={(e) => actualizar("ceremoniaDireccion", e.target.value)} placeholder="Dirección" className={inputClass} />
                  <input type="text" value={form.ceremoniaMaps} onChange={(e) => actualizar("ceremoniaMaps", e.target.value)} placeholder="Link de Google Maps (opcional)" className={inputClass} />
                </div>
              )}
            </div>
          )}

          {seccionDisponible("recepcion") && (
            <div className={dividerClass}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={tituloSeccionClass}>Recepción</h3>
                <IntakeSeccionToggle activa={seccionActivaParaCliente("recepcion")} onToggle={() => toggleSeccionCliente("recepcion")} colorAcento={t.colors.accent} />
              </div>
              {seccionActivaParaCliente("recepcion") && (
                <div className="space-y-2">
                  <input type="text" value={form.recepcionLugar} onChange={(e) => actualizar("recepcionLugar", e.target.value)} placeholder="Lugar" className={inputClass} />
                  <input type="time" value={form.recepcionHora} onChange={(e) => actualizar("recepcionHora", e.target.value)} className={inputClass} />
                  <input type="text" value={form.recepcionDireccion} onChange={(e) => actualizar("recepcionDireccion", e.target.value)} placeholder="Dirección" className={inputClass} />
                  <input type="text" value={form.recepcionMaps} onChange={(e) => actualizar("recepcionMaps", e.target.value)} placeholder="Link de Google Maps (opcional)" className={inputClass} />
                </div>
              )}
            </div>
          )}

          {seccionDisponible("itinerario") && (
            <div className={dividerClass}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={tituloSeccionClass}>Itinerario</h3>
                <div className="flex items-center gap-2">
                  {seccionActivaParaCliente("itinerario") && (
                    <button type="button" onClick={agregarItinerario} className="intake-link-accent text-[10px] font-bold">+ Agregar</button>
                  )}
                  <IntakeSeccionToggle activa={seccionActivaParaCliente("itinerario")} onToggle={() => toggleSeccionCliente("itinerario")} colorAcento={t.colors.accent} />
                </div>
              </div>
              {seccionActivaParaCliente("itinerario") && (
                <div className="space-y-2">
                  {form.itinerario.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="time" value={item.hora} onChange={(e) => actualizarItinerario(i, "hora", e.target.value)} className={inputClass + " w-28"} />
                      <input type="text" value={item.evento} onChange={(e) => actualizarItinerario(i, "evento", e.target.value)} placeholder="Ej. Cena de gala" className={inputClass} />
                      <button type="button" onClick={() => quitarItinerario(i)} className="text-rose-500 px-2">✕</button>
                    </div>
                  ))}
                  {form.itinerario.length === 0 && <p className="text-[11px]" style={{ opacity: 0.6 }}>Sin actividades todavía.</p>}
                </div>
              )}
            </div>
          )}

          {seccionDisponible("vestimenta") && (
            <div className={dividerClass}>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + " mb-0"}>Código de vestimenta</label>
                <IntakeSeccionToggle activa={seccionActivaParaCliente("vestimenta")} onToggle={() => toggleSeccionCliente("vestimenta")} colorAcento={t.colors.accent} />
              </div>
              {seccionActivaParaCliente("vestimenta") && (
                <input type="text" value={form.dressCode} onChange={(e) => actualizar("dressCode", e.target.value)} placeholder="Ej. Formal / Etiqueta" className={inputClass} />
              )}
            </div>
          )}

          {seccionDisponible("familia") && (
            <div className={dividerClass}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={tituloSeccionClass}>Padres y Padrinos</h3>
                <IntakeSeccionToggle activa={seccionActivaParaCliente("familia")} onToggle={() => toggleSeccionCliente("familia")} colorAcento={t.colors.accent} />
              </div>
              {seccionActivaParaCliente("familia") && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ opacity: 0.6 }}>Padres</p>
                  <div className="space-y-2 mb-4">
                    <input type="text" value={form.padres[0] || ""} onChange={(e) => actualizar("padres", [e.target.value, form.padres[1] || ""])} placeholder="Nombre del papá" className={inputClass} />
                    <input type="text" value={form.padres[1] || ""} onChange={(e) => actualizar("padres", [form.padres[0] || "", e.target.value])} placeholder="Nombre de la mamá" className={inputClass} />
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ opacity: 0.6 }}>Padrinos</p>
                    <button type="button" onClick={agregarPadrino} className="intake-link-accent text-[10px] font-bold">+ Agregar</button>
                  </div>
                  <div className="space-y-2">
                    {form.padrinos.map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={p} onChange={(e) => actualizarPadrino(i, e.target.value)} placeholder="Nombre del padrino/madrina" className={inputClass} />
                        <button type="button" onClick={() => quitarPadrino(i)} className="text-rose-500 px-2">✕</button>
                      </div>
                    ))}
                    {form.padrinos.length === 0 && <p className="text-[11px]" style={{ opacity: 0.6 }}>Sin padrinos todavía.</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {seccionDisponible("regalos") && (
            <div className={dividerClass}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={tituloSeccionClass}>Mesa de Regalos</h3>
                <IntakeSeccionToggle activa={seccionActivaParaCliente("regalos")} onToggle={() => toggleSeccionCliente("regalos")} colorAcento={t.colors.accent} />
              </div>
              {seccionActivaParaCliente("regalos") && (
                <>
                  <label className={labelClass}>Mesa de regalos</label>
                  <textarea value={form.mesaRegalos} onChange={(e) => actualizar("mesaRegalos", e.target.value)} rows={2} placeholder="Ej. Liverpool No. Evento 12345" className={inputClass + " resize-none mb-3"} />
                  <label className={labelClass}>Datos bancarios (opcional)</label>
                  <textarea value={form.datosBancarios} onChange={(e) => actualizar("datosBancarios", e.target.value)} rows={2} placeholder="Banco, CLABE, beneficiario..." className={inputClass + " resize-none"} />
                </>
              )}
            </div>
          )}

          <div className={dividerClass + " grid grid-cols-2 gap-3"}>
            {seccionDisponible("hashtag") && (
              <div>
                <label className={labelClass}>Hashtag (opcional)</label>
                <input type="text" value={form.hashtag} onChange={(e) => actualizar("hashtag", e.target.value)} placeholder="#MisXV" className={inputClass} />
              </div>
            )}
            <div>
              <label className={labelClass}>Link de tu canción (opcional)</label>
              <input type="text" value={form.cancion} onChange={(e) => actualizar("cancion", e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>

          <div className={dividerClass}>
            <h3 className={tituloSeccionClass + " mb-2"}>Fotos</h3>
            <label className={labelClass}>Foto de portada</label>
            {form.fotoPortada && (
              <img src={form.fotoPortada} alt="Portada" className="w-full h-40 object-cover rounded-lg mb-2" style={{ border: `1px solid ${t.colors.border}` }} referrerPolicy="no-referrer" />
            )}
            <label className="intake-dropzone flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition mb-4">
              <span className="text-xs font-bold">{subiendoFoto === "portada" ? "Subiendo..." : "Subir foto de portada"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleSubirPortada} disabled={!!subiendoFoto} />
            </label>

            <label className={labelClass}>Galería ({form.fotos.length}/{maxFotos})</label>
            {form.fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {form.fotos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden" style={{ border: `1px solid ${t.colors.border}` }}>
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => actualizar("fotos", form.fotos.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-[10px] flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
            {form.fotos.length < maxFotos && (
              <label className="intake-dropzone flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition">
                <span className="text-xs font-bold">{subiendoFoto === "galeria" ? "Subiendo..." : `Subir fotos (hasta ${maxFotos})`}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleSubirGaleria} disabled={!!subiendoFoto} />
              </label>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleEnviar}
          disabled={enviando || !!subiendoFoto}
          className="intake-btn-accent w-full mt-6 py-3 rounded-xl font-bold text-sm transition"
        >
          {enviando ? "Guardando..." : "Guardar mi información"}
        </button>
      </div>

      {/* Barra fija de guardar en celular (2026-11-22) -- mismo `handleEnviar` que el botón de
          arriba, para no bajar 4-5 pantallas de scroll solo para guardar. El padding inferior
          del contenedor raíz (`pb-28 sm:pb-6`) ya deja el espacio equivalente para que esta
          barra nunca tape el último campo. Solo visible en anchos de celular (`sm:hidden`). */}
      <div
        className="fixed bottom-0 left-0 right-0 p-3 sm:hidden z-40"
        style={{ background: t.colors.light, borderTop: `1px solid ${t.colors.border}`, boxShadow: "0 -8px 24px rgba(0,0,0,0.15)" }}
      >
        <button
          type="button"
          onClick={handleEnviar}
          disabled={enviando || !!subiendoFoto}
          className="intake-btn-accent w-full py-3 rounded-xl font-bold text-sm transition"
        >
          {enviando ? "Guardando..." : "Guardar mi información"}
        </button>
      </div>
    </div>
  );
}

// Escáner de QR a pantalla completa, EMBEBIDO dentro del control de acceso (2026-11-22) -- antes
// había que salir a la cámara nativa del celular para leer el QR de un pase, lo cual sacaba a
// quien controla la puerta de esta página. Usa BarcodeDetector nativo cuando el navegador lo
// trae (más rápido, cero dependencias) y cae a jsQR (decodificación en JS puro) si no existe --
// Safari/iOS no lo trae en todas sus versiones, así que el respaldo es necesario, no opcional.
// Solo decodifica: no sabe nada de invitados/invitaciones, eso lo resuelve el llamador
// (resolverPaseEscaneado) con el texto crudo que este componente entrega.
function EscanerPaseQR({ onDetectado, onCerrar, aviso }: { onDetectado: (texto: string) => void; onCerrar: () => void; aviso: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const activoRef = useRef(true);
  // Evita re-disparar el mismo texto decenas de veces por segundo mientras el QR sigue frente a
  // la cámara (el loop de decodificación corre en cada frame) -- 1.5s de "enfriamiento" por texto.
  const ultimoRef = useRef<{ texto: string; ts: number } | null>(null);
  const onDetectadoRef = useRef(onDetectado);
  onDetectadoRef.current = onDetectado;
  const [estado, setEstado] = useState<"abriendo" | "lista" | "sin-permiso">("abriendo");

  useEffect(() => {
    activoRef.current = true;
    const BarcodeDetectorCtor: any = (window as any).BarcodeDetector;
    let detector: any = null;
    if (BarcodeDetectorCtor) {
      try { detector = new BarcodeDetectorCtor({ formats: ["qr_code"] }); } catch { detector = null; }
    }

    const procesarTexto = (texto: string) => {
      const ahora = Date.now();
      if (ultimoRef.current && ultimoRef.current.texto === texto && ahora - ultimoRef.current.ts < 1500) return;
      ultimoRef.current = { texto, ts: ahora };
      onDetectadoRef.current(texto);
    };

    const loop = () => {
      if (!activoRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        if (detector) {
          detector.detect(video)
            .then((codigos: any[]) => { if (codigos && codigos[0]?.rawValue) procesarTexto(codigos[0].rawValue); })
            .catch(() => {});
        } else {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const resultado = jsQR(frame.data, frame.width, frame.height);
            if (resultado?.data) procesarTexto(resultado.data);
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (stream) => {
        if (!activoRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setEstado("lista");
        loop();
      })
      .catch(() => setEstado("sin-permiso"));

    return () => {
      activoRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // Monta la cámara una sola vez; onDetectado se lee de onDetectadoRef para no tener que
    // reabrir la cámara cada vez que el llamador cambia esa función entre renders.
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white text-sm font-bold flex items-center gap-1.5"><ScanLine size={16} /> Escanea el QR del pase</span>
        <button type="button" onClick={onCerrar} className="text-white/80 hover:text-white p-1">
          <X size={22} />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {estado === "lista" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-4 border-white/80 rounded-2xl" />
          </div>
        )}
        {estado === "abriendo" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-white text-xs">Abriendo cámara...</p>
          </div>
        )}
        {estado === "sin-permiso" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 px-6 text-center gap-3">
            <Camera className="text-white/70" size={32} />
            <p className="text-white text-sm font-semibold">No pudimos abrir la cámara</p>
            <p className="text-white/70 text-xs max-w-xs">Da permiso de cámara a este navegador para escanear, o cierra esto y busca a la familia a mano en la lista.</p>
            <button type="button" onClick={onCerrar} className="mt-2 px-4 py-2 bg-white text-slate-800 text-xs font-bold rounded-full">
              Usar la lista
            </button>
          </div>
        )}
        {aviso && (
          <div className="absolute bottom-6 left-4 right-4 bg-rose-600 text-white text-xs font-bold text-center py-2.5 px-3 rounded-xl shadow-lg">
            {aviso}
          </div>
        )}
      </div>
      {estado === "lista" && (
        <p className="text-white/60 text-[11px] text-center py-3 px-6 shrink-0">Apunta la cámara al código QR del pase del invitado</p>
      )}
    </div>
  );
}

// Complemento à la carte "Control de Acceso QR" (requiere que la invitación tenga "pases"
// activo -- ver toggle junto a SeccionesToggleList). Página pública para quien controla la
// entrada del evento: se llega por el link corto /puerta/<codigo>[/<slug>] (2026-11-21), por el
// QR de un pase individual (?checkin=1&iid=...&fam=... -- ver mostrarPaseFijo en templates.ts,
// compatibilidad con links ya compartidos), o por el link general que el admin genera y manda
// por WhatsApp (sin familia, muestra una lista buscable de todas las familias).
// Lee datos_completos por iid con la anon key -- mismo modelo de riesgo aceptado que el resto
// de los links públicos de esta app (UUID adivinable = acceso a esa fila).
function CheckinPage({ invitacionId, famNombre }: { invitacionId: string | null; famNombre: string | null }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [nombreQuinceanera, setNombreQuinceanera] = useState("");
  // codigoCorto de esta invitación (si tiene, ver dc.codigoCorto más abajo) -- cuando existe,
  // los links internos de esta página ("Ver lista completa", cada familia de la lista) usan
  // /puerta/<codigo>[/<slug>] en vez de ?checkin=1&iid=...[&fam=...], para que alguien que llegó
  // por la ruta corta se quede en rutas cortas en vez de que un clic la regrese a la larga.
  const [codigoCortoPuerta, setCodigoCortoPuerta] = useState<string | null>(null);
  const [invitados, setInvitados] = useState<{ nombre: string; pases: number }[]>([]);
  const [registros, setRegistros] = useState<{ invitado_nombre: string; personas_registradas: number }[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cantidadAConfirmar, setCantidadAConfirmar] = useState(1);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  // "Marca de celular de puerta" (2026-11-22, sin PIN ni claves -- la llave es el link de
  // control mismo): abrir el control GENERAL de esta invitación (esta ruta, sin `famNombre`)
  // marca este navegador en localStorage. Esa marca es lo único que distingue, al abrir el
  // link de UNA familia (`/puerta/<codigo>/<slug>` o el largo con `&fam=`), si quien lo abre es
  // el celular de la puerta (ya vio la lista general antes, ve el registro real) o el propio
  // invitado reenviando/escaneando su pase (nunca vio la lista general, solo un saludo genérico,
  // sin ningún dato). Se guarda por invitacionId -- único y siempre conocido en esta página, sin
  // importar si se llegó por la ruta corta o la larga, así una sola marca cubre ambas.
  const marcaKey = invitacionId ? `puerta_ok_${invitacionId}` : null;
  // Calculado una sola vez al montar (no debe cambiar durante la vida de este montaje -- cada
  // ruta/familia distinta es un montaje nuevo de esta página). Si localStorage no está
  // disponible (navegación privada estricta, etc.) se asume lo más conservador: SÍ requiere
  // saludo genérico, es decir, nunca mostrar datos reales por una falla al leer la marca.
  const [requiereSaludo] = useState<boolean>(() => {
    if (!famNombre) return false;
    try {
      return !(marcaKey && localStorage.getItem(marcaKey) === "1");
    } catch {
      return true;
    }
  });

  // Escáner de QR embebido en la lista general (2026-11-22) -- ver EscanerPaseQR arriba y
  // resolverPaseEscaneado (helper puro, cerca de slugsDeInvitados). `familiaEscaneada` guarda el
  // NOMBRE de la familia que se acaba de escanear y validar: con eso, el bloque de "ficha de una
  // familia" más abajo se muestra SIN navegar a `/puerta/<codigo>/<slug>` (que exigiría otra
  // carga de página) -- se queda todo dentro de este mismo montaje, como pide el encargo
  // ("sin salir del control"). `famNombre` (el de la URL) y `familiaEscaneada` nunca compiten:
  // el escáner solo se ofrece en la pantalla general, que por definición no trae `famNombre`.
  const [familiaEscaneada, setFamiliaEscaneada] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [avisoEscaneo, setAvisoEscaneo] = useState<string | null>(null);
  const familiaActiva = familiaEscaneada || famNombre;

  useEffect(() => {
    if (requiereSaludo) {
      // Sin marca de "celular de puerta": pantalla de saludo genérica (ver render más abajo),
      // SIN consultar Supabase -- ni siquiera se lee el nombre de la quinceañera ni la lista de
      // invitados, por diseño, para que un invitado que abre su propio pase (o se lo reenvía a
      // sí mismo) nunca dispare ninguna lectura de datos de la familia/evento.
      setCargando(false);
      return;
    }
    const cargar = async () => {
      if (!invitacionId || !window.supabaseClient) {
        setError("Este link no es válido.");
        setCargando(false);
        return;
      }
      try {
        const { data, error: err } = await window.supabaseClient
          .from("invitaciones")
          .select("nombre_quinceanera, datos_completos, pausada")
          .eq("id", invitacionId)
          .maybeSingle();
        if (err) throw err;
        // Pausa manual por falta de pago (2026-11-22) -- va primero, antes incluso del chequeo
        // de controlAccesoQR: mientras esté pausada, el control de acceso no debe mostrar NADA,
        // ni el nombre de la quinceañera ni la lista de invitados.
        if (data?.pausada) {
          setError("Esta invitación está en pausa.");
          setCargando(false);
          return;
        }
        const dc: Partial<InvitacionDatos> = data?.datos_completos || {};
        if (!data || !dc.controlAccesoQR) {
          setError("Esta función no está disponible para esta invitación.");
          setCargando(false);
          return;
        }
        setNombreQuinceanera(data.nombre_quinceanera || "");
        setInvitados(dc.invitados || []);
        setCodigoCortoPuerta(dc.codigoCorto || null);

        const { data: checkinsData, error: errCheckins } = await window.supabaseClient
          .from("checkins")
          .select("invitado_nombre, personas_registradas")
          .eq("invitacion_id", invitacionId);
        if (!errCheckins) setRegistros(checkinsData || []);

        // Marca este navegador como el de la puerta (ver comentario de `marcaKey` arriba) --
        // SOLO al abrir el control GENERAL (sin `famNombre`), nunca al abrir el link de una
        // familia directo -- eso es justo el punto 1 del flujo pedido.
        if (!famNombre && marcaKey) {
          try { localStorage.setItem(marcaKey, "1"); } catch { /* localStorage no disponible: sin marca, sin romper la pantalla general */ }
        }
      } catch (e: any) {
        setError("Ocurrió un error al cargar: " + e.message);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [invitacionId]);

  // El aviso de "Ese pase no corresponde a este evento" (ver EscanerPaseQR más abajo) se borra
  // solo a los pocos segundos, para no quedarse tapando la cámara mientras se sigue escaneando.
  useEffect(() => {
    if (!avisoEscaneo) return;
    const t = setTimeout(() => setAvisoEscaneo(null), 2500);
    return () => clearTimeout(t);
  }, [avisoEscaneo]);

  // Links internos de esta página (ver codigoCortoPuerta arriba): corto cuando se puede, largo
  // de siempre como respaldo (invitación guardada antes del código corto, o nunca re-guardada).
  const hrefListaCompleta = codigoCortoPuerta
    ? `/puerta/${codigoCortoPuerta}`
    : `?checkin=1&iid=${encodeURIComponent(invitacionId || "")}`;
  const hrefFamilia = (nombreInv: string): string => {
    if (codigoCortoPuerta) {
      const idx = invitados.findIndex(i => i.nombre === nombreInv);
      const slug = idx >= 0 ? slugsDeInvitados(invitados)[idx] : slugFamilia(nombreInv);
      return `/puerta/${codigoCortoPuerta}/${slug}`;
    }
    return `?checkin=1&iid=${encodeURIComponent(invitacionId || "")}&fam=${encodeURIComponent(nombreInv)}`;
  };

  const registradosPorFamilia = (nombre: string) =>
    registros.filter(r => r.invitado_nombre === nombre).reduce((s, r) => s + r.personas_registradas, 0);

  const totalAsignado = invitados.reduce((s, i) => s + (i.pases || 0), 0);
  const totalRegistrado = registros.reduce((s, r) => s + r.personas_registradas, 0);

  const handleConfirmar = async () => {
    if (!invitacionId || !familiaActiva || !window.supabaseClient) return;
    setConfirmando(true);
    setInsertError(null);
    try {
      const { error: err } = await window.supabaseClient
        .from("checkins")
        .insert([{ invitacion_id: invitacionId, invitado_nombre: familiaActiva, personas_registradas: cantidadAConfirmar }]);
      if (err) throw err;
      setConfirmado(true);
      setRegistros(prev => [...prev, { invitado_nombre: familiaActiva, personas_registradas: cantidadAConfirmar }]);
    } catch (e: any) {
      setInsertError("No se pudo registrar la entrada: " + e.message);
    } finally {
      setConfirmando(false);
    }
  };

  if (cargando) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
        <p className="text-xs text-slate-500 font-medium font-sans">Cargando control de acceso...</p>
      </div>
    );
  }

  // Sin la marca de "celular de puerta" y llegando al link de UNA familia (QR de su propio
  // pase, con su celular o uno reenviado): saludo genérico, nada de datos del sistema -- ni
  // nombre de familia, ni evento, ni formulario, ni link al control general. Va ANTES del
  // chequeo de `error` a propósito: como el efecto de arriba ni siquiera consultó Supabase en
  // este caso, `error` nunca se puso, pero tampoco debe importar -- este saludo no depende de
  // si la invitación/familia son válidas o no.
  if (requiereSaludo) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 px-6 text-center gap-2">
        <span className="text-4xl mb-2">🔳</span>
        <p className="text-sm font-semibold text-slate-700">¡Hola!</p>
        <p className="text-sm text-slate-600 max-w-xs">Este es un pase de acceso: muéstralo en la puerta cuando llegues.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 px-6 text-center gap-2">
        <span className="text-4xl mb-2">🔳</span>
        <p className="text-sm font-semibold text-slate-700">{error}</p>
      </div>
    );
  }

  // Pantalla de confirmación de UNA familia -- llegó desde el link de su pase (`famNombre`,
  // con la marca de puerta ya confirmada arriba) o se acaba de resolver desde el escáner
  // embebido de la pantalla general (`familiaEscaneada`, ver EscanerPaseQR/resolverPaseEscaneado).
  if (familiaActiva) {
    const invitado = invitados.find(i => i.nombre === familiaActiva);
    if (!invitado) {
      return (
        <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 px-6 text-center gap-2">
          <span className="text-4xl mb-2">🔳</span>
          <p className="text-sm font-semibold text-slate-700">No encontramos a "{familiaActiva}" en la lista de pases.</p>
          <a href={hrefListaCompleta} className="text-xs font-bold text-indigo-600 mt-2">← Ver lista completa</a>
        </div>
      );
    }
    const yaRegistrados = registradosPorFamilia(familiaActiva);
    const volverAEscanear = () => {
      setFamiliaEscaneada(null);
      setConfirmado(false);
      setCantidadAConfirmar(1);
      setInsertError(null);
      setEscaneando(true);
    };
    const volverALaListaDesdeEscaneo = () => {
      setFamiliaEscaneada(null);
      setConfirmado(false);
      setCantidadAConfirmar(1);
      setInsertError(null);
    };
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center">
          <span className="text-3xl block mb-2">🔳</span>
          <h1 className="text-lg font-bold text-slate-800">{invitado.nombre}</h1>
          <p className="text-xs text-slate-500 mt-1">{invitado.pases} pase{invitado.pases === 1 ? "" : "s"} asignado{invitado.pases === 1 ? "" : "s"}</p>
          {yaRegistrados > 0 && !confirmado && (
            <p className="text-xs font-bold text-amber-600 mt-2">Ya se registraron {yaRegistrados} de este pase.</p>
          )}
          {confirmado ? (
            <>
              <p className="text-sm font-bold text-emerald-600 mt-4">✅ Entrada registrada</p>
              {familiaEscaneada && (
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    type="button"
                    onClick={volverAEscanear}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Camera size={16} /> Escanear siguiente pase
                  </button>
                  <button
                    type="button"
                    onClick={volverALaListaDesdeEscaneo}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition"
                  >
                    Volver a la lista
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="block text-[11px] font-bold text-slate-600 mt-4 mb-1">¿Cuántas personas entran ahora?</label>
              <input
                type="number"
                min={1}
                value={cantidadAConfirmar}
                onChange={(e) => setCantidadAConfirmar(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 mx-auto text-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
              />
              {insertError && <p className="text-[11px] text-rose-600 mt-2">{insertError}</p>}
              <button
                onClick={handleConfirmar}
                disabled={confirmando}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-xl transition"
              >
                {confirmando ? "Registrando..." : "Confirmar entrada"}
              </button>
            </>
          )}
          {!familiaEscaneada && (
            <a href={hrefListaCompleta} className="block text-[11px] font-bold text-slate-400 hover:text-slate-600 mt-4">← Ver lista completa</a>
          )}
          {familiaEscaneada && !confirmado && (
            <button type="button" onClick={volverALaListaDesdeEscaneo} className="block w-full text-[11px] font-bold text-slate-400 hover:text-slate-600 mt-4">
              ← Volver a la lista
            </button>
          )}
        </div>
      </div>
    );
  }

  // Pantalla general: lista buscable de familias + contador en vivo + escáner de QR embebido.
  const invitadosFiltrados = invitados.filter(i => i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-base font-bold text-slate-800 text-center mt-2">Control de Acceso — {nombreQuinceanera}</h1>
        <p className="text-xs text-slate-500 text-center mt-1 mb-4">{totalRegistrado} de {totalAsignado} pases registrados</p>
        <button
          type="button"
          onClick={() => { setAvisoEscaneo(null); setEscaneando(true); }}
          className="w-full mb-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Camera size={18} /> Escanear pase
        </button>
        <input
          type="text"
          placeholder="Buscar familia..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm outline-none focus:border-indigo-500 mb-3"
        />
        <div className="space-y-2">
          {invitadosFiltrados.map((inv, idx) => {
            const registrado = registradosPorFamilia(inv.nombre);
            return (
              <a
                key={idx}
                href={hrefFamilia(inv.nombre)}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition"
              >
                <div>
                  <span className="block text-sm font-bold text-slate-800">{inv.nombre}</span>
                  <span className="block text-[11px] text-slate-500">{inv.pases} pase{inv.pases === 1 ? "" : "s"} asignado{inv.pases === 1 ? "" : "s"}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${registrado >= inv.pases ? "bg-emerald-100 text-emerald-700" : registrado > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                  {registrado}/{inv.pases}
                </span>
              </a>
            );
          })}
          {invitadosFiltrados.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">Ninguna familia coincide con "{busqueda}"</p>
          )}
        </div>
      </div>
      {escaneando && (
        <EscanerPaseQR
          aviso={avisoEscaneo}
          onCerrar={() => { setEscaneando(false); setAvisoEscaneo(null); }}
          onDetectado={(texto) => {
            const invitadoValido = resolverPaseEscaneado(texto, { invitacionId, codigoCortoPuerta, invitados });
            if (!invitadoValido) {
              setAvisoEscaneo("Ese pase no corresponde a este evento");
              return;
            }
            setAvisoEscaneo(null);
            setEscaneando(false);
            setConfirmado(false);
            setCantidadAConfirmar(1);
            setInsertError(null);
            setFamiliaEscaneada(invitadoValido.nombre);
          }}
        />
      )}
    </div>
  );
}

// "Recuperar acceso" (?recuperar=1): la salida de emergencia para cuando se te olvida
// ADMIN_PASSWORD y no tienes a mano la CLI de Vercel para correr scripts/reset-admin-password.mjs.
// Tres pasos: pedir un código de un solo uso (llega por correo a ADMIN_RECOVERY_EMAIL, ver
// api/recovery/request.ts), escribirlo, y si es correcto el servidor genera una contraseña
// nueva, la sube a Vercel y redeploya (api/recovery/confirm.ts) -- mismo resultado que el script,
// pero sin depender de tener la CLI autenticada en esta máquina en particular.
function RecoveryPage() {
  const [paso, setPaso] = useState<"inicio" | "codigo" | "listo">("inicio");
  const [token, setToken] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordNueva, setPasswordNueva] = useState("");
  const [copiado, setCopiado] = useState(false);

  const handlePedirCodigo = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch("/api/recovery/request", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "No se pudo enviar el código.");
      setToken(data.token);
      setPaso("codigo");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmarCodigo = async () => {
    if (codigo.trim().length !== 6) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const r = await fetch("/api/recovery/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: codigo.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "No se pudo confirmar el código.");
      setPasswordNueva(data.password);
      setPaso("listo");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(passwordNueva).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="text-center mb-5">
          <span className="text-3xl block mb-2">🔑</span>
          <h1 className="text-lg font-bold text-slate-800">Recuperar acceso al editor</h1>
        </div>

        {paso === "inicio" && (
          <>
            <p className="text-xs text-slate-500 text-center mb-5">
              Se mandará un código de un solo uso por correo. Al confirmarlo se genera una contraseña nueva para el editor y se aplica sola -- ya no hace falta correr nada en una terminal.
            </p>
            <button
              onClick={handlePedirCodigo}
              disabled={cargando}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition"
            >
              {cargando ? "Enviando..." : "Enviarme un código"}
            </button>
          </>
        )}

        {paso === "codigo" && (
          <>
            <p className="text-xs text-slate-500 text-center mb-4">
              Revisa tu correo -- te llegó un código de 6 dígitos, vence en 10 minutos.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 mb-4"
              autoFocus
            />
            <button
              onClick={handleConfirmarCodigo}
              disabled={cargando || codigo.length !== 6}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition"
            >
              {cargando ? "Confirmando..." : "Confirmar y generar contraseña nueva"}
            </button>
            <button
              onClick={handlePedirCodigo}
              disabled={cargando}
              className="w-full text-xs text-slate-400 hover:text-slate-600 mt-3"
            >
              Reenviar código
            </button>
          </>
        )}

        {paso === "listo" && (
          <>
            <p className="text-xs text-slate-500 text-center mb-3">
              Listo -- ya se aplicó y el sitio se está redesplegando. Esta es tu nueva contraseña (usuario <strong>admin</strong>):
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 break-all">{passwordNueva}</code>
              <button
                onClick={handleCopiar}
                className="shrink-0 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2.5 transition"
              >
                {copiado ? "✓" : "Copiar"}
              </button>
            </div>
            <p className="text-[11px] text-amber-600 font-semibold text-center mb-4">
              Guárdala ya en tu gestor de contraseñas -- no se puede volver a ver después de esto.
            </p>
            <p className="text-[11px] text-slate-400 text-center">
              Espera medio minuto a que termine el redeploy y entra normal a <a href="/" className="underline">administradorinvitamx.vercel.app</a>.
            </p>
          </>
        )}

        {error && <p className="text-xs font-semibold text-red-600 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}

// Componente «Fondos listos» (2026-11-22, v1 de este mismo prompt) -- extraído del bloque que
// antes vivía solo en PARTE 1b (Gestión de Imágenes) para poder renderizarlo TAMBIÉN junto al
// selector de Tipo de Evento (pestaña Información Esencial), compartiendo el mismo estado
// (`datos.fondosGaleriaPorEvento`) y los mismos handlers -- elegir en un lugar se refleja en el
// otro de inmediato, no son dos copias independientes.
function BloqueFondosListos({
  datos,
  onAplicar,
  onQuitar,
  mostrarVacio = true,
  ayudaExtra
}: {
  datos: InvitacionDatos;
  onAplicar: (url: string) => void;
  onQuitar: () => void;
  mostrarVacio?: boolean;
  ayudaExtra?: string;
}) {
  const tipoActual: TipoEvento = (datos.tipoEvento && TEXTOS_POR_EVENTO[datos.tipoEvento]) ? datos.tipoEvento : "xv";
  const fondosDelEvento = fondosListosPorEvento(tipoActual);
  const fondoGaleriaActual = datos.fondosGaleriaPorEvento?.[tipoActual];

  if (fondosDelEvento.length === 0 && !mostrarVacio) {
    return null;
  }

  return (
    <div className="p-4 bg-fuchsia-50/40 rounded-xl border border-fuchsia-100 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎀</span>
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
            Fondos listos ({TIPOS_EVENTO.find(t => t.id === tipoActual)?.label || "Evento"})
          </h4>
          <p className="text-[10px] text-slate-500">
            {ayudaExtra || "Elige un fondo prediseñado para el evento de esta invitación, con un clic -- sin subir nada. Se recuerda uno distinto por cada tipo de evento que esta invitación use."}
          </p>
        </div>
      </div>

      {fondosDelEvento.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic p-2.5 bg-white/60 rounded-lg border border-slate-150">
          Aún no hay fondos listos para este evento.
        </p>
      ) : (
        <>
          {fondoGaleriaActual && (
            <div className="p-2 rounded-lg bg-fuchsia-100 border border-fuchsia-200 text-fuchsia-800 text-[10px] font-semibold flex items-center gap-1.5">
              ✨ Este fondo de galería se está usando ahora en la vista previa y en el link público (tiene prioridad sobre un fondo subido a mano, si hubiera uno).
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {fondosDelEvento.map(f => {
              const seleccionado = fondoGaleriaActual === f.url;
              return (
                <button
                  key={f.url}
                  type="button"
                  onClick={() => onAplicar(f.url)}
                  title={`Usar "${f.nombre}" como fondo de esta invitación`}
                  className={`relative rounded-lg overflow-hidden border-2 transition text-left cursor-pointer ${seleccionado ? "border-fuchsia-500 ring-2 ring-fuchsia-200" : "border-slate-200 hover:border-fuchsia-300"}`}
                >
                  <img src={f.url} alt={f.nombre} className="w-full h-16 object-cover" referrerPolicy="no-referrer" />
                  <span className="block px-1.5 py-1 text-[9px] font-bold text-slate-700 bg-white/90 truncate">{f.nombre}</span>
                  {seleccionado && (
                    <span className="absolute top-1 right-1 bg-fuchsia-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          {fondoGaleriaActual && (
            <button
              type="button"
              onClick={onQuitar}
              className="w-full px-3 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold rounded-lg transition cursor-pointer"
            >
              Quitar fondo de galería de este evento
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  // Cargar estado inicial desde la URL si existe o desde localStorage, o el editor precargado
  const getInitialState = (): { initialDatos: InvitacionDatos; initialTemaId: string; isView: boolean; isCatalog: boolean; initialCatalogTemaId: string | null; initialCatalogEstiloCajasId: "normal" | "sin_cajon" | "solo_borde" | null; initialCatalogEvento: TipoEvento; isEmbed: boolean } => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Link corto /v/<codigoCorto> (2026-11-19): se trata como un modo vista más -- reusa
      // toda la infraestructura ya existente de isViewMode (spinner mientras carga, chequeo de
      // bloqueo, document.write, guardia de modos combinados). El contenido real (datos/tema)
      // llega async más abajo (ver linkCortoEstado), así que `initialDatos` aquí es solo un
      // relleno que NUNCA se llega a mostrar (el document.write queda bloqueado hasta que ese
      // fetch resuelve, ver el efecto correspondiente).
      const esLinkCorto = /^\/v\/[a-z0-9-]+(?:\/[a-z0-9-]+)?\/?$/i.test(window.location.pathname);
      const isView = params.get("v") === "1" || params.get("view") === "true" || esLinkCorto;
      const isCatalog = params.get("catalog") === "true" || params.get("catalogo") === "true";
      const isEmbed = params.get("embed") === "true";
      const initialCatalogTemaId = params.get("tema") || null;
      // Deep-link al demo comparativo de "Estilos de Presentación" (2026-11-26, fix de "demo
      // desajustado en celular"): ?catalog=true&estiloCajas=sin_cajon -- igual que `tema`,
      // sirve para abrir ESE demo directo sin pasar por el grid primero. Se usa para que "Ver
      // Demo en Vivo" pueda abrir una pestaña nueva (ventana/viewport real) en vez de cambiar
      // el estado local dentro del mismo documento embebido en el iframe de la landing.
      const estiloCajasParam = params.get("estiloCajas");
      const initialCatalogEstiloCajasId: "normal" | "sin_cajon" | "solo_borde" | null =
        estiloCajasParam === "normal" || estiloCajasParam === "sin_cajon" || estiloCajasParam === "solo_borde"
          ? estiloCajasParam
          : null;
      // Modo catálogo por evento (2026-11-25, prompt "/bodas"): ?catalog=true&evento=boda --
      // sin este parámetro, o con cualquier valor que no sea un TipoEvento real, el catálogo
      // se comporta exactamente como siempre (demos de XV). No afecta ningún otro modo (vista
      // real de invitado, panel, embed) -- solo lo lee isCatalogMode más abajo.
      const eventoParam = params.get("evento");
      const initialCatalogEvento: TipoEvento = (eventoParam && TEXTOS_POR_EVENTO[eventoParam as TipoEvento]) ? (eventoParam as TipoEvento) : "xv";
      let targetTema = params.get("tema") || "mariposas";

      // Intentar cargar fondos persistentes locales
      let customBgs = {};
      try {
        const savedBgs = localStorage.getItem('xv_fondos_personalizados');
        if (savedBgs) {
          customBgs = JSON.parse(savedBgs);
        }
      } catch (e) {
        console.error("Error al leer xv_fondos_personalizados:", e);
      }

      const d = params.get("d");
      if (d) {
        const decoded = decodeState(d);
        if (decoded && typeof decoded === "object") {
          return {
            initialDatos: {
              ...decoded,
              bgImages: {
                ...customBgs,
                ...(decoded.bgImages || {})
              }
            },
            initialTemaId: decoded.tema || targetTema,
            isView,
            isCatalog,
            initialCatalogTemaId,
            initialCatalogEstiloCajasId,
            initialCatalogEvento,
            isEmbed
          };
        }
      }

      // Cargar desde localStorage si no viene por parámetro de compartir
      try {
        const saved = localStorage.getItem('xv_datos_invitacion');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            return {
              initialDatos: {
                ...parsed,
                bgImages: {
                  ...customBgs,
                  ...(parsed.bgImages || {})
                }
              },
              initialTemaId: parsed.tema || targetTema,
              isView,
              isCatalog,
              initialCatalogTemaId,
              initialCatalogEstiloCajasId,
              initialCatalogEvento,
              isEmbed
            };
          }
        }
      } catch (err) {
        console.error("Error al cargar desde localStorage:", err);
      }

      return {
        initialDatos: { 
          ...datosDefault.premium,
          bgImages: {
            ...customBgs
          }
        },
        initialTemaId: targetTema,
        isView,
        isCatalog,
        initialCatalogTemaId,
        initialCatalogEstiloCajasId,
        initialCatalogEvento,
        isEmbed
      };
    } catch (e) {
      let customBgs = {};
      try {
        const savedBgs = localStorage.getItem('xv_fondos_personalizados');
        if (savedBgs) customBgs = JSON.parse(savedBgs);
      } catch (err) {}
      return {
        initialDatos: { 
          ...datosDefault.premium,
          bgImages: {
            ...customBgs
          }
        },
        initialTemaId: "mariposas",
        isView: false,
        isCatalog: false,
        initialCatalogTemaId: null,
        initialCatalogEstiloCajasId: null,
        initialCatalogEvento: "xv",
        isEmbed: false
      };
    }
  };

  const { initialDatos, initialTemaId, isView: isViewMode, isCatalog: isCatalogInitial, initialCatalogTemaId, initialCatalogEstiloCajasId, initialCatalogEvento, isEmbed: isEmbedMode } = getInitialState();

  const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

  // Rutas cortas /puerta/<codigoCorto>[/<slug-familia>] y /datos/<codigoCorto> (2026-11-21):
  // alias cortos del check-in (?checkin=1&iid=...[&fam=...]) y del formulario (?intake=1&iid=...)
  // de siempre, colgando del MISMO codigoCorto que ya tiene la invitación (ver resolución de
  // /v/ más abajo, mismo patrón). Se resuelven contra Supabase (ver rutaCortaEstado más abajo) y
  // luego se reescriben con `replaceState` a su equivalente largo -- de ahí en adelante,
  // isCheckinMode/isIntakeMode (que leen `queryParams`, recalculado en cada render desde
  // `window.location.search`) las toman exactamente igual que si hubieran llegado por el link
  // largo de toda la vida. Los links largos siguen funcionando tal cual, sin tocarlos.
  const matchPuertaRuta = typeof window !== "undefined" ? window.location.pathname.match(/^\/puerta\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/i) : null;
  const matchDatosRuta = typeof window !== "undefined" ? window.location.pathname.match(/^\/datos\/([a-z0-9-]+)\/?$/i) : null;
  const esPuertaCorta = !!matchPuertaRuta;
  const esDatosCorta = !!matchDatosRuta;

  // Modo "formulario de datos del cliente" (?intake=1&iid=<id de la fila en Supabase>): un link
  // público (sin login) que el admin le manda al cliente desde "Mis Invitaciones" en cuanto
  // sabe su paquete, para que el cliente mismo capture sus datos y suba sus fotos -- en vez de
  // que el admin tenga que escribir todo a mano. No usa el blob `d` de la URL como el resto de
  // los modos: lee y escribe directo la fila de Supabase por su id, así el link es cortito.
  const isIntakeMode = queryParams.get('intake') === '1';
  const intakeInvitacionId = queryParams.get('iid');

  // Complemento à la carte "Control de Acceso QR" (?checkin=1&iid=...[&fam=...]) -- ver
  // CheckinPage más arriba.
  const isCheckinMode = queryParams.get('checkin') === '1';
  const checkinInvitacionId = queryParams.get('iid');
  const checkinFamNombre = queryParams.get('fam');

  // "Recuperar acceso" (?recuperar=1) -- ver RecoveryPage más arriba.
  const isRecoveryMode = queryParams.get('recuperar') === '1';

  // Estado principal de los datos de la invitación
  const [datos, setDatos] = useState<InvitacionDatos>(initialDatos);

  // Links de pago del admin (ver LinksPagoAdmin arriba) -- se cargan de la misma fila global
  // única que los fondos personalizados, en la MISMA petición (una columna más del mismo
  // select), para no agregar un segundo viaje de red solo por esto.
  const [linksPago, setLinksPago] = useState<LinksPagoAdmin>(LINKS_PAGO_VACIO);
  const [mostrarModalLinksPago, setMostrarModalLinksPago] = useState(false);
  const [guardandoLinksPago, setGuardandoLinksPago] = useState(false);

  // Cargar fondos personalizados desde Supabase al iniciar. Esta carga es asíncrona (red),
  // así que `datos.bgImages` empieza vacío durante uno o dos segundos en cada carga de página
  // -- sin `cargandoFondos`, la UI ("Ver fondos guardados (0 temas)", "No hay fondos guardados
  // aún") se ve idéntica a si de verdad no hubiera nada, aunque los fondos sigan intactos en
  // Supabase. `cargandoFondos` existe solo para no mostrar ese falso "está vacío" mientras la
  // petición sigue en vuelo.
  useEffect(() => {
    const cargarFondosDesdeSupabase = async () => {
      try {
        if (!window.supabaseClient) return;

        const supabase = window.supabaseClient;
        const { data, error } = await supabase
          .from('invitaciones')
          .select('fondos_personalizados, links_pago')
          .eq('id', FONDOS_ROW_ID)
          .maybeSingle();

        if (error) {
          console.warn('Error al cargar fondos desde Supabase:', error.message);
          mostrarToast('⚠️ No se pudieron cargar los fondos guardados: ' + error.message, 'error');
          return;
        }

        if (data && data.fondos_personalizados) {
          const fondosGuardados = data.fondos_personalizados;
          setDatos(prev => ({
            ...prev,
            bgImages: {
              ...prev.bgImages,
              ...fondosGuardados
            }
          }));

          // También guardar en localStorage local
          try {
            localStorage.setItem('xv_fondos_personalizados', JSON.stringify(fondosGuardados));
          } catch (err) {
            console.warn('Error al guardar fondos en localStorage:', err);
          }
        }

        if (data && data.links_pago) {
          setLinksPago(prev => ({ ...prev, ...data.links_pago }));
        }
      } catch (err: any) {
        console.warn('Error al cargar fondos desde Supabase:', err);
        mostrarToast('⚠️ No se pudieron cargar los fondos guardados: ' + (err?.message || 'error de red'), 'error');
      } finally {
        setCargandoFondos(false);
      }
    };

    cargarFondosDesdeSupabase();
  }, []);

  // Guarda los 4 links de pago completos (reemplaza el objeto entero -- a diferencia de
  // guardarFondoEnSupabase, aquí no hace falta leer-mezclar-escribir: el admin edita los 4
  // campos juntos en un solo formulario y los guarda de un jalón). Columna nueva `links_pago`
  // en la misma fila global única -- PostgREST solo actualiza las columnas incluidas en el
  // payload, así que esto nunca toca `fondos_personalizados` ni ninguna otra columna de esa fila.
  const handleGuardarLinksPago = async () => {
    if (!window.supabaseClient) {
      mostrarToast("Supabase no está disponible", "error");
      return;
    }
    setGuardandoLinksPago(true);
    try {
      const { error } = await window.supabaseClient
        .from('invitaciones')
        .upsert([{
          id: FONDOS_ROW_ID,
          nombre_quinceanera: 'Configuración global',
          estado: 'fondos_personalizados',
          links_pago: linksPago,
          updated_at: new Date().toISOString(),
        }], { onConflict: 'id' });
      if (error) throw error;
      mostrarToast("💳 Links de pago guardados", "success");
      setMostrarModalLinksPago(false);
    } catch (err: any) {
      mostrarToast("Error al guardar los links de pago: " + err.message, "error");
    } finally {
      setGuardandoLinksPago(false);
    }
  };

  // Auto-guardar cambios de datos en localStorage para persistencia local
  useEffect(() => {
    try {
      if (datos) {
        localStorage.setItem('xv_datos_invitacion', JSON.stringify(datos));
      }
    } catch (err) {
      console.error("Error al guardar en localStorage:", err);
    }
  }, [datos]);

  // Título de la pestaña del navegador con el nombre del cliente que se está editando (pedido
  // explícito 2026-11-18: antes siempre decía "Invitación Digital de XV Años", sin importar qué
  // cliente tuvieras abierto -- imposible distinguir pestañas si tenías varios clientes a la vez.
  // Se queda sin efecto en modo vista/catálogo/intake porque esas rutas nunca llegan a montar este
  // efecto como editor real (view mode sobreescribe document entero con document.write más abajo).
  useEffect(() => {
    document.title = datos?.nombre?.trim() ? `${datos.nombre.trim()} — Editor XV` : "Invitación sin guardar — Editor XV";
  }, [datos?.nombre]);

  // Estado para notificaciones Toast no bloqueantes (reemplazo de alert)
  const [toast, setToast] = useState<{ mensaje: string; tipo: "success" | "error" | "info" } | null>(null);

  // Estado para modal de confirmación personalizado (reemplazo de window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    titulo: string;
    mensaje: string;
    onAceptar: () => void;
    // Opcional (2026-11-19) -- antes "Cancelar" solo cerraba el modal en silencio, lo cual
    // bastaba porque nadie esperaba una respuesta. guardarConChequeoDeConflicto() sí necesita
    // enterarse de que el admin canceló (para no mostrarlo como un error real ni quedarse
    // esperando para siempre), así que puede registrar aquí un callback de cancelación.
    onCancelar?: () => void;
  } | null>(null);

  const mostrarToast = (mensaje: string, tipo: "success" | "error" | "info" = "success") => {
    setToast({ mensaje, tipo });
  };

  const toggleSeccion = useCallback((secName: string) => {
    setDatos(prev => {
      const ex = prev.seccionesExcluidas || [];
      const seVaAExcluir = !ex.includes(secName);
      const newEx = seVaAExcluir ? [...ex, secName] : ex.filter(s => s !== secName);
      // Si se apaga "pases", el Control de Acceso QR se apaga con él -- requiere pases activo
      // (ver toggle junto a SeccionesToggleList) y así evitamos que quede "true" a escondidas
      // y reaparezca solo si el admin reactiva pases más adelante.
      const nuevoControlAccesoQR = (secName === "pases" && seVaAExcluir) ? false : prev.controlAccesoQR;
      return { ...prev, seccionesExcluidas: newEx, controlAccesoQR: nuevoControlAccesoQR };
    });
  }, []);

  const moverSeccion = useCallback((secName: string, direccion: 1 | -1) => {
    setDatos(prev => {
      const orden = getOrdenSeccionesEfectivo(prev.paquete, prev.ordenSecciones);
      const idx = orden.indexOf(secName);
      const nuevoIdx = idx + direccion;
      if (idx === -1 || nuevoIdx < 0 || nuevoIdx >= orden.length) return prev;
      const nuevoOrden = [...orden];
      [nuevoOrden[idx], nuevoOrden[nuevoIdx]] = [nuevoOrden[nuevoIdx], nuevoOrden[idx]];
      return { ...prev, ordenSecciones: nuevoOrden };
    });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Estado de carga para Cloudinary
  const [subiendoCloudinary, setSubiendoCloudinary] = useState<boolean>(false);
  const [generandoPDF, setGenerandoPDF] = useState<boolean>(false);
  const [enlaceCloudinary, setEnlaceCloudinary] = useState<string>('');
  const [estadoGuardadoLink, setEstadoGuardadoLink] = useState<'idle' | 'guardando' | 'ok' | 'error'>('idle');

  // Estado del tema seleccionado
  const [selectedTemaId, setSelectedTemaId] = useState<string>(initialTemaId);

  // Estados para el catálogo de demostración de temas
  const [isCatalogMode, setIsCatalogMode] = useState<boolean>(isCatalogInitial);
  const [selectedCatalogTemaId, setSelectedCatalogTemaId] = useState<string | null>(initialCatalogTemaId);
  // Demo comparativa de "Estilos de Contenedores de Sección" (Con cajón/Sin cajón/Solo borde):
  // usa siempre el mismo tema de referencia para que la única diferencia visible sea el cajón.
  const [selectedEstiloCajasDemo, setSelectedEstiloCajasDemo] = useState<"normal" | "sin_cajon" | "solo_borde" | null>(initialCatalogEstiloCajasId);
  // Avisa a la landing (si esta página está embebida en su iframe, ver `estaEmbebidoEnIframe`
  // arriba) cada vez que se entra/sale de la vista de un tema o estilo, para que agrande/achique
  // el iframe al alto real del visitante -- así el `vh` del marco de celular de la demo calcula
  // bien. Fuera de la landing (`estaEmbebidoEnIframe` false) esto no tiene ningún efecto visible.
  useEffect(() => {
    if (!estaEmbebidoEnIframe) return;
    const expandido = !!(selectedCatalogTemaId || selectedEstiloCajasDemo);
    try {
      window.parent.postMessage({ type: "invitamx-catalog-demo", expanded: expandido }, "*");
    } catch {
      // Ignorar -- si el padre bloqueó el acceso, simplemente el iframe se queda con su altura
      // de siempre (mismo comportamiento que antes de este fix, no empeora nada).
    }
  }, [selectedCatalogTemaId, selectedEstiloCajasDemo]);
  const TEMA_DEMO_ESTILO_CAJAS = "dorado-clasico";
  // Estilo de cajón elegido dentro de la demo de un tema específico del catálogo (independiente
  // de la sección comparativa "Estilos de Presentación") -- se resetea a "normal" cada vez que
  // se abre la demo de un tema distinto, para no dejar un estado raro pegado entre temas.
  const [catalogDemoEstiloCajas, setCatalogDemoEstiloCajas] = useState<"normal" | "sin_cajon" | "solo_borde">("normal");
  // Personalización en vivo de la demo del catálogo: el visitante escribe su nombre y fecha y ve
  // su propia invitación al instante (sin backend) -- se resetea al abrir la demo de otro tema.
  const [catalogDemoNombre, setCatalogDemoNombre] = useState("");
  const [catalogDemoFecha, setCatalogDemoFecha] = useState("");
  // Paquete elegido para la demo personalizada -- por default Premium (no "todo incluido" desde
  // el inicio) para que el visitante vea exactamente qué trae SU paquete, no el Deluxe completo.
  const [catalogDemoPaquete, setCatalogDemoPaquete] = useState<"basico" | "premium" | "deluxe">("premium");

  // Guarda UN fondo de tema en Supabase sin arriesgar los demás. Antes, handleBgImageUpload y
  // handleGuardarEnlaceCloudinary armaban el objeto completo a partir de localStorage y lo
  // subían tal cual con upsert -- si el localStorage de ESE navegador/dispositivo no tenía
  // los fondos de otros temas (navegador distinto, caché limpiado, primera carga antes de que
  // el efecto de sincronización con Supabase terminara), el upsert sobreescribía la columna
  // completa en Supabase, borrando de la base de datos los fondos de los demás temas aunque
  // sus archivos siguieran intactos en Cloudinary. Esta función en cambio SIEMPRE lee el
  // estado real y actual de Supabase primero, y solo le agrega/actualiza la entrada del tema
  // que se está guardando, así que nunca puede pisar datos que no vio.
  const guardarFondoEnSupabase = async (temaId: string, url: string): Promise<Record<string, string>> => {
    if (!window.supabaseClient) {
      throw new Error('Supabase no está disponible');
    }
    const supabase = window.supabaseClient;

    const { data: actual, error: errorLectura } = await supabase
      .from('invitaciones')
      .select('fondos_personalizados')
      .eq('id', FONDOS_ROW_ID)
      .maybeSingle();

    if (errorLectura) {
      throw new Error('No se pudo leer el estado actual de fondos: ' + errorLectura.message);
    }

    const fondosActuales = (actual && actual.fondos_personalizados) || {};
    const fondosActualizados = { ...fondosActuales, [temaId]: url };

    const { error: errorEscritura } = await supabase
      .from('invitaciones')
      .upsert([{
        id: FONDOS_ROW_ID,
        nombre_quinceanera: datos.nombre || 'Sin nombre',
        tema_elegido: temaId,
        fondos_personalizados: fondosActualizados,
        estado: 'fondos_personalizados',
        updated_at: new Date().toISOString()
      }], { onConflict: 'id' });

    if (errorEscritura) {
      throw new Error('No se pudo guardar en Supabase: ' + errorEscritura.message);
    }

    try {
      localStorage.setItem('xv_fondos_personalizados', JSON.stringify(fondosActualizados));
    } catch (err) {
      console.warn('Error al guardar fondos en localStorage:', err);
    }

    return fondosActualizados;
  };

  // Quita el fondo personalizado de UN tema (Supabase + estado local + localStorage). Antes no
  // existía ninguna forma de deshacer un fondo ya subido desde la UI -- si el link se rompía
  // (borrado del hosting, link de prueba guardado sin querer, etc.) no había manera de
  // limpiarlo sin editar la base de datos a mano. Sigue el mismo patrón "leer todo primero,
  // solo tocar la entrada de este tema" que guardarFondoEnSupabase, para no arriesgar los
  // fondos de los demás temas.
  const handleQuitarFondoTema = async (temaId: string) => {
    if (!window.supabaseClient) return;
    try {
      const { data: actual, error: errorLectura } = await window.supabaseClient
        .from('invitaciones')
        .select('fondos_personalizados')
        .eq('id', FONDOS_ROW_ID)
        .maybeSingle();
      if (errorLectura) throw errorLectura;

      const fondosActuales = { ...((actual && actual.fondos_personalizados) || {}) };
      delete fondosActuales[temaId];

      const { error: errorEscritura } = await window.supabaseClient
        .from('invitaciones')
        .update({ fondos_personalizados: fondosActuales, updated_at: new Date().toISOString() })
        .eq('id', FONDOS_ROW_ID);
      if (errorEscritura) throw errorEscritura;

      try {
        localStorage.setItem('xv_fondos_personalizados', JSON.stringify(fondosActuales));
      } catch {}

      setDatos(prev => {
        const nuevoBgImages = { ...(prev.bgImages || {}) };
        delete nuevoBgImages[temaId];
        return { ...prev, bgImages: nuevoBgImages };
      });

      mostrarToast(`Fondo personalizado de "${temaId}" eliminado`, "success");
    } catch (err: any) {
      mostrarToast("Error al quitar el fondo: " + err.message, "error");
    }
  };

  // Fondos "listos" de galería por evento (2026-11-22, ver fondosListos.ts) -- a diferencia de
  // handleQuitarFondoTema/handleBgImageUpload (fondo subido a mano, por TEMA, sincronizado con
  // la fila global `fondos_personalizados` en Supabase), esto vive 100% dentro de ESTA
  // invitación (`datos.fondosGaleriaPorEvento`, por EVENTO) -- nunca toca Supabase aparte, se
  // guarda cuando la invitación misma se guarda, igual que cualquier otro campo de `datos`.
  const handleAplicarFondoGaleria = (url: string) => {
    const tipoActual = datos.tipoEvento || "xv";
    setDatos(prev => ({
      ...prev,
      fondosGaleriaPorEvento: {
        ...(prev.fondosGaleriaPorEvento || {}),
        [tipoActual]: url
      }
    }));
  };

  const handleQuitarFondoGaleria = () => {
    const tipoActual = datos.tipoEvento || "xv";
    setDatos(prev => {
      const nuevo = { ...(prev.fondosGaleriaPorEvento || {}) };
      delete nuevo[tipoActual];
      return { ...prev, fondosGaleriaPorEvento: nuevo };
    });
  };

  // Manejo de carga de imágenes de fondo por tema por separado
  const handleBgImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoCloudinary(true);
    try {
      const url = await subirImagenPublica(file);

      try {
        await guardarFondoEnSupabase(selectedTemaId, url);
      } catch (err) {
        console.warn("Advertencia: Error al guardar fondo en Supabase:", err);
        mostrarToast("Se subió a Cloudinary pero no se pudo sincronizar en Supabase: " + (err as Error).message, "error");
      }

      setDatos(prev => {
        const currentBgImages = prev.bgImages || {};
        return {
          ...prev,
          bgImages: {
            ...currentBgImages,
            [selectedTemaId]: url
          }
        };
      });
      mostrarToast(`¡Imagen de fondo cargada exitosamente a Cloudinary para "${temaActual.nombre}"! 🌐🌸`, "success");
    } catch (err: any) {
      mostrarToast("Error al subir fondo del tema: " + err.message, "error");
    } finally {
      setSubiendoCloudinary(false);
      e.target.value = "";
    }
  };

  const handleGuardarEnlaceCloudinary = async () => {
    if (!enlaceCloudinary.trim()) {
      mostrarToast('Por favor pega un link de Cloudinary', 'error');
      return;
    }

    setEstadoGuardadoLink('guardando');

    try {
      if (!window.supabaseClient) {
        setEstadoGuardadoLink('error');
        mostrarToast('❌ Supabase no está disponible: el link no se pudo sincronizar', 'error');
        return;
      }

      try {
        await guardarFondoEnSupabase(selectedTemaId, enlaceCloudinary.trim());
      } catch (err: any) {
        console.error('Error de Supabase al guardar link:', err.message);
        setEstadoGuardadoLink('error');
        mostrarToast('❌ Error al guardar en Supabase: ' + err.message, 'error');
        return;
      }

      // Actualizar datos en la app
      setDatos(prev => {
        const currentBgImages = prev.bgImages || {};
        return {
          ...prev,
          bgImages: {
            ...currentBgImages,
            [selectedTemaId]: enlaceCloudinary.trim()
          }
        };
      });

      setEnlaceCloudinary('');
      setEstadoGuardadoLink('ok');
      mostrarToast(`✅ Fondo guardado y sincronizado para "${temaActual.nombre}"`, 'success');
    } catch (err: any) {
      setEstadoGuardadoLink('error');
      mostrarToast("Error al guardar enlace: " + err.message, "error");
    }
  };

  // Guarda el link del campo "pegar link directo" en Supabase (igual que el botón de guardar
  // enlace). Se llama al perder el foco, no en cada tecla, para no guardar URLs a medio escribir.
  const handleGuardarUrlDirecta = async () => {
    const url = (borradorUrlFondo ?? '').trim();
    if (!url) {
      setBorradorUrlFondo(null);
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      mostrarToast('El link debe empezar con http:// o https://', 'error');
      return;
    }
    if (url === datos.bgImages?.[selectedTemaId]) {
      setBorradorUrlFondo(null);
      return;
    }

    try {
      await guardarFondoEnSupabase(selectedTemaId, url);
      setDatos(prev => ({
        ...prev,
        bgImages: { ...(prev.bgImages || {}), [selectedTemaId]: url }
      }));
      setBorradorUrlFondo(null);
      mostrarToast(`✅ Fondo guardado y sincronizado para "${temaActual.nombre}"`, 'success');
    } catch (err: any) {
      mostrarToast('❌ No se pudo guardar el fondo en Supabase: ' + err.message, 'error');
    }
  };

  // Estado para la pestaña de configuración activa en el panel lateral
  const [panelPestana, setPanelPestana] = useState<"ajustes" | "quince" | "lugares" | "itincode" | "familia" | "regalos" | "fotos" | "invitados" | "personalizar">("ajustes");

  // Id de la fila en Supabase de la invitación que se está editando actualmente (si ya se
  // guardó al menos una vez). Permite que "Guardar en Supabase" actualice esa misma fila en
  // vez de crear una fila nueva cada vez que se guarda mientras se sigue editando el mismo
  // cliente. Se reinicia al usar "Limpiar formulario" (nueva invitación).
  const [supabaseRowId, setSupabaseRowId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('xv_supabase_row_id');
    } catch {
      return null;
    }
  });
  // Marca de tiempo de "el cliente llenó su formulario" (intake_actualizado_en) tal como estaba
  // cuando el admin abrió ESTA invitación en el editor -- se compara contra el valor en vivo
  // antes de "Guardar en Supabase" (ver handleGuardarEnSupabase) para detectar si el cliente
  // guardó su propio ?intake=1 mientras el admin tenía el editor abierto con datos viejos en
  // memoria. Antes "Guardar en Supabase" pisaba datos_completos entero sin leer nada primero --
  // a diferencia de IntakeForm.handleEnviar, que sí hace lectura-fusión-escritura. Hallazgo
  // real, 2026-11-02. `undefined` = baseline desconocido (ej. editor recargado desde el
  // respaldo local del navegador, sin pasar por "Abrir en editor") -- en ese caso no se avisa,
  // para no dar falsos positivos; `null` SÍ es un baseline conocido (significa "el cliente
  // todavía no había llenado su intake cuando se abrió esta invitación").
  const [intakeBaselineAlAbrir, setIntakeBaselineAlAbrir] = useState<string | null | undefined>(undefined);

  // Usuario con el que se entró al editor (isaac/vladimir/nidia/admin), leído del mismo header
  // de Basic Auth que ya mandó el navegador -- ver api/whoami.ts. Se usa para etiquetar quién
  // creó cada invitación nueva en "Mis Invitaciones", y para el filtro "Mías / Todas".
  const [usuarioActual, setUsuarioActual] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/whoami')
      .then(r => r.json())
      .then(d => setUsuarioActual(d.usuario || null))
      .catch(() => setUsuarioActual(null));
  }, []);

  // Botón "Instalar app" propio en vez de que cada quien tenga que encontrar el icono chiquito
  // del navegador. Chrome/Edge/Android avisan con el evento beforeinstallprompt -- lo guardamos
  // y lo disparamos nosotros al hacer clic. Safari/iOS no tiene este evento (no existe API para
  // instalar por código ahí), así que en iPhone el botón simplemente nunca aparece y ese usuario
  // sigue el paso manual de "Compartir -> Agregar a inicio".
  const [instalarPrompt, setInstalarPrompt] = useState<any>(
    () => (window as any).__deferredInstallPrompt || null
  );
  useEffect(() => {
    // Por si el evento ya se había capturado en index.html antes de que este componente
    // montara (ver ese archivo) -- lo recoge aquí también, no solo en el useState inicial,
    // por si llega justo entre el primer render y este efecto.
    if ((window as any).__deferredInstallPrompt && !instalarPrompt) {
      setInstalarPrompt((window as any).__deferredInstallPrompt);
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
      setInstalarPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    const onInstalled = () => { (window as any).__deferredInstallPrompt = null; setInstalarPrompt(null); };
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Estado para controles de copiado temporal
  const [htmlCopiado, setHtmlCopiado] = useState(false);
  const [datosCopiados, setDatosCopiados] = useState(false);
  const [generandoEnlace, setGenerandoEnlace] = useState(false);

  // Estado para mostrar modal de fondos guardados
  const [mostrarFondosGuardados, setMostrarFondosGuardados] = useState(false);
  const [cargandoFondos, setCargandoFondos] = useState(true);
  // Texto que el usuario está escribiendo en "pegar link directo" (null = mostrar el fondo guardado)
  const [borradorUrlFondo, setBorradorUrlFondo] = useState<string | null>(null);

  // Estado para el panel "Mis Invitaciones": lista de invitaciones de clientes guardadas en
  // Supabase, para poder reabrirlas y seguir editándolas, borrarlas, o marcar hasta cuándo
  // deben quedarse activas (bookkeeping propio del admin, ver InvitacionGuardadaRow).
  const [mostrarMisInvitaciones, setMostrarMisInvitaciones] = useState(false);
  const [cargandoMisInvitaciones, setCargandoMisInvitaciones] = useState(false);
  // Bug real reportado 2026-11-21: cuando cargarListaInvitaciones fallaba (ej. un 401 del
  // middleware, que hace que resp.json() truene), listaInvitaciones se quedaba en [] y el modal
  // mostraba "Aún no has guardado ninguna invitación" -- el mensaje de "cuenta nueva sin datos",
  // indistinguible de un error real de carga. `errorCargaInvitaciones` guarda el mensaje del
  // último fallo (null = sin error); se limpia al INICIO de cada carga (éxito o no) y se pone
  // solo en el catch -- así el modal (y el Dashboard de Ingresos, que comparte el mismo
  // `listaInvitaciones.length === 0` para el mismo mensaje) pueden distinguir "no hay nada
  // guardado" de "no se pudo cargar".
  const [errorCargaInvitaciones, setErrorCargaInvitaciones] = useState<string | null>(null);
  // "🗄️ Respaldo completo" ahora pide `datos_completos` de TODAS las invitaciones aparte (ver
  // handleRespaldoCompletoInvitaciones) -- la lista ligera ya no lo trae de entrada (2026-11-19).
  const [generandoRespaldoCompleto, setGenerandoRespaldoCompleto] = useState(false);
  const [listaInvitaciones, setListaInvitaciones] = useState<InvitacionGuardadaRow[]>([]);
  // Confirmaciones (RSVP) por invitación, cargadas bajo demanda al expandir una fila en el
  // panel (evita N+1 queries al abrir la lista si hay muchas invitaciones guardadas).
  const [confirmacionesPorInvitacion, setConfirmacionesPorInvitacion] = useState<Record<string, ConfirmacionRSVP[]>>({});
  // Analítica de aperturas (2026-11-19) -- número de aperturas de cada invitación, cargado
  // bajo demanda igual que confirmacionesPorInvitacion. null = la consulta falló (ej. la tabla
  // "aperturas" todavía no existe en Supabase) -- se muestra "—" en vez de romper la lista.
  const [aperturasPorInvitacion, setAperturasPorInvitacion] = useState<Record<string, number | null>>({});
  const [invitacionExpandidaId, setInvitacionExpandidaId] = useState<string | null>(null);
  const [invitacionPagosExpandidaId, setInvitacionPagosExpandidaId] = useState<string | null>(null);
  const [invitacionMensajesExpandidaId, setInvitacionMensajesExpandidaId] = useState<string | null>(null);
  // Pestaña "Vigencia y acceso" de la ficha de cliente (2026-11-18, rediseño de "Mis
  // Invitaciones" pedido por el usuario: antes vigencia/bloqueo se mostraban siempre
  // visibles en la fila; ahora viven como una 4ta pestaña, igual que pagos/mensajes/confirmaciones).
  const [invitacionAccesoExpandidaId, setInvitacionAccesoExpandidaId] = useState<string | null>(null);
  // Menú "⋯" (duplicar/respaldo/eliminar) de una fila -- mismo rediseño, mueve las acciones
  // poco usadas fuera de la vista siempre-visible.
  const [invitacionMenuAbiertoId, setInvitacionMenuAbiertoId] = useState<string | null>(null);
  // Historial de abonos por invitación (tabla `abonos`), cargado bajo demanda al ver el
  // historial en el panel de Pagos y estatus.
  const [abonosPorInvitacion, setAbonosPorInvitacion] = useState<Record<string, Abono[]>>({});
  const [historialAbonosExpandidoId, setHistorialAbonosExpandidoId] = useState<string | null>(null);
  // Avisos de pago del cliente pendientes de revisar, por invitación.
  const [avisosPagoPorInvitacion, setAvisosPagoPorInvitacion] = useState<Record<string, AvisoPago[]>>({});
  const [montoAvisoManual, setMontoAvisoManual] = useState<Record<string, string>>({});
  const [cargandoAbonos, setCargandoAbonos] = useState(false);
  // Motivo elegido en el selector de apagar/encender acceso, por fila -- se lee al momento de
  // apagar (ver MOTIVOS_BLOQUEO / handleActualizarBloqueoInvitacion más arriba).
  const [motivoBloqueoSeleccionado, setMotivoBloqueoSeleccionado] = useState<Record<string, string>>({});
  // Motivo libre escrito antes de pausar una invitación (2026-11-22, "Pausa por falta de pago")
  // -- a diferencia de MOTIVOS_BLOQUEO (una lista fija de razones), la pausa es texto libre.
  const [motivoPausaSeleccionado, setMotivoPausaSeleccionado] = useState<Record<string, string>>({});
  // Teléfono del encargado de acceso (asistente, wedding planner, etc.) para mandarle el link
  // de Control de Acceso QR -- a propósito NO se guarda en la fila como telefono_whatsapp (ese
  // es el del cliente): se escribe cada vez porque suele ser una persona distinta al cliente.
  const [telefonoCheckinPorInvitacion, setTelefonoCheckinPorInvitacion] = useState<Record<string, string>>({});
  const [montoNuevoAbono, setMontoNuevoAbono] = useState<Record<string, string>>({});
  const [notaNuevoAbono, setNotaNuevoAbono] = useState<Record<string, string>>({});
  // Sección "Complementos" de "Administrar cliente" → Pagos: cantidad elegida para un renglón
  // del catálogo con cantidad (Familia extra/Ajustes extra) -- llave `${invitacionId}:${clave}`
  // (2026-11-22 v4, "Complementos en un solo bloque") porque ahora el catálogo completo se
  // muestra siempre (no un picker con un solo complemento seleccionado a la vez), así que puede
  // haber más de un renglón con cantidad visible al mismo tiempo para la misma invitación.
  const [cantidadComplemento, setCantidadComplemento] = useState<Record<string, number>>({});
  const [busquedaInvitaciones, setBusquedaInvitaciones] = useState("");
  const [filtroEstatusInvitaciones, setFiltroEstatusInvitaciones] = useState("todos");
  // Pestañas de la lista (reemplazan los chips sueltos de "urgentes/pendientes/próximos" de
  // antes, 2026-11-19): "activas" es la vista inicial al abrir el panel (bug real reportado
  // 2026-11-20: con "atencion" como default, si no hay ninguna invitación urgente en ese momento
  // -- el caso normal -- la lista se veía vacía pese a que sí había datos cargados; "🔥 Requieren
  // atención" sigue existiendo, solo deja de ser la vista inicial) -- ver el onClick que abre
  // "Mis Invitaciones", que la resetea a "activas" cada vez que se abre el panel.
  const [pestanaListaInvitaciones, setPestanaListaInvitaciones] = useState<"atencion" | "activas" | "pasados">("activas");
  // Filtro por tipo de evento (2026-11-19) -- se combina con la pestaña de estado y el
  // buscador de arriba, todo sobre la lista ya cargada (sin pedir nada nuevo a Supabase).
  const [filtroEventoInvitaciones, setFiltroEventoInvitaciones] = useState<"todos" | GrupoFiltroEvento>("todos");
  // "Mías / Todas" -- todos ven el trabajo de todos por default (no se ocultan invitaciones
  // entre isaac/vladimir/nidia), este filtro es solo para que cada quien pueda ubicar rápido
  // lo suyo sin tener que buscarlo entre el resto.
  const [filtroCreadorInvitaciones, setFiltroCreadorInvitaciones] = useState<"todas" | "mias">("todas");
  // Qué fila está expandida mostrando su detalle (nombre completo/badges, botones, pestañas de
  // pagos/mensajes/confirmaciones/acceso, links de la clienta) -- cada renglón empieza
  // colapsado a una sola línea para que la lista siga siendo manejable con 200+ invitaciones.
  const [invitacionFilaExpandidaId, setInvitacionFilaExpandidaId] = useState<string | null>(null);

  // Estado para el "Dashboard de Ingresos": totales y desglose histórico de ingresos, aparte
  // del detalle por-invitación que ya vive en "Mis Invitaciones". Usa la tabla `abonos`
  // completa (no filtrada por invitación) porque es la única fuente con fecha real de cada
  // pago -- `invitaciones.precio_pagado` es solo el acumulado, sin ubicación en el tiempo.
  const [mostrarDashboardIngresos, setMostrarDashboardIngresos] = useState(false);
  const [cargandoDashboardIngresos, setCargandoDashboardIngresos] = useState(false);
  const [abonosTodos, setAbonosTodos] = useState<{ invitacion_id: string; monto: number; creado_en: string }[]>([]);
  // Alta rápida de "Nuevo Cliente": lo primero que se hace al vender un paquete -- guarda un
  // registro en Supabase de inmediato (estatus "Cotización") con solo nombre + celular, antes
  // de llenar el resto de la invitación.
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("52");
  const [nuevoClientePaquete, setNuevoClientePaquete] = useState<"basico" | "premium" | "deluxe">("basico");
  const [creandoNuevoCliente, setCreandoNuevoCliente] = useState(false);
  const [cargandoConfirmaciones, setCargandoConfirmaciones] = useState(false);

  // Optimizaciones de PC: Dispositivo de vista previa y escala de zoom
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);

  // Arrastrar para mover el Monitor de Invitación (pedido 2026-11-18, junto con dejar el
  // Monitor fijo mientras el panel izquierdo hace su propio scroll): a 100% de zoom el mockup
  // de celular/tablet puede ser más alto que el espacio visible, y centrarlo con
  // "items-center" (como estaba) hace que la parte de arriba quede atrapada -- sin forma de
  // llegar ahí ni con la rueda del mouse ni arrastrando la barra de scroll (bug conocido de
  // flexbox: contenido centrado que se desborda nunca deja alcanzar el lado de "antes" del
  // centro). Se cambió a "items-start" (ver más abajo) y, además, se agregó arrastre real con
  // el mouse sobre el fondo del Monitor para poder mover la vista con comodidad.
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const [arrastrandoPreview, setArrastrandoPreview] = useState(false);
  const previewDragInicio = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const iniciarArrastrePreview = (e: MouseEvent) => {
    const el = previewScrollRef.current;
    if (!el) return;
    previewDragInicio.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    setArrastrandoPreview(true);
  };
  const moverArrastrePreview = (e: MouseEvent) => {
    if (!arrastrandoPreview) return;
    const el = previewScrollRef.current;
    if (!el) return;
    el.scrollLeft = previewDragInicio.current.scrollLeft - (e.clientX - previewDragInicio.current.x);
    el.scrollTop = previewDragInicio.current.scrollTop - (e.clientY - previewDragInicio.current.y);
  };
  const terminarArrastrePreview = () => setArrastrandoPreview(false);

  // Estados para compartir por WhatsApp
  const [whatsappDestino, setWhatsappDestino] = useState("522217445410");
  const [whatsappTemplateId, setWhatsappTemplateId] = useState("completo");
  const [selectedInvitadoIndex, setSelectedInvitadoIndex] = useState<number>(-1);
  const [esEnlaceMuestra, setEsEnlaceMuestra] = useState(false);

  // Estados locales para nuevos elementos interactivos de listas
  const [nuevoItinHora, setNuevoItinHora] = useState("");
  const [nuevoItinEvento, setNuevoItinEvento] = useState("");
  
  const [nuevoPadre, setNuevoPadre] = useState("");
  const [nuevoPadrino, setNuevoPadrino] = useState("");

  const [nuevoInvitadoNombre, setNuevoInvitadoNombre] = useState("");
  const [nuevoInvitadoPases, setNuevoInvitadoPases] = useState(2);

  const [mostrarImportarLista, setMostrarImportarLista] = useState(false);
  const [textoImportarInvitados, setTextoImportarInvitados] = useState("");

  const [qrVisibleIndex, setQrVisibleIndex] = useState<number | null>(null);

  const [nuevoFotoUrl, setNuevoFotoUrl] = useState("");

  // Referencia al iframe para actualizar la vista previa de forma aislada
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Tema seleccionado real
  const temaActual = temas.find(t => t.id === selectedTemaId) || temas[0];

  // Estilo efectivo de los cajones de sección: si ya se eligió explícitamente con los botones
  // nuevos, se respeta; si no, se deriva del boolean legacy `mostrarCajasSecciones` para no
  // cambiarle el look a invitaciones guardadas antes de este cambio (ver generarHTMLFinal).
  const estiloCajasEfectivo = datos.estiloCajasSecciones || (datos.mostrarCajasSecciones === false ? "sin_cajon" : "normal");

  // Estado para saber si el tema actual tiene un diseño guardado en el catálogo
  const [tieneDiseñoGuardado, setTieneDiseñoGuardado] = useState<boolean>(false);

  // Sincronizar el estado del diseño guardado al cambiar el tema actual
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`xv_diseño_guardado_tema_${selectedTemaId}`);
      setTieneDiseñoGuardado(!!saved);
    } catch (e) {
      setTieneDiseñoGuardado(false);
    }
  }, [selectedTemaId]);

  // Sincronizar tema de datos cuando elegimos tema
  useEffect(() => {
    setDatos(prev => ({
      ...prev,
      tema: selectedTemaId
    }));
  }, [selectedTemaId]);

  // Recuerda qué apertura/tema tenía la última vez que regeneramos el preview, para saber
  // si el cambio actual es justo el que afecta la apertura (en cuyo caso sí queremos volver
  // a mostrarla) o es cualquier otro campo (en cuyo caso preferimos no interrumpir al usuario).
  const previaAperturaRef = useRef<{ tipo?: string; temaId?: string }>({ tipo: undefined, temaId: undefined });

  // Actualizar la vista previa dentro del iframe de simulación de smartphone
  const actualizarVistaPrevia = () => {
    if (!iframeRef.current) return;

    const tipoAperturaActual = datos.personalizacion?.tipoApertura;
    const cambioAfectaApertura =
      previaAperturaRef.current.tipo !== tipoAperturaActual || previaAperturaRef.current.temaId !== temaActual.id;
    previaAperturaRef.current = { tipo: tipoAperturaActual, temaId: temaActual.id };

    // Si el usuario ya "abrió" la invitación en el preview y lo que cambió NO es el tipo de
    // apertura ni el tema (ej. edita un texto, sube una foto, cambia colores), conservamos
    // ese estado y el scroll al regenerar el HTML en vez de mandarlo de vuelta a la pantalla
    // de apertura. Si sí cambió la apertura o el tema, queremos que la vea desde el inicio.
    let yaAbierta = false;
    let scrollY = 0;
    if (!cambioAfectaApertura) {
      try {
        const doc = iframeRef.current.contentDocument;
        const win = iframeRef.current.contentWindow;
        if (doc?.body?.classList.contains("experiencia-iniciada")) {
          yaAbierta = true;
          scrollY = win?.scrollY || 0;
        }
      } catch {
        // Iframe todavía sin cargar o sin acceso: se regenera desde la pantalla de apertura.
      }
    }

    const htmlString = generarHTMLFinal(datos, temaActual, { esVistaPreviaEditor: true });

    if (yaAbierta) {
      const iframeEl = iframeRef.current;
      iframeEl.addEventListener("load", function restaurarEstadoAbierto() {
        iframeEl.removeEventListener("load", restaurarEstadoAbierto);
        const doc = iframeEl.contentDocument;
        const win = iframeEl.contentWindow as (Window & { iniciarAnimacionCaida?: () => void }) | null;
        if (!doc || !win) return;
        doc.body.classList.add("experiencia-iniciada");
        doc.getElementById("pantalla-apertura")?.remove();
        doc.getElementById("music-widget")?.classList.remove("hidden");
        win.iniciarAnimacionCaida?.();
        win.scrollTo(0, scrollY);
      }, { once: true });
    }

    // Asignamos el HTML al iframe usando srcdoc para evitar contaminación global de estilos y permitir scripts
    iframeRef.current.srcdoc = htmlString;

    setGenerandoEnlace(true);
    setTimeout(() => {
      setGenerandoEnlace(false);
    }, 1200);
  };

  // Escucha cambios en datos o tema para refrescar la visualización en vivo. También escucha
  // previewDevice: Móvil/Tablet/Escritorio son <iframe> DISTINTOS que se montan y desmontan al
  // cambiar de mockup (cada uno pierde el srcdoc del anterior), así que sin esta dependencia el
  // iframe recién montado de Tablet/Escritorio nacía vacío y solo Móvil (el que ya traía
  // contenido del montaje inicial) parecía funcionar.
  //
  // El refresh está debounced (350ms desde la última tecla) a propósito: `datos` cambia en
  // cada pulsación de teclado (los inputs son controlados), y cada refresh reemplaza el
  // `srcdoc` completo del iframe -- eso reinicia la animación de caída y crea una carrera entre
  // "leer el scroll del iframe viejo" y "restaurarlo en el nuevo" (ver actualizarVistaPrevia).
  // Sin este debounce, escribir rápido hacía que la invitación pareciera saltar/scrollear sola
  // en cada letra. Con el debounce, mientras escribes no se recarga nada (se sigue viendo la
  // versión anterior, sin moverse) y se actualiza una sola vez al hacer una pausa -- suficiente
  // para sentirse en tiempo real sin el parpadeo por tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      actualizarVistaPrevia();
    }, 350);
    return () => clearTimeout(timer);
  }, [datos, temaActual, previewDevice]);

  // Aplicar plantilla completa predefinida de un paquete
  const handleCambiarPaquete = (paqKey: "basico" | "premium" | "deluxe") => {
    // Si ya hay contenido real cargado (nombre, invitados o padres), cambiar de paquete solo
    // debe ajustar el nivel/secciones disponibles, NO reemplazar los datos del cliente por
    // datos de prueba. El reemplazo total solo tiene sentido cuando el formulario está vacío
    // (invitación nueva, aún sin datos reales) y sirve como plantilla de arranque rápido.
    const tieneContenidoReal = Boolean(
      datos.nombre?.trim() || (datos.invitados && datos.invitados.length > 0) || (datos.padres && datos.padres.length > 0)
    );

    setConfirmModal({
      titulo: `Cambiar al paquete "${paqKey.toUpperCase()}"`,
      mensaje: tieneContenidoReal
        ? `Vas a cambiar al paquete "${paqKey.toUpperCase()}". Tus datos actuales (invitados, direcciones, fotos, etc.) se conservan — solo cambia el nivel de paquete y las secciones disponibles. Si en vez de esto quieres cargar datos de ejemplo desde cero, usa "Limpiar formulario" primero. ¿Deseas proceder?`
        : `Al cambiar al paquete "${paqKey.toUpperCase()}", cargaremos los datos de prueba idóneos para ese nivel de secciones. ¿Deseas proceder?`,
      onAceptar: () => {
        if (tieneContenidoReal) {
          const maxFotosNuevoPaquete = paquetes[paqKey].maxFotos;
          // Cada cambio de paquete recalcula desde cero las secciones condicionadas por nivel
          // (familia/regalos/hashtag/calendario/pases) -- antes esto solo se ajustaba al bajar a
          // Básico, así que subir a Premium/Deluxe dejaba esas secciones apagadas si ya venían
          // excluidas de un paquete anterior, en vez de prenderlas como corresponde al nuevo
          // nivel (hallazgo real 2026-11-05, reportado por el usuario probando Deluxe).
          const seccionesExcluidasAjustadas = recalcularSeccionesPorPaquete(datos.seccionesExcluidas, paqKey);
          const pasesQuedaExcluido = seccionesExcluidasAjustadas.includes("pases");
          setDatos(prev => ({
            ...prev,
            paquete: paqKey,
            fotos: (prev.fotos || []).slice(0, maxFotosNuevoPaquete),
            seccionesExcluidas: seccionesExcluidasAjustadas,
            controlAccesoQR: pasesQuedaExcluido ? false : prev.controlAccesoQR
          }));
        } else {
          const datosBase = datosDefault[paqKey];
          setDatos(prev => ({
            ...datosBase,
            paquete: paqKey,
            bgImages: { ...prev.bgImages, ...datosBase.bgImages } // Preservamos los fondos subidos
          }));
          setSelectedTemaId(datosBase.tema);
        }
        setPanelPestana("ajustes");
        mostrarToast(`¡Se ha cambiado al paquete ${paqKey.toUpperCase()}! ✨`, "success");
      }
    });
  };

  // Cambia el tipo de evento de la invitación actual (selector "Tipo de Evento", pestaña
  // "Quinceañera"/datos principales). Solo rellena mensaje de bienvenida/itinerario con un
  // ejemplo del tipo nuevo cuando el actual sigue siendo exactamente un default "de fábrica"
  // conocido -- si el admin (o el cliente desde su propio formulario) ya los editó, se
  // respetan tal cual, nunca se sobreescriben. Nada de esto toca temas, paquetes, precios ni
  // secciones -- solo estas dos piezas de texto de ejemplo.
  const handleSeleccionarTipoEvento = (tipo: TipoEvento) => {
    setDatos(prev => {
      const mensajeEsDefaultConocido = !prev.mensajeBienvenida?.trim() || MENSAJES_BIENVENIDA_DEFAULT_CONOCIDOS.includes(prev.mensajeBienvenida);
      const nuevoMensajeDefault = MENSAJE_BIENVENIDA_POR_EVENTO[tipo];
      const mensajeBienvenida = (tipo !== "xv" && nuevoMensajeDefault && mensajeEsDefaultConocido)
        ? nuevoMensajeDefault
        : prev.mensajeBienvenida;

      let itinerario = prev.itinerario;
      if (tipo === "boda" && ITINERARIOS_DEFAULT_CONOCIDOS_JSON.includes(JSON.stringify(prev.itinerario))) {
        itinerario = ITINERARIO_BODA_POR_PAQUETE[prev.paquete] || prev.itinerario;
      }

      return { ...prev, tipoEvento: tipo, mensajeBienvenida, itinerario };
    });
  };

  // Limpiar formulario completo
  const handleLimpiarFormulario = () => {
    setConfirmModal({
      titulo: "Limpiar formulario completo",
      mensaje: "¿Estás seguro de que deseas reiniciar todos los campos del generador a su estado inicial?",
      onAceptar: () => {
        setDatos(prev => ({
          paquete: "basico",
          tema: "dorado-clasico",
          nombre: "",
          fecha: new Date().toISOString().substring(0, 16),
          mensajeBienvenida: "Estás invitado a compartir conmigo la alegría de mis quince años.",
          ceremonia: { lugar: "", hora: "", direccion: "", maps: "" },
          recepcion: { lugar: "", hora: "", direccion: "", maps: "" },
          itinerario: [],
          dressCode: "Formal",
          colorSugerido: ["#D4AF37", "#FFFFFF"],
          padres: [],
          padrinos: [],
          mesaRegalos: "",
          datosBancarios: "",
          fotos: [],
          hashtag: "",
          whatsappConfirmacion: "52",
          cancion: "",
          linkPersonalizado: "",
          invitados: [],
          bgImages: prev.bgImages, // Preservamos los fondos subidos
          // "Pases de Entrada" es a la carta en Básico (el paquete al que resetea Limpiar):
          // apagada por default, igual que en datosDefault.basico.
          seccionesExcluidas: ["pases"]
        }));
        setSelectedTemaId("dorado-clasico");
        // Nueva invitación: si se guarda en Supabase de nuevo, debe crear una fila nueva,
        // no seguir actualizando la fila de la invitación anterior.
        setSupabaseRowId(null);
        setIntakeBaselineAlAbrir(null);
        try { localStorage.removeItem('xv_supabase_row_id'); } catch {}
        mostrarToast("¡El formulario ha sido reiniciado! 💮", "info");
      }
    });
  };

  // Trae la lista de invitaciones de clientes guardadas en Supabase para el panel "Mis
  // Invitaciones". Excluye la fila fija de fondos personalizados (no es una invitación real).
  const cargarListaInvitaciones = async () => {
    if (!window.supabaseClient) {
      mostrarToast("Supabase no está configurado en este entorno.", "error");
      return;
    }
    setCargandoMisInvitaciones(true);
    setErrorCargaInvitaciones(null);
    try {
      // Pasa por api/admin/list-invitaciones.ts (service_role key en el servidor, protegido
      // por el Basic Auth de middleware.ts) en vez de leer la tabla completa directo con la
      // anon key -- ver el comentario en ese archivo para el porqué.
      const resp = await fetch("/api/admin/list-invitaciones");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Error al cargar invitaciones");
      let filas = (data || []) as InvitacionGuardadaRow[];

      // Estatus automático "Evento pasado": si la fecha del evento ya pasó y el estatus sigue
      // en cualquier etapa "activa" (no se toca si el admin ya lo archivó o ya lo había
      // marcado como evento pasado), lo actualizamos aquí para que nadie tenga que acordarse
      // de hacerlo a mano. Se revisa cada vez que se abre el panel.
      const hoyISO = new Date().toISOString().substring(0, 10);
      const idsAActualizar = filas
        .filter(r => r.fecha_fiesta && r.fecha_fiesta < hoyISO && r.estado !== "evento_pasado" && r.estado !== "archivada")
        .map(r => r.id);
      if (idsAActualizar.length > 0) {
        const { error: errAuto } = await window.supabaseClient
          .from("invitaciones")
          .update({ estado: "evento_pasado" })
          .in("id", idsAActualizar);
        if (!errAuto) {
          filas = filas.map(r => idsAActualizar.includes(r.id) ? { ...r, estado: "evento_pasado" } : r);
        }
      }

      setListaInvitaciones(filas);
    } catch (err: any) {
      mostrarToast("Error al cargar invitaciones: " + err.message, "error");
      setErrorCargaInvitaciones(err.message || "Error al cargar invitaciones");
    } finally {
      setCargandoMisInvitaciones(false);
    }
  };

  // Trae el `datos_completos` (y el resto de columnas) de UNA invitación bajo demanda, para
  // las acciones que de verdad lo necesitan (abrir en editor, exportar JSON, duplicar, mandar
  // su vista previa por WhatsApp, revisar sus invitados contra confirmaciones, etc.) -- la
  // lista ligera de cargarListaInvitaciones ya no lo trae de entrada (ver el comentario ahí y
  // en api/admin/list-invitaciones.ts). Si ya se había traído antes en esta misma sesión del
  // panel (quedó cacheado en listaInvitaciones), no vuelve a pedirlo. Devuelve la fila con el
  // dato ya resuelto (o `datos_completos: null` si de verdad no hay nada guardado ahí); el
  // llamador sigue revisando `datos_completos` después de llamar esto, igual que antes.
  const asegurarDatosCompletos = async (row: InvitacionGuardadaRow): Promise<InvitacionGuardadaRow> => {
    if (row.datos_completos !== undefined) return row;
    try {
      const resp = await fetch(`/api/admin/get-invitacion?id=${encodeURIComponent(row.id)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Error al cargar la invitación completa");
      const filaCompleta: InvitacionGuardadaRow = {
        ...row,
        ...data,
        paquete: (data?.datos_completos?.paquete as "basico" | "premium" | "deluxe" | undefined) ?? row.paquete,
        tipoEvento: (data?.datos_completos?.tipoEvento as TipoEvento | undefined) ?? row.tipoEvento
      };
      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? filaCompleta : r));
      return filaCompleta;
    } catch (err: any) {
      mostrarToast("Error al cargar los datos completos de esta invitación: " + err.message, "error");
      return row;
    }
  };

  // Carga los datos del "Dashboard de Ingresos": reutiliza listaInvitaciones (si ya se cargó
  // antes, no la vuelve a pedir) para los totales por paquete/pendiente, y trae la tabla
  // `abonos` COMPLETA (todas las invitaciones, no solo una) para el histórico mes a mes.
  const cargarDashboardIngresos = async () => {
    if (!window.supabaseClient) {
      mostrarToast("Supabase no está configurado en este entorno.", "error");
      return;
    }
    setCargandoDashboardIngresos(true);
    try {
      if (listaInvitaciones.length === 0) {
        await cargarListaInvitaciones();
      }
      // Igual que cargarListaInvitaciones: pasa por api/admin/abonos.ts (service_role key en
      // el servidor) en vez de leer la tabla completa de abonos de TODOS los clientes directo
      // con la anon key.
      const resp = await fetch("/api/admin/abonos");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Error al cargar abonos");
      setAbonosTodos((data || []) as { invitacion_id: string; monto: number; creado_en: string }[]);
    } catch (err: any) {
      mostrarToast("Error al cargar el dashboard de ingresos: " + err.message, "error");
    } finally {
      setCargandoDashboardIngresos(false);
    }
  };

  // Muestra/oculta las confirmaciones (RSVP) de una fila en el panel "Mis Invitaciones",
  // cargándolas de Supabase la primera vez que se expande (luego quedan en caché en el estado).
  const toggleConfirmacionesInvitacion = async (row: InvitacionGuardadaRow, forzarAbrir = false) => {
    if (!forzarAbrir && invitacionExpandidaId === row.id) {
      setInvitacionExpandidaId(null);
      return;
    }
    setInvitacionExpandidaId(row.id);
    // El detalle de "quién tiene pases asignados pero no ha confirmado" (ver abajo, en el
    // render) necesita datos_completos.invitados -- que la lista ligera ya no trae de entrada
    // (2026-11-19). Se pide en paralelo, igual que las aperturas, sin bloquear el resto.
    asegurarDatosCompletos(row);
    // Analítica de aperturas (2026-11-19): se carga EN PARALELO con las confirmaciones, mismo
    // momento/mismo disparador (lazy, solo al abrir esta pestaña, no para las N filas de la
    // lista de un jalón) -- pero en su propio try/catch independiente: si la tabla "aperturas"
    // todavía no existe en Supabase (el dueño corre docs/sql/aperturas.sql por separado), eso
    // nunca debe tumbar ni bloquear la carga de confirmaciones, que sí es una tabla real de
    // siempre. Se queda en "—" (ver render) en vez de un número si falla.
    if (aperturasPorInvitacion[row.id] === undefined && window.supabaseClient) {
      window.supabaseClient
        .from("aperturas")
        .select("id", { count: "exact", head: true })
        .eq("invitacion_id", row.id)
        .then(({ count, error }: { count: number | null; error: any }) => {
          setAperturasPorInvitacion(prev => ({ ...prev, [row.id]: error ? null : (count ?? 0) }));
        });
    }
    if (confirmacionesPorInvitacion[row.id] || !window.supabaseClient) return;
    setCargandoConfirmaciones(true);
    try {
      const { data, error } = await window.supabaseClient
        .from("confirmaciones")
        .select("id, nombre_invitado, asistencia, num_personas, creado_en")
        .eq("invitacion_id", row.id)
        .order("creado_en", { ascending: false });
      if (error) throw error;
      setConfirmacionesPorInvitacion(prev => ({ ...prev, [row.id]: (data || []) as ConfirmacionRSVP[] }));
    } catch (err: any) {
      mostrarToast("Error al cargar confirmaciones: " + err.message, "error");
    } finally {
      setCargandoConfirmaciones(false);
    }
  };

  // Corrige el número de personas de una confirmación ya recibida (ej. el invitado se
  // equivocó al llenar el RSVP).
  const handleActualizarPersonasConfirmacion = async (invitacionId: string, confirmacionId: string, numPersonas: number) => {
    if (!window.supabaseClient) return;
    try {
      const { error } = await window.supabaseClient.from("confirmaciones").update({ num_personas: numPersonas }).eq("id", confirmacionId);
      if (error) throw error;
      setConfirmacionesPorInvitacion(prev => ({
        ...prev,
        [invitacionId]: prev[invitacionId].map(c => c.id === confirmacionId ? { ...c, num_personas: numPersonas } : c)
      }));
    } catch (err: any) {
      mostrarToast("Error al actualizar: " + err.message, "error");
    }
  };

  // Elimina una confirmación individual (ej. una respuesta duplicada o hecha por error).
  const handleEliminarConfirmacion = async (invitacionId: string, confirmacionId: string) => {
    if (!window.supabaseClient) return;
    try {
      const { error } = await window.supabaseClient.from("confirmaciones").delete().eq("id", confirmacionId);
      if (error) throw error;
      setConfirmacionesPorInvitacion(prev => ({
        ...prev,
        [invitacionId]: prev[invitacionId].filter(c => c.id !== confirmacionId)
      }));
      mostrarToast("Confirmación eliminada", "success");
    } catch (err: any) {
      mostrarToast("Error al eliminar: " + err.message, "error");
    }
  };

  // Reabre en el editor una invitación previamente guardada, para seguir modificándola según
  // lo que vaya pidiendo el cliente. Las filas guardadas antes de que existiera la columna
  // `datos_completos` no se pueden recargar (solo tienen el resumen), así que se avisa en vez
  // de cargar un estado incompleto/roto. Trae el contenido completo bajo demanda (ver
  // asegurarDatosCompletos) -- la lista ligera de "Mis Invitaciones" ya no lo trae de entrada.
  const handleAbrirInvitacionGuardada = async (row: InvitacionGuardadaRow) => {
    const fila = await asegurarDatosCompletos(row);
    if (!fila.datos_completos) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para recargar.", "error");
      return;
    }
    // No reemplazar bgImages a ciegas con la foto congelada de ESTA invitación -- los fondos
    // personalizados son compartidos entre todas las invitaciones (viven en Supabase por tema,
    // no por invitación) y pueden haberse agregado/actualizado DESPUÉS de que esta invitación
    // se guardó por última vez. Sin este merge, cada vez que se reabre una invitación vieja
    // "desaparecían" de la pantalla los fondos más recientes (el archivo seguía intacto en
    // Cloudinary/Supabase, solo dejaba de verse el link guardado en el editor) hasta volver a
    // subirlos a mano.
    setDatos({
      ...fila.datos_completos,
      bgImages: {
        ...(fila.datos_completos.bgImages || {}),
        ...(datos.bgImages || {}),
      },
    });
    setSelectedTemaId(fila.datos_completos.tema || "dorado-clasico");
    setSupabaseRowId(fila.id);
    setIntakeBaselineAlAbrir(fila.intake_actualizado_en || null);
    try { localStorage.setItem("xv_supabase_row_id", fila.id); } catch {}
    setMostrarMisInvitaciones(false);
    setPanelPestana("ajustes");
    mostrarToast(`Invitación de "${fila.nombre_quinceanera || "cliente"}" cargada en el editor ✏️`, "success");
  };

  // "Guardar en Supabase" con chequeo de conflicto -- antes este botón llamaba a
  // guardarEnSupabase() directo, que sobrescribe datos_completos entero sin leer nada primero.
  // Si el cliente llenó su propio ?intake=1 (ceremonia, padrinos, fotos) mientras el admin
  // tenía el editor abierto con datos viejos en memoria, "Guardar en Supabase" pisaba eso en
  // silencio -- último que escribe gana, sin ningún aviso. Hallazgo real, 2026-11-02. Solo se
  // puede detectar si se conoce el baseline (ver intakeBaselineAlAbrir); si no se conoce (ej.
  // editor recargado desde el respaldo local sin pasar por "Abrir en editor"), se guarda
  // directo, igual que antes, en vez de bloquear con un chequeo que no se puede hacer bien.
  // Guarda de verdad (mismo camino de siempre) y devuelve el codigoCorto resultante -- ya
  // existente si la fila se conservaba, o recién generado si era nueva/no tenía -- o `null` si
  // el guardado falló. Extraído de handleGuardarEnSupabase (2026-11-19) para poder reusarlo
  // también desde "compartir guarda primero" (ver asegurarCodigoCortoParaEntregarLink) sin
  // duplicar esta lógica en dos lados.
  const ejecutarGuardadoYObtenerCodigo = async (): Promise<string | null> => {
    const finalLink = getShareUrl();
    try {
      const row = await guardarEnSupabase(datos, temaActual, finalLink, supabaseRowId, usuarioActual);
      let codigoResultante = datos.codigoCorto || null;
      if (row?.id) {
        setSupabaseRowId(row.id);
        setIntakeBaselineAlAbrir(row.intake_actualizado_en ?? null);
        try { localStorage.setItem('xv_supabase_row_id', row.id); } catch {}
        // El código corto (link `/v/<codigoCorto>`) se genera DENTRO de guardarEnSupabase --
        // hay que traerlo de vuelta al estado en memoria para que el siguiente "Compartir por
        // WhatsApp"/getShareUrl() ya lo use, y para no generar uno nuevo si se vuelve a
        // guardar (ver guardarEnSupabase: una fila existente conserva el que ya tenía).
        if (row.datos_completos?.codigoCorto) {
          codigoResultante = row.datos_completos.codigoCorto;
          if (codigoResultante !== datos.codigoCorto) {
            setDatos(prev => ({ ...prev, codigoCorto: codigoResultante as string }));
          }
        }
      }
      return codigoResultante;
    } catch {
      return null;
    }
  };

  // Guarda respetando el mismo aviso de "el cliente actualizó su formulario" que ya tenía
  // "Guardar en Supabase" -- compartido entre ese botón y cualquier acción de "compartir guarda
  // primero" que necesite guardar sin pasar por ahí (ver asegurarCodigoCortoParaEntregarLink).
  // Devuelve el codigoCorto resultante, `null` si el guardado falló de verdad, o `undefined` si
  // el admin canceló en el aviso de conflicto (distinto de un error real: no hay que avisarlo
  // como tal, el admin ya decidió no guardar a propósito).
  const guardarConChequeoDeConflicto = async (): Promise<string | null | undefined> => {
    if (supabaseRowId && intakeBaselineAlAbrir !== undefined && window.supabaseClient) {
      const { data } = await window.supabaseClient
        .from('invitaciones')
        .select('intake_actualizado_en')
        .eq('id', supabaseRowId)
        .maybeSingle();
      const intakeEnVivo = data?.intake_actualizado_en || null;
      if (intakeEnVivo !== intakeBaselineAlAbrir) {
        return new Promise((resolve) => {
          setConfirmModal({
            titulo: "El cliente actualizó su formulario",
            mensaje: "El cliente llenó o actualizó su propio formulario (fecha, ceremonia, padrinos, fotos, etc.) " +
              "después de que abriste esta invitación en el editor. Si guardas ahora, tus cambios de aquí van a " +
              "sobrescribir lo que el cliente acaba de capturar. Para no perderlo: cierra esto, abre la invitación " +
              "de nuevo desde \"Mis Invitaciones\" (así traes lo más reciente), y vuelve a hacer tus cambios. ¿Guardar " +
              "de todos modos y perder lo que el cliente capturó?",
            onAceptar: async () => { resolve(await ejecutarGuardadoYObtenerCodigo()); },
            onCancelar: () => resolve(undefined)
          });
        });
      }
    }
    return ejecutarGuardadoYObtenerCodigo();
  };

  const handleGuardarEnSupabase = async () => {
    const resultado = await guardarConChequeoDeConflicto();
    if (resultado === undefined) return; // cancelado en el aviso de conflicto, sin tronar como error
    if (resultado !== null) {
      mostrarToast('✅ Guardado en Supabase correctamente', 'success');
    } else {
      mostrarToast('❌ Error al guardar', 'error');
    }
  };

  // "Compartir guarda primero" (2026-11-19): antes de cualquier botón que ENTREGUE el link de
  // la invitación a la clienta o a un invitado (Compartir por WhatsApp, Copiar, Abrir link
  // directo), si todavía no existe un código corto asignado lo genera guardando primero -- así
  // ese link siempre sale corto, nunca el blob largo `?v=1&d=...`, aunque el admin nunca le haya
  // dado clic a "Guardar" antes. En modo "muestra" (esEnlaceMuestra) se deja pasar tal cual: ese
  // modo siempre usa el link largo de toda la vida, a propósito, no hace falta guardar para eso.
  // Devuelve `{ ok: false }` si hay que abortar sin compartir nada (si fue un error real ya se
  // avisó aquí mismo; si el admin canceló el aviso de conflicto, no hace falta avisar de nuevo).
  const asegurarCodigoCortoParaEntregarLink = async (): Promise<{ ok: true; codigo?: string } | { ok: false }> => {
    if (datos.codigoCorto || esEnlaceMuestra) return { ok: true, codigo: datos.codigoCorto };
    const resultado = await guardarConChequeoDeConflicto();
    if (resultado === undefined) return { ok: false };
    if (resultado === null) {
      mostrarToast("❌ No se pudo guardar la invitación -- intenta de nuevo antes de compartir", "error");
      return { ok: false };
    }
    return { ok: true, codigo: resultado };
  };

  // Descarga un respaldo del CONTENIDO completo de una invitación (todo InvitacionDatos: fotos,
  // itinerario, padrinos, mensaje, etc.) como archivo JSON -- el CSV de "Mis Invitaciones" solo
  // trae los campos de administración (nombre, pagos, estatus), no el diseño en sí. Trae el
  // contenido completo bajo demanda si todavía no se había pedido en esta sesión del panel.
  const handleDescargarRespaldoInvitacion = async (row: InvitacionGuardadaRow) => {
    const fila = await asegurarDatosCompletos(row);
    if (!fila.datos_completos) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para exportar.", "error");
      return;
    }
    const slug = (fila.nombre_quinceanera || "invitacion").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const blob = new Blob([JSON.stringify(fila.datos_completos, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respaldo-${slug}-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clona una invitación ya guardada como punto de partida para un cliente nuevo (mismo
  // tema/estilo/secciones, distinto nombre) -- crea una FILA NUEVA en Supabase (no toca la
  // original) y la deja cargada en el editor lista para renombrar y ajustar. Trae el contenido
  // completo bajo demanda si todavía no se había pedido en esta sesión del panel.
  const handleDuplicarInvitacionGuardada = async (row: InvitacionGuardadaRow) => {
    const fila = await asegurarDatosCompletos(row);
    if (!fila.datos_completos) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para duplicar.", "error");
      return;
    }
    const temaDuplicado = temas.find(t => t.id === fila.datos_completos!.tema) || temas[0];
    // Una copia es para un cliente NUEVO, que todavía no ha pagado ningún extra à la carte --
    // los extras que la invitación ORIGINAL ya tenía desbloqueados (QR de puerta, secciones
    // sueltas como "pases" en un Básico) no deben viajar activados solo porque el cliente
    // anterior sí los pagó. `recalcularSeccionesPorPaquete` es la MISMA función que ya usa el
    // selector de paquete (ver más abajo, ~línea 3445) para decidir qué secciones condicionadas
    // (pases/familia/regalos) quedan prendidas/apagadas según el plan -- se reutiliza aquí tal
    // cual, sin duplicar esa lógica. Solo se tocan estos 2 campos; tema/textos/fotos/invitados/
    // datos del evento y del cliente viajan igual que siempre (la copia es plantilla de
    // partida). El resto de seccionesExcluidas (secciones que el admin apagó a mano sin que
    // dependan del paquete, ej. "Galería") se conserva intacto -- lo que hace
    // recalcularSeccionesPorPaquete.
    const datosParaClon: InvitacionDatos = {
      ...fila.datos_completos,
      controlAccesoQR: false,
      seccionesExcluidas: recalcularSeccionesPorPaquete(fila.datos_completos.seccionesExcluidas, fila.datos_completos.paquete),
    };
    try {
      const nuevaFila = await guardarEnSupabase(datosParaClon, temaDuplicado, fila.link_invitacion || undefined, null, usuarioActual);
      if (!nuevaFila?.id) {
        mostrarToast("No se pudo duplicar la invitación", "error");
        return;
      }
      // Mismo merge que handleAbrirInvitacionGuardada -- no pisar los fondos personalizados
      // compartidos con la foto vieja congelada en esta invitación duplicada. `codigoCorto` se
      // sobreescribe a propósito con el de `nuevaFila` (el recién generado por
      // guardarEnSupabase para ESTA fila nueva) -- nunca el de `fila`, que es el de la
      // invitación ORIGINAL de la que se copió.
      setDatos({
        ...datosParaClon,
        codigoCorto: nuevaFila.datos_completos?.codigoCorto,
        bgImages: {
          ...(fila.datos_completos.bgImages || {}),
          ...(datos.bgImages || {}),
        },
      });
      setSelectedTemaId(fila.datos_completos.tema || "dorado-clasico");
      setSupabaseRowId(nuevaFila.id);
      setIntakeBaselineAlAbrir(null); // fila nueva (copia) -- sin intake propio todavia, nada con que pueda chocar
      try { localStorage.setItem("xv_supabase_row_id", nuevaFila.id); } catch {}
      setMostrarMisInvitaciones(false);
      setPanelPestana("ajustes");
      mostrarToast(`Copia de "${row.nombre_quinceanera || "la invitación"}" creada y cargada en el editor — cambia el nombre antes de compartirla. Los extras à la carte (QR de puerta y secciones sueltas) inician apagados en la copia y se activan cuando se registre su pago ✏️`, "success");
    } catch (err: any) {
      mostrarToast("Error al duplicar: " + err.message, "error");
    }
  };

  // Elimina la fila de Supabase. Nota importante para el admin: esto solo borra el registro de
  // este panel; el link ya compartido con el invitado (?v=1&d=...) sigue siendo autocontenido
  // y seguirá funcionando aunque se borre aquí, porque no depende de Supabase para mostrarse.
  const handleEliminarInvitacionGuardada = (row: InvitacionGuardadaRow) => {
    setConfirmModal({
      titulo: "Eliminar invitación guardada",
      mensaje: `¿Eliminar el registro de "${row.nombre_quinceanera || "esta invitación"}"? Esto solo borra tu registro en el panel — si ya le compartiste el link al invitado, ese link seguirá abriendo igual.`,
      onAceptar: async () => {
        if (!window.supabaseClient) return;
        try {
          const { error } = await window.supabaseClient.from("invitaciones").delete().eq("id", row.id);
          if (error) throw error;
          setListaInvitaciones(prev => prev.filter(r => r.id !== row.id));
          if (supabaseRowId === row.id) {
            setSupabaseRowId(null);
            setIntakeBaselineAlAbrir(null);
            try { localStorage.removeItem("xv_supabase_row_id"); } catch {}
          }
          mostrarToast("Invitación eliminada del panel", "success");
        } catch (err: any) {
          mostrarToast("Error al eliminar: " + err.message, "error");
        }
      }
    });
  };

  // Actualiza solo la fecha de vigencia (bookkeeping del admin) de una fila ya guardada.
  const handleActualizarVigenciaInvitacion = async (row: InvitacionGuardadaRow, nuevaFechaISO: string) => {
    if (!window.supabaseClient) return;
    try {
      const valor = nuevaFechaISO ? new Date(nuevaFechaISO).toISOString() : null;
      const { error } = await window.supabaseClient
        .from("invitaciones")
        .update({ activo_hasta: valor })
        .eq("id", row.id);
      if (error) throw error;
      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? { ...r, activo_hasta: valor } : r));
      mostrarToast("Vigencia actualizada", "success");
    } catch (err: any) {
      mostrarToast("Error al actualizar vigencia: " + err.message, "error");
    }
  };

  // Apaga/enciende el acceso público de una invitación (vista de invitado ?v=1 e intake
  // ?intake=1) sin borrar nada -- 100% manual y reversible, nada en la app lo dispara solo.
  // El motivo es solo para el registro del admin (ver MOTIVOS_BLOQUEO); nunca se le muestra
  // al invitado el motivo específico, solo si está o no disponible.
  const handleActualizarBloqueoInvitacion = async (row: InvitacionGuardadaRow, bloqueada: boolean, motivo: string) => {
    if (!window.supabaseClient) return;
    try {
      const motivoAGuardar = bloqueada ? motivo : null;
      const { error } = await window.supabaseClient
        .from("invitaciones")
        .update({ bloqueada, motivo_bloqueo: motivoAGuardar })
        .eq("id", row.id);
      if (error) throw error;
      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? { ...r, bloqueada, motivo_bloqueo: motivoAGuardar } : r));
      mostrarToast(bloqueada ? "Acceso apagado" : "Acceso encendido de nuevo", "success");
    } catch (err: any) {
      mostrarToast("Error al actualizar el bloqueo: " + err.message, "error");
    }
  };

  // Pausa manual por falta de pago (2026-11-22, regla de negocio "revisión primero, entrega
  // final al liquidar") -- estado NUEVO, independiente de `bloqueada`/`handleActualizarBloqueoInvitacion`
  // de arriba (esa sigue siendo la vigencia/acceso de siempre del editor). Mientras `pausada`
  // sea true, TODAS las rutas públicas de esta invitación (vista, pases por familia, control de
  // acceso, formulario) muestran una pantalla genérica sin ningún dato -- ver pausaCheck en la
  // vista pública y los chequeos propios de CheckinPage/IntakeForm. 100% manual y reversible,
  // nada en la app la activa sola.
  const handleActualizarPausaInvitacion = async (row: InvitacionGuardadaRow, pausada: boolean, motivo: string) => {
    if (!window.supabaseClient) return;
    try {
      const pausadaEn = pausada ? new Date().toISOString() : null;
      const motivoAGuardar = pausada ? (motivo.trim() || "Falta de pago") : null;
      const { error } = await window.supabaseClient
        .from("invitaciones")
        .update({ pausada, pausada_en: pausadaEn, motivo_pausa: motivoAGuardar })
        .eq("id", row.id);
      if (error) throw error;
      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? { ...r, pausada, pausada_en: pausadaEn, motivo_pausa: motivoAGuardar } : r));
      mostrarToast(pausada ? "Invitación pausada" : "Invitación reactivada", "success");
    } catch (err: any) {
      mostrarToast("Error al actualizar la pausa: " + err.message, "error");
    }
  };

  // Actualiza un solo campo de administración de pedido (estatus, precios, pases/PDF pagado,
  // notas, link de pago) de una fila ya guardada, sin tocar el resto de columnas -- separado a
  // propósito de guardarEnSupabase (que guarda el DISEÑO) para que abrir/guardar la invitación
  // en el editor nunca pise estos datos de administración, y viceversa.
  const handleActualizarCampoInvitacion = async (
    row: InvitacionGuardadaRow,
    campo: "estado" | "precio_total" | "precio_pagado" | "pases_pagado" | "pdf_pagado" | "checkin_pagado" | "notas" | "link_pago",
    valor: string | number | boolean | null
  ) => {
    if (!window.supabaseClient) return;
    try {
      const { error } = await window.supabaseClient.from("invitaciones").update({ [campo]: valor }).eq("id", row.id);
      if (error) throw error;
      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? { ...r, [campo]: valor } : r));
    } catch (err: any) {
      mostrarToast("Error al guardar: " + err.message, "error");
    }
  };

  // Cambia el paquete de una invitación ya guardada directo desde "Mis Invitaciones", sin
  // tener que abrir el editor completo -- pedido explícito del usuario (2026-11-02): poder
  // elegir/corregir el paquete y mandar el formulario que le corresponde desde el mismo panel.
  // Igual que handleCambiarPaquete (editor), nunca reemplaza datos reales (nombre, invitados,
  // fotos, etc.), solo ajusta el nivel, recorta la galería si excede el nuevo máximo, y
  // corrige "pases" (à la carte en Básico/Premium, incluido en Deluxe) -- antes, cambiar de
  // paquete con contenido real cargado dejaba "pases" en el estado del paquete viejo (hallazgo
  // real: si ya pagó "pases" aparte, aunque baje de Deluxe se respeta, vía pases_pagado).
  //
  // 2026-11-22 v4 ("El paquete manda el precio total"): además recalcula `precio_total` --
  // precio base del paquete nuevo + la suma de los complementos ya agregados a ESTA invitación
  // (`row.complementos`, sin tocar) -- para que la pestaña "💳 Pagos" nazca con el precio
  // correcto sin que el admin tenga que calcularlo a mano. Sigue siendo editable después (el
  // input de "Precio total" no cambia), igual que hoy.
  const handleCambiarPaqueteInvitacion = async (row: InvitacionGuardadaRow, nuevoPaquete: "basico" | "premium" | "deluxe") => {
    if (!window.supabaseClient) return;
    const actual = row.paquete || "basico";
    if (actual === nuevoPaquete) return;
    try {
      const { data: fila, error: errLectura } = await window.supabaseClient
        .from("invitaciones")
        .select("datos_completos, complementos")
        .eq("id", row.id)
        .maybeSingle();
      if (errLectura) throw errLectura;
      const base: Partial<InvitacionDatos> = fila?.datos_completos || {};
      const complementosActuales = (fila?.complementos || []) as ComplementoInvitacion[];
      const sumaComplementos = complementosActuales.reduce((acc, c) => acc + c.precio * c.cantidad, 0);
      const nuevoPrecioTotal = PRECIO_BASE_PAQUETE[nuevoPaquete] + sumaComplementos;
      const maxFotosNuevo = paquetes[nuevoPaquete].maxFotos;
      // Igual que en handleCambiarPaquete (editor): cada cambio de paquete recalcula desde cero
      // las secciones condicionadas por nivel (familia/regalos/hashtag/calendario/pases) --
      // antes esto solo apagaba al bajar a Básico, dejando esas secciones apagadas al SUBIR de
      // paquete si ya venían excluidas (hallazgo real 2026-11-05). Excepción: si "pases" ya fue
      // pagado para esta invitación (row.pases_pagado), se respeta y no se vuelve a apagar aunque
      // el nuevo paquete lo trate como a la carte -- ya se cobró, no es un default sin pagar.
      const extrasPorPaquete = seccionesACartaPorPaquete(nuevoPaquete).filter(
        s => !(s === "pases" && row.pases_pagado)
      );
      const sinCondicionadas = (base.seccionesExcluidas || []).filter(
        s => !SECCIONES_CONDICIONADAS_POR_PAQUETE.includes(s)
      );
      const seccionesExcluidasNuevas = Array.from(new Set([...sinCondicionadas, ...extrasPorPaquete]));
      const pasesQuedaExcluido = seccionesExcluidasNuevas.includes("pases");
      // Mismo criterio que el toggle manual de "pases" en el editor (ver ~línea 2042): si
      // "pases" se excluye, el Control de Acceso QR no puede seguir activo -- depende de que
      // haya pases para escanear. Sin esto, un Deluxe con QR activado que se baja de paquete
      // se quedaba con controlAccesoQR:true y checkin_pagado marcado pero sin pases que lo
      // sustenten (hallazgo real, 2026-11-02).
      const actualizado: Partial<InvitacionDatos> = {
        ...base,
        paquete: nuevoPaquete,
        fotos: (base.fotos || []).slice(0, maxFotosNuevo),
        seccionesExcluidas: seccionesExcluidasNuevas,
        controlAccesoQR: pasesQuedaExcluido ? false : base.controlAccesoQR
      };
      const { error: errUpdate } = await window.supabaseClient
        .from("invitaciones")
        .update({ datos_completos: actualizado, precio_total: nuevoPrecioTotal })
        .eq("id", row.id);
      if (errUpdate) throw errUpdate;
      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? { ...r, datos_completos: actualizado, paquete: nuevoPaquete, precio_total: nuevoPrecioTotal } : r));
      mostrarToast(`Paquete cambiado a ${paquetes[nuevoPaquete].nombre} -- precio total: $${nuevoPrecioTotal.toLocaleString("es-MX")}.`, "success");
    } catch (err: any) {
      mostrarToast("Error al cambiar el paquete: " + err.message, "error");
    }
  };

  // Catálogo de complementos ofrecibles AHORA MISMO para esta invitación en particular
  // (2026-11-22, "Administrar cliente" → Complementos) -- se recalcula cada vez que se abre
  // "+ Agregar complemento" para no ofrecer algo que ya está activo (ya lo incluye el paquete,
  // ya se agregó antes, o todavía no aplica -- ej. Control de Acceso QR sin pases activo).
  // Nunca decide el precio por su cuenta: toma los mismos números que ya usa el resto del panel
  // (PRECIO_PASES_POR_PAQUETE/PRECIO_QR_ACCESO/etc., arriba).
  const catalogoComplementosDisponibles = (row: InvitacionGuardadaRow): { clave: string; nombre: string; precio: number }[] => {
    const paquete = row.paquete || "basico";
    const complementosActuales = row.complementos || [];
    const tieneClave = (clave: string) => complementosActuales.some(c => c.clave === clave);
    const pasesActivo = paquete === "deluxe" || row.pases_pagado || tieneClave("pases");
    const items: { clave: string; nombre: string; precio: number }[] = [];

    if (!pasesActivo) {
      const precioPases = PRECIO_PASES_POR_PAQUETE[paquete];
      if (precioPases != null) items.push({ clave: "pases", nombre: `Pases (${paquetes[paquete].nombre})`, precio: precioPases });
    }
    if (pasesActivo && !row.checkin_pagado && !tieneClave("checkin")) {
      items.push({ clave: "checkin", nombre: "Control de Acceso QR", precio: PRECIO_QR_ACCESO });
    }
    if (paquete !== "deluxe" && !row.pdf_pagado && !tieneClave("pdf")) {
      items.push({ clave: "pdf", nombre: "PDF de Regalo", precio: PRECIO_PDF_REGALO });
    }
    // Familia extra solo tiene sentido con pases activo (son familias de MÁS, arriba del tope
    // que ya trae el plan/complemento de pases) -- no se ofrece suelta sin eso.
    if (pasesActivo) {
      items.push({ clave: "familia-extra", nombre: "Familia extra", precio: PRECIO_FAMILIA_EXTRA });
    }
    if (paquete === "basico") {
      const excluidas = row.datos_completos?.seccionesExcluidas || [];
      SECCIONES_EXCLUSIVAS_PREMIUM.forEach(seccionId => {
        const yaDesbloqueada = !excluidas.includes(seccionId) || tieneClave(`seccion-suelta:${seccionId}`);
        if (!yaDesbloqueada) {
          items.push({ clave: `seccion-suelta:${seccionId}`, nombre: `Sección suelta: ${NOMBRE_CORTO_SECCION_SUELTA[seccionId] || seccionId}`, precio: PRECIO_SECCION_SUELTA });
        }
      });
    }
    items.push({ clave: "ajustes-extra", nombre: "Ajustes extra", precio: PRECIO_AJUSTES_EXTRA });
    return items;
  };

  // Filas EXTRA de solo presentación para el bloque único "🧩 Complementos" (2026-11-22 v4,
  // "Complementos: un solo bloque, todos juntos y todos con su precio") -- catalogoComplementosDisponibles
  // (arriba, SIN tocar, sigue siendo la única fuente de precio/disponibilidad de lo AGREGABLE
  // ahora mismo) no muestra nada para lo que ya viene incluido sin costo, lo que todavía le
  // falta un requisito (QR sin pases activo), ni una marca vieja de pagado sin su complemento
  // registrado (pases_pagado/pdf_pagado/checkin_pagado=true de antes del 2026-11-22, cuando no
  // existía la columna `complementos`) -- esta función solo agrega esos 3 casos para que el
  // bloque los muestre también, sin duplicar ninguna decisión de precio/disponibilidad.
  const filasExtraCatalogoComplementos = (
    row: InvitacionGuardadaRow
  ): { clave: string; nombre: string; tipo: "incluido" | "bloqueado" | "legacy"; detalle?: string }[] => {
    const paquete = row.paquete || "basico";
    const complementosActuales = row.complementos || [];
    const tieneClave = (clave: string) => complementosActuales.some(c => c.clave === clave);
    const pasesActivo = paquete === "deluxe" || row.pases_pagado || tieneClave("pases");
    const filas: { clave: string; nombre: string; tipo: "incluido" | "bloqueado" | "legacy"; detalle?: string }[] = [];

    if (paquete === "deluxe") {
      filas.push({ clave: "pases", nombre: "Pases", tipo: "incluido" });
      filas.push({ clave: "pdf", nombre: "PDF de Regalo", tipo: "incluido" });
    } else {
      if (row.pases_pagado && !tieneClave("pases")) filas.push({ clave: "pases", nombre: "Pases", tipo: "legacy" });
      if (row.pdf_pagado && !tieneClave("pdf")) filas.push({ clave: "pdf", nombre: "PDF de Regalo", tipo: "legacy" });
    }
    if (row.checkin_pagado && !tieneClave("checkin")) {
      filas.push({ clave: "checkin", nombre: "Control de Acceso QR", tipo: "legacy" });
    } else if (!pasesActivo && !tieneClave("checkin")) {
      filas.push({ clave: "checkin", nombre: "Control de Acceso QR", tipo: "bloqueado", detalle: `+$${PRECIO_QR_ACCESO} MXN — requiere Pases activo` });
    }
    return filas;
  };

  // Agrega un complemento de "Administrar cliente" → Complementos: lee precio_total/
  // complementos/datos_completos FRESCOS justo antes de escribir (mismo criterio que
  // handleRegistrarAbono, para no pisar un cambio reciente desde otro lado), suma
  // precio×cantidad al total, agrega el registro, y prende el flag gemelo si lo tiene
  // (pases_pagado/checkin_pagado/pdf_pagado) -- el mismo mecanismo con el que ya se respetan
  // esos flags al abrir la invitación en el editor, sin duplicar esa lógica. "Sección suelta"
  // además quita esa sección de datos_completos.seccionesExcluidas (misma fila ya cargada por
  // togglePagosInvitacion al abrir esta pestaña).
  // Calcula el `datos_completos` resultante de (des)activar la FUNCIÓN real de un complemento
  // en particular -- no solo su flag de cobro. "pases" y "checkin" tienen su propio interruptor
  // dentro de `datos_completos` (`seccionesExcluidas`/`controlAccesoQR`) que es justo lo que
  // decide si la sección aparece activa al abrir la invitación en el editor -- marcar solo
  // pases_pagado/checkin_pagado (como ya hacían las casillas de siempre) deja el flag prendido
  // pero la función seguía apagada hasta que el admin la prendiera a mano adentro del editor.
  // "sección suelta" ya era así desde el diseño original de este encargo; "pdf" no necesita
  // nada aquí -- el botón de descarga nunca estuvo bloqueado por paquete/flag, pdf_pagado es
  // puramente informativo (confirma que ya se cobró).
  const datosCompletosConFuncionDeComplemento = (
    base: Partial<InvitacionDatos>,
    clave: string,
    activar: boolean
  ): InvitacionDatos | null => {
    if (clave === "pases") {
      const excluidas = base.seccionesExcluidas || [];
      return {
        ...base,
        seccionesExcluidas: activar ? excluidas.filter(s => s !== "pases") : Array.from(new Set([...excluidas, "pases"]))
      } as InvitacionDatos;
    }
    if (clave === "checkin") {
      return { ...base, controlAccesoQR: activar } as InvitacionDatos;
    }
    if (clave.startsWith("seccion-suelta:")) {
      const seccionId = clave.slice("seccion-suelta:".length);
      const excluidas = base.seccionesExcluidas || [];
      return {
        ...base,
        seccionesExcluidas: activar ? excluidas.filter(s => s !== seccionId) : Array.from(new Set([...excluidas, seccionId]))
      } as InvitacionDatos;
    }
    return null;
  };

  // Agrega un complemento de "Administrar cliente" → Complementos: lee precio_total/
  // complementos/datos_completos FRESCOS justo antes de escribir (mismo criterio que
  // handleRegistrarAbono, para no pisar un cambio reciente desde otro lado), suma
  // precio×cantidad al total, agrega el registro, prende el flag de cobro gemelo si lo tiene
  // (pases_pagado/checkin_pagado/pdf_pagado) Y, si el complemento tiene una función real que
  // activar (ver datosCompletosConFuncionDeComplemento), la activa ahí mismo -- así "abrirla en
  // el editor: la sección queda desbloqueada" sin que el admin tenga que ir a prenderla aparte.
  const handleAgregarComplemento = async (row: InvitacionGuardadaRow, item: { clave: string; nombre: string; precio: number }, cantidad: number) => {
    if (!window.supabaseClient) return;
    if (!cantidad || cantidad <= 0) {
      mostrarToast("La cantidad debe ser al menos 1", "error");
      return;
    }
    try {
      const { data: actual, error: errLectura } = await window.supabaseClient
        .from("invitaciones")
        .select("precio_total, complementos, datos_completos")
        .eq("id", row.id)
        .maybeSingle();
      if (errLectura) throw errLectura;
      const monto = item.precio * cantidad;
      const nuevoTotal = (actual?.precio_total || 0) + monto;
      const nuevoComplemento: ComplementoInvitacion = {
        clave: item.clave,
        nombre: cantidad > 1 ? `${item.nombre} ×${cantidad}` : item.nombre,
        precio: item.precio,
        cantidad,
        fecha: new Date().toISOString()
      };
      const complementosNuevos = [...((actual?.complementos || []) as ComplementoInvitacion[]), nuevoComplemento];

      const update: { precio_total: number; complementos: ComplementoInvitacion[]; pases_pagado?: boolean; checkin_pagado?: boolean; pdf_pagado?: boolean; datos_completos?: InvitacionDatos } =
        { precio_total: nuevoTotal, complementos: complementosNuevos };
      if (item.clave === "pases") update.pases_pagado = true;
      if (item.clave === "checkin") update.checkin_pagado = true;
      if (item.clave === "pdf") update.pdf_pagado = true;
      const datosCompletosNuevos = datosCompletosConFuncionDeComplemento(actual?.datos_completos || {}, item.clave, true);
      if (datosCompletosNuevos) update.datos_completos = datosCompletosNuevos;

      const { error: errUpdate } = await window.supabaseClient.from("invitaciones").update(update).eq("id", row.id);
      if (errUpdate) throw errUpdate;

      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? {
        ...r,
        precio_total: nuevoTotal,
        complementos: complementosNuevos,
        ...(item.clave === "pases" ? { pases_pagado: true } : {}),
        ...(item.clave === "checkin" ? { checkin_pagado: true } : {}),
        ...(item.clave === "pdf" ? { pdf_pagado: true } : {}),
        ...(datosCompletosNuevos ? { datos_completos: datosCompletosNuevos } : {})
      } : r));
      mostrarToast(`${nuevoComplemento.nombre} agregado -- +$${monto.toLocaleString("es-MX")} MXN`, "success");
    } catch (err: any) {
      mostrarToast("Error al agregar el complemento: " + err.message, "error");
    }
  };

  // Quita un complemento ya agregado: resta su monto del precio_total, apaga su flag de cobro
  // gemelo si lo tiene, Y apaga la función real que esa activó (contraparte de
  // datosCompletosConFuncionDeComplemento arriba). Guarda explícita del encargo: no se puede
  // quitar "Pases" mientras "Control de Acceso QR" siga activo -- sin pases no hay nada contra
  // qué controlar el acceso (revisa el FLAG, no solo si hay un registro de complemento "checkin"
  // en la lista, para cubrir también el caso de un QR activado a mano con la casilla, sin
  // complemento registrado).
  const handleQuitarComplemento = async (row: InvitacionGuardadaRow, index: number) => {
    if (!window.supabaseClient) return;
    const complemento = (row.complementos || [])[index];
    if (!complemento) return;
    if (complemento.clave === "pases" && row.checkin_pagado) {
      mostrarToast('Primero quita "Control de Acceso QR" -- no puede seguir activo sin pases.', "error");
      return;
    }
    try {
      const { data: actual, error: errLectura } = await window.supabaseClient
        .from("invitaciones")
        .select("precio_total, complementos, datos_completos")
        .eq("id", row.id)
        .maybeSingle();
      if (errLectura) throw errLectura;
      const complementosFrescos = (actual?.complementos || []) as ComplementoInvitacion[];
      const idxFresco = complementosFrescos.findIndex(c => c.clave === complemento.clave && c.fecha === complemento.fecha);
      const complementoFresco = idxFresco >= 0 ? complementosFrescos[idxFresco] : complemento;
      const monto = complementoFresco.precio * complementoFresco.cantidad;
      const nuevoTotal = Math.max(0, (actual?.precio_total || 0) - monto);
      const complementosNuevos = idxFresco >= 0 ? complementosFrescos.filter((_, i) => i !== idxFresco) : complementosFrescos;

      const update: { precio_total: number; complementos: ComplementoInvitacion[]; pases_pagado?: boolean; checkin_pagado?: boolean; pdf_pagado?: boolean; datos_completos?: InvitacionDatos } =
        { precio_total: nuevoTotal, complementos: complementosNuevos };
      if (complemento.clave === "pases") update.pases_pagado = false;
      if (complemento.clave === "checkin") update.checkin_pagado = false;
      if (complemento.clave === "pdf") update.pdf_pagado = false;
      const datosCompletosNuevos = datosCompletosConFuncionDeComplemento(actual?.datos_completos || {}, complemento.clave, false);
      if (datosCompletosNuevos) update.datos_completos = datosCompletosNuevos;

      const { error: errUpdate } = await window.supabaseClient.from("invitaciones").update(update).eq("id", row.id);
      if (errUpdate) throw errUpdate;

      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? {
        ...r,
        precio_total: nuevoTotal,
        complementos: complementosNuevos,
        ...(complemento.clave === "pases" ? { pases_pagado: false } : {}),
        ...(complemento.clave === "checkin" ? { checkin_pagado: false } : {}),
        ...(complemento.clave === "pdf" ? { pdf_pagado: false } : {}),
        ...(datosCompletosNuevos ? { datos_completos: datosCompletosNuevos } : {})
      } : r));
      mostrarToast(`${complementoFresco.nombre} quitado -- -$${monto.toLocaleString("es-MX")} MXN`, "success");
    } catch (err: any) {
      mostrarToast("Error al quitar el complemento: " + err.message, "error");
    }
  };

  // Muestra/oculta el historial de abonos de una invitación, cargándolo la primera vez.
  const toggleHistorialAbonos = async (row: InvitacionGuardadaRow) => {
    if (historialAbonosExpandidoId === row.id) {
      setHistorialAbonosExpandidoId(null);
      return;
    }
    setHistorialAbonosExpandidoId(row.id);
    if (abonosPorInvitacion[row.id] || !window.supabaseClient) return;
    setCargandoAbonos(true);
    try {
      const { data, error } = await window.supabaseClient
        .from("abonos")
        .select("id, monto, nota, creado_en")
        .eq("invitacion_id", row.id)
        .order("creado_en", { ascending: false });
      if (error) throw error;
      setAbonosPorInvitacion(prev => ({ ...prev, [row.id]: (data || []) as Abono[] }));
    } catch (err: any) {
      mostrarToast("Error al cargar historial de abonos: " + err.message, "error");
    } finally {
      setCargandoAbonos(false);
    }
  };

  // Registra un abono nuevo: lo agrega al historial (tabla `abonos`) Y suma el monto al
  // precio_pagado acumulado de la invitación (lee el valor actual justo antes de sumar, para
  // no pisar un cambio que se haya hecho desde otro lado un segundo antes).
  const handleRegistrarAbono = async (row: InvitacionGuardadaRow, monto: number, nota: string) => {
    if (!window.supabaseClient || !monto || monto <= 0) {
      mostrarToast("Ingresa un monto válido", "error");
      return;
    }
    try {
      const { error: errInsert } = await window.supabaseClient
        .from("abonos")
        .insert([{ invitacion_id: row.id, monto, nota: nota.trim() || null }]);
      if (errInsert) throw errInsert;

      const { data: actual, error: errLectura } = await window.supabaseClient
        .from("invitaciones")
        .select("precio_pagado")
        .eq("id", row.id)
        .maybeSingle();
      if (errLectura) throw errLectura;
      const nuevoPagado = (actual?.precio_pagado || 0) + monto;

      const { error: errUpdate } = await window.supabaseClient
        .from("invitaciones")
        .update({ precio_pagado: nuevoPagado })
        .eq("id", row.id);
      if (errUpdate) throw errUpdate;

      setListaInvitaciones(prev => prev.map(r => r.id === row.id ? { ...r, precio_pagado: nuevoPagado } : r));
      if (abonosPorInvitacion[row.id]) {
        setAbonosPorInvitacion(prev => ({
          ...prev,
          [row.id]: [{ id: crypto.randomUUID(), monto, nota: nota.trim() || null, creado_en: new Date().toISOString() }, ...prev[row.id]]
        }));
      }
      mostrarToast(`Abono de $${monto.toLocaleString("es-MX")} registrado`, "success");
    } catch (err: any) {
      mostrarToast("Error al registrar abono: " + err.message, "error");
    }
  };

  // Abre/cierra el panel de Pagos y estatus, y de paso trae los avisos de pago del cliente
  // pendientes de revisar para esa invitación (solo la primera vez que se abre).
  const togglePagosInvitacion = async (row: InvitacionGuardadaRow, forzarAbrir = false) => {
    const abriendo = forzarAbrir || invitacionPagosExpandidaId !== row.id;
    if (!forzarAbrir) setInvitacionPagosExpandidaId(prev => prev === row.id ? null : row.id);
    else setInvitacionPagosExpandidaId(row.id);
    // El selector de "Paquete" de esta pestaña ya no necesita datos_completos (usa row.paquete,
    // la versión ligera), pero el bloque de "Control de Acceso QR" más abajo sí lo sigue
    // necesitando (datos_completos.controlAccesoQR) -- se pide en paralelo al abrir.
    if (abriendo) asegurarDatosCompletos(row);
    if (!abriendo || avisosPagoPorInvitacion[row.id] || !window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient
        .from("avisos_pago")
        .select("id, monto, comprobante_url, nota, creado_en")
        .eq("invitacion_id", row.id)
        .eq("revisado", false)
        .order("creado_en", { ascending: false });
      if (error) throw error;
      setAvisosPagoPorInvitacion(prev => ({ ...prev, [row.id]: (data || []) as AvisoPago[] }));
    } catch (err: any) {
      mostrarToast("Error al cargar avisos de pago: " + err.message, "error");
    }
  };

  // Aprueba un aviso de pago del cliente: lo registra como abono real (usa el monto que el
  // cliente reportó, o el que el admin haya corregido/escrito a mano si no lo dio) y lo marca
  // como revisado.
  const handleAprobarAvisoPago = async (row: InvitacionGuardadaRow, aviso: AvisoPago, montoManual?: string) => {
    const monto = aviso.monto || Number(montoManual || 0);
    if (!monto || monto <= 0) {
      mostrarToast("Escribe el monto del pago antes de registrarlo", "error");
      return;
    }
    await handleRegistrarAbono(row, monto, aviso.nota || "Aviso de pago del cliente");
    if (!window.supabaseClient) return;
    try {
      await window.supabaseClient.from("avisos_pago").update({ revisado: true }).eq("id", aviso.id);
      setAvisosPagoPorInvitacion(prev => ({ ...prev, [row.id]: prev[row.id].filter(a => a.id !== aviso.id) }));
    } catch (err: any) {
      mostrarToast("El abono se registró, pero no se pudo marcar el aviso como revisado: " + err.message, "error");
    }
  };

  // Descarta un aviso de pago sin registrar ningún abono (ej. era un duplicado o un error).
  const handleDescartarAvisoPago = async (row: InvitacionGuardadaRow, aviso: AvisoPago) => {
    if (!window.supabaseClient) return;
    try {
      await window.supabaseClient.from("avisos_pago").update({ revisado: true }).eq("id", aviso.id);
      setAvisosPagoPorInvitacion(prev => ({ ...prev, [row.id]: prev[row.id].filter(a => a.id !== aviso.id) }));
      mostrarToast("Aviso descartado", "success");
    } catch (err: any) {
      mostrarToast("Error: " + err.message, "error");
    }
  };

  // Alta rápida de un cliente nuevo: solo pide nombre + celular + paquete, guarda la fila en
  // Supabase DE INMEDIATO (estatus "Cotización") y deja el editor abierto con esos datos para
  // seguir llenando el resto (fotos, itinerario, etc.) con calma. Así el cliente queda
  // registrado en "Mis Invitaciones" desde el minuto uno de la venta, no hasta que termines de
  // diseñar toda la invitación.
  const handleCrearNuevoCliente = async () => {
    if (!nuevoClienteNombre.trim()) {
      mostrarToast("Falta el nombre de la quinceañera", "error");
      return;
    }
    const soloDigitos = nuevoClienteTelefono.replace(/[^0-9]/g, "");
    if (soloDigitos.length < 10) {
      mostrarToast("El número de celular/WhatsApp no parece válido (necesita código de país + 10 dígitos)", "error");
      return;
    }
    setCreandoNuevoCliente(true);
    try {
      const nuevosDatos: InvitacionDatos = {
        paquete: nuevoClientePaquete,
        tema: "dorado-clasico",
        nombre: nuevoClienteNombre.trim(),
        fecha: "",
        mensajeBienvenida: "",
        ceremonia: { lugar: "", hora: "", direccion: "", maps: "" },
        recepcion: { lugar: "", hora: "", direccion: "", maps: "" },
        itinerario: [],
        dressCode: "",
        colorSugerido: [],
        padres: [],
        padrinos: [],
        mesaRegalos: "",
        datosBancarios: "",
        fotos: [],
        hashtag: "",
        whatsappConfirmacion: soloDigitos,
        cancion: "",
        linkPersonalizado: "",
        invitados: [],
        // "pases" es a la carte en Básico/Premium (apagada por default), incluida en Deluxe.
        seccionesExcluidas: nuevoClientePaquete === "deluxe" ? [] : ["pases"]
      };
      const temaConfig = temas.find(t => t.id === "dorado-clasico") || temas[0];
      const nuevaFila = await guardarEnSupabase(nuevosDatos, temaConfig, undefined, null, usuarioActual);
      if (!nuevaFila?.id) {
        mostrarToast("No se pudo crear el cliente", "error");
        return;
      }
      // guardarEnSupabase siempre inserta con estado:"completada" -- lo corregimos aparte a
      // "cotizacion" para no tener que tocar esa función compartida por el resto de la app.
      if (window.supabaseClient) {
        await window.supabaseClient.from("invitaciones").update({ estado: "cotizacion" }).eq("id", nuevaFila.id);
      }
      // El código corto se genera dentro de guardarEnSupabase -- se trae de vuelta aquí para
      // que el editor ya lo tenga disponible desde el primer momento (mismo porqué que en
      // handleGuardarEnSupabase).
      setDatos({ ...nuevosDatos, codigoCorto: nuevaFila.datos_completos?.codigoCorto });
      setSelectedTemaId("dorado-clasico");
      setSupabaseRowId(nuevaFila.id);
      setIntakeBaselineAlAbrir(null); // fila nueva -- sin intake propio todavia
      try { localStorage.setItem("xv_supabase_row_id", nuevaFila.id); } catch {}
      setMostrarNuevoCliente(false);
      setMostrarMisInvitaciones(false);
      setPanelPestana("ajustes");
      mostrarToast(`Cliente "${nuevosDatos.nombre}" creado — sigue llenando su invitación ✨`, "success");
      setNuevoClienteNombre("");
      setNuevoClienteTelefono("52");
      setNuevoClientePaquete("basico");
    } catch (err: any) {
      mostrarToast("Error al crear cliente: " + err.message, "error");
    } finally {
      setCreandoNuevoCliente(false);
    }
  };

  // Cobrar por WhatsApp (2026-11-21) -- el botón solo ABRE WhatsApp con el mensaje y el link de
  // pago correctos ya listos, el admin le sigue dando "Enviar" él mismo. Nunca toca
  // precio_pagado/abonos (eso se sigue registrando a mano cuando el pago se refleja, ver
  // handleRegistrarAbono) -- esto solo manda el cobro. Reemplaza al viejo "link de pago pegado a
  // mano por clienta" (`handleEnviarLinkPago`, campo `row.link_pago`) -- ese campo/botón se
  // quitó de esta vista (2026-11-22, consolidado con "Links de la clienta"/Parte 1 del encargo)
  // porque ahora los 4 links de Mercado Pago guardados en `linksPago` cubren el mismo caso de
  // uso sin que el admin tenga que pegar nada por clienta. El dato `link_pago` se queda intacto
  // en la base (columna sin tocar), simplemente esta vista ya no lo lee ni lo muestra.
  const handleCobrarAnticipo = (row: InvitacionGuardadaRow) => {
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const anticipo = calcularAnticipo(row.precio_total);
    const { link, esLinkAbierto } = resolverLinkAnticipo(row, linksPago);
    if (!link?.trim()) {
      mostrarToast('Configura primero tus links de pago ("💳 Links de pago" en la cabecera)', "error");
      return;
    }
    const nombrePlan = row.paquete ? paquetes[row.paquete].nombre : "tu plan";
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    // Si el link es el de monto abierto (no uno fijo por plan), el pago no trae el monto
    // pre-cargado -- el mensaje debe decírselo explícito para que lo escriba al pagar.
    const notaMontoAbierto = esLinkAbierto ? ` (ingresa el monto de $${anticipo.toLocaleString("es-MX")})` : "";
    const msg = `Hola ${row.nombre_quinceanera || "tu evento"}, soy de InvitaMX 💌 Te comparto el link para el anticipo de tu invitación ${nombrePlan} por $${anticipo.toLocaleString("es-MX")}: ${link.trim()}${notaMontoAbierto}\nCon tu anticipo queda apartada la fecha de tu evento. ¡Gracias!`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCobrarLiquidacion = (row: InvitacionGuardadaRow) => {
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const saldo = calcularSaldoPendiente(row.precio_total, row.precio_pagado);
    if (saldo <= 0) {
      mostrarToast("Esta invitación ya está liquidada", "error");
      return;
    }
    if (!linksPago.montoAbierto?.trim()) {
      mostrarToast('Configura primero tus links de pago ("💳 Links de pago" en la cabecera)', "error");
      return;
    }
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    const msg = `Hola ${row.nombre_quinceanera || "tu evento"}, tu invitación ya está lista 🎉 El saldo para liquidar es de $${saldo.toLocaleString("es-MX")}. Puedes pagarlo en este link (ingresa el monto de $${saldo.toLocaleString("es-MX")}): ${linksPago.montoAbierto.trim()}\nEn cuanto se refleje te entrego tu invitación.`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Envío MANUAL de un link de pago (2026-11-22 v4, "Links de pago -- envío manual (tú eliges)")
  // -- a diferencia de handleCobrarAnticipo/handleCobrarLiquidacion (que ELIGEN solos cuál link
  // mandar con resolverLinkAnticipo), aquí el admin elige directo cuál de los 4 links de la
  // configuración global enviar. Nunca cambia ningún estado de cobro (no marca pagos/abonos, no
  // toca pases_pagado/etc.): solo abre WhatsApp con ese link puesto, igual que los handlers
  // automáticos -- misma mecánica, mismo `window.open`, sin lógica de negocio nueva.
  const handleEnviarLinkManual = (row: InvitacionGuardadaRow, key: keyof LinksPagoAdmin) => {
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const link = linksPago[key];
    if (!link?.trim()) {
      mostrarToast('Ese link no está configurado todavía ("💳 Links de pago" en la cabecera)', "error");
      return;
    }
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    let msg: string;
    if (key === "montoAbierto") {
      // El monto a escribir es su saldo pendiente; si ya no debe saldo (o nunca se capturó un
      // precio_total), se ofrece el anticipo de su total como alternativa razonable -- mismo
      // criterio pedido explícitamente en el punto 6 del encargo.
      const saldo = calcularSaldoPendiente(row.precio_total, row.precio_pagado);
      const monto = saldo > 0 ? saldo : calcularAnticipo(row.precio_total);
      msg = `Hola ${row.nombre_quinceanera || "tu evento"}, soy de InvitaMX 💌 Te comparto tu link de pago (ingresa el monto de $${monto.toLocaleString("es-MX")}): ${link.trim()}\nEn cuanto se refleje seguimos con tu invitación. ¡Gracias!`;
    } else {
      const paqueteDelLink = PAQUETE_POR_LINK_ANTICIPO_KEY[key];
      const nombrePlan = paquetes[paqueteDelLink].nombre;
      const monto = Math.round(PRECIO_BASE_PAQUETE[paqueteDelLink] * 0.5);
      msg = `Hola ${row.nombre_quinceanera || "tu evento"}, soy de InvitaMX 💌 Te comparto el link para el anticipo del paquete ${nombrePlan} por $${monto.toLocaleString("es-MX")}: ${link.trim()}\nCon tu anticipo queda apartada la fecha de tu evento. ¡Gracias!`;
    }
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Links cortos /datos/<codigoCorto> y /puerta/<codigoCorto> (2026-11-21) para el formulario y
  // el control de acceso, igual que /v/<codigoCorto> para la invitación -- caen al link largo
  // de siempre (?intake=1&iid=... / ?checkin=1&iid=...) si la fila todavía no tiene código
  // (guardada antes de este cambio, o nunca re-guardada), para que nunca salga un link roto.
  const urlFormularioDatos = (row: InvitacionGuardadaRow): string => {
    const codigo = row.datos_completos?.codigoCorto;
    return codigo ? `${URL_PUBLICA_INVITAMX}/datos/${codigo}` : `${URL_PUBLICA_INVITAMX}/?intake=1&iid=${row.id}`;
  };
  const urlControlAcceso = (row: InvitacionGuardadaRow): string => {
    const codigo = row.datos_completos?.codigoCorto;
    return codigo ? `${URL_PUBLICA_INVITAMX}/puerta/${codigo}` : `${URL_PUBLICA_INVITAMX}/?checkin=1&iid=${row.id}`;
  };

  // Manda por WhatsApp el link público (/datos/<codigo>, antes ?intake=1&iid=<id>) del
  // formulario de datos/fotos para que el cliente lo llene él mismo, en vez de que el admin
  // capture todo a mano.
  const handleEnviarFormularioDatos = (row: InvitacionGuardadaRow) => {
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    const urlFormulario = urlFormularioDatos(row);
    const msg = `¡Hola! 🌸 Para seguir con tu invitación de XV Años de *${row.nombre_quinceanera || "tu evento"}*, por favor llena tus datos y sube tus fotos en este link:\n${urlFormulario}`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Manda uno de los textos predeterminados (ver MENSAJES_PREDETERMINADOS) al WhatsApp de
  // ESTE cliente -- mismo patrón que handleCobrarAnticipo/handleEnviarFormularioDatos (abre
  // api.whatsapp.com/send con el texto ya listo en el cuadro, nunca lo manda solo; el admin
  // sigue teniendo que darle "Enviar" él mismo). Pedido 2026-11-02: tener textos listos para
  // no escribirlos de cero cada vez, sin necesidad de abrir esta invitación en el editor.
  // Arma el link general (sin invitado específico) DIRECTO desde la fila guardada, sin
  // necesidad de tenerla abierta en el editor -- mismo espíritu que handleCobrarAnticipo /
  // handleEnviarFormularioDatos. Pedido 2026-11-02: poder mandar la vista previa desde "Mis
  // Invitaciones" (vía "👤 Administrar cliente") sin pasar por "Abrir en editor" primero.
  // Siempre en modo "muestra" (pedido 2026-11-02: "vista previa temporal con marca de agua, 1
  // semana de duración") -- a diferencia de getShareUrl() del editor, que manda el link FINAL
  // permanente (para cuando ya se entregó de verdad), este botón manda desde "Mis Invitaciones"
  // sin que el admin tenga que acordarse de activar el toggle "Muestra" -- siempre protegido.
  const getShareUrlDesdeFila = (row: InvitacionGuardadaRow): string | null => {
    if (!row.datos_completos) return null;
    const exp = Date.now() + MUESTRA_DIAS_VIGENCIA * 24 * 60 * 60 * 1000;
    // Link corto también para la muestra (2026-11-19, parte 2 de "que el link corto salga
    // siempre"): si la fila ya tiene codigoCorto (se guardó al menos una vez con la lógica del
    // link corto), la muestra sale corta igual que el link final -- `muestra`/`exp` viajan como
    // parámetros sueltos sobre el link corto, la resolución de /v/<codigo> los preserva y aplica
    // el mismo candado de siempre (ver resolución del link corto más abajo). Si la fila es muy
    // vieja y no tiene código, se deja el link largo de siempre -- no se bloquea por esto.
    if (row.datos_completos.codigoCorto) {
      return `${URL_PUBLICA_INVITAMX}/v/${row.datos_completos.codigoCorto}?muestra=1&exp=${exp}`;
    }
    const datosListos = { ...row.datos_completos, tema: row.tema_elegido || row.datos_completos.tema, invitados: [] };
    return `${URL_PUBLICA_INVITAMX}/?v=1&d=${encodeState(datosListos)}&iid=${encodeURIComponent(row.id)}&muestra=1&exp=${exp}`;
  };

  const handleEnviarPreviewWhatsApp = async (row: InvitacionGuardadaRow) => {
    const fila = await asegurarDatosCompletos(row);
    const url = getShareUrlDesdeFila(fila);
    if (!url) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para compartir.", "error");
      return;
    }
    if (!fila.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const numeroLimpio = fila.telefono_whatsapp.replace(/[^0-9]/g, "");
    const msg = `¡Hola! 🌸 Aquí está la vista previa (temporal, válida ${MUESTRA_DIAS_VIGENCIA} días) de tu invitación de XV Años de *${fila.nombre_quinceanera || "tu evento"}*:\n${url}`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Resuelve el link de vista previa/muestra de esta fila para Copiar/Abrir (2026-11-22, "Links
  // de la clienta" ganó su propia fila para este link, antes solo existía como botón de
  // WhatsApp en la pestaña "Mensajes" -- ver handleEnviarPreviewWhatsApp arriba, que ya hace
  // exactamente este mismo `asegurarDatosCompletos` + `getShareUrlDesdeFila`). Mismo patrón
  // resolver+copiar/abrir que `resolverLinkInvitacionFila`/`resolverLinkClasicoFila` más abajo.
  const resolverLinkMuestraFila = async (row: InvitacionGuardadaRow): Promise<string | null> => {
    const fila = await asegurarDatosCompletos(row);
    const url = getShareUrlDesdeFila(fila);
    if (!url) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para compartir.", "error");
      return null;
    }
    return url;
  };
  const handleCopiarLinkMuestraFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkMuestraFila(row);
    if (url) copiarLinkClienta(url);
  };
  const handleAbrirLinkMuestraFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkMuestraFila(row);
    if (url) abrirLinkClienta(url);
  };

  // Link de REVISIÓN (2026-11-22, regla de negocio "revisión primero, entrega final al
  // liquidar"): distinto del de muestra -- este es para la clienta que YA pagó su anticipo y
  // ya tiene datos completos, para que revise el resultado antes de liquidar. Vigencia más
  // larga (7 días, la ventana de ajustes) que la muestra (5 días) -- son conceptos separados a
  // propósito, cada uno con su propia constante. Mismo criterio que el link de muestra corto:
  // con `codigoCorto` sale corto (`/v/<codigo>?revision=1&exp=...`), sin código cae al formato
  // largo de siempre como respaldo.
  const REVISION_DIAS_VIGENCIA = 7;
  const resolverLinkRevisionFila = async (row: InvitacionGuardadaRow): Promise<string | null> => {
    const fila = await asegurarDatosCompletos(row);
    if (!fila.datos_completos) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para generar su link de revisión.", "error");
      return null;
    }
    const exp = Date.now() + REVISION_DIAS_VIGENCIA * 24 * 60 * 60 * 1000;
    if (fila.datos_completos.codigoCorto) {
      return `${URL_PUBLICA_INVITAMX}/v/${fila.datos_completos.codigoCorto}?revision=1&exp=${exp}`;
    }
    const datosListos = { ...fila.datos_completos, tema: fila.tema_elegido || fila.datos_completos.tema, invitados: [] };
    return `${URL_PUBLICA_INVITAMX}/?v=1&d=${encodeState(datosListos)}&iid=${encodeURIComponent(fila.id)}&revision=1&exp=${exp}`;
  };
  const handleCopiarLinkRevisionFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkRevisionFila(row);
    if (url) copiarLinkClienta(url);
  };
  const handleAbrirLinkRevisionFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkRevisionFila(row);
    if (url) abrirLinkClienta(url);
  };
  const handleEnviarRevisionWhatsApp = async (row: InvitacionGuardadaRow) => {
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const url = await resolverLinkRevisionFila(row);
    if (!url) return;
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    const msg = `¡Hola! 🌸 Ya está lista tu invitación de XV Años de *${row.nombre_quinceanera || "tu evento"}* para que la revises con calma (válida ${REVISION_DIAS_VIGENCIA} días). Échale un ojo y dime si quieres algún ajuste -- en cuanto se liquide tu saldo te mando tu link final, permanente:\n${url}`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleEnviarMensajePredefinido = (row: InvitacionGuardadaRow, texto: string) => {
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(texto)}`, "_blank");
  };

  // Botón único "Administrar cliente" (pedido 2026-11-02: "ademas de abrir el editor... un
  // boton de administrar ese cliente con toda su informacion y para comunicarnos con el y
  // todo") -- en vez de duplicar los 3 paneles ya construidos (Pagos y estatus / Mensajes /
  // Ver confirmaciones), este botón simplemente los abre los TRES a la vez usando los mismos
  // toggles de siempre (con forzarAbrir=true para que nunca los cierre por accidente si solo
  // alguno ya estaba abierto). Vuelve a cerrarlos todos si ya estaban los tres abiertos.
  // Ficha de cliente (rediseño 2026-11-18): pagos/mensajes/confirmaciones/acceso ya no son 3-4
  // toggles independientes que se podían dejar todos abiertos a la vez (lo que hacía que la
  // fila creciera con 3 bloques apilados) -- ahora son pestañas mutuamente excluyentes de UNA
  // sola ficha por cliente, igual que pidió el usuario ("que sea fácil de usar y ver").
  type PestanaCliente = "pagos" | "mensajes" | "confirmaciones" | "acceso";
  const pestanaClienteDe = (row: InvitacionGuardadaRow): PestanaCliente | null => {
    if (invitacionPagosExpandidaId === row.id) return "pagos";
    if (invitacionMensajesExpandidaId === row.id) return "mensajes";
    if (invitacionExpandidaId === row.id) return "confirmaciones";
    if (invitacionAccesoExpandidaId === row.id) return "acceso";
    return null;
  };
  const cerrarFichaCliente = (row: InvitacionGuardadaRow) => {
    if (invitacionPagosExpandidaId === row.id) setInvitacionPagosExpandidaId(null);
    if (invitacionMensajesExpandidaId === row.id) setInvitacionMensajesExpandidaId(null);
    if (invitacionExpandidaId === row.id) setInvitacionExpandidaId(null);
    if (invitacionAccesoExpandidaId === row.id) setInvitacionAccesoExpandidaId(null);
  };
  const abrirPestanaCliente = (row: InvitacionGuardadaRow, pestana: PestanaCliente) => {
    if (pestanaClienteDe(row) === pestana) {
      cerrarFichaCliente(row);
      return;
    }
    // La pestaña "mensajes" (vista previa por WhatsApp) también necesita datos_completos --
    // "pagos" y "confirmaciones" ya lo piden ellas mismas (togglePagosInvitacion/
    // toggleConfirmacionesInvitacion), así que aquí solo hace falta cubrir "mensajes".
    if (pestana === "mensajes") asegurarDatosCompletos(row);
    if (invitacionPagosExpandidaId === row.id && pestana !== "pagos") setInvitacionPagosExpandidaId(null);
    if (invitacionMensajesExpandidaId === row.id && pestana !== "mensajes") setInvitacionMensajesExpandidaId(null);
    if (invitacionExpandidaId === row.id && pestana !== "confirmaciones") setInvitacionExpandidaId(null);
    if (invitacionAccesoExpandidaId === row.id && pestana !== "acceso") setInvitacionAccesoExpandidaId(null);
    if (pestana === "pagos") togglePagosInvitacion(row, true);
    else if (pestana === "mensajes") setInvitacionMensajesExpandidaId(row.id);
    else if (pestana === "confirmaciones") toggleConfirmacionesInvitacion(row, true);
    else setInvitacionAccesoExpandidaId(row.id);
  };

  const handleAdministrarCliente = (row: InvitacionGuardadaRow) => {
    if (pestanaClienteDe(row)) {
      cerrarFichaCliente(row);
      return;
    }
    abrirPestanaCliente(row, "pagos");
  };

  // "Otras invitaciones de esta clienta" (2026-11-22, "Folio de clienta") -- clic en una de la
  // lista de historial: quita cualquier filtro/búsqueda/pestaña que pudiera esconderla y
  // expande esa fila, el mismo mecanismo de "abrir" que ya usa toda esta lista (no hay una
  // página aparte por invitación, expandir la fila ES abrirla).
  const handleAbrirInvitacionDesdeHistorial = (id: string) => {
    setBusquedaInvitaciones("");
    setFiltroEstatusInvitaciones("todos");
    setFiltroEventoInvitaciones("todos");
    const esPasada = invitacionesPasadasTab.some(r => r.id === id);
    setPestanaListaInvitaciones(esPasada ? "pasados" : "activas");
    setInvitacionFilaExpandidaId(id);
  };

  // Complemento à la carte "Control de Acceso QR": manda el link GENERAL de check-in
  // (sin &fam=, ver CheckinPage) a quien vaya a controlar la puerta -- normalmente no es el
  // mismo número del cliente, por eso se escribe aparte cada vez en vez de usar
  // row.telefono_whatsapp.
  const handleEnviarLinkCheckin = (row: InvitacionGuardadaRow) => {
    const telefono = (telefonoCheckinPorInvitacion[row.id] || "").replace(/[^0-9]/g, "");
    if (telefono.length < 10) {
      mostrarToast("Escribe el número del encargado de acceso (código de país + 10 dígitos)", "error");
      return;
    }
    const urlCheckin = urlControlAcceso(row);
    const msg = `¡Hola! 🔳 Este es el link de control de acceso para la fiesta de XV Años de *${row.nombre_quinceanera || "el evento"}* -- ábrelo el día del evento para registrar la entrada de cada familia:\n${urlCheckin}`;
    window.open(`https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Copiar/Abrir el link de control de acceso viven en el bloque "🔗 Links de la clienta"
  // (`copiarLinkClienta(linkCheckinFila)`/`abrirLinkClienta(linkCheckinFila)` más abajo) --
  // antes existían aquí también como `handleCopiarLinkCheckin`/`handleAbrirLinkCheckin`,
  // duplicando la misma acción; se quitaron el 2026-11-22 al consolidar ese bloque.

  // Copia/abre cualquiera de los "Links de la clienta" (invitación/formulario/control de
  // acceso) -- helpers genéricos compartidos por ese bloque del detalle de cada fila en "Mis
  // Invitaciones". `abrirLinkClienta` es la contraparte de "Abrir" (2026-11-22) junto a cada
  // "Copiar" de ese bloque -- misma URL ya resuelta, nunca se reconstruye aparte.
  const copiarLinkClienta = (url: string) => {
    navigator.clipboard.writeText(url).then(() => mostrarToast("Link copiado", "success")).catch(() => {});
  };
  const abrirLinkClienta = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Resuelve el link CORTO (/v/<codigoCorto>) de esta fila -- es el que "Invitación" muestra en
  // "Links de la clienta". Si todavía no tiene código (fila guardada antes de este cambio, o
  // nunca guardada desde que se agregó), lo genera y lo persiste en el momento (mismo
  // generarCodigoCortoUnico que usa guardarEnSupabase al guardar desde el editor) -- siempre
  // reconstruido con el origen ACTUAL, nunca con lo que haya quedado guardado en
  // `link_invitacion`, para que si algún día cambia el dominio los links ya existentes lo
  // reflejen solos. Extraída a su propio resolver (2026-11-22) para que "Copiar" y "Abrir"
  // compartan la MISMA resolución -- incluida la generación del código si todavía no existe --
  // y solo difieran en el paso final (copiar vs. abrir en pestaña nueva).
  const resolverLinkInvitacionFila = async (row: InvitacionGuardadaRow): Promise<string | null> => {
    const fila = await asegurarDatosCompletos(row);
    if (!fila.datos_completos) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para generar su link.", "error");
      return null;
    }
    let codigoCorto = fila.datos_completos.codigoCorto;
    if (!codigoCorto) {
      if (!window.supabaseClient) {
        mostrarToast("Supabase no está disponible", "error");
        return null;
      }
      try {
        const temaDeEsaFila = temas.find(t => t.id === fila.datos_completos!.tema) || temas.find(t => t.id === fila.tema_elegido) || temas[0];
        const filaActualizada = await guardarEnSupabase(fila.datos_completos, temaDeEsaFila, undefined, row.id, undefined);
        codigoCorto = filaActualizada?.datos_completos?.codigoCorto;
        if (filaActualizada) {
          setListaInvitaciones(prev => prev.map(r => r.id === row.id ? { ...r, link_invitacion: filaActualizada.link_invitacion, datos_completos: filaActualizada.datos_completos } : r));
        }
      } catch (err: any) {
        mostrarToast("No se pudo generar el link corto: " + err.message, "error");
        return null;
      }
    }
    if (!codigoCorto) {
      mostrarToast("No se pudo generar el link corto", "error");
      return null;
    }
    return `${URL_PUBLICA_INVITAMX}/v/${codigoCorto}`;
  };
  const handleCopiarLinkInvitacionFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkInvitacionFila(row);
    if (url) copiarLinkClienta(url);
  };
  const handleAbrirLinkInvitacionFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkInvitacionFila(row);
    if (url) abrirLinkClienta(url);
  };

  // Resuelve el link LARGO clásico (?v=1&d=...&iid=...) de esta fila -- opción secundaria "por
  // si se necesita el de siempre" (pedido explícito), nunca el principal. A diferencia de
  // getShareUrlDesdeFila (que SIEMPRE agrega &muestra=1&exp=... para la vista previa temporal),
  // este es el link PERMANENTE de toda la vida, sin marca de agua ni expiración. Mismo patrón
  // de resolver+copiar/abrir que `resolverLinkInvitacionFila` arriba.
  const resolverLinkClasicoFila = async (row: InvitacionGuardadaRow): Promise<string | null> => {
    const fila = await asegurarDatosCompletos(row);
    if (!fila.datos_completos) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para generar su link clásico.", "error");
      return null;
    }
    const datosListos = { ...fila.datos_completos, tema: fila.tema_elegido || fila.datos_completos.tema, invitados: [] };
    return `${URL_PUBLICA_INVITAMX}/?v=1&d=${encodeState(datosListos)}&iid=${encodeURIComponent(fila.id)}`;
  };
  const handleCopiarLinkClasicoFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkClasicoFila(row);
    if (url) copiarLinkClienta(url);
  };
  const handleAbrirLinkClasicoFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkClasicoFila(row);
    if (url) abrirLinkClienta(url);
  };

  // Tercer botón "WhatsApp" de cada link de "Links de la clienta" (2026-11-22, pedido
  // explícito: Copiar / Abrir / WhatsApp en los tres) -- abre el WhatsApp de LA CLIENTA
  // (`row.telefono_whatsapp`) con el link ya resuelto y un mensaje breve, mismo formato que el
  // resto de botones de WhatsApp del panel (nunca lo manda solo, el admin le da "Enviar" él
  // mismo en WhatsApp). Helper genérico para no repetir la guardia de teléfono + la URL de
  // api.whatsapp.com en cada variante.
  const enviarWhatsAppLinkClienta = (row: InvitacionGuardadaRow, url: string, introduccion: string) => {
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    const msg = `${introduccion}\n${url}`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };
  const handleEnviarWhatsAppLinkInvitacionFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkInvitacionFila(row);
    if (url) enviarWhatsAppLinkClienta(row, url, `¡Hola! 🌸 Aquí está el link de tu invitación de XV Años de *${row.nombre_quinceanera || "tu evento"}*:`);
  };
  const handleEnviarWhatsAppLinkClasicoFila = async (row: InvitacionGuardadaRow) => {
    const url = await resolverLinkClasicoFila(row);
    if (url) enviarWhatsAppLinkClienta(row, url, `¡Hola! 🌸 Aquí está el link de tu invitación de XV Años de *${row.nombre_quinceanera || "tu evento"}*:`);
  };
  // Distinto de `handleEnviarLinkCheckin` (más abajo, manda al número del ENCARGADO de la
  // puerta, capturado aparte en `telefonoCheckinPorInvitacion` -- normalmente no es la clienta):
  // este manda el mismo link al WhatsApp de LA CLIENTA, para que ella misma se lo reenvíe a
  // quien vaya a controlar el acceso, si así prefiere hacerlo. No es un duplicado -- el
  // destinatario y el mensaje son distintos.
  const handleEnviarWhatsAppLinkCheckinCliente = (row: InvitacionGuardadaRow) => {
    enviarWhatsAppLinkClienta(row, urlControlAcceso(row), `¡Hola! 🔳 Este es el link de control de acceso para la fiesta de XV Años de *${row.nombre_quinceanera || "tu evento"}* -- compártelo con quien vaya a registrar la entrada de cada familia el día del evento:`);
  };

  // Exporta la lista de "Mis Invitaciones" (respetando los filtros/búsqueda activos) a un CSV
  // descargable, para llevar cuentas fuera de la app (Excel, contador, etc.).
  const escapeCSV = (valor: string | number | null | undefined): string => {
    const texto = String(valor ?? "");
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const handleExportarInvitacionesCSV = () => {
    const encabezados = ["Nombre", "Tema", "Fecha del evento", "Estatus", "Teléfono", "Precio total", "Precio pagado", "Falta pagar", "Pases pagado", "PDF pagado", "QR acceso pagado", "Notas"];
    const filas = invitacionesFiltradas.map(row => {
      const estatusLabel = ESTATUS_PEDIDO.find(e => e.id === (row.estado || "cotizacion"))?.label || row.estado || "";
      const falta = (row.precio_total || 0) - (row.precio_pagado || 0);
      return [
        row.nombre_quinceanera || "",
        temas.find(t => t.id === row.tema_elegido)?.nombre || row.tema_elegido || "",
        row.fecha_fiesta || "",
        estatusLabel,
        row.telefono_whatsapp || "",
        row.precio_total ?? "",
        row.precio_pagado ?? "",
        row.precio_total ? falta : "",
        row.pases_pagado ? "Sí" : "No",
        row.pdf_pagado ? "Sí" : "No",
        row.checkin_pagado ? "Sí" : "No",
        row.notas || ""
      ].map(escapeCSV).join(",");
    });
    const csv = "﻿" + [encabezados.join(","), ...filas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mis-invitaciones-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Respaldo completo de TODAS las invitaciones guardadas (no solo las visibles bajo el
  // filtro/búsqueda actual, a diferencia del CSV de arriba -- un respaldo que se le puede
  // olvidar quitar un filtro y quedar incompleto no sirve como respaldo). Incluye el
  // datos_completos entero de cada una, así que este único archivo basta para reconstruir
  // cualquier invitación si algo le pasa a la fila en Supabase. Pide `?full=1` a
  // list-invitaciones.ts (2026-11-19) en vez de usar listaInvitaciones tal cual -- la lista
  // ligera ya no trae datos_completos de entrada (ver el comentario ahí).
  const handleRespaldoCompletoInvitaciones = async () => {
    setGenerandoRespaldoCompleto(true);
    try {
      const resp = await fetch("/api/admin/list-invitaciones?full=1");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Error al generar el respaldo completo");
      const filas = (data || []) as InvitacionGuardadaRow[];
      const respaldo = filas.map(row => ({
        id: row.id,
        nombre_quinceanera: row.nombre_quinceanera,
        fecha_fiesta: row.fecha_fiesta,
        tema_elegido: row.tema_elegido,
        estado: row.estado,
        precio_total: row.precio_total,
        precio_pagado: row.precio_pagado,
        telefono_whatsapp: row.telefono_whatsapp,
        notas: row.notas,
        link_pago: row.link_pago,
        activo_hasta: row.activo_hasta,
        intake_actualizado_en: row.intake_actualizado_en,
        bloqueada: row.bloqueada,
        motivo_bloqueo: row.motivo_bloqueo,
        checkin_pagado: row.checkin_pagado,
        datos_completos: row.datos_completos
      }));
      const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo-completo-invitaciones-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      mostrarToast(`Respaldo de ${respaldo.length} invitación${respaldo.length === 1 ? "" : "es"} descargado`, "success");
    } catch (err: any) {
      mostrarToast("Error al generar el respaldo completo: " + err.message, "error");
    } finally {
      setGenerandoRespaldoCompleto(false);
    }
  };

  // Archiva en un solo paso todas las invitaciones cuyo evento ya pasó (estado
  // "evento_pasado", puesto ahí automáticamente por cargarListaInvitaciones) -- antes había
  // que abrir cada una y cambiarle el estatus a mano de una en una.
  const handleArchivarEventosPasados = () => {
    const idsAArchivar = invitacionesArchivablesPorEventoPasado.map(r => r.id);
    if (idsAArchivar.length === 0) return;
    const n = idsAArchivar.length;
    setConfirmModal({
      titulo: "Archivar eventos pasados",
      mensaje: `¿Archivar ${n} invitación${n === 1 ? "" : "es"} marcada${n === 1 ? "" : "s"} como "Evento pasado"? Esto solo cambia su estatus a "Archivada" -- no borra nada ni afecta los links ya compartidos con los invitados o el cliente.`,
      onAceptar: async () => {
        if (!window.supabaseClient) return;
        try {
          const { error } = await window.supabaseClient.from("invitaciones").update({ estado: "archivada" }).in("id", idsAArchivar);
          if (error) throw error;
          setListaInvitaciones(prev => prev.map(r => idsAArchivar.includes(r.id) ? { ...r, estado: "archivada" } : r));
          mostrarToast(`${n} invitación${n === 1 ? "" : "es"} archivada${n === 1 ? "" : "s"}`, "success");
        } catch (err: any) {
          mostrarToast("Error al archivar: " + err.message, "error");
        }
      }
    });
  };

  // Descargar el archivo index.html standalone
  const handleDescargarHTML = () => {
    const htmlCompleto = generarHTMLFinal(datos, temaActual);
    const blob = new Blob([htmlCompleto], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    // Nombre del archivo personalizado según la quinceañera
    const slugName = (datos.nombre || "invitacion").toLowerCase().replace(/[^a-z0-9]/g, "-");
    a.download = `index-${slugName}-${datos.paquete}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generar un PDF de regalo con el diseño completo de la invitación (para imprimir o guardar de recuerdo)
  const handleDescargarPDF = async () => {
    setGenerandoPDF(true);
    let contenedorTemporal: HTMLIFrameElement | null = null;
    try {
      // jsPDF/html2canvas se cargan solo aquí, bajo demanda -- son librerías pesadas que antes
      // se importaban de forma estática arriba del archivo, así que SIEMPRE bajaban y se
      // parseaban en TODOS los modos (vista de invitado, catálogo, embed de ThemePreview,
      // checkin, intake), aunque solo el editor usa esta función. Encontrado el 2026-11-17
      // investigando por qué las 14 vistas previas del catálogo cargaban lento -- esto no era
      // la causa principal (ese bug era el 401 de embed=true en middleware.ts, ya corregido),
      // pero sí es peso real que esos modos nunca necesitan.
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas")
      ]);
      const htmlCompleto = generarHTMLFinal(datos, temaActual, { paraExportarPDF: true });

      // Renderizamos la invitación en un iframe oculto, ya "abierta", para capturarla completa
      contenedorTemporal = document.createElement("iframe");
      contenedorTemporal.style.position = "fixed";
      contenedorTemporal.style.top = "-99999px";
      contenedorTemporal.style.left = "0";
      contenedorTemporal.style.width = "420px";
      // Alto fijo tipo "pantalla de celular": varias secciones usan unidades vh (ej. la
      // portada usa min-h-[92vh]) que se resuelven contra ESTE alto. Si luego estiráramos el
      // iframe hasta igualar el alto total del contenido, ese 92vh pasaría a ser el 92% de TODA
      // la invitación en vez de una pantalla — exactamente lo que causaba que las secciones se
      // vieran separadas por espacios enormes en el PDF.
      contenedorTemporal.style.height = "800px";
      contenedorTemporal.style.border = "0";
      document.body.appendChild(contenedorTemporal);

      await new Promise<void>((resolve) => {
        contenedorTemporal!.onload = () => resolve();
        contenedorTemporal!.srcdoc = htmlCompleto;
      });

      const iframeDoc = contenedorTemporal.contentDocument;
      if (!iframeDoc) throw new Error("No se pudo preparar la invitación para exportar");

      // Forzamos el estado "abierto" (sin overlay de sobre) para que el PDF muestre el contenido completo
      iframeDoc.body.classList.add("experiencia-iniciada");
      const overlaySobre = iframeDoc.getElementById("pantalla-apertura");
      if (overlaySobre) overlaySobre.style.display = "none";

      // body y main traen "min-h-screen" (min-height:100vh) para que la invitación real ocupe
      // toda la pantalla del celular del invitado. Pero el iframe de captura mide 800px fijos
      // (necesario para que secciones con vh, como la portada, se vean como "una pantalla" y no
      // como % de todo el documento) — en invitaciones cortas (pocas secciones/paquete Básico)
      // cuyo contenido real mide menos de 800px, ese min-height de todas formas fuerza el body a
      // 800px, dejando un espacio en blanco al final del PDF. Invitaciones largas no lo notan
      // porque su contenido ya supera los 800px por sí solo. Se neutraliza solo para esta
      // captura (con estilo inline, que gana sobre la clase) — no afecta el HTML final real.
      iframeDoc.body.style.minHeight = "0";
      const mainEl = iframeDoc.querySelector("main");
      if (mainEl) (mainEl as HTMLElement).style.minHeight = "0";

      // Esperamos a que las fuentes de Google Fonts y las imágenes terminen de cargar antes
      // de capturar. Antes había solo un timeout fijo de 600ms, que en conexiones lentas no
      // alcanza y html2canvas termina tomando la foto con la fuente de reemplazo del sistema.
      const fontsReady = iframeDoc.fonts
        ? Promise.all(Array.from(iframeDoc.fonts).map((f) => f.load().catch(() => {})))
        : Promise.resolve();
      const imagenesListas = Promise.all(
        Array.from(iframeDoc.images).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
        )
      );
      await Promise.race([
        Promise.all([fontsReady, imagenesListas]),
        new Promise((resolve) => setTimeout(resolve, 4000))
      ]);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(iframeDoc.body, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: "#ffffff",
        // windowWidth/windowHeight fijan la base para resolver vh/vw (ej. min-h-[92vh] de la
        // portada) — deben quedarse en el tamaño de "pantalla de celular" del iframe, NO en el
        // alto real del contenido, que es lo que capturamos abajo con `height`.
        windowWidth: 420,
        windowHeight: 800,
        height: iframeDoc.body.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      // Una sola página con las medidas exactas de la invitación (mismo aspect ratio que la
      // captura), en vez de partirla en páginas tamaño carta. El PDF/jsPDF no permite páginas
      // de más de ~14400pt de alto, así que si la invitación es muy larga se reduce el tamaño
      // físico de la página proporcionalmente (ancho y alto por igual) para no pasar ese límite
      // — la imagen no se recorta ni se distorsiona, solo se imprime un poco más chica.
      const PX_A_PT = 0.75; // 1 px CSS (96dpi) = 0.75pt (72dpi), conversión estándar
      const LIMITE_PT = 14000; // margen de seguridad bajo el límite real de ~14400pt
      let pageWidth = canvas.width * PX_A_PT;
      let pageHeight = canvas.height * PX_A_PT;
      if (pageHeight > LIMITE_PT) {
        const factor = LIMITE_PT / pageHeight;
        pageWidth *= factor;
        pageHeight *= factor;
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [pageWidth, pageHeight]
      });
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);

      const slugName = (datos.nombre || "invitacion").toLowerCase().replace(/[^a-z0-9]/g, "-");
      pdf.save(`invitacion-${slugName}-regalo.pdf`);
      mostrarToast("🎁 PDF de regalo generado con éxito", "success");
    } catch (err: any) {
      mostrarToast("Error al generar el PDF: " + err.message, "error");
    } finally {
      if (contenedorTemporal) document.body.removeChild(contenedorTemporal);
      setGenerandoPDF(false);
    }
  };

  // Abrir vista previa en nueva pestaña (optimización para PC)
  const handleAbrirDemoNuevaPestana = () => {
    const htmlCompleto = generarHTMLFinal(datos, temaActual);
    const blob = new Blob([htmlCompleto], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    // Abrimos una VENTANA con el tamaño del dispositivo seleccionado en el monitor (Móvil/
    // Tablet), en vez de una pestaña normal que toma el ancho completo del navegador — si no,
    // aunque el contenido esté centrado, no se aprecia como una pantalla de celular real.
    const featuresPorDispositivo: Record<string, string> = {
      mobile: "width=430,height=900",
      tablet: "width=820,height=1024"
    };
    const features = featuresPorDispositivo[previewDevice];
    window.open(url, "_blank", features);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 4000);
  };

  // Copiar código HTML final al portapapeles
  const handleCopiarHTML = () => {
    const htmlCompleto = generarHTMLFinal(datos, temaActual);
    navigator.clipboard.writeText(htmlCompleto)
      .then(() => {
        setHtmlCopiado(true);
        setTimeout(() => setHtmlCopiado(false), 2000);
        mostrarToast("¡Código HTML de la invitación copiado al portapapeles! 📄⚜️", "success");
      })
      .catch(err => mostrarToast("Error al copiar HTML: " + err, "error"));
  };

  // Copiar objeto de datos JSON al portapapeles para guardado futuro
  const handleCopiarDatos = () => {
    const datosJson = JSON.stringify(datos, null, 2);
    navigator.clipboard.writeText(datosJson)
      .then(() => {
        setDatosCopiados(true);
        setTimeout(() => setDatosCopiados(false), 2000);
        mostrarToast("¡Esquema de datos JSON de la invitación copiado al portapapeles! 📂⚙️", "success");
      })
      .catch(err => mostrarToast("Error al copiar datos JSON: " + err, "error"));
  };

  // Generar URL del catálogo de demos. Este deploy (administradorinvitamx.vercel.app) es
  // público sin protección SSO, así que basta con apuntar al propio origen para que el link
  // funcione para cualquier cliente, sin importar desde dónde se genere (editor, localhost, etc.).
  //
  // Importante: NO se codifica `datos` aquí. Este link se pensó para reutilizarse muchas
  // veces con distintos clientes potenciales, y si incluyera el estado de la invitación que
  // esté abierta en ese momento en el editor, filtraría datos privados de un cliente real
  // (cuenta bancaria, lista de invitados, teléfono) de forma decodificable en la URL. El
  // catálogo no necesita esos datos: los fondos personalizados por tema ya se sincronizan
  // vía Supabase para cualquiera que abra la página.
  const getCatalogUrl = () => {
    const appUrl = window.location.origin + "/";
    return `${appUrl}?catalog=true`;
  };


  // Generar URL de compartir con todos los datos y el invitado seleccionado. Este deploy es
  // público sin protección SSO, así que apuntar al propio origen es seguro: los invitados
  // reales abren su invitación sin toparse con ningún login de Vercel.
  //
  // Privacidad: cada link SOLO lleva los datos del invitado al que se le está enviando, nunca
  // la lista completa de `datos.invitados`. Antes se mandaba el arreglo completo siempre (el
  // parámetro `g` solo pre-llenaba un buscador), así que CUALQUIER link -general o
  // "personalizado"- exponía nombre y número de pases de TODAS las demás familias a quien sea
  // que lo abriera. Ahora, si no hay un invitado específico seleccionado (link general de
  // preview), la lista va vacía a propósito.
  // Detecta fotos "locales" (base64, recién elegidas del teléfono/computadora pero nunca
  // subidas a Cloudinary). encodeState (más abajo) las quita del link compartido y cae al
  // diseño por defecto del tema -- se ven perfecto en TU editor, pero desaparecen del todo
  // para quien abra el link, sin ningún aviso. Se usa para mostrar una advertencia antes de
  // compartir (ver banner en la sección "Compartir por WhatsApp").
  const detectarFotosLocalesSinSubir = (): string[] => {
    const problemas: string[] = [];
    if (datos.fotoPortada?.startsWith("data:")) problemas.push("Foto de Portada");
    (datos.fotos || []).forEach((f, i) => {
      if (f?.startsWith("data:")) problemas.push(`Foto de Galería #${i + 1}`);
    });
    const fondoActual = datos.bgImages?.[selectedTemaId];
    if (fondoActual?.startsWith("data:")) problemas.push(`Fondo del tema "${temaActual.nombre}"`);
    return problemas;
  };

  // Validaciones básicas antes de compartir/guardar: nada de esto bloquea al admin (sigue
  // siendo su decisión), solo evita que un link roto o con datos incompletos salga sin que se
  // note -- antes no había ningún aviso de campo obligatorio, teléfono mal escrito, o fecha ya
  // pasada.
  const validarInvitacion = (): string[] => {
    const problemas: string[] = [];
    if (!datos.nombre?.trim()) {
      const tipo = datos.tipoEvento || "xv";
      problemas.push(tipo === "xv" ? "Falta el nombre de la quinceañera" : `Falta el nombre (${ETIQUETA_NOMBRE_POR_EVENTO[tipo]})`);
    }
    const soloDigitos = (datos.whatsappConfirmacion || "").replace(/[^0-9]/g, "");
    if (!soloDigitos) {
      problemas.push("Falta el número de WhatsApp de confirmación");
    } else if (soloDigitos.length < 10 || soloDigitos.length > 13) {
      problemas.push(`El número de WhatsApp de confirmación (${soloDigitos.length} dígitos) no parece válido — revisa que tenga código de país + 10 dígitos`);
    }
    if (!datos.fecha) {
      problemas.push("Falta la fecha del evento");
    } else {
      const fechaEvento = new Date(datos.fecha);
      if (!isNaN(fechaEvento.getTime()) && fechaEvento.getTime() < Date.now()) {
        problemas.push("La fecha del evento ya pasó");
      }
    }
    // El enlace de Maps es texto libre y opcional (la dirección escrita ya se muestra aparte),
    // pero un error común es pegar la dirección en vez del link de compartir de Google Maps --
    // eso deja el botón "Cómo llegar" roto sin que nada lo note. Solo se avisa si SE ESCRIBIÓ
    // algo y no tiene pinta de URL; un campo vacío no es un error, solo falta ese dato.
    const revisarMaps = (valor: string | undefined, etiqueta: string) => {
      const texto = (valor || "").trim();
      if (texto && !/^https?:\/\//i.test(texto)) {
        problemas.push(`El enlace de Google Maps de ${etiqueta} no parece una URL (¿pegaste la dirección en vez del link "Compartir" de Maps?) — el botón "Cómo llegar" no va a funcionar`);
      }
    };
    revisarMaps(datos.ceremonia?.maps, "la ceremonia");
    revisarMaps(datos.recepcion?.maps, "la recepción");
    return problemas;
  };

  // `codigoCortoOverride` (2026-11-19, parte 1 de "que el link corto salga siempre"): permite
  // construir el link con un código que TODAVÍA no llegó a `datos.codigoCorto` en este render --
  // necesario porque, tras guardar para generar uno nuevo (ver asegurarCodigoCortoParaEntregarLink),
  // `setDatos` no actualiza el `datos` que esta función ya tiene cerrado en el closure hasta el
  // siguiente render; sin este parámetro, el PRIMER link compartido justo después de guardar
  // seguiría saliendo largo por un instante, aunque el código ya exista en Supabase.
  const getShareUrl = (invitadoIndex = selectedInvitadoIndex, codigoCortoOverride?: string) => {
    const appUrl = URL_PUBLICA_INVITAMX + "/";
    const invitadoObjetivo =
      invitadoIndex !== -1 && datos.invitados && datos.invitados[invitadoIndex]
        ? datos.invitados[invitadoIndex]
        : null;

    // Link corto (2026-11-19): una vez que la invitación tiene código asignado (se guardó al
    // menos una vez en Supabase, ver guardarEnSupabase), el link PRINCIPAL pasa a ser el corto
    // `/v/<codigoCorto>` en vez del blob largo -- `/v/<codigo>/<slug>` reemplaza al viejo
    // `?fam=` para un invitado específico (2026-11-21, ver resolverFamiliaPorSlug/
    // slugsDeInvitados arriba y la resolución del link corto más abajo, que sigue aceptando
    // `?fam=` también para los links ya compartidos antes de este cambio).
    // El enlace de "muestra" (preview temporal con marca de agua, ver esEnlaceMuestra/
    // aplicarModoMuestra) TAMBIÉN usa este mismo link corto cuando hay código (2026-11-22,
    // "Link de muestra corto" -- antes se excluía aquí a propósito, cuando `/v/<codigo>`
    // todavía no sabía leer `?muestra=1&exp=...`; ya lo sabe desde la Parte 2 del link corto,
    // igual que `getShareUrlDesdeFila` en "Mis Invitaciones" ya hacía). `aplicarModoMuestra`
    // es quien agrega `muestra=1&exp=...` después, aquí no hace falta saber nada de eso -- el
    // formato largo de abajo se queda solo como respaldo para invitaciones sin código.
    const codigo = codigoCortoOverride || datos.codigoCorto;
    if (codigo) {
      const baseCorta = `${URL_PUBLICA_INVITAMX}/v/${codigo}`;
      if (!invitadoObjetivo) return baseCorta;
      const idxSlug = (datos.invitados || []).indexOf(invitadoObjetivo);
      const slugInvitado = idxSlug >= 0 ? slugsDeInvitados(datos.invitados || [])[idxSlug] : slugFamilia(invitadoObjetivo.nombre);
      return `${baseCorta}/${slugInvitado}`;
    }

    // Sincronizar el tema activo de forma explícita en los datos decodificables antes de codificar la URL
    const datosListos = {
      ...datos,
      tema: selectedTemaId,
      invitados: invitadoObjetivo ? [invitadoObjetivo] : []
    };

    let url = `${appUrl}?v=1&d=${encodeState(datosListos)}`;
    if (invitadoObjetivo) {
      url += `&g=${encodeURIComponent(invitadoObjetivo.nombre)}`;
      // `famSlug` para que mostrarPaseFijo() en templates.ts pueda armar el QR del pase como
      // el link corto de check-in (/puerta/<codigo>/<slug>) cuando esta invitación SÍ tenga
      // codigoCorto (puede traerlo aunque el link principal haya salido largo por ir con
      // &g=, ej. una "muestra") -- ver mismo razonamiento en la resolución de /v/ más abajo.
      const idxSlugBlob = (datos.invitados || []).indexOf(invitadoObjetivo);
      const slugBlob = idxSlugBlob >= 0 ? slugsDeInvitados(datos.invitados || [])[idxSlugBlob] : slugFamilia(invitadoObjetivo.nombre);
      url += `&famSlug=${encodeURIComponent(slugBlob)}`;
    }
    // Si esta invitación ya se guardó en Supabase, incluimos su id (`iid`) en el link para que
    // el formulario de RSVP dentro de la invitación pueda asociar cada confirmación a esta fila
    // (ver "Mis Invitaciones" → confirmaciones). Si nunca se guardó, el RSVP sigue funcionando
    // igual por WhatsApp, solo que no queda registrado en ningún lado para verlo después.
    if (supabaseRowId) {
      url += `&iid=${encodeURIComponent(supabaseRowId)}`;
    }
    return url;
  };

  // Enlaces de "muestra": para mandarle una vista previa a un cliente potencial ANTES de que
  // pague. Se agregan como parámetros de URL sueltos (fuera del blob `d`) para no tocar el
  // modelo de datos de la invitación en absoluto. Expiran a los `MUESTRA_DIAS_VIGENCIA` días
  // (revisión del lado del cliente en isViewMode más abajo — no es seguridad real, solo un
  // límite práctico) y muestran un banner de "MUESTRA" sobre la invitación mientras estén
  // vigentes.
  const MUESTRA_DIAS_VIGENCIA = 5; // 5 días (ajuste 2026-11-18, antes 7 días)
  const aplicarModoMuestra = (url: string): string => {
    if (!esEnlaceMuestra) return url;
    const exp = Date.now() + MUESTRA_DIAS_VIGENCIA * 24 * 60 * 60 * 1000;
    // Separador correcto (2026-11-22, "Link de muestra corto"): antes `url` SIEMPRE llegaba con
    // un `?` ya puesto (el blob largo `?v=1&d=...`), porque `getShareUrl` nunca devolvía la
    // forma corta en modo muestra -- un `&` a secas bastaba. Ahora `getShareUrl` también
    // devuelve el link corto `/v/<codigo>` (sin ningún `?`) para muestra, así que hay que
    // detectar si `url` ya trae query string antes de decidir si el primer parámetro empieza
    // con `?` o con `&` -- un `&` sobre un link corto sin `?` dejaría una URL rota
    // (`/v/<codigo>&muestra=1...`, sin signo de interrogación).
    const separador = url.includes("?") ? "&" : "?";
    return `${url}${separador}muestra=1&exp=${exp}`;
  };

  // Compartir datos de la invitación final por WhatsApp
  const handleEnviarWhatsApp = async (overrideInvitadoIndex?: number) => {
    // validarInvitacion() ya detecta estos problemas (WhatsApp inválido, enlaces de Maps que
    // parecen direcciones en vez de links, etc.), pero solo se mostraba como un aviso pasivo
    // en la sección de compartir -- el admin puede no llegar a verlo y mandar el link igual.
    // Aquí se avisa justo en el momento que de verdad importa (al mandar el link), sin
    // bloquear el envío -- misma filosofía que validarInvitacion: avisa, no bloquea, porque
    // el admin puede querer compartir un WIP a propósito.
    const problemasEnvio = validarInvitacion();
    if (problemasEnvio.length > 0) {
      mostrarToast(`⚠️ Revisa antes de compartir: ${problemasEnvio.join(" · ")}`, "error");
    }

    // "Compartir guarda primero" (2026-11-19): si esta invitación nunca se ha guardado, guardar
    // aquí mismo antes de armar el link -- sin esto, getShareUrl() caía al blob largo
    // `?v=1&d=...` en vez del corto, porque ese código solo existe una vez que se guardó.
    const listoParaCompartir = await asegurarCodigoCortoParaEntregarLink();
    if (!listoParaCompartir.ok) return;

    const targetIndex = typeof overrideInvitadoIndex === "number" ? overrideInvitadoIndex : selectedInvitadoIndex;
    const urlFinal = aplicarModoMuestra(getShareUrl(targetIndex, listoParaCompartir.codigo));
    const nombreQuince = datos.nombre || "Sophia Valeria";
    
    let fechaBonita = datos.fecha;
    try {
      if (datos.fecha) {
        const d = new Date(datos.fecha);
        fechaBonita = d.toLocaleDateString("es-MX", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    } catch (e) {
      // Usar tal cual si falla
    }

    const hasGuest = targetIndex !== -1 && datos.invitados && datos.invitados[targetIndex];
    const invitado = hasGuest ? datos.invitados[targetIndex] : null;

    let msg = "";
    if (whatsappTemplateId === "link-only") {
      if (invitado) {
        msg = `🌸 ¡Hola *${invitado.nombre}*! Te comparto tu pase digital personalizado con *${invitado.pases} boleto(s)* para los XV Años de *${nombreQuince}*: ${urlFinal}`;
      } else {
        msg = `🌸 ¡Hola! Te comparto el enlace de la invitación digital interactiva de XV Años de *${nombreQuince}*: ${urlFinal}`;
      }
    } else {
      if (invitado) {
        msg = `¡Hola *${invitado.nombre}*! Ya está lista tu invitación digital personalizada de XV Años para *${nombreQuince}*. 🌸✨\n\n🎟️ Tienen asignados: **${invitado.pases} pase(s)** familiares\n📅 *Fecha:* ${fechaBonita}\n💒 *Misa:* ${datos.ceremonia.lugar || "Sin especificar"} (${datos.ceremonia.hora || "Sin especificar"} hrs)\n🎉 *Recepción:* ${datos.recepcion.lugar || "Sin especificar"}\n\n👉 Puedes ver tu pase interactivo ingresando a este enlace:\n${urlFinal}`;
      } else {
        msg = `¡Hola! Ya está lista la propuesta de invitación digital de XV Años para *${nombreQuince}*. 🌸✨\n\n📅 *Fecha:* ${fechaBonita}\n💒 *Misa:* ${datos.ceremonia.lugar || "Sin especificar"} (${datos.ceremonia.hora || "Sin especificar"} hrs)\n🎉 *Recepción:* ${datos.recepcion.lugar || "Sin especificar"} (${datos.recepcion.hora || "Sin especificar"} hrs)\n\n👉 Puedes ver la invitación digital interactiva ingresando a este enlace:\n${urlFinal}`;
      }
    }

    const numberClean = whatsappDestino.replace(/[^0-9]/g, "");
    const waUrl = `https://api.whatsapp.com/send?phone=${numberClean}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  // Procesar archivo cargado localmente (Subir a Cloudinary)
  const handleLeerFotoLocal = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxFotosPermitidas = paquetes[datos.paquete].maxFotos;
    const fotosActuales = [...(datos.fotos || [])];

    if (fotosActuales.length >= maxFotosPermitidas) {
      mostrarToast(`Límite alcanzado: El paquete ${datos.paquete.toUpperCase()} solo permite un máximo de ${maxFotosPermitidas} fotos.`, "error");
      e.target.value = "";
      return;
    }

    const file = files[0];
    setSubiendoCloudinary(true);
    try {
      const url = await subirImagenPublica(file);
      setDatos(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), url]
      }));
      mostrarToast("¡Imagen cargada exitosamente a Cloudinary! 🌐🌸", "success");
    } catch (err: any) {
      mostrarToast("Error al subir a Cloudinary: " + err.message, "error");
    } finally {
      setSubiendoCloudinary(false);
      e.target.value = "";
    }
  };

  // Procesar carga de foto de portada principal localmente a Cloudinary
  const handleCargarFotoPortadaLocal = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setSubiendoCloudinary(true);
    try {
      const url = await subirImagenPublica(file);
      setDatos(prev => ({
        ...prev,
        fotoPortada: url
      }));
      mostrarToast("¡Foto de portada cargada exitosamente a Cloudinary! 🌐🌸", "success");
    } catch (err: any) {
      mostrarToast("Error al subir foto de portada: " + err.message, "error");
    } finally {
      setSubiendoCloudinary(false);
      e.target.value = "";
    }
  };

  // Agregar una URL de foto pegada
  const handleAgregarFotoUrl = () => {
    if (!nuevoFotoUrl.trim()) return;
    
    const maxFotosPermitidas = paquetes[datos.paquete].maxFotos;
    const fotosActuales = [...(datos.fotos || [])];

    if (fotosActuales.length >= maxFotosPermitidas) {
      mostrarToast(`Límite alcanzado: El paquete ${datos.paquete.toUpperCase()} solo permite un máximo de ${maxFotosPermitidas} fotos.`, "error");
      return;
    }

    setDatos(prev => ({
      ...prev,
      fotos: [...(prev.fotos || []), nuevoFotoUrl.trim()]
    }));
    setNuevoFotoUrl("");
  };

  // Procesar carga de foto de galería en un casillero específico a Cloudinary
  const handleCargarFotoGaleriaIndex = async (index: number, file: File) => {
    if (!file) return;
    setSubiendoCloudinary(true);
    try {
      const url = await subirImagenPublica(file);
      setDatos(prev => {
        const nuevasFotos = [...(prev.fotos || [])];
        nuevasFotos[index] = url;
        return {
          ...prev,
          fotos: nuevasFotos
        };
      });
      mostrarToast(`¡Imagen para el casillero #${index + 1} cargada exitosamente a Cloudinary! 🌐🌸`, "success");
    } catch (err: any) {
      mostrarToast("Error al cargar imagen en galería: " + err.message, "error");
    } finally {
      setSubiendoCloudinary(false);
    }
  };

  // Reemplazar o establecer el link de la foto de la galería en un casillero específico
  const handleEstablecerFotoUrlIndex = (index: number, url: string) => {
    setDatos(prev => {
      const nuevasFotos = [...(prev.fotos || [])];
      nuevasFotos[index] = url.trim();
      return {
        ...prev,
        fotos: nuevasFotos
      };
    });
  };

  // Eliminar foto individual de galería por índice sin desordenar necesariamente el resto
  const handleEliminarFoto = (index: number) => {
    setDatos(prev => {
      const nuevasFotos = [...(prev.fotos || [])];
      // Eliminamos el elemento de esa posición (splice) o la limpiamos.
      // Limpiarla (dejarla vacía) o removerla de la lista. Removerla de la lista compactará la galería.
      // Hagamos la eliminación compactando, que es el comportamiento esperado usual de una galería,
      // pero actualizando correctamente.
      const filtradas = nuevasFotos.filter((_, i) => i !== index);
      return {
        ...prev,
        fotos: filtradas
      };
    });
  };

  // Fotos "listas" de álbum por evento (2026-11-22, ver fotosListas.ts) -- espejo de
  // handleAplicarFondoGaleria/handleQuitarFondoGaleria pero SIN campo propio: las URLs quedan
  // escritas directo en datos.fotoPortada/datos.fotos, como si se hubieran subido a mano, así
  // que a partir de ahí son fotos normales (se quitan/reemplazan con los controles de siempre,
  // PARTE 3) y cambiar de tipo de evento nunca las borra ni las recuerda.
  const handleInsertarFotoLista = (url: string) => {
    const fotosActuales = datos.fotos || [];
    if (fotosActuales.includes(url)) return; // ya está -- la miniatura ya se ve marcada ✓, no duplica
    const maxFotosPermitidas = paquetes[datos.paquete].maxFotos;
    if (fotosActuales.length >= maxFotosPermitidas) {
      mostrarToast(`Límite alcanzado: El paquete ${datos.paquete.toUpperCase()} solo permite un máximo de ${maxFotosPermitidas} fotos.`, "error");
      return;
    }
    setDatos(prev => ({ ...prev, fotos: [...(prev.fotos || []), url] }));
  };

  const handleInsertarSetFotosCompleto = (grupo?: string) => {
    const tipoActual: TipoEvento = (datos.tipoEvento && TEXTOS_POR_EVENTO[datos.tipoEvento]) ? datos.tipoEvento : "xv";
    const setDelEvento = fotosListasPorEvento(tipoActual).filter(f => !grupo || f.grupo === grupo);
    if (setDelEvento.length === 0) return;

    const maxFotosPermitidas = paquetes[datos.paquete].maxFotos;
    const nuevasFotos = [...(datos.fotos || [])];
    const yaPresentes = new Set(nuevasFotos);
    let insertadas = 0;
    let descartadasPorLimite = 0;

    for (const foto of setDelEvento) {
      if (yaPresentes.has(foto.url)) continue;
      if (nuevasFotos.length >= maxFotosPermitidas) {
        descartadasPorLimite++;
        continue;
      }
      nuevasFotos.push(foto.url);
      yaPresentes.add(foto.url);
      insertadas++;
    }

    const fotoDePortada = setDelEvento.find(f => f.esPortada);
    let nuevaPortada = datos.fotoPortada;
    let portadaPuesta = false;
    let portadaYaExistia = false;
    if (fotoDePortada) {
      if (!datos.fotoPortada) {
        nuevaPortada = fotoDePortada.url;
        portadaPuesta = true;
      } else {
        portadaYaExistia = true;
      }
    }

    setDatos(prev => ({
      ...prev,
      fotos: nuevasFotos,
      fotoPortada: nuevaPortada
    }));

    const evento = TIPOS_EVENTO.find(t => t.id === tipoActual)?.label || "Evento";
    const clausulas: string[] = [];
    if (portadaPuesta) clausulas.push("portada lista");
    else if (portadaYaExistia) clausulas.push("la portada ya existía y no se cambió");

    if (insertadas > 0) {
      clausulas.push(
        descartadasPorLimite > 0
          ? `${insertadas} foto${insertadas === 1 ? "" : "s"} en la galería (el paquete ${paquetes[datos.paquete].nombre} solo admite ${maxFotosPermitidas})`
          : `${insertadas} foto${insertadas === 1 ? "" : "s"} en la galería`
      );
    } else if (descartadasPorLimite > 0) {
      clausulas.push(`no se pudo agregar ninguna foto nueva a la galería -- el paquete ${paquetes[datos.paquete].nombre} ya está en su límite de ${maxFotosPermitidas}`);
    }

    if (clausulas.length === 0) {
      mostrarToast(`El set de ${evento} ya estaba insertado por completo -- nada que agregar`, "info");
    } else {
      mostrarToast(`Set de ${evento} insertado: ${clausulas.join(" y ")}`, "success");
    }
  };

  // Itinerario: Agregar evento
  const handleAgregarItinerario = () => {
    if (!nuevoItinHora || !nuevoItinEvento) {
      mostrarToast("Por favor rellena ambos campos: Hora y Evento.", "error");
      return;
    }
    setDatos(prev => ({
      ...prev,
      itinerario: [
        ...(prev.itinerario || []),
        { hora: nuevoItinHora, evento: nuevoItinEvento }
      ]
    }));
    setNuevoItinHora("");
    setNuevoItinEvento("");
  };

  // Itinerario: Eliminar evento
  const handleEliminarItinerario = (index: number) => {
    setDatos(prev => ({
      ...prev,
      itinerario: (prev.itinerario || []).filter((_, i) => i !== index)
    }));
  };

  // Padres: Agregar
  const handleAgregarPadre = () => {
    if (!nuevoPadre.trim()) return;
    setDatos(prev => ({
      ...prev,
      padres: [...(prev.padres || []), nuevoPadre.trim()]
    }));
    setNuevoPadre("");
  };

  // Padres: Eliminar
  const handleEliminarPadre = (index: number) => {
    setDatos(prev => ({
      ...prev,
      padres: (prev.padres || []).filter((_, i) => i !== index)
    }));
  };

  // Padrinos: Agregar
  const handleAgregarPadrino = () => {
    if (!nuevoPadrino.trim()) return;
    setDatos(prev => ({
      ...prev,
      padrinos: [...(prev.padrinos || []), nuevoPadrino.trim()]
    }));
    setNuevoPadrino("");
  };

  // Padrinos: Eliminar
  const handleEliminarPadrino = (index: number) => {
    setDatos(prev => ({
      ...prev,
      padrinos: (prev.padrinos || []).filter((_, i) => i !== index)
    }));
  };

  // Invitados: Agregar
  const handleAgregarInvitado = () => {
    if (!nuevoInvitadoNombre.trim()) {
      mostrarToast("Por favor escribe el nombre de la familia o invitado.", "error");
      return;
    }
    setDatos(prev => ({
      ...prev,
      invitados: [
        ...(prev.invitados || []),
        { nombre: nuevoInvitadoNombre.trim(), pases: nuevoInvitadoPases }
      ]
    }));
    setNuevoInvitadoNombre("");
    setNuevoInvitadoPases(2);
  };

  // Invitados: Eliminar
  const handleEliminarInvitado = (index: number) => {
    setDatos(prev => ({
      ...prev,
      invitados: (prev.invitados || []).filter((_, i) => i !== index)
    }));
  };

  // Invitados: Asignar/editar mesa (acomodo de mesas) -- texto libre, opcional. Vacío = sin
  // asignar, no se muestra nada en el pase del invitado (ver mostrarPaseFijo en templates.ts).
  const handleActualizarMesaInvitado = (index: number, mesa: string) => {
    setDatos(prev => ({
      ...prev,
      invitados: (prev.invitados || []).map((item, i) => i === index ? { ...item, mesa } : item)
    }));
  };

  // Invitados: Parsear una línea de texto libre en { nombre, pases }. Acepta el formato en el
  // que el cliente naturalmente mande su lista (copiado/pegado de Excel/Sheets, Word, o
  // escrito a mano en WhatsApp) — no exigimos un archivo ni un formato específico:
  //   "Familia Pérez, 4"        "Familia Pérez - 4 pases"     "Familia Pérez   4" (tab de Excel)
  //   "Familia Pérez (4)"       "Familia Pérez 4 personas"    "Familia Pérez" (sin número -> 2 pases)
  const parsearLineaInvitado = (linea: string): { nombre: string; pases: number } | null => {
    const trimmed = linea.trim();
    if (!trimmed) return null;

    const match = trimmed.match(
      /^(.*?)[\s,;:\-–—]+\(?(\d{1,2})\)?\s*(?:pases?|boletos?|personas?|invitados?)?\.?$/i
    );

    if (match && match[1].trim()) {
      // Acotado al mismo rango (1-20) que el formulario de "agregar uno" de al lado -- antes
      // esta línea aceptaba hasta 99 pases sin tope mientras el otro formulario topaba en 20,
      // una inconsistencia entre dos formas de cargar lo mismo (aunque de bajo riesgo real, ya
      // que esto lo pega el propio admin, no un visitante público).
      const pases = Math.min(Math.max(parseInt(match[2], 10) || 1, 1), 20);
      return { nombre: match[1].trim(), pases };
    }
    // Sin número identificable al final -> se toma la línea completa como nombre, default 2 pases
    return { nombre: trimmed, pases: 2 };
  };

  // Invitados: Importar lista completa pegada de un jalón (una familia por línea)
  const handleImportarListaInvitados = () => {
    const lineas = textoImportarInvitados.split(/\r?\n/);
    const nuevos = lineas
      .map(parsearLineaInvitado)
      .filter((x): x is { nombre: string; pases: number } => x !== null);

    if (nuevos.length === 0) {
      mostrarToast("No encontré ninguna familia válida en el texto pegado.", "error");
      return;
    }

    setDatos(prev => ({
      ...prev,
      invitados: [...(prev.invitados || []), ...nuevos]
    }));
    setTextoImportarInvitados("");
    setMostrarImportarLista(false);
    mostrarToast(`✅ ${nuevos.length} invitado(s) importado(s) correctamente`, "success");
  };

  // Código de Vestimenta: Agregar color sugerido
  const [nuevoColor, setNuevoColor] = useState("#b76e79");
  const handleAgregarColorSugerido = () => {
    if (datos.colorSugerido.includes(nuevoColor)) return;
    setDatos(prev => ({
      ...prev,
      colorSugerido: [...prev.colorSugerido, nuevoColor]
    }));
  };

  // Código de Vestimenta: Eliminar color
  const handleEliminarColorSugerido = (color: string) => {
    setDatos(prev => ({
      ...prev,
      colorSugerido: prev.colorSugerido.filter(c => c !== color)
    }));
  };

  // Enlaces de "muestra" (ver aplicarModoMuestra más arriba): `exp`/`muestra` viajan como
  // parámetros de URL sueltos, fuera del blob `d`, así que se leen aparte aquí. Esto NO es
  // seguridad real (alguien técnico podría decodificar `d` sin pasar por este chequeo) — es
  // solo un límite práctico para que una vista previa de venta no quede accesible para siempre.
  const paramsMuestra = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const muestraExp = paramsMuestra?.get("exp");
  const esVistaDeMuestra = paramsMuestra?.get("muestra") === "1";
  // `&& esVistaDeMuestra` agregado 2026-11-22: el link de revisión (ver más abajo) también usa
  // `exp`, sin `muestra=1` -- sin este chequeo, un link de revisión vencido caía por error en
  // la pantalla de "esta muestra ya expiró" (bug real encontrado en vivo al probar la expiración
  // de revisión, antes de que existiera esta guardia).
  const muestraExpirada = esVistaDeMuestra && !!muestraExp && Date.now() > parseInt(muestraExp, 10);

  // Enlaces de "revisión" (2026-11-22, regla de negocio "revisión primero, entrega final al
  // liquidar" -- ver resolverLinkRevisionFila/handleEnviarRevisionWhatsApp): mismo mecanismo
  // exacto que la muestra de arriba (parámetros de URL sueltos, mismo `exp` compartido -- nunca
  // viajan juntos en un link real, así que no hay colisión), pero la invitación se ve COMPLETA
  // y SIN marca de agua -- es para la clienta que ya pagó su anticipo, no para un prospecto.
  const esVistaDeRevision = paramsMuestra?.get("revision") === "1";
  const revisionExpirada = esVistaDeRevision && !!muestraExp && Date.now() > parseInt(muestraExp, 10);

  // Bloqueo manual del admin (ver "Mis Invitaciones" -> Apagar/Encender acceso). A diferencia
  // de la muestra de arriba, esto SÍ necesita una consulta a Supabase: el blob `d` de la URL es
  // estático (codificado una vez al compartir el link), así que no puede reflejar un apagado
  // hecho después -- solo el `iid` (id de la fila) que ya viaja en el link una vez que la
  // invitación se guardó permite revisar el estado actual en vivo. Links compartidos ANTES de
  // guardar (sin `iid`) no se pueden bloquear por esta vía -- se tratan como no bloqueados.
  const [bloqueoCheck, setBloqueoCheck] = useState<{ listo: boolean; bloqueada: boolean; motivo: string | null }>({ listo: false, bloqueada: false, motivo: null });
  // Pausa manual por falta de pago (2026-11-22) -- estado NUEVO e independiente del bloqueo de
  // arriba, resuelto en la MISMA consulta (una sola fila, dos chequeos distintos) por
  // eficiencia. Mientras `pausada` sea true, ninguna ruta pública debe mostrar ningún dato --
  // ver el guardia de pausa, que va primero, antes incluso que el de bloqueo.
  const [pausaCheck, setPausaCheck] = useState<{ listo: boolean; pausada: boolean }>({ listo: false, pausada: false });
  const iidVista = paramsMuestra?.get("iid") || null;
  useEffect(() => {
    if (!isViewMode) return;
    if (!iidVista || !window.supabaseClient) {
      setBloqueoCheck({ listo: true, bloqueada: false, motivo: null });
      setPausaCheck({ listo: true, pausada: false });
      return;
    }
    let cancelado = false;
    window.supabaseClient
      .from("invitaciones")
      .select("bloqueada, motivo_bloqueo, pausada")
      .eq("id", iidVista)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (cancelado) return;
        setBloqueoCheck({ listo: true, bloqueada: !error && !!data?.bloqueada, motivo: (!error && data?.motivo_bloqueo) || null });
        setPausaCheck({ listo: true, pausada: !error && !!data?.pausada });
      });
    return () => { cancelado = true; };
  }, [isViewMode, iidVista]);

  // Link corto /v/<codigoCorto> (2026-11-19): resuelve el código contra Supabase (anon key,
  // mismo modelo de lectura ya aceptado en check-in/intake -- lee datos_completos por id/código
  // conocido, nunca un SELECT sin filtro) y carga esa fila en `datos`/`selectedTemaId` -- de ahí
  // en adelante reusa EXACTAMENTE el mismo camino de siempre (document.write con
  // generarHTMLFinal). "cargando" bloquea ese document.write más abajo para que nunca se llegue
  // a pintar el relleno de initialDatos mientras este fetch sigue en vuelo.
  const [linkCortoEstado, setLinkCortoEstado] = useState<"ninguno" | "cargando" | "listo" | "no-encontrado">(() => {
    if (typeof window === "undefined") return "ninguno";
    return /^\/v\/[a-z0-9-]+(?:\/[a-z0-9-]+)?\/?$/i.test(window.location.pathname) ? "cargando" : "ninguno";
  });
  useEffect(() => {
    if (linkCortoEstado !== "cargando") return;
    let cancelado = false;
    const resolver = async () => {
      // Segundo segmento opcional (2026-11-21): /v/<codigo>/<slug-familia>, equivalente corto
      // de /v/<codigo>?fam=<nombre> -- ver resolverFamiliaPorSlug/slugsDeInvitados arriba.
      const match = window.location.pathname.match(/^\/v\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/i);
      const codigo = match?.[1];
      const slugFamiliaRuta = match?.[2] || null;
      if (!codigo || !window.supabaseClient) {
        if (!cancelado) setLinkCortoEstado("no-encontrado");
        return;
      }
      try {
        const { data, error } = await window.supabaseClient
          .from("invitaciones")
          .select("id, datos_completos, bloqueada, motivo_bloqueo, pausada")
          .eq("datos_completos->>codigoCorto", codigo)
          .maybeSingle();
        if (cancelado) return;
        if (error || !data || !data.datos_completos) {
          setLinkCortoEstado("no-encontrado");
          return;
        }
        const dc = data.datos_completos as InvitacionDatos;
        // Pases por familia: por el slug de la ruta corta /v/<codigo>/<slug> (prioridad, ya que
        // es un link de los que el panel genera hoy) o por el ?fam=<nombre> de los links largos
        // ya compartidos antes de este cambio (compatibilidad). Si ninguno coincide, se muestra
        // la vista general -- igual que un link largo "general" (sin invitado), `invitados`
        // SIEMPRE queda vacío en ese caso, nunca la lista completa (sería exponer a todos los
        // invitados a cualquiera que abra el link base, el mismo riesgo de privacidad que ya se
        // cerró para los links largos -- ver nota en getShareUrl).
        const famParam = new URLSearchParams(window.location.search).get("fam");
        const invitadoFam = slugFamiliaRuta
          ? resolverFamiliaPorSlug(dc.invitados || [], slugFamiliaRuta)
          : (famParam
            ? (dc.invitados || []).find(inv => inv.nombre.trim().toLowerCase() === famParam.trim().toLowerCase()) || null
            : null);
        setDatos({
          ...dc,
          invitados: invitadoFam ? [invitadoFam] : [],
          bgImages: { ...(dc.bgImages || {}), ...(datos.bgImages || {}) }
        });
        setSelectedTemaId(dc.tema || "dorado-clasico");
        // Inyecta `?iid=`/`&fam=` en la URL real (sin recargar) para que el HTML generado más
        // abajo -- que lee aperturas/RSVP/el QR de check-in directo de window.location.search,
        // ver templates.ts -- siga funcionando exactamente igual que con un link largo, sin
        // tener que tocar ese archivo. También deja que el chequeo de bloqueo de arriba
        // (iidVista) se vuelva a disparar con el id real en vez de "sin iid todavía".
        // Preservar `muestra`/`revision`/`exp` si venían en el link corto original (2026-11-19,
        // parte 2 de "que el link corto salga siempre"; `revision` agregado 2026-11-22, mismo
        // criterio exacto) -- sin esto, este replaceState los descartaba en silencio (solo
        // escribía iid/fam), así que esVistaDeMuestra/esVistaDeRevision/muestraExpirada/
        // revisionExpirada (que leen window.location.search en vivo, ver más arriba) dejaban de
        // ver el modo correspondiente justo después de resolver el código, aunque el link SÍ lo
        // traía al abrirse. `muestra`/`revision` nunca viajan juntos en un link real (son modos
        // mutuamente excluyentes), así que no hay riesgo de colisión al preservar ambos.
        const queryOriginal = new URLSearchParams(window.location.search);
        const muestraOriginal = queryOriginal.get("muestra");
        const revisionOriginal = queryOriginal.get("revision");
        const expOriginal = queryOriginal.get("exp");
        // `famSlug` viaja también para los links largos/`?fam=` de siempre (2026-11-21): así
        // mostrarPaseFijo() en templates.ts puede armar el QR del pase como el link CORTO de
        // check-in (/puerta/<codigo>/<slug>) sin tener que recalcular el slug ahí mismo con una
        // lista de invitados incompleta (datosInvitacion.invitados solo trae a ESTE invitado,
        // no a los demás, así que no podría desambiguar una colisión de slugs por su cuenta).
        const famSlugResuelto = invitadoFam
          ? slugsDeInvitados(dc.invitados || [])[(dc.invitados || []).indexOf(invitadoFam)] || null
          : null;
        const nuevaQuery = `?iid=${encodeURIComponent(data.id)}${invitadoFam ? `&fam=${encodeURIComponent(invitadoFam.nombre)}` : ""}${famSlugResuelto ? `&famSlug=${encodeURIComponent(famSlugResuelto)}` : ""}${muestraOriginal ? `&muestra=${encodeURIComponent(muestraOriginal)}` : ""}${revisionOriginal ? `&revision=${encodeURIComponent(revisionOriginal)}` : ""}${expOriginal ? `&exp=${encodeURIComponent(expOriginal)}` : ""}`;
        window.history.replaceState(null, "", window.location.pathname + nuevaQuery);
        // Se fija aparte del bloqueoCheck/pausaCheck genéricos de arriba (que de cualquier forma
        // se van a volver a disparar solo en cuanto `iidVista` cambie con el replaceState de
        // aquí arriba) para que la primera pintura ya sea la correcta -- sin esto, se quedarían
        // en su resolución preliminar de "sin iid todavía = sin bloqueo/pausa" durante la breve
        // ventana entre este fetch y el re-chequeo automático, y un link corto de una
        // invitación SÍ bloqueada o pausada podría llegar a pintarse antes de que se corrija.
        setBloqueoCheck({ listo: true, bloqueada: !!data.bloqueada, motivo: data.motivo_bloqueo || null });
        setPausaCheck({ listo: true, pausada: !!data.pausada });
        setLinkCortoEstado("listo");
      } catch {
        if (!cancelado) setLinkCortoEstado("no-encontrado");
      }
    };
    resolver();
    return () => { cancelado = true; };
  }, [linkCortoEstado]);

  // Rutas cortas /puerta/<codigoCorto>[/<slug-familia>] y /datos/<codigoCorto> (2026-11-21) --
  // ver matchPuertaRuta/matchDatosRuta más arriba. Mismo patrón que el resolver de /v/ de
  // arriba: fetch a Supabase por codigoCorto, luego `replaceState` al equivalente largo
  // (?checkin=1&iid=...[&fam=...] o ?intake=1&iid=...) -- de ahí en adelante, isCheckinMode/
  // isIntakeMode lo recogen solos en el siguiente render, sin tocar CheckinPage/IntakeForm.
  const [rutaCortaEstado, setRutaCortaEstado] = useState<"ninguno" | "cargando" | "listo" | "no-encontrado">(() => {
    if (typeof window === "undefined") return "ninguno";
    return (esPuertaCorta || esDatosCorta) ? "cargando" : "ninguno";
  });
  useEffect(() => {
    if (rutaCortaEstado !== "cargando") return;
    let cancelado = false;
    const resolver = async () => {
      const pathname = window.location.pathname;
      const mPuerta = pathname.match(/^\/puerta\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/i);
      const mDatos = pathname.match(/^\/datos\/([a-z0-9-]+)\/?$/i);
      const codigo = mPuerta?.[1] || mDatos?.[1];
      const slugRuta = mPuerta?.[2] || null;
      if (!codigo || !window.supabaseClient) {
        if (!cancelado) setRutaCortaEstado("no-encontrado");
        return;
      }
      try {
        const { data, error } = await window.supabaseClient
          .from("invitaciones")
          .select("id, datos_completos")
          .eq("datos_completos->>codigoCorto", codigo)
          .maybeSingle();
        if (cancelado) return;
        if (error || !data) {
          setRutaCortaEstado("no-encontrado");
          return;
        }
        let query: string;
        if (mPuerta) {
          const dc = (data.datos_completos || {}) as Partial<InvitacionDatos>;
          const famResuelta = slugRuta ? resolverFamiliaPorSlug(dc.invitados || [], slugRuta) : null;
          query = `?checkin=1&iid=${encodeURIComponent(data.id)}${famResuelta ? `&fam=${encodeURIComponent(famResuelta.nombre)}` : ""}`;
        } else {
          query = `?intake=1&iid=${encodeURIComponent(data.id)}`;
        }
        window.history.replaceState(null, "", pathname + query);
        setRutaCortaEstado("listo");
      } catch {
        if (!cancelado) setRutaCortaEstado("no-encontrado");
      }
    };
    resolver();
    return () => { cancelado = true; };
  }, [rutaCortaEstado]);

  // Reemplazar el DOM de la página para la vista de los invitados (isViewMode = true)
  // Esto elimina las restricciones severas de iframe y sandbox del navegador,
  // permitiendo que el copiado de cuentas de banco, itinerarios, música y mapas funcionen de manera nativa y confiable.
  useEffect(() => {
    if (
      isViewMode && !muestraExpirada && !revisionExpirada &&
      bloqueoCheck.listo && !bloqueoCheck.bloqueada &&
      pausaCheck.listo && !pausaCheck.pausada &&
      linkCortoEstado !== "cargando" && linkCortoEstado !== "no-encontrado"
    ) {
      let htmlContent = generarHTMLFinal(datos, temaActual);

      if (esVistaDeMuestra) {
        const numeroContacto = datos.whatsappConfirmacion || whatsappDestino;
        // Estilos forzados con !important: el CSS global de la invitación oculta (opacity/visibility)
        // los hijos directos de <body> hasta que termina la animación de apertura, y este banner
        // se inyecta como el primer hijo de <body> -- sin !important quedaría invisible igual.
        const bannerHTML = `
          <div style="position:fixed !important;top:0 !important;left:0 !important;right:0 !important;z-index:2147483647 !important;opacity:1 !important;visibility:visible !important;background:#4f46e5;color:#fff;text-align:center;padding:9px 14px;font-family:system-ui,sans-serif;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
            🎀 Esta es una MUESTRA — así se vería tu invitación real con tus datos completos.
            <a href="https://api.whatsapp.com/send?phone=${encodeURIComponent(numeroContacto)}&text=${encodeURIComponent("¡Hola! Vi la muestra de mi invitación y quiero continuar 🌸")}" style="color:#fff !important;text-decoration:underline;margin-left:6px;" target="_blank" rel="noopener">Contáctanos para continuar</a>
          </div>`;
        // Marca de agua tileada (pedido 2026-11-02, "vista previa temporal con marca de agua"):
        // patrón SVG de texto repetido como fondo, en una capa fija por encima de TODA la
        // invitación (pointer-events:none para no estorbar ningún click/tap real debajo). Más
        // difícil de recortar/reusar que solo el banner de arriba, que una captura de pantalla
        // bien encuadrada podía evitar.
        const watermarkSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='160'><text x='0' y='90' font-size='22' fill='%234f46e5' fill-opacity='0.14' font-family='sans-serif' font-weight='700' transform='rotate(-28 130 80)'>VISTA PREVIA</text></svg>`;
        const watermarkHTML = `
          <div style="position:fixed !important;inset:0 !important;z-index:2147483646 !important;opacity:1 !important;visibility:visible !important;pointer-events:none !important;background-image:url(&quot;data:image/svg+xml,${encodeURIComponent(watermarkSvg)}&quot;);background-repeat:repeat;"></div>`;
        htmlContent = htmlContent.replace(/<body([^>]*)>/i, `<body$1>${bannerHTML}${watermarkHTML}`);
      } else if (esVistaDeRevision) {
        // Modo revisión (2026-11-22, "revisión primero, entrega final al liquidar"): invitación
        // COMPLETA, SIN marca de agua (es clienta que ya pagó anticipo, no un prospecto) -- solo
        // la franja discreta de arriba, igual de forzada con !important que la de muestra.
        const bannerRevisionHTML = `
          <div style="position:fixed !important;top:0 !important;left:0 !important;right:0 !important;z-index:2147483647 !important;opacity:1 !important;visibility:visible !important;background:#0f766e;color:#fff;text-align:center;padding:9px 14px;font-family:system-ui,sans-serif;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
            📝 Invitación en revisión — tu link final se libera al liquidar tu saldo.
          </div>`;
        htmlContent = htmlContent.replace(/<body([^>]*)>/i, `<body$1>${bannerRevisionHTML}`);
      }

      document.open();
      document.write(htmlContent);
      document.close();
    }
  }, [isViewMode, datos, temaActual, esVistaDeMuestra, muestraExpirada, esVistaDeRevision, revisionExpirada, bloqueoCheck.listo, bloqueoCheck.bloqueada, pausaCheck.listo, pausaCheck.pausada, linkCortoEstado]);

  // Los modos de ruta (vista pública, embed, checkin, recuperación, intake, catálogo) son
  // banderas independientes leídas cada una de su propio query param -- nunca se valida que
  // sean mutuamente excluyentes. Hoy funciona porque cada link que la propia app genera trae
  // un solo parámetro, pero si alguna vez llegan combinados (copiado a mano, un parámetro
  // nuevo agregado sin revisar esta cadena, etc.), el primero de la cadena gana en silencio y
  // el resto nunca se renderiza, sin ningún aviso de "modo ambiguo". Guardia agregada
  // 2026-11-02 -- no cambia el comportamiento de ningún link válido de hoy (siempre trae un
  // solo modo), solo evita que una combinación futura falle en silencio.
  if ([isViewMode, isEmbedMode, isCheckinMode, isRecoveryMode, isIntakeMode, isCatalogMode].filter(Boolean).length > 1) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 px-6 text-center gap-2">
        <span className="text-4xl mb-2">⚠️</span>
        <p className="text-sm font-semibold text-slate-700">Este link no es válido: combina más de un modo a la vez.</p>
        <p className="text-xs text-slate-500 max-w-xs">Pide un link nuevo a quien te lo compartió.</p>
      </div>
    );
  }

  // Pausa manual por falta de pago (2026-11-22) -- va PRIMERO, antes incluso del bloqueo de
  // acceso de siempre: a diferencia de ese, que al menos distingue "evento ya pasó" de "ya no
  // disponible", la pausa no debe mostrar NADA -- ni el nombre de la quinceañera, ni ninguna
  // pista del motivo. Mismo criterio en CheckinPage/IntakeForm (ver sus propios chequeos).
  if (isViewMode && pausaCheck.listo && pausaCheck.pausada) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 px-6 text-center">
        <span className="text-4xl mb-3">⏸️</span>
        <p className="text-sm font-semibold text-slate-700">Esta invitación está en pausa.</p>
      </div>
    );
  }

  if (isViewMode && bloqueoCheck.listo && bloqueoCheck.bloqueada) {
    const esEventoPasado = bloqueoCheck.motivo === "evento_pasado";
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 px-6 text-center">
        <span className="text-4xl mb-3">{esEventoPasado ? "💛" : "🔒"}</span>
        <p className="text-sm font-semibold text-slate-700 mb-1">
          {esEventoPasado ? "Gracias por ser parte de este día tan especial" : "Esta invitación ya no está disponible"}
        </p>
        <p className="text-xs text-slate-500 max-w-xs">
          {esEventoPasado ? "Este evento ya tuvo lugar." : "Contacta a quien te compartió este link para más información."}
        </p>
      </div>
    );
  }

  if (isViewMode && linkCortoEstado === "no-encontrado") {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 px-6 text-center">
        <span className="text-4xl mb-3">🌸</span>
        <p className="text-sm font-semibold text-slate-700 mb-1">Esta invitación no está disponible</p>
        <p className="text-xs text-slate-500 mb-5 max-w-xs">El link puede estar incompleto o la invitación ya no existe. Contacta a quien te lo compartió.</p>
        <a
          href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(whatsappDestino)}&text=${encodeURIComponent("¡Hola! Intenté abrir mi invitación digital pero el link no funcionó 🌸")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full transition"
        >
          Contactar por WhatsApp
        </a>
      </div>
    );
  }

  if (isViewMode && muestraExpirada) {
    const numeroContacto = datos.whatsappConfirmacion || whatsappDestino;
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 px-6 text-center">
        <span className="text-4xl mb-3">🌸</span>
        <p className="text-sm font-semibold text-slate-700 mb-1">Esta muestra ya expiró</p>
        <p className="text-xs text-slate-500 mb-5 max-w-xs">Contáctanos para continuar con tu invitación personalizada.</p>
        <a
          href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(numeroContacto)}&text=${encodeURIComponent("¡Hola! Vi la muestra de mi invitación y quiero continuar 🌸")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full transition"
        >
          Contactar por WhatsApp
        </a>
      </div>
    );
  }

  // "Revisión vencida" (2026-11-22) -- mismo mecanismo que "muestra ya expiró" de arriba, pero
  // para el link de revisión (clienta que ya pagó anticipo, pidiendo un link nuevo tras los 7
  // días de vigencia, no un prospecto).
  if (isViewMode && esVistaDeRevision && revisionExpirada) {
    const numeroContacto = datos.whatsappConfirmacion || whatsappDestino;
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 px-6 text-center">
        <span className="text-4xl mb-3">🌸</span>
        <p className="text-sm font-semibold text-slate-700 mb-1">Este link de revisión ya venció</p>
        <p className="text-xs text-slate-500 mb-5 max-w-xs">Pide un link nuevo para seguir revisando tu invitación.</p>
        <a
          href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(numeroContacto)}&text=${encodeURIComponent("¡Hola! Quiero un link nuevo para revisar mi invitación 🌸")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full transition"
        >
          Contactar por WhatsApp
        </a>
      </div>
    );
  }

  if (isViewMode) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
        <p className="text-xs text-slate-500 font-medium font-sans">Abriendo tu invitación digital de 15 años...</p>
      </div>
    );
  }

  // Modo embed (?embed=true&tema=<id>): reemplaza el DOM con la misma vista previa en vivo
  // (generarHTMLFinal + getDatosVisualizacionCatalog) que usan las tarjetas del catálogo interno,
  // para que invitacionmx-landing e invitacionmx-catalogo puedan incrustarla en un iframe y
  // garantizar que siempre coincida con lo que se ve aquí.
  // &apertura=<tipo> (2026-11-19, pedido por invitacionmx-catalogo para su sección "Mira cómo
  // se abre tu invitación"): con un valor válido, el demo SÍ muestra la pantalla de apertura
  // (normalmente excluida en embed) con ese tipo forzado -- solo para esta vista demo, no se
  // guarda ni afecta ninguna invitación real (datosEmbed es una copia local nueva en cada
  // render). Sin el parámetro o con un valor inválido, se comporta exactamente como antes:
  // apertura excluida, sin ningún override.
  useEffect(() => {
    if (isEmbedMode) {
      const embedTema = temas.find(t => t.id === initialCatalogTemaId) || temas[0];
      const datosEmbed = getDatosVisualizacionCatalog(embedTema, datos);
      const aperturaParam = new URLSearchParams(window.location.search).get("apertura");
      const aperturaValida: TipoApertura | null =
        aperturaParam === "sobre" || aperturaParam === "cortina" || aperturaParam === "tarjeta" || aperturaParam === "puertas" || aperturaParam === "destellos" || aperturaParam === "caligrafia"
          ? aperturaParam
          : null;
      const datosParaRender = aperturaValida
        ? { ...datosEmbed, personalizacion: { ...(datosEmbed.personalizacion || {}), tipoApertura: aperturaValida } }
        : { ...datosEmbed, seccionesExcluidas: [...(datosEmbed.seccionesExcluidas || []), "apertura"] };
      const htmlContent = generarHTMLFinal(datosParaRender, embedTema, { esDemoDeCatalogo: true });

      document.open();
      document.write(htmlContent);
      document.close();
    }
  }, [isEmbedMode, initialCatalogTemaId, datos]);

  if (isEmbedMode) {
    return <div className="w-screen h-screen fixed inset-0 bg-white" />;
  }

  // Rutas cortas /puerta/<codigo>[/<slug>] y /datos/<codigo> (2026-11-21): mientras se resuelve
  // el código contra Supabase, ninguna de las banderas de modo (isCheckinMode/isIntakeMode)
  // está encendida todavía -- sin esta guardia, caería de largo hasta el editor normal por un
  // instante. Una vez resuelto, `rutaCortaEstado` pasa a "listo" y el replaceState ya dejó
  // ?checkin=1/?intake=1 en la URL, así que los bloques de abajo la recogen sin que esta
  // guardia tenga que hacer nada más. Colocada aquí (después de TODOS los hooks del
  // componente, igual que isCheckinMode/isIntakeMode más abajo) a propósito -- `rutaCortaEstado`
  // cambia de verdad durante la vida de este montaje (cargando -> listo/no-encontrado), así que
  // un return condicionado a su valor nunca puede ir antes de un hook, o React cuenta un número
  // de hooks distinto entre el render en "cargando" y el siguiente.
  if ((esPuertaCorta || esDatosCorta) && rutaCortaEstado === "cargando") {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
        <p className="text-xs text-slate-500 font-medium font-sans">Abriendo...</p>
      </div>
    );
  }

  if ((esPuertaCorta || esDatosCorta) && rutaCortaEstado === "no-encontrado") {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 px-6 text-center gap-2">
        <span className="text-4xl mb-2">🌸</span>
        <p className="text-sm font-semibold text-slate-700">Este link no es válido o ya no está disponible.</p>
        <p className="text-xs text-slate-500 max-w-xs">Pide un link nuevo a quien te lo compartió.</p>
      </div>
    );
  }

  if (isCheckinMode) {
    return <CheckinPage invitacionId={checkinInvitacionId} famNombre={checkinFamNombre} />;
  }

  if (isRecoveryMode) {
    return <RecoveryPage />;
  }

  if (isIntakeMode) {
    return <IntakeForm invitacionId={intakeInvitacionId} />;
  }

  if (isCatalogMode) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col animate-fadeIn">
        {/* ENCABEZADO DENTRO DE VISTA CATALOGO */}
        {selectedCatalogTemaId || selectedEstiloCajasDemo ? (
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedCatalogTemaId(null); setSelectedEstiloCajasDemo(null); }}
                className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer"
              >
                ← Volver al Catálogo
              </button>
              <div>
                <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {selectedEstiloCajasDemo ? "Comparando Estilo de Contenedores" : "Visualizando Demo Interactiva"}
                </h2>
                <p className="text-xs font-extrabold text-indigo-600 flex items-center gap-1">
                  {selectedEstiloCajasDemo
                    ? ESTILOS_CAJAS_SECCIONES.find(e => e.id === selectedEstiloCajasDemo)?.nombre
                    : temas.find(t => t.id === selectedCatalogTemaId)?.nombre || "Tema Elegido"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/522217445410?text=Hola%2C%20vengo%20de%20InvitaMX%2C%20me%20interesa%20una%20invitaci%C3%B3n%20digital%20personalizada"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span className="hidden sm:inline">¡Me interesa este Tema!</span>
                <span>Pedir por WhatsApp 💬</span>
              </a>
            </div>
            

          </div>
        ) : (
          <header className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white py-10 px-6 text-center shrink-0">
            <div className="max-w-4xl mx-auto space-y-3">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-extrabold tracking-wider text-indigo-200 uppercase">
                Colección Premium XV Años ⚜️
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Catálogo de Invitaciones Digitales Interactivas
              </h1>
              <p className="text-xs md:text-sm text-indigo-200 max-w-2xl mx-auto leading-relaxed">
                Explora cada uno de nuestros 14 temas exclusivos con todos los efectos interactivos en vivo: música, mapas de ceremonia, control de pases de invitados y galerías de fotos.
              </p>
            </div>
          </header>
        )}

        {/* CONTAINER DEL CONTENIDO */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
          {selectedEstiloCajasDemo ? (
            /* Render del Demo en vivo del estilo de cajones elegido, siempre con el mismo tema
               de referencia para que la única diferencia visible sea el cajón */
            <div className="w-full h-[calc(100vh-140px)] rounded-2xl border border-slate-200 overflow-hidden shadow-xl bg-white">
              <iframe
                srcDoc={generarHTMLFinal({ ...getDatosVisualizacionCatalog(temas.find(t => t.id === TEMA_DEMO_ESTILO_CAJAS) || temas[0], datos), seccionesExcluidas: ["apertura"], estiloCajasSecciones: selectedEstiloCajasDemo }, temas.find(t => t.id === TEMA_DEMO_ESTILO_CAJAS) || temas[0], { esDemoDeCatalogo: true })}
                className="w-full h-full border-0"
                title="Demo de Estilo de Contenedores"
              />
            </div>
          ) : selectedCatalogTemaId ? (
            /* Render del Demo en vivo dentro de un iframe interactivo, con selector de estilo
               de cajón para poder combinar este tema con cualquiera de las 3 opciones */
            (() => {
              const temaDemoSel = temas.find(t => t.id === selectedCatalogTemaId) || temas[0];
              const datosDemoBase = getDatosVisualizacionCatalog(temaDemoSel, datos, initialCatalogEvento);
              // Secciones a la carta que NO vienen incluidas según el paquete elegido -- misma
              // política real usada en Nuevo Cliente/paquetes.ts, para que la demo no le haga
              // creer al visitante que todo viene incluido sin importar qué compre.
              const seccionesExcluidasPorPaquete = catalogDemoPaquete === "deluxe" ? [] : ["pases"];
              const datosDemoPersonalizada = {
                ...datosDemoBase,
                ...(catalogDemoNombre.trim() ? { nombre: catalogDemoNombre.trim() } : {}),
                // Se le agrega una hora fija porque el resto del código espera un datetime-local
                // ("YYYY-MM-DDTHH:mm"); una fecha sola se interpreta como UTC y se corre un día
                // en zonas horarias negativas (confirmado en vivo con GMT-6).
                ...(catalogDemoFecha ? { fecha: `${catalogDemoFecha}T19:00` } : {}),
                paquete: catalogDemoPaquete,
                seccionesExcluidas: ["apertura", ...seccionesExcluidasPorPaquete],
                estiloCajasSecciones: catalogDemoEstiloCajas,
                // El sample data trae un número de WhatsApp de mentiras (whatsappConfirmacion de
                // datosDefault.deluxe) -- lo pisamos con el número real del negocio para que tanto
                // el botón de RSVP dentro de la demo como el CTA de "muestra expirada" (más abajo)
                // contacten a alguien real en vez de un número de ejemplo.
                whatsappConfirmacion: whatsappDestino
              };
              const handleEnviarDemoPersonalizada = () => {
                const datosParaLink = { ...datosDemoPersonalizada, seccionesExcluidas: seccionesExcluidasPorPaquete };
                // Reutiliza el mismo candado real de "Muestra (1 semana)" que ya usa el admin
                // (ver aplicarModoMuestra/muestraExpirada) -- después de MUESTRA_DIAS_VIGENCIA
                // días el link deja de mostrar la invitación y en su lugar aparece el CTA de
                // "contactar para comprar".
                const exp = Date.now() + MUESTRA_DIAS_VIGENCIA * 24 * 60 * 60 * 1000;
                const linkPersonalizado = `${URL_PUBLICA_INVITAMX}/?v=1&d=${encodeState(datosParaLink)}&muestra=1&exp=${exp}`;
                const msg = `¡Hola! Así se vería mi invitación de XV años (tema "${temaDemoSel.nombre}", paquete ${paquetes[catalogDemoPaquete].nombre}${catalogDemoNombre.trim() ? `, a nombre de ${catalogDemoNombre.trim()}` : ""}): ${linkPersonalizado}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
              };
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Ve tu propia invitación (opcional)</label>
                      <input
                        type="text"
                        value={catalogDemoNombre}
                        onChange={(e) => setCatalogDemoNombre(e.target.value)}
                        placeholder="Tu nombre"
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-indigo-500 w-40"
                      />
                    </div>
                    <input
                      type="date"
                      value={catalogDemoFecha}
                      onChange={(e) => setCatalogDemoFecha(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-indigo-500"
                    />
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Paquete</label>
                      <div className="flex gap-1">
                        {(Object.keys(paquetes) as Array<"basico" | "premium" | "deluxe">).map((key) => (
                          <button
                            key={key}
                            onClick={() => setCatalogDemoPaquete(key)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-2 transition cursor-pointer capitalize ${catalogDemoPaquete === key ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                          >
                            {paquetes[key].nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(catalogDemoNombre.trim() || catalogDemoFecha) && (
                      <div className="flex flex-col items-start gap-1">
                        <button
                          onClick={handleEnviarDemoPersonalizada}
                          className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          Enviar mi demo por WhatsApp 💬
                        </button>
                        <span className="text-[9px] text-slate-400">Ese link es válido por {MUESTRA_DIAS_VIGENCIA} días</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 px-1">Estilo de cajón:</span>
                    {ESTILOS_CAJAS_SECCIONES.map(e => (
                      <button
                        key={e.id}
                        onClick={() => setCatalogDemoEstiloCajas(e.id)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 transition cursor-pointer ${catalogDemoEstiloCajas === e.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                      >
                        {e.nombre}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11px] font-bold text-slate-500">
                    Viendo cómo se vería tu paquete: <span className="text-indigo-600">{paquetes[catalogDemoPaquete].nombre}</span> ({paquetes[catalogDemoPaquete].precio})
                    {seccionesExcluidasPorPaquete.includes("pases") && " — Pases de Entrada no incluidos en este paquete"}
                  </p>
                  {/* Demo en vivo dentro de un marco de celular (2026-11-26, v5 del prompt de
                      portada/previa/foto) -- antes el iframe era w-full/h-full de esta área ancha
                      de escritorio, mostrando la invitación como una columna angosta flotando en
                      medio de fondo vacío. Ahora se ve como la verá la clienta: dentro de un
                      marco con proporción real de celular, gemelo del de las tarjetas del
                      catálogo (mismo borde/radios), centrado en esta área. templates.ts NO se
                      toca para este caso -- la invitación sigue siendo la completa, sin
                      soloPortada; solo cambia el tamaño del contenedor que la envuelve. */}
                  <div className="w-full h-[calc(100vh-260px)] rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100 flex items-center justify-center p-3 sm:p-6">
                    <div className="relative w-full max-w-[400px] h-[min(86vh,820px)] bg-slate-100 rounded-[38px] p-[5px] border-[3px] border-slate-300 shadow-[0_20px_45px_-10px_rgba(15,23,42,0.25),0_10px_20px_-6px_rgba(15,23,42,0.15)] max-[480px]:max-w-none max-[480px]:h-[82vh] max-[480px]:rounded-none max-[480px]:border-0 max-[480px]:p-0 max-[480px]:shadow-none">
                      {/* Isla dinámica / muesca superior -- gemela de la del catálogo, se esconde en celulares reales (<480px) */}
                      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-full z-20 max-[480px]:hidden" />
                      <div className="w-full h-full rounded-[32px] bg-white overflow-hidden relative max-[480px]:rounded-none">
                        <DemoEnVivoConCarga
                          srcDoc={generarHTMLFinal(datosDemoPersonalizada, temaDemoSel, { esDemoDeCatalogo: true })}
                          title="Invitación Demo en Vivo"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* Listado de tarjetas de catálogo de todos los temas */
            <div className="space-y-6">
              {/* Aviso arriba de todo para que no se descubra hasta el final del scroll */}
              <a
                href="#estilos-presentacion"
                className="block text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl py-2.5 px-4 hover:bg-indigo-100 transition cursor-pointer"
              >
                ✨ También puedes elegir cómo se presentan tus textos — ver Estilos de Presentación ↓
              </a>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {temas.filter(t => !t.oculto).map((t, idx) => {
                  const isDarkTheme = t.id === "celestial" || t.id === "princesa-elegante" || t.id === "neon" || t.id === "aurora-boreal";
                  const isVisorOscuro = t.id === "celestial" || t.id === "neon" || t.id === "aurora-boreal";
                  const lightBgColor = isVisorOscuro ? '#f8fafc' : (t.colors.light || '#f8fafc');
                  const lightBgEnd = isVisorOscuro ? '#e2e8f0' : (t.colors.bg || '#f1f5f9');
                  let descripcion = "Un diseño lujoso y resplandeciente.";
                  if (t.id === "dorado-clasico") descripcion = "Tradicional, majestuoso, elegante. Con detalles dorados clásicos e impecables decoraciones heráldicas ⚜️";
                  if (t.id === "mariposas") descripcion = "Mágico, etéreo y romántico. Cascadas de hermosas mariposas revoloteando sobre una tipografía artesanal 🦋";
                  if (t.id === "floral-acuarela") descripcion = "Fresco, primaveral y sumamente artístico. Ramos florales en acuarela pintados a mano en tonos rosa pastel 🌸";
                  if (t.id === "celestial") descripcion = "Místico, nocturno y estrellado. Un firmamento azul profundo con lunas y constelaciones doradas brillando celestialmente 🌙";
                  if (t.id === "botanico") descripcion = "Natural, orgánico y minimalista. Un santuario de eucalipto fresco y sutiles hojas verdes para una vibra moderna 🌿";
                  if (t.id === "glam-rose") descripcion = "Moderno, ultra glamuroso y chic. Tonos oro rosa metálicos y polvos de escarcha para celebraciones alegres 💖";
                  if (t.id === "boho-chic") descripcion = "Rústico, cálido y bohemio. Tonos terracotas, pastos secos y flores de pampa con libre expresión artística 🌾";
                  if (t.id === "princesa-elegante") descripcion = "Digno de la realeza. Distinguido, clásico y de alta alcurnia, con tiaras heráldicas y estética principesca 👑";
                  if (t.id === "marmol-oro") descripcion = "Sofisticado, contemporáneo y ultra premium. Vetas de mármol pulido realzado con vetas de oro pulido 💎";
                  if (t.id === "neon") descripcion = "Ciberpunk, vibrante y electrizante. Un fondo oscuro de noche urbana iluminado con espectaculares destellos de luz de neón rosa, cian y amarillo lima ⚡";
                  if (t.id === "coquette-pink") descripcion = "Romántico y coqueto. Listones y moños en rosa empolvado con destellos suaves, para una quinceañera dulce y femenina 🎀";
                  if (t.id === "coquette-luxe") descripcion = "Elegancia y oro. Rosa empolvado con dorado lujoso y brillo de alta gama, para una entrada de princesa moderna 💎";
                  if (t.id === "aurora-boreal") descripcion = "Onírico y polar. Un cielo nocturno profundo surcado por velos de luz verde y violeta, como una aurora boreal real 🌌";
                  if (t.id === "vino-elegante") descripcion = "Sofisticado y de gala. Tonos vino/borgoña profundos con acentos champán y dorado, para una celebración de salón 🍷";

                  return (
                    <div 
                      key={t.id} 
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-300 flex flex-col h-full"
                    >
                      {/* Cabecera visual del tema + Mini Vista Previa Interactiva en Vivo en forma de Celular */}
                      <div className="relative h-[500px] overflow-hidden border-b border-slate-150 group flex items-center justify-center select-none" style={{ backgroundColor: lightBgColor }}>
                        
                        {/* Fondo de estudio decorativo claro adaptado al color de fondo y primario del tema */}
                        <div 
                          className="absolute inset-0 transition-colors duration-500" 
                          style={{
                            background: `radial-gradient(circle at 50% 50%, ${(t.colors.primary || '#6366f1')}15 0%, ${lightBgColor} 70%, ${lightBgEnd} 100%)`
                          }}
                        />
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-slate-200/40" />

                        {/* Círculos de luz flotantes decorativos claros y suaves con colores del tema */}
                        <div 
                          className="absolute -top-10 -left-10 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none transition-all duration-500 group-hover:scale-110" 
                          style={{ backgroundColor: t.colors.primary }}
                        />
                        <div 
                          className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none transition-all duration-500 group-hover:scale-110" 
                          style={{ backgroundColor: t.colors.accent || t.colors.secondary || t.colors.primary }}
                        />

                        {/* Rejilla decorativa translúcida suave alineada al color del tema */}
                        <div 
                          className="absolute inset-0 opacity-10"
                          style={{ 
                            backgroundImage: `linear-gradient(to right, ${t.colors.primary}25 1px, transparent 1px), linear-gradient(to bottom, ${t.colors.primary}25 1px, transparent 1px)`,
                            backgroundSize: '14px 14px'
                          }}
                        />

                        {/* Maqueta del Celular Realista */}
                        <div className="relative z-10 w-[210px] h-[456px] bg-slate-100 rounded-[28px] p-[3.5px] border-[2px] border-slate-300 shadow-[0_12px_30px_-5px_rgba(15,23,42,0.15),0_8px_16px_-6px_rgba(15,23,42,0.1)] flex flex-col transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-300 group-hover:shadow-[0_18px_38px_-8px_rgba(99,102,241,0.22),0_8px_18px_rgba(15,23,42,0.12)]">
                          
                          {/* Botones físicos laterales simulados */}
                          <div className="absolute top-12 -left-[2.5px] w-[2.5px] h-6 bg-slate-300 rounded-l transition-colors duration-300 group-hover:bg-indigo-300" />
                          <div className="absolute top-20 -left-[2.5px] w-[2.5px] h-6 bg-slate-300 rounded-l transition-colors duration-300 group-hover:bg-indigo-300" />
                          <div className="absolute top-16 -right-[2.5px] w-[2.5px] h-10 bg-slate-300 rounded-r transition-colors duration-300 group-hover:bg-indigo-300" />

                          {/* Pantalla del celular */}
                          <div className="w-full h-full rounded-[24px] bg-white overflow-hidden relative border border-slate-200 flex items-center justify-center">
                            
                            {/* Isla Dinámica / Muesca superior */}
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-11 h-2.5 bg-slate-200 rounded-full z-20 flex items-center justify-start px-1 shadow-inner">
                              <span className="w-1 h-1 rounded-full bg-slate-400 block opacity-80" />
                            </div>

                            {/* Ranura del Auricular de llamadas */}
                            <div className="absolute top-[1.5px] left-1/2 -translate-x-1/2 w-3 h-[0.75px] bg-slate-300 rounded-full z-20" />

                            {/* Barra de inicio / Swipe Bar inferior (iOS Style) */}
                            <div className="absolute bottom-1 w-8 h-0.5 bg-slate-400/50 rounded-full left-1/2 -translate-x-1/2 z-20 shadow-xs" />

                            {/* Iframe minificado cargando el HTML final y ajustado exactamente al tamaño de la pantalla */}
                            <div className="w-full h-full overflow-hidden absolute inset-0 bg-white">
                              <LazyIframe t={t} index={idx} datos={datos} evento={initialCatalogEvento} />
                            </div>
                          </div>
                        </div>

                        {/* Capa de degrade de brillo suave sobre el panel de cabecera */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/5 to-transparent pointer-events-none z-10" />

                        {/* Indicadores visuales y etiquetas */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
                          <span className="text-2xl drop-shadow-sm">{t.decorativeEmoji}</span>
                          <div className="flex gap-1">
                            {isDarkTheme && (
                              <span className="bg-slate-900/95 border border-slate-700 text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded text-indigo-300 shadow-sm backdrop-blur-xs">
                                Nocturno 🌙
                              </span>
                            )}
                            <span className="bg-white/95 border border-slate-200/80 text-[8px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded text-slate-700 shadow-sm backdrop-blur-xs">
                              Vista Previa ⚡
                            </span>
                          </div>
                        </div>

                        <div className="absolute bottom-3 left-4 right-4 pointer-events-none z-20 flex items-center justify-between">
                          <span className="text-xs font-bold tracking-tight text-slate-800 bg-white/90 backdrop-blur-xs border border-slate-100 px-2 py-0.5 rounded-lg shadow-sm">
                            {t.nombre}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider scale-90 origin-right bg-white/90 backdrop-blur-xs border border-slate-100 px-1.5 py-0.5 rounded-lg shadow-sm">
                            Demo Activo
                          </span>
                        </div>
                      </div>

                      {/* Cuerpo de detalles */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <p className="text-xs text-slate-600 leading-relaxed font-sans">
                            {descripcion}
                          </p>

                          {/* Estilo tipográfico */}
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Título Principal</span>
                              <span 
                                className="text-sm text-slate-800 font-semibold"
                                style={{ fontFamily: t.fontHeading }}
                              >
                                Luna Isabella
                              </span>
                            </div>
                            {t.fontCursive && (
                              <div>
                                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Firma Cursiva</span>
                                <span 
                                  className="text-base text-slate-700 block"
                                  style={{ fontFamily: t.fontCursive }}
                                >
                                  Mis Quince Años
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Paleta de colores */}
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">Paleta Oficial</span>
                            <div className="flex gap-2">
                              {Object.entries(t.colors).map(([key, val]) => (
                                <div key={key} className="flex flex-col items-center">
                                  <div 
                                    className="w-5.5 h-5.5 rounded-full border border-slate-200 shadow-2xs" 
                                    style={{ backgroundColor: val }}
                                    title={key}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="pt-2 flex flex-col gap-2">
                          <button
                            onClick={() => { setSelectedCatalogTemaId(t.id); setCatalogDemoEstiloCajas("normal"); setCatalogDemoNombre(""); setCatalogDemoFecha(""); setCatalogDemoPaquete("premium"); }}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5"
                          >
                            Ver Demo en Vivo 👁️✨
                          </button>
                          <a
                            href="https://wa.me/522217445410?text=Hola%2C%20vengo%20de%20InvitaMX%2C%20me%20interesa%20una%20invitaci%C3%B3n%20digital%20personalizada"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5"
                          >
                            Pedir este Tema por WhatsApp 💬
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ESTILOS DE PRESENTACIÓN: muestra las 3 opciones de "cajón" de sección con el
                  mismo tema de referencia, para comparar el efecto sin mezclarlo con la elección
                  de tema/diseño de arriba. */}
              <div id="estilos-presentacion" className="pt-4 border-t border-slate-200 scroll-mt-4">
                <div className="max-w-2xl mx-auto text-center mb-5">
                  <h2 className="text-xl font-extrabold text-slate-800">Estilos de Presentación</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Además del tema, puedes elegir cómo se presenta el texto de cada sección. Estas 3 demos usan el mismo tema ("{temas.find(t => t.id === TEMA_DEMO_ESTILO_CAJAS)?.nombre}") para que la única diferencia sea el estilo del cajón.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {ESTILOS_CAJAS_SECCIONES.map(e => (
                    <div key={e.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                      <div>
                        <span className="block text-sm font-extrabold text-slate-800">{e.nombre}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">{e.desc}</span>
                      </div>
                      <button
                        onClick={() => setSelectedEstiloCajasDemo(e.id)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5"
                      >
                        Ver Demo en Vivo 👁️✨
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Modo de despliegue "solo demo pública" (VITE_PUBLIC_DEMO_ONLY=true): usado en el
  // proyecto de Vercel público (sin protección SSO) que sirve el catálogo a clientes.
  // Bloquea el editor privado (con acceso de escritura a Supabase) para que ese despliegue
  // público solo pueda mostrar los modos de solo lectura (catálogo, vista, embed).
  if (import.meta.env.VITE_PUBLIC_DEMO_ONLY === 'true') {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3 text-center px-6">
        <p className="text-sm text-slate-500 font-medium font-sans">Este link no está disponible.</p>
        <a href="https://wa.me/522217445410?text=Hola%2C%20vengo%20de%20InvitaMX%2C%20me%20interesa%20una%20invitaci%C3%B3n%20digital%20personalizada" className="text-xs text-indigo-600 font-semibold underline">Contáctanos por WhatsApp</a>
      </div>
    );
  }

  // Saldo pendiente y "evento en los próximos 14 días" -- se usan para armar la pestaña
  // "Requieren atención" de la lista (ver invitacionesFiltradas más abajo).
  const invitacionTienePendiente = (row: InvitacionGuardadaRow) =>
    row.estado !== "archivada" && ((row.precio_total || 0) - (row.precio_pagado || 0)) > 0;
  const invitacionEsProxima = (row: InvitacionGuardadaRow) => {
    if (!row.fecha_fiesta || row.estado === "archivada" || row.estado === "evento_pasado") return false;
    const dias = (new Date(row.fecha_fiesta + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return dias >= 0 && dias <= 14;
  };
  const invitacionEsPasada = (row: InvitacionGuardadaRow) => row.estado === "evento_pasado" || row.estado === "archivada";
  const invitacionesUrgentes = listaInvitaciones.filter(row => invitacionEsProxima(row) && invitacionTienePendiente(row));
  const invitacionesActivasTab = listaInvitaciones.filter(row => !invitacionEsPasada(row));
  const invitacionesPasadasTab = listaInvitaciones.filter(invitacionEsPasada);
  // Para el archivado en lote: invitaciones cuyo evento ya pasó y que todavía no se han
  // archivado a mano -- se auto-marcan "evento_pasado" al cargar la lista (ver
  // cargarListaInvitaciones), así que este botón solo necesita dar el siguiente paso.
  const invitacionesArchivablesPorEventoPasado = listaInvitaciones.filter(r => r.estado === "evento_pasado");

  // Dashboard de ingresos: abonosTodos (tabla `abonos`, con fecha real de cada pago) es la
  // fuente para el histórico mes a mes; listaInvitaciones sirve para los totales por
  // paquete/pendiente que no necesitan ubicarse en el tiempo.
  const totalCobradoHistorico = abonosTodos.reduce((acc, a) => acc + (a.monto || 0), 0);
  const invitacionesActivasParaIngresos = listaInvitaciones.filter(r => r.estado !== "archivada");
  const totalPendienteCobrarGlobal = invitacionesActivasParaIngresos.reduce((acc, r) => acc + Math.max((r.precio_total || 0) - (r.precio_pagado || 0), 0), 0);
  const totalContratado = invitacionesActivasParaIngresos.reduce((acc, r) => acc + (r.precio_total || 0), 0);
  const ingresosPorMes = (() => {
    const mapa = new Map<string, number>();
    for (const a of abonosTodos) {
      const mes = (a.creado_en || "").substring(0, 7); // "YYYY-MM"
      if (!mes) continue;
      mapa.set(mes, (mapa.get(mes) || 0) + (a.monto || 0));
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();
  const maxIngresoMensual = Math.max(1, ...ingresosPorMes.map(([, monto]) => monto));
  const ingresosPorPaquete = (() => {
    const mapa: Record<"basico" | "premium" | "deluxe", number> = { basico: 0, premium: 0, deluxe: 0 };
    for (const r of listaInvitaciones) {
      const paquete = r.paquete || "basico";
      mapa[paquete] = (mapa[paquete] || 0) + (r.precio_pagado || 0);
    }
    return mapa;
  })();

  // Avisa (sin bloquear) si el celular capturado en "Nuevo Cliente" ya pertenece a otra
  // invitación guardada -- suele pasar cuando ya se dio de alta por error o desde otra pantalla.
  const nuevoClienteDigitos = nuevoClienteTelefono.replace(/[^0-9]/g, "");
  const nuevoClienteDuplicado = nuevoClienteDigitos.length >= 10
    ? listaInvitaciones.find(r => (r.telefono_whatsapp || "").replace(/[^0-9]/g, "") === nuevoClienteDigitos)
    : null;

  // Quita acentos y normaliza mayúsculas para que buscar "maria" encuentre "María" -- se usa
  // tanto para la búsqueda por nombre/tema como por teléfono.
  const normalizarBusqueda = (texto: string) =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // Conteos del filtro por tipo de evento (2026-11-19) -- sobre TODA la lista cargada, no sobre
  // lo ya filtrado por pestaña/búsqueda, para que el admin vea de un vistazo cuántas hay de
  // cada tipo en total (igual que el conteo de las pestañas de estado).
  const conteoPorGrupoEvento = (() => {
    const mapa: Record<GrupoFiltroEvento, number> = { xv: 0, boda: 0, cumpleanos: 0, otros: 0 };
    for (const r of listaInvitaciones) mapa[grupoFiltroEventoDeFila(r)]++;
    return mapa;
  })();

  // Filtro del panel "Mis Invitaciones": primero la pestaña activa (Requieren atención /
  // Activas / Eventos pasados), luego tipo de evento, "Mías/Todas" y el estatus puntual, y por
  // último la búsqueda libre por nombre de la quinceañera, tema, o teléfono de WhatsApp. Todos
  // se combinan a la vez, sobre la misma lista ya cargada (sin pedir nada nuevo a Supabase).
  const invitacionesFiltradas = (() => {
    const q = normalizarBusqueda(busquedaInvitaciones.trim());
    const qDigitos = busquedaInvitaciones.replace(/[^0-9]/g, "");
    return listaInvitaciones.filter(row => {
      if (pestanaListaInvitaciones === "atencion" && !invitacionesUrgentes.includes(row)) return false;
      if (pestanaListaInvitaciones === "activas" && invitacionEsPasada(row)) return false;
      if (pestanaListaInvitaciones === "pasados" && !invitacionEsPasada(row)) return false;
      if (filtroEventoInvitaciones !== "todos" && grupoFiltroEventoDeFila(row) !== filtroEventoInvitaciones) return false;
      if (filtroCreadorInvitaciones === "mias" && row.creado_por !== usuarioActual) return false;
      if (filtroEstatusInvitaciones !== "todos" && (row.estado || "cotizacion") !== filtroEstatusInvitaciones) return false;
      if (!q) return true;
      const temaNombre = temas.find(t => t.id === row.tema_elegido)?.nombre || row.tema_elegido || "";
      const coincideTexto = normalizarBusqueda(row.nombre_quinceanera || "").includes(q) || normalizarBusqueda(temaNombre).includes(q);
      const coincideTelefono = qDigitos.length >= 3 && (row.telefono_whatsapp || "").replace(/[^0-9]/g, "").includes(qDigitos);
      return coincideTexto || coincideTelefono;
    });
  })();

  return (
    <div className="min-h-screen lg:h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-y-auto lg:overflow-hidden">

      {/* EN CELULAR/TABLET (<1024px): el panel izquierdo nunca se achicaba (tiene `shrink-0`,
          sin altura fija) dentro de este contenedor que antes SIEMPRE era `h-screen
          overflow-hidden` -- la página entera no podía hacer scroll, así que todo lo que no
          cupiera en la primera pantalla (la mayoría del formulario, y el Monitor de Invitación
          completo) quedaba inalcanzable, sin ningún aviso. Corregido 2026-11-19: en pantallas
          angostas el contenedor ahora permite scroll normal de toda la página
          (`overflow-y-auto`, sin altura fija) -- en escritorio (lg+) se queda exactamente igual
          que antes (`h-screen overflow-hidden`, el split de panel fijo + monitor fijo sigue
          intacto). DASHBOARD PRINCIPAL DE TRABAJO -- ya no hay header de ancho completo arriba (quitado
          2026-11-18, "que no esté dentro del monitor para que tenga más espacio": el título
          ahora vive SOLO del lado del panel izquierdo, fijo mientras ese panel hace scroll, ver
          <header> dentro del <aside> más abajo -- y el Monitor de Invitación (la <section>
          hermana) arranca desde arriba del todo, ganando esa altura que antes ocupaba el
          header compartido). */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">

        {/* PANEL IZQUIERDO: SECCIONES DE CONFIGURACIÓN Y FORMULARIO -- overflow-y-auto propio
            (pedido 2026-11-18: "mantener fijo el monitor... el panel de botones que sí se
            pueda dar scroll") para que este panel se desplace solo, SIN arrastrar consigo al
            Monitor de Invitación (el <section> hermano de abajo), que ahora se queda fijo en
            su lugar mientras el admin trabaja aquí. */}
        <aside className="w-full lg:w-[48%] xl:w-[45%] border-r border-slate-200 flex flex-col bg-white shrink-0 overflow-y-auto">

        {/* HEADER PRINCIPAL -- sticky dentro de este panel (no de toda la página) para que se
            quede fijo mientras el resto del panel izquierdo hace scroll, sin ocupar ancho
            completo sobre el Monitor de Invitación (ver nota arriba). */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">GENERADOR PRIVADO XV</h1>
                <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full">
                  ADMIN WORKSPACE
                </span>
                {datos?.nombre?.trim() ? (
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Editando: {datos.nombre.trim()}
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Invitación sin guardar / sin nombre
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Diseña, compila y exporta invitaciones de 15 años profesionales en segundos.</p>
            </div>
          </div>
        </header>

        {/* Guía rápida de 3 pasos, pedida 2026-11-02 ("que encuentre todos los botones para
            generar la invitación") para alguien nuevo capacitándose con el editor: antes de
            los 11 botones agrupados (ver nota de abajo), señala en orden cuáles 3 SÍ hay que
            tocar siempre para terminar y entregar una invitación -- el resto son casos
            especiales (exportar PDF, duplicar, etc.), no parte del camino normal. Coincide
            1:1 con la sección 6 de docs/guia-de-uso.md ("Entregar la invitación al cliente"):
            mantener ambos sincronizados si el flujo cambia. */}
        <div className="px-3 pt-2.5 pb-1 border-b border-slate-200 bg-indigo-50/40 shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5">🧭 Para terminar y entregar una invitación, en este orden:</p>
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold text-indigo-900">
            <span className="flex items-center gap-1 bg-white border border-indigo-200 rounded-full px-2 py-0.5"><span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">1</span> Generar invitación</span>
            <span className="text-indigo-300">→</span>
            <span className="flex items-center gap-1 bg-white border border-indigo-200 rounded-full px-2 py-0.5"><span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">2</span> 💾 Guardar en Supabase</span>
            <span className="text-indigo-300">→</span>
            <span className="flex items-center gap-1 bg-white border border-indigo-200 rounded-full px-2 py-0.5"><span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">3</span> Compartir por WhatsApp (pestaña "Tema/Paquete", al final)</span>
          </div>
        </div>

        {/* ACCIONES DEL FORMULARIO -- agrupadas por propósito (reordenado 2026-10-20, antes
            eran 11 botones sueltos en una sola fila sin ningún orden lógico, con "Limpiar"
            -destructivo- mezclado en medio de los demás; movidas aquí al panel izquierdo el
            mismo día, a pedido del usuario, para dejar el panel derecho dedicado solo al
            Monitor de Invitación): 1) trabajar en esta invitación, 2) exportar/copiar,
            3) paneles de navegación, 4) cuenta/dispositivo, y 5) Limpiar aislado al final
            (mismo rojo de antes) para que no se preste a un click accidental entre los
            botones de uso normal. */}
        <div id="control-panel-actions" className="flex items-start gap-x-4 gap-y-2 flex-wrap p-3 border-b border-slate-200 bg-slate-50/50 shrink-0">
          {/* Grupo 1: trabajar en esta invitación. Revision de usabilidad 2026-11-02: cada
              grupo ahora lleva su propia mini-etiqueta encima, en vez de depender solo de un
              separador de 1px que se vuelve invisible en cuanto los botones hacen wrap a una
              nueva fila (pasa seguido, son 11 botones en un panel angosto). */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-0.5">Esta invitación</span>
            <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={actualizarVistaPrevia}
            className={`px-3.5 py-2 ${generandoEnlace ? 'bg-emerald-600 text-white border-emerald-600 font-extrabold scale-102 shadow-md' : 'bg-white hover:bg-indigo-50/20 hover:border-indigo-200 text-slate-700 border border-slate-200'} text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-300 cursor-pointer shadow-sm`}
            title="Sincronizar y generar enlace con tus cambios actuales"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generandoEnlace ? 'text-white animate-spin' : 'text-indigo-600'}`} />
            <span>{generandoEnlace ? "¡Sincronizado! ✨" : "Generar invitación"}</span>
          </button>

          <button
            onClick={handleGuardarEnSupabase}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <span>💾 Guardar en Supabase</span>
          </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-0.5">Exportar / copiar</span>
            <div className="flex items-center gap-2 flex-wrap">
          {/* Grupo 2: exportar / copiar */}
          <button
            onClick={handleDescargarHTML}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer transform active:scale-95"
            id="descargar-btn"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Descargar index.html</span>
          </button>

          <button
            onClick={handleDescargarPDF}
            disabled={generandoPDF}
            title={datos.paquete === "deluxe" ? "Incluido sin costo extra en el paquete Premium" : "Complemento a la carta en este paquete — confirma que el cliente ya lo pagó antes de entregarlo"}
            className="px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer transform active:scale-95"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>{generandoPDF ? "Generando PDF..." : "🎁 Descargar PDF de Regalo"}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${datos.paquete === "deluxe" ? "bg-white/25" : "bg-black/20"}`}>
              {datos.paquete === "deluxe" ? "Incluido" : "A la carte"}
            </span>
          </button>

          <button
            onClick={handleCopiarHTML}
            className={`px-3.5 py-2 ${htmlCopiado ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'} text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm`}
          >
            {htmlCopiado ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{htmlCopiado ? "Copiado" : "Copiar HTML"}</span>
          </button>

          <button
            onClick={handleCopiarDatos}
            className={`px-3.5 py-2 ${datosCopiados ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'} text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm`}
            title="Copiar configuración JSON del cliente"
          >
            {datosCopiados ? <Check className="w-3.5 h-3.5 text-white" /> : <Clipboard className="w-3.5 h-3.5 text-slate-500" />}
            <span>{datosCopiados ? "JSON Copiado" : "Copiar Datos"}</span>
          </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-0.5">Ver todo</span>
            <div className="flex items-center gap-2 flex-wrap">
          {/* Grupo 3: paneles de navegación */}
          <button
            onClick={() => {
              setMostrarMisInvitaciones(true);
              setPestanaListaInvitaciones("activas");
              cargarListaInvitaciones();
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Ver, reabrir, eliminar o marcar vigencia de invitaciones de clientes ya guardadas"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Mis Invitaciones</span>
          </button>

          <button
            onClick={() => {
              setMostrarDashboardIngresos(true);
              cargarDashboardIngresos();
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Ver ingresos totales, histórico mensual y pendiente por cobrar"
          >
            <span>💰 Ingresos</span>
          </button>

          <button
            onClick={() => setMostrarModalLinksPago(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Configura una sola vez tus links de pago (Mercado Pago/Clip) para poder cobrar por WhatsApp desde cada invitación"
          >
            <span>💳 Links de pago</span>
          </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-0.5">Landing y catálogo</span>
            <div className="flex items-center gap-2 flex-wrap">
          {/* Grupo nuevo (2026-11-19, reorganización pedida por el usuario): antes estos 4
              botones vivían mezclados dentro de "Cuenta / dispositivo", sin relación real con
              cuenta ni dispositivo -- aquí quedan agrupados por lo que realmente son: abrir o
              compartir landing/catálogo. "Abrir landing" es nuevo (antes solo existía mandarla
              por WhatsApp); "Abrir catálogo de temas" ya existía, solo se movió aquí. */}
          <button
            onClick={() => window.open("https://invitamx.app", "_blank")}
            title="Abre la página de ventas (invitamx.app) aquí mismo, en una pestaña nueva"
            className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <span>🌐 Abrir landing</span>
          </button>

          <button
            onClick={() => {
              // Deferimos la actualización pesada del estado para mantener la interactividad instantánea (INP óptimo)
              setTimeout(() => {
                setIsCatalogMode(true);
              }, 0);
            }}
            title="Abre aquí mismo el catálogo de temas, para probarlos en vivo antes de mandar nada"
            className="px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <span>👁️ Abrir catálogo</span>
          </button>

          <button
            onClick={() => {
              const url = "https://invitamx.app";
              const msg = `Hola! 🌸 Aquí tienes nuestra página de Invitaciones Digitales de XV Años, con precios, paquetes y todo lo que incluye:\n\n${url}`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
            }}
            title="Abre WhatsApp con el link de la página de ventas (invitamx.app) ya listo para compartir -- tú eliges el contacto o grupo"
            className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <span>💬 Enviar landing</span>
          </button>

          <button
            onClick={() => {
              // Antes vivía dentro de la caja "4. Catálogo Digital de Temas" (quitada
              // 2026-11-18 por ocupar mucho espacio) -- mismo getCatalogUrl() de siempre, ahora
              // como botón directo junto a los otros "enviar link".
              const catUrl = getCatalogUrl();
              const msg = `Hola! 🌸 Aquí tienes nuestro catálogo con los 14 temas de invitación digital de XV años, con demos en vivo de cada uno:\n\n${catUrl}`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
            }}
            title="Abre WhatsApp con el link del catálogo de temas ya listo para compartir -- tú eliges el contacto o grupo"
            className="px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <span>💬 Enviar catálogo</span>
          </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-0.5">Diseño de este tema en catálogo</span>
            <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(`xv_diseño_guardado_tema_${selectedTemaId}`, JSON.stringify(datos));
                  setTieneDiseñoGuardado(true);
                  mostrarToast(`¡Diseño guardado con éxito en el catálogo para el tema "${temaActual.nombre}"! 🌟💖`, "success");
                } catch (err) {
                  mostrarToast("Error al guardar el diseño en el catálogo.", "error");
                }
              }}
              title="Guarda esta invitación como la versión activa de este tema en el catálogo"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Guardar Diseño en Catálogo 🌸</span>
            </button>
            {tieneDiseñoGuardado ? (
              <span className="text-[10px] text-emerald-600 font-bold whitespace-nowrap">✓ Personalizado activo</span>
            ) : (
              <span className="text-[10px] text-slate-400 whitespace-nowrap">Usando diseño predeterminado</span>
            )}
            {tieneDiseñoGuardado && (
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    titulo: "Restablecer diseño predeterminado",
                    onAceptar: () => {
                      try {
                        localStorage.removeItem(`xv_diseño_guardado_tema_${selectedTemaId}`);
                        setTieneDiseñoGuardado(false);
                        mostrarToast(`Se ha restablecido el diseño de fábrica para "${temaActual.nombre}".`, "info");
                      } catch (err) {
                        mostrarToast("Error al restablecer el diseño.", "error");
                      }
                    },
                    mensaje: `¿Deseas eliminar tu diseño personalizado para el tema "${temaActual.nombre}" en el catálogo y volver al de fábrica?`
                  });
                }}
                className="text-[10px] text-rose-500 hover:text-rose-700 transition font-bold underline cursor-pointer select-none whitespace-nowrap"
              >
                Restablecer
              </button>
            )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-0.5">Cuenta / dispositivo</span>
            <div className="flex items-center gap-2 flex-wrap">
          {/* Grupo 4: cuenta / dispositivo */}
          <button
            onClick={async () => {
              // Caso ideal: Chrome/Edge sí dispararon beforeinstallprompt y lo tenemos
              // guardado -- instalación real de un click.
              if (instalarPrompt) {
                instalarPrompt.prompt();
                await instalarPrompt.userChoice;
                (window as any).__deferredInstallPrompt = null;
                setInstalarPrompt(null);
                return;
              }
              // Ese evento del navegador es poco confiable en la práctica (no siempre se
              // dispara aunque el sitio cumpla todos los requisitos) -- en vez de esconder el
              // botón cuando no llega, se explican los pasos manuales según el dispositivo,
              // que siempre funcionan.
              const ua = navigator.userAgent;
              const esIOS = /iPhone|iPad|iPod/.test(ua);
              const esAndroid = /Android/.test(ua);
              const mensaje = esIOS
                ? 'Para instalarla en iPhone/iPad:\n\n1. Toca el botón "Compartir" (el cuadrito con la flecha hacia arriba) en Safari\n2. Elige "Agregar a inicio"'
                : esAndroid
                ? 'Para instalarla en este celular:\n\n1. Toca el menú ⋮ (tres puntos) de Chrome, arriba a la derecha\n2. Elige "Instalar app" o "Agregar a pantalla de inicio"'
                : 'Para instalarla en esta computadora:\n\n1. Toca el menú ⋮ (tres puntos) de Chrome/Edge, arriba a la derecha de la ventana del navegador\n2. Elige "Instalar Invitaciones XV..." (o "Convertir en app")';
              alert(mensaje);
            }}
            title="Instala esta app en tu celular o PC -- queda como un acceso directo, sin necesidad de abrir el navegador"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-white" />
            <span>Instalar app</span>
          </button>

          <button
            onClick={async () => {
              // Bug real reportado 2026-11-21: la ventana de la PWA instalada no tiene botón de
              // recarga ni barra de direcciones -- si arranca con un estado viejo, el admin no
              // tenía forma de refrescarla. Este botón es una recarga DE VERDAD, no el
              // "Actualizar" de "Mis Invitaciones" (ese solo vuelve a pedir la lista). No
              // depende de beforeinstallprompt ni de si la app está instalada -- se ve y
              // funciona igual en navegador normal y en modo standalone.
              try {
                if ("serviceWorker" in navigator) {
                  const reg = await navigator.serviceWorker.getRegistration();
                  reg?.update().catch(() => {});
                }
                if ("caches" in window) {
                  const nombresCache = await caches.keys();
                  await Promise.all(nombresCache.map(nombre => caches.delete(nombre)));
                }
              } catch {
                // Si algo de esto falla, igual recargamos -- lo importante es el reload de abajo.
              }
              window.location.reload();
            }}
            title="Recarga la app por completo -- útil si algo se ve viejo o raro, sobre todo en la ventana instalada (PWA), que no tiene botón de recargar ni barra de direcciones"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>⟳ Actualizar</span>
          </button>

          <a
            href="/manual.html"
            target="_blank"
            rel="noopener noreferrer"
            title="Manual de uso completo -- cómo entrar, las 9 pestañas del editor, guardar/compartir, Mis Invitaciones. Útil para capacitar a alguien nuevo."
            className="px-3.5 py-2 bg-white hover:bg-indigo-50/20 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <span>📖 Manual de uso</span>
          </a>

          <button
            onClick={() => {
              // Mismo patrón "sin número fijo" que handleEnviarWhatsApp cuando se manda el
              // demo del catálogo sin whatsappDestino (App.tsx:4321) -- deja que el propio
              // WhatsApp (Web o celular) pida con qué contacto o grupo compartirlo, en vez de
              // amarrar el botón a un número de colaborador en particular.
              const url = window.location.origin;
              const msg = `Hola! Aquí tienes el link del Administrador de InvitaMX (el editor de invitaciones):\n\n${url}\n\nPara entrar necesitas el usuario y contraseña que te compartí por separado. También está el manual de uso ahí mismo, en el botón "📖 Manual de uso".`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
            }}
            title="Abre WhatsApp con el link de este administrador ya listo para mandárselo a un colaborador o equipo -- tú eliges el contacto o grupo"
            className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <span>💬 Enviar link a colaborador</span>
          </button>

          <button
            onClick={() => {
              // No hay sesión real de servidor que cerrar (el login es HTTP Basic Auth, sin
              // cookies) -- el navegador simplemente recuerda el usuario/contraseña que ya
              // funcionaron para este dominio. El truco estándar para "olvidarlos" es navegar
              // con credenciales a propósito inválidas en la URL: el navegador descarta las
              // buenas y, en la siguiente carga, vuelve a pedir usuario y contraseña.
              const { protocol, host } = window.location;
              window.location.href = `${protocol}//logout:${Date.now()}@${host}/`;
            }}
            title="Cierra tu sesión de este navegador -- te va a volver a pedir usuario y contraseña"
            className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Cerrar sesión</span>
          </button>
            </div>
          </div>

          {/* Grupo 5: destructivo, aislado a propósito al final -- ml-auto lo empuja a su
              propia esquina para que nunca quede pegado a los botones de uso normal. */}
          <div className="flex flex-col gap-1 ml-auto">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-0.5">&nbsp;</span>
            <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleLimpiarFormulario}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Limpiar</span>
          </button>
            </div>
          </div>
        </div>

          {/* BARRA DE PESTAÑAS DEL EXPEDIENTE -- en vez de scroll horizontal interno
              (que duplicaba el scroll general del panel), las pestañas se acomodan en
              varias filas si no caben, así las 9 quedan visibles sin arrastrar nada. */}
          <div className="flex items-stretch flex-wrap border-b border-slate-200 bg-white shrink-0">
            <button
              onClick={() => setPanelPestana("ajustes")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "ajustes" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
              id="pestana-ajustes"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Tema/Paquete</span>
            </button>
            <button 
              onClick={() => setPanelPestana("quince")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "quince" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Quinceañera</span>
            </button>
            <button 
              onClick={() => setPanelPestana("lugares")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "lugares" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Direcciones</span>
            </button>
            <button 
              onClick={() => setPanelPestana("itincode")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "itincode" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agenda y Vestido</span>
            </button>
            <button 
              onClick={() => setPanelPestana("familia")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "familia" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Familia</span>
            </button>
            <button 
              onClick={() => setPanelPestana("regalos")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "regalos" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Regalos</span>
            </button>
            <button 
              onClick={() => setPanelPestana("fotos")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "fotos" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Álbum</span>
            </button>
            <button 
              onClick={() => setPanelPestana("invitados")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "invitados" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Lista Pases</span>
            </button>
            <button
              onClick={() => setPanelPestana("personalizar")}
              className={`px-4 py-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${panelPestana === "personalizar" ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>A Medida</span>
            </button>
          </div>

          {/* CONTENIDOR DEL FORMULARIO -- sin su propio scroll: ahora forma parte del
              scroll general del panel izquierdo junto con los botones de arriba y las
              pestañas, en vez de quedar como una barra interna aparte (pedido 2026-11-02:
              "que haya solo un scroll de todo"). */}
          <div className="flex-1 p-6 space-y-6">

            {/* TAB 1: PAQUETES Y TEMAS */}
            {panelPestana === "ajustes" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* SELECTOR DE PAQUETE */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    1. Selección de Paquete (Activa / Desactiva Secciones)
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(paquetes) as Array<"basico" | "premium" | "deluxe">).map((key) => {
                      const paq = paquetes[key];
                      const isSelected = datos.paquete === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handleCambiarPaquete(key)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition h-28 cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'}`}
                        >
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Nivel</span>
                            <span className="text-sm font-extrabold text-slate-800 block capitalize">{paq.nombre}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Máx. Fotos: {paq.maxFotos}</span>
                            <span className="text-xs font-mono font-bold text-indigo-600">{paq.precio}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                      <div>
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>⚙️</span> Personalizar Secciones Habilitadas
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Apaga las secciones que no desees incluir en el link final</span>
                      </div>
                      <button
                        onClick={() => setDatos({ ...datos, seccionesExcluidas: [] })}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300"
                      >
                        🔄 Habilitar Todas
                      </button>
                    </div>
                    <SeccionesToggleList
                      secciones={["apertura", ...getOrdenSeccionesEfectivo(datos.paquete, datos.ordenSecciones), "cierre"]}
                      seccionesExcluidas={datos.seccionesExcluidas || []}
                      onToggle={toggleSeccion}
                      onMover={moverSeccion}
                      paquete={datos.paquete}
                    />
                    {(() => {
                      const pasesActivo = !(datos.seccionesExcluidas || []).includes("pases");
                      return (
                        <div className={`mt-3 flex items-center justify-between p-2.5 rounded-lg border ${pasesActivo ? "bg-indigo-50/50 border-indigo-200" : "bg-slate-100/50 border-slate-200 opacity-60"}`}>
                          <div className="pr-3 min-w-0">
                            <span className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-indigo-900">Control de Acceso QR 🔳</span>
                              <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${pasesActivo ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"}`}>
                                {PRECIO_CONTROL_ACCESO_QR}
                              </span>
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              {pasesActivo
                                ? "Cada pase de familia muestra un QR para registrar su entrada en la puerta."
                                : "Requiere activar \"Control de pases de invitados\" primero -- sin una lista de familias no hay nada contra qué controlar el acceso."}
                            </span>
                          </div>
                          <label className={`relative inline-flex items-center shrink-0 ${pasesActivo ? "cursor-pointer" : "cursor-not-allowed"}`}>
                            <input
                              type="checkbox"
                              checked={pasesActivo && !!datos.controlAccesoQR}
                              disabled={!pasesActivo}
                              onChange={(e) => setDatos({ ...datos, controlAccesoQR: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:cursor-not-allowed"></div>
                          </label>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* SELECTOR DE TEMAS */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    2. Tema de la Invitación (CSS y Visuales Propios)
                  </h3>
                  <TemasGrid selectedTemaId={selectedTemaId} onSelect={setSelectedTemaId} />

                  {/* GESTIÓN DE FONDO EXCLUSIVO DEL TEMA ACTUAL */}
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🖼️</span>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">
                          Fondo del Tema: {temaActual.nombre}
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Carga un fondo exclusivo para este tema a Cloudinary. Se guardará de forma independiente.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {datos.bgImages?.[selectedTemaId] ? (
                        <div className="p-1.5 border border-indigo-150 rounded-lg bg-white flex items-center gap-2 flex-1 min-w-0">
                          <img 
                            src={datos.bgImages[selectedTemaId]} 
                            alt="Fondo activo" 
                            className="w-10 h-8 rounded object-cover border shrink-0 bg-slate-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-slate-750 block truncate">Fondo Personalizado Activo</span>
                            <span className="text-[9px] font-mono text-slate-400 block truncate leading-tight">
                              {datos.bgImages[selectedTemaId]}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleQuitarFondoTema(selectedTemaId)}
                            title="Quitar este fondo personalizado"
                            className="shrink-0 p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-2 border border-slate-200/60 rounded-lg bg-slate-100/30 flex items-center gap-2 flex-1">
                          <span className="text-sm shrink-0">🎨</span>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block">Fondo predeterminado del tema</span>
                            <span className="text-[9px] text-slate-400 block leading-tight">Usa los degradados o texturas nativos.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {datos.bgImages?.[selectedTemaId] && (() => {
                      const esOscuro = temaActual.id === "celestial" || temaActual.id === "neon";
                      const opacidadActual = datos.fondoVeloOpacidad ?? (esOscuro ? 0.65 : 0.55);
                      return (
                        <div className="p-2.5 border border-slate-200 rounded-lg bg-white space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-extrabold text-slate-700">
                              🔎 Nitidez del fondo (velo: {Math.round(opacidadActual * 100)}%)
                            </label>
                            <button
                              type="button"
                              onClick={() => setDatos({ ...datos, fondoVeloOpacidad: undefined })}
                              className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700"
                            >
                              Restablecer
                            </button>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={90}
                            step={1}
                            value={Math.round(opacidadActual * 100)}
                            onChange={(e) => setDatos({ ...datos, fondoVeloOpacidad: Number(e.target.value) / 100 })}
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                            <span>Más nítido</span>
                            <span>Más opaco (mejor legibilidad)</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <label className="flex items-center justify-center gap-1.5 p-2 border border-dashed border-indigo-200 rounded-lg bg-white hover:bg-indigo-50/40 transition cursor-pointer text-center group">
                        <Upload className={`w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-600 ${subiendoCloudinary ? 'animate-bounce' : ''}`} />
                        <span className="text-[10px] font-extrabold text-indigo-700">
                          {subiendoCloudinary ? "Subiendo..." : "Subir a Cloudinary"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBgImageUpload}
                          className="hidden"
                          disabled={subiendoCloudinary}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={true}
                        title="Los fondos se mantienen hasta que subas uno nuevo para reemplazarlo"
                        className="flex items-center justify-center gap-1.5 p-2 border rounded-lg bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed font-medium text-[10px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Fondos protegidos</span>
                      </button>
                    </div>

                    <a
                      href="https://console.cloudinary.com/console/media_library"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 p-2 mb-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition text-center text-slate-600 hover:text-slate-800 text-[10px] font-bold"
                      title="Abre tu cuenta de Cloudinary en una pestaña nueva para subir cualquier foto o fondo manualmente y copiar su link"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Abrir Cloudinary (subir manual) ↗
                    </a>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Pega link de Cloudinary aquí..."
                        value={enlaceCloudinary}
                        onChange={(e) => { setEnlaceCloudinary(e.target.value); setEstadoGuardadoLink('idle'); }}
                        className="flex-1 px-2 py-1.5 text-[11px] border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleGuardarEnlaceCloudinary}
                        disabled={!enlaceCloudinary.trim() || estadoGuardadoLink === 'guardando'}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10px] font-bold rounded-lg transition"
                      >
                        {estadoGuardadoLink === 'guardando' ? 'Guardando...' : 'Guardar Link'}
                      </button>
                    </div>
                    {estadoGuardadoLink === 'ok' && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1.5">
                        ✅ Guardado y sincronizado en todos los dispositivos
                      </div>
                    )}
                    {estadoGuardadoLink === 'error' && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold flex items-center gap-1.5">
                        ❌ No se pudo sincronizar. Revisa la conexión con Supabase.
                      </div>
                    )}

                    <button
                      onClick={() => setMostrarFondosGuardados(true)}
                      disabled={cargandoFondos}
                      className="w-full flex items-center justify-center gap-2 p-2 border border-emerald-200 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition text-emerald-700 font-semibold text-[11px] disabled:opacity-60 disabled:cursor-wait"
                    >
                      <Eye className="w-4 h-4" />
                      {cargandoFondos
                        ? "Cargando fondos guardados..."
                        : `Ver fondos guardados (${Object.keys(datos.bgImages || {}).length} temas)`}
                    </button>

                    <div className="space-y-1">
                      <span className="block text-[10px] font-semibold text-slate-500">O pegar link directo (se guarda al salir del campo):</span>
                      <input
                        type="text"
                        value={borradorUrlFondo ?? (datos.bgImages?.[selectedTemaId] && !datos.bgImages[selectedTemaId].startsWith("data:") ? datos.bgImages[selectedTemaId] : "")}
                        onChange={(e) => setBorradorUrlFondo(e.target.value)}
                        onBlur={handleGuardarUrlDirecta}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        placeholder="El fondo se mostrará aquí al subir..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 text-[11px] outline-none font-mono"
                      />
                      <span className="text-[9px] text-slate-500 italic">💾 Los fondos se guardan en la nube y persisten para cada tema</span>
                    </div>
                  </div>
                </div>

                {/* SOPORTE DE CAJON DE TEXTO / TARJETAS DETALLADAS */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                    Estilo de Contenedores de Sección
                  </h3>
                  <div className="p-4 bg-rose-50/20 border border-pink-100 rounded-xl space-y-3">
                    <div>
                      <span className="block text-xs font-bold text-slate-800">
                        Cajas de fondo en textos de secciones
                      </span>
                      <span className="block text-[11px] text-slate-500 leading-normal mt-0.5 mb-2">
                        Elige cómo se presentan los cajones/tarjetas donde va el texto de cada sección (iglesia, salón, mesa de regalos, etc.).
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {ESTILOS_CAJAS_SECCIONES.map(e => (
                          <button
                            key={e.id}
                            onClick={() => setDatos(prev => ({ ...prev, estiloCajasSecciones: e.id }))}
                            className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${estiloCajasEfectivo === e.id ? "border-pink-500 bg-pink-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
                          >
                            <span className="block text-xs font-bold text-slate-700">{e.nombre}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">{e.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-pink-100/60 pt-3">
                      <div className="pr-3">
                        <span className="block text-xs font-bold text-slate-800">
                          Efecto de Animación de Caída
                        </span>
                        <span className="block text-[11px] text-slate-500 leading-normal mt-0.5">
                          Activa una preciosa lluvia de flores, moños/listones, estrellas o mariposas flotando en la invitación según el tema elegido.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={datos.mostrarAnimacionCaida !== false}
                          onChange={(e) => setDatos({ ...datos, mostrarAnimacionCaida: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-550"></div>
                        <span className="ml-2 text-xs font-bold text-pink-700 w-12 text-right uppercase">
                          {datos.mostrarAnimacionCaida !== false ? "ON" : "OFF"}
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between border-t border-pink-100/60 pt-3">
                      <div className="pr-3">
                        <span className="block text-xs font-bold text-slate-800">
                          Animación al Hacer Scroll
                        </span>
                        <span className="block text-[11px] text-slate-500 leading-normal mt-0.5">
                          Cada sección entra con una subida suave y desvanecido al llegar a ella, en vez de aparecer de golpe. Respeta "Reducir movimiento" del dispositivo del invitado.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={datos.personalizacion?.animacionScroll === "suave"}
                          onChange={(e) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), animacionScroll: e.target.checked ? "suave" : "ninguna" } }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-550"></div>
                        <span className="ml-2 text-xs font-bold text-pink-700 w-12 text-right uppercase">
                          {datos.personalizacion?.animacionScroll === "suave" ? "ON" : "OFF"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* FORMATO DE LA GALERÍA DE FOTOS */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                    Formato de la Galería de Fotos
                  </h3>
                  <div className="p-4 bg-rose-50/20 border border-pink-100 rounded-xl">
                    <span className="block text-xs font-bold text-slate-800">
                      Cómo se muestra "Mi Álbum de Fotos"
                    </span>
                    <span className="block text-[11px] text-slate-500 leading-normal mt-0.5 mb-2">
                      El carrusel conviene con álbumes grandes (Premium, 10-14 fotos): la sección no crece en alto sin importar cuántas fotos tenga.
                    </span>
                    <SelectorEstiloGaleria
                      tema={temaActual}
                      valorActual={datos.estiloGaleria || "grid"}
                      onSelect={(id) => setDatos(prev => ({ ...prev, estiloGaleria: id }))}
                    />
                  </div>
                </div>

                {/* DISEÑO DE LA CUENTA REGRESIVA */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                    Diseño de la Cuenta Regresiva
                  </h3>
                  <div className="p-4 bg-rose-50/20 border border-pink-100 rounded-xl">
                    <span className="block text-[11px] text-slate-500 leading-normal mb-2">
                      💡 Aplica al tema activo, sea cual sea. Si no eliges ninguno, se usa "Cajas" (el diseño de siempre).
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {ESTILOS_CUENTA.map(e => (
                        <button
                          key={e.id}
                          onClick={() => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), estiloCuenta: e.id } }))}
                          className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${(datos.personalizacion?.estiloCuenta || "cajas") === e.id ? "border-pink-500 bg-pink-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          <span className="block text-xs font-bold text-slate-700">{e.nombre}</span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">{e.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* TIPO DE APERTURA Y LLUVIA DECORATIVA */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    Apertura y Decoración
                  </h3>
                  <div className="p-4 bg-purple-50/20 border border-purple-100 rounded-xl space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Tipo de Apertura</h4>
                      <p className="text-[10px] text-slate-400 mb-2">💡 Aplica al tema activo, sea cual sea. Si no eliges ninguno, se usa la apertura por defecto de "{temaActual.nombre}".</p>
                      <SelectorTipoApertura
                        tema={temaActual}
                        valorActual={datos.personalizacion?.tipoApertura || tipoAperturaPorDefectoDelTema(temaActual.id)}
                        onSelect={(id) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), tipoApertura: id } }))}
                        colorAcento="purple"
                      />
                    </div>

                    <div className="border-t border-purple-100/60 pt-3">
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Diseño del Itinerario</h4>
                      <p className="text-[10px] text-slate-400 mb-2">💡 Aplica al tema activo, sea cual sea. Si no eliges ninguno, se usa "Clásica" (el diseño de siempre).</p>
                      <SelectorEstiloItinerario
                        tema={temaActual}
                        valorActual={datos.personalizacion?.estiloItinerario || "clasica"}
                        onSelect={(id) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), estiloItinerario: id } }))}
                        colorAcento="purple"
                      />
                    </div>

                    <div className="border-t border-purple-100/60 pt-3">
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Diseño de la Portada</h4>
                      <p className="text-[10px] text-slate-400 mb-2">💡 Aplica al tema activo, sea cual sea. "Fondo" necesita que ya tengas una foto subida.</p>
                      <SelectorEstiloPortada
                        tema={temaActual}
                        valorActual={datos.personalizacion?.estiloPortada || estiloPortadaPorDefectoDelTema(temaActual.id)}
                        onSelect={(id) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), estiloPortada: id } }))}
                        colorAcento="purple"
                      />
                    </div>

                    <div className="border-t border-purple-100/60 pt-3">
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Símbolos de Lluvia Decorativa</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {PALETAS_ANIMACION.map(a => {
                          const actual = datos.personalizacion?.simbolosCaida;
                          const isSelected = actual ? actual.join(",") === a.simbolos.join(",") : a.id === "elegante";
                          return (
                            <button
                              key={a.id}
                              onClick={() => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), simbolosCaida: a.simbolos } }))}
                              className={`text-left p-2.5 rounded-xl border-2 transition cursor-pointer ${isSelected ? "border-purple-500 bg-purple-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
                            >
                              <span className="block text-base mb-1">{a.simbolos.join(" ")}</span>
                              <span className="block text-[10px] font-bold text-slate-700">{a.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">💡 Solo visible si "Efecto de Animación de Caída" está en ON.</p>
                    </div>
                  </div>
                </div>

                {/* COMPARTIR POR WHATSAPP */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]"></span>
                    3. Compartir por WhatsApp (Envío Directo)
                  </h3>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Comparte el link para ver y editar esta invitación directamente en WhatsApp. El link se genera de manera dinámica combinando tus opciones, temas e invitados.
                    </p>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Para Invitado Especial (Opcional)</label>
                      <select
                        value={selectedInvitadoIndex}
                        onChange={(e) => setSelectedInvitadoIndex(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-emerald-500 outline-none font-sans"
                      >
                        <option value="-1">-- Todos / Invitación General --</option>
                        {datos.invitados && datos.invitados.map((item, index) => (
                          <option key={index} value={index}>
                            {item.nombre} ({item.pases} pases)
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Destinatario</label>
                        <input
                          type="text"
                          value={whatsappDestino}
                          onChange={(e) => setWhatsappDestino(e.target.value)}
                          placeholder="Ej. 22177445410"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-emerald-500 outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Formato de Invitación</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setWhatsappTemplateId("completo")}
                            className={`p-2 text-center rounded-lg border text-xs font-semibold transition cursor-pointer ${
                              whatsappTemplateId === "completo"
                                ? "bg-emerald-600/10 border-emerald-500 text-emerald-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Detalle Completo
                          </button>
                          <button
                            type="button"
                            onClick={() => setWhatsappTemplateId("link-only")}
                            className={`p-2 text-center rounded-lg border text-xs font-semibold transition cursor-pointer ${
                              whatsappTemplateId === "link-only"
                                ? "bg-emerald-600/10 border-emerald-500 text-emerald-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Solo Enlace
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Enlace</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEsEnlaceMuestra(false)}
                            className={`p-2 text-center rounded-lg border text-xs font-semibold transition cursor-pointer ${
                              !esEnlaceMuestra
                                ? "bg-emerald-600/10 border-emerald-500 text-emerald-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => setEsEnlaceMuestra(true)}
                            className={`p-2 text-center rounded-lg border text-xs font-semibold transition cursor-pointer ${
                              esEnlaceMuestra
                                ? "bg-amber-500/10 border-amber-500 text-amber-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            🎀 Muestra ({MUESTRA_DIAS_VIGENCIA} días)
                          </button>
                        </div>
                        {esEnlaceMuestra && (
                          <p className="text-[10px] text-amber-700 mt-1.5 leading-relaxed">
                            Este enlace deja de funcionar en {MUESTRA_DIAS_VIGENCIA} días y muestra un aviso de "MUESTRA" mientras esté vigente — pensado para mandarle una vista previa a un cliente antes de que pague, no para la invitación final.
                          </p>
                        )}
                      </div>

                      {validarInvitacion().length > 0 && (
                        <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg">
                          <p className="text-[11px] font-bold text-rose-800">🚩 Revisa esto antes de compartir:</p>
                          <ul className="text-[10px] text-rose-700 list-disc list-inside mt-1">
                            {validarInvitacion().map((problema, i) => <li key={i}>{problema}</li>)}
                          </ul>
                        </div>
                      )}

                      {detectarFotosLocalesSinSubir().length > 0 && (
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg">
                          <p className="text-[11px] font-bold text-amber-800">⚠️ Estas fotos no se verán en el link que compartas:</p>
                          <ul className="text-[10px] text-amber-700 list-disc list-inside mt-1">
                            {detectarFotosLocalesSinSubir().map((nombre, i) => <li key={i}>{nombre}</li>)}
                          </ul>
                          <p className="text-[10px] text-amber-700 mt-1">Súbelas a Cloudinary (arriba, en "Fotos") antes de compartir — mientras tanto, el link usa el diseño por defecto del tema en su lugar.</p>
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Enlace de Invitación Resultante (Elección Actual)</label>
                        <div className="flex gap-1.5 w-full">
                          <input
                            type="text"
                            readOnly
                            value={aplicarModoMuestra(getShareUrl())}
                            className="flex-1 px-3 py-2 bg-white/75 border border-slate-200 rounded-lg text-slate-600 text-[10px] outline-none font-mono truncate"
                            title="Este enlace incluye toda tu configuración guardada encriptada en tiempo real"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              // Compartir guarda primero (2026-11-19) -- ver nota en handleEnviarWhatsApp.
                              const listo = await asegurarCodigoCortoParaEntregarLink();
                              if (!listo.ok) return;
                              navigator.clipboard.writeText(aplicarModoMuestra(getShareUrl(selectedInvitadoIndex, listo.codigo)))
                                .then(() => mostrarToast("¡Enlace de invitación copiado con éxito! 🌸✨", "success"))
                                .catch(err => mostrarToast("Error al copiar enlace: " + err, "error"));
                            }}
                            className="px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs"
                            title="Copiar enlace"
                          >
                            <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleEnviarWhatsApp}
                      className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba5a] active:scale-[0.98] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-emerald-500/10"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.503-5.714-1.458L0 24zm12.035-2.024c1.801 0 3.559-.483 5.097-1.397l.365-.217 3.793.994-.101-3.693.24-.382c.983-1.566 1.502-3.39 1.501-5.275C22.99 5.8 18.055 1.12 12.01 1.12c-2.926 0-5.677 1.14-7.747 3.212C2.193 6.405 1.05 9.155 1.05 12.08c0 2.923.77 5.666 2.23 7.728l.243.344-.997 3.642 3.743-.981.36.214a10.932 10.932 0 0 0 5.406 1.413h.001zM17.47 15.3c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                      Enviar por WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        // Compartir guarda primero (2026-11-19) -- ver nota en handleEnviarWhatsApp.
                        const listo = await asegurarCodigoCortoParaEntregarLink();
                        if (!listo.ok) return;
                        window.open(aplicarModoMuestra(getShareUrl(selectedInvitadoIndex, listo.codigo)), "_blank");
                      }}
                      className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
                      title="Abre el link de esta invitación tal como lo vería el invitado, en una pestaña nueva -- la invitación terminada, no la vista previa del editor"
                    >
                      🔗 Abrir link directo
                    </button>

                    <div className="border-t border-emerald-100/50 pt-2.5">
                      <p className="text-[10px] text-slate-500 font-medium">
                        El link de edición se actualizará automáticamente con tus cambios actuales para que el destinatario los visualice en su simulación.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: QUINCE_AÑERA DATOS BÁSICOS */}
            {panelPestana === "quince" && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-semibold text-indigo-600 mb-2">Información Esencial</h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Evento</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {TIPOS_EVENTO.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSeleccionarTipoEvento(t.id)}
                        className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${(datos.tipoEvento || "xv") === t.id ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span className="text-base">{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Solo cambia las palabras que ve el invitado (portada, apertura, etc.) -- el tema, el paquete y las secciones siguen siendo los mismos para cualquier tipo de evento.</p>
                </div>

                {/* NUEVO (2026-11-22, v1 de este mismo prompt): el mismo bloque «Fondos listos»
                    de Gestión de Imágenes, repetido aquí junto al selector de evento -- mismo
                    estado/handlers (BloqueFondosListos), nunca dos copias independientes. Solo
                    se muestra si el evento elegido ya tiene fondos (hoy: solo Boda) -- si no,
                    no se renderiza nada, ni una caja vacía ni texto. */}
                <BloqueFondosListos
                  datos={datos}
                  onAplicar={handleAplicarFondoGaleria}
                  onQuitar={handleQuitarFondoGaleria}
                  mostrarVacio={false}
                  ayudaExtra="Elige el fondo de la invitación para este evento -- también está en Gestión de Imágenes."
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{ETIQUETA_NOMBRE_POR_EVENTO[datos.tipoEvento || "xv"]} *</label>
                  <input
                    type="text"
                    value={datos.nombre}
                    onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                    placeholder="Ej. Sophia Valeria"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none"
                    id="input-nombre-quince"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fecha y Hora del Evento Principal *</label>
                  <input
                    type="datetime-local"
                    value={datos.fecha ? datos.fecha.substring(0, 16) : ""}
                    onChange={(e) => setDatos({ ...datos, fecha: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Usa la hora de la Ceremonia Principal para calcular la cuenta regresiva.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mensaje de Bienvenida / Agradecimiento</label>
                  <textarea
                    rows={4}
                    value={datos.mensajeBienvenida}
                    onChange={(e) => setDatos({ ...datos, mensajeBienvenida: e.target.value })}
                    placeholder="Escribe el poema, dedicatoria o palabras de bienvenida para los invitados..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hashtag de Redes Sociales (Opcional)</label>
                  <input
                    type="text"
                    value={datos.hashtag}
                    onChange={(e) => setDatos({ ...datos, hashtag: e.target.value })}
                    placeholder="Ej. #SophiaValeriaXV"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">WhatsApp de Confirmación de Asistencia (Lada + Número)*</label>
                  <input
                    type="text"
                    value={datos.whatsappConfirmacion}
                    onChange={(e) => setDatos({ ...datos, whatsappConfirmacion: e.target.value })}
                    placeholder="Ej. 525512345678 (Solo números sin espacios)"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Indispensable código de país al inicio (52 para México).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Enlace a Música de Fondo (Debe ser un .mp3 público)*</label>
                  <input
                    type="text"
                    value={datos.cancion}
                    onChange={(e) => setDatos({ ...datos, cancion: e.target.value })}
                    placeholder="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Sugerencia: Puedes colocar links de canciones libres de derechos alojadas públicamente o dejarse en blanco.</p>
                </div>

                {/* CONFIGURACIÓN DE FOTO DE PORTADA */}
                <div className="bg-gradient-to-r from-pink-50 to-indigo-50/50 p-4 rounded-xl border border-pink-100 space-y-4 shadow-sm mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs uppercase font-extrabold text-pink-600 flex items-center gap-1.5">
                      <span className="p-1 bg-pink-100 border border-pink-200 rounded-full text-pink-600">📷</span>
                      Foto de Portada Principal
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={datos.mostrarFotoPortada !== false}
                        onChange={(e) => setDatos({ ...datos, mostrarFotoPortada: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                      <span className="ml-2 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                        {datos.mostrarFotoPortada !== false ? "Habilitada" : "Apagada"}
                      </span>
                    </label>
                  </div>

                  {datos.mostrarFotoPortada !== false && (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Subir archivo local */}
                      <div className="space-y-2">
                        <span className="block text-xs font-semibold text-slate-700">Subir nueva Foto de Portada (Directo a Cloudinary)</span>
                        <label className="flex flex-col items-center justify-center p-3 border border-dashed border-pink-200 bg-white rounded-lg hover:bg-pink-50/50 cursor-pointer transition">
                          <Upload className="w-5 h-5 text-pink-600 mb-1" />
                          <span className="text-xs text-rose-700 font-bold">
                            {subiendoCloudinary ? "Subiendo archivo..." : "Seleccionar Archivo Local"}
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleCargarFotoPortadaLocal} 
                            disabled={subiendoCloudinary}
                            className="hidden" 
                          />
                        </label>
                      </div>

                      {/* URL o visualización */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Enlace/URL de Foto para Portada (Opcional)
                        </label>
                        <input
                          type="text"
                          value={datos.fotoPortada || ""}
                          onChange={(e) => setDatos({ ...datos, fotoPortada: e.target.value })}
                          placeholder="Ej. https://images.unsplash.com/photo-X..."
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-pink-500 outline-none font-mono"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Pega un link directo de imagen (.jpg, .png) o utiliza el botón de arriba de Cloudinary. Si se deja vacío se usará la primera foto de tu galería o una ilustración del tema.
                        </p>
                      </div>

                      {/* Mini Vista previa de la portada actual */}
                      {datos.fotoPortada && (
                        <div className="pt-2">
                          <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vista Previa Portada:</span>
                          <div className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-pink-300 shadow-md">
                            <img src={datos.fotoPortada} alt="Miniatura Portada" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setDatos({ ...datos, fotoPortada: "" })}
                              className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition text-[10px] shadow"
                              title="Remover imagen"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: UBICACIONES (CEREMONIA Y RECEPCION) */}
            {panelPestana === "lugares" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* UBICACION DE CEREMONIA */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                  <h4 className="text-xs uppercase font-extrabold text-indigo-600 flex items-center gap-1.5">
                    <span className="p-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600"><MapPin className="w-3 h-3" /></span>
                    Ceremonia Religiosa / Misa
                  </h4>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-semibold">Templo / Iglesia</label>
                    <input
                      type="text"
                      value={datos.ceremonia.lugar}
                      onChange={(e) => setDatos({
                        ...datos,
                        ceremonia: { ...datos.ceremonia, lugar: e.target.value }
                      })}
                      placeholder="Ej. Parroquia de San Juan Bautista"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1 font-semibold">Hora Misa</label>
                      <input
                        type="text"
                        value={datos.ceremonia.hora}
                        onChange={(e) => setDatos({
                          ...datos,
                          ceremonia: { ...datos.ceremonia, hora: e.target.value }
                        })}
                        placeholder="Ej. 17:05"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-semibold">Dirección Física Completa</label>
                    <input
                      type="text"
                      value={datos.ceremonia.direccion}
                      onChange={(e) => setDatos({
                        ...datos,
                        ceremonia: { ...datos.ceremonia, direccion: e.target.value }
                      })}
                      placeholder="Calle, Número, Colonia, Ciudad"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-semibold">Enlace de Compartir Google Maps</label>
                    <input
                      type="text"
                      value={datos.ceremonia.maps}
                      onChange={(e) => setDatos({
                        ...datos,
                        ceremonia: { ...datos.ceremonia, maps: e.target.value }
                      })}
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* UBICACION DE RECEPCION */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                  <h4 className="text-xs uppercase font-extrabold text-indigo-600 flex items-center gap-1.5">
                    <span className="p-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600"><MapPin className="w-3 h-3" /></span>
                    Recepción / Salón de Fiestas
                  </h4>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-semibold">Salón o Finca</label>
                    <input
                      type="text"
                      value={datos.recepcion.lugar}
                      onChange={(e) => setDatos({
                        ...datos,
                        recepcion: { ...datos.recepcion, lugar: e.target.value }
                      })}
                      placeholder="Ej. Salón de Eventos Las Gardenias"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1 font-semibold">Hora Recepción</label>
                      <input
                        type="text"
                        value={datos.recepcion.hora}
                        onChange={(e) => setDatos({
                          ...datos,
                          recepcion: { ...datos.recepcion, hora: e.target.value }
                        })}
                        placeholder="Ej. 19:30"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-semibold">Dirección Física Completa</label>
                    <input
                      type="text"
                      value={datos.recepcion.direccion}
                      onChange={(e) => setDatos({
                        ...datos,
                        recepcion: { ...datos.recepcion, direccion: e.target.value }
                      })}
                      placeholder="Calle, Número, Colonia, Ciudad"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-semibold">Enlace de Compartir Google Maps</label>
                    <input
                      type="text"
                      value={datos.recepcion.maps}
                      onChange={(e) => setDatos({
                        ...datos,
                        recepcion: { ...datos.recepcion, maps: e.target.value }
                      })}
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none font-mono"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: ITINERARIO Y CODIGO VESTIMENTA */}
            {panelPestana === "itincode" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* ITINERARIO DINÁMICO */}
                <div>
                  <h3 className="text-sm font-semibold text-indigo-600 mb-3">Cronograma de Eventos Dinámico</h3>
                  
                  {/* Lista de eventos actuales */}
                  <div className="space-y-2 mb-4">
                    {datos.itinerario && datos.itinerario.length > 0 ? (
                      datos.itinerario.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded mr-2">
                              {item.hora} hrs
                            </span>
                            <span className="text-xs font-semibold text-slate-850">{item.evento}</span>
                          </div>
                          <button 
                            onClick={() => handleEliminarItinerario(index)} 
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition overflow-hidden"
                            title="Eliminar evento"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No hay momentos cargados en el itinerario de la fiesta.</p>
                    )}
                  </div>

                  {/* Formulario rápido para añadir evento al itinerario */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Añadir Nuevo Suceso</span>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={nuevoItinHora}
                        onChange={(e) => setNuevoItinHora(e.target.value)}
                        placeholder="Hora (Ej. 21:00)"
                        className="col-span-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                      />
                      <input
                        type="text"
                        value={nuevoItinEvento}
                        onChange={(e) => setNuevoItinEvento(e.target.value)}
                        placeholder="Suceso (Ej. Cena de Gala)"
                        className="col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleAgregarItinerario}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir al Cronograma
                    </button>
                  </div>
                </div>

                {/* VESTIMENTA Y COLORES SUGERIDOS */}
                <div className="border-t border-slate-200 pt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-indigo-600">Vestimenta y Colores Sugeridos</h3>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 font-semibold">Regla o Código para la Invitación</label>
                    <input
                      type="text"
                      value={datos.dressCode}
                      onChange={(e) => setDatos({ ...datos, dressCode: e.target.value })}
                      placeholder="Ej. Gala Formal - Caballeros de Traje, Damas de Vestido Largo"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 font-semibold">Colores Sugeridos e Inspiración</label>
                    
                    {/* Burbujitas actuales */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {datos.colorSugerido && datos.colorSugerido.length > 0 ? (
                        datos.colorSugerido.map((color, index) => (
                          <div 
                            key={index}
                            className="bg-slate-100 px-2.5 py-1.5 rounded-full border border-slate-200 flex items-center gap-2"
                          >
                            <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: color }}></span>
                            <span className="text-[10px] font-mono font-bold text-slate-700">{color.toUpperCase()}</span>
                            <button 
                              onClick={() => handleEliminarColorSugerido(color)}
                              className="text-slate-400 hover:text-rose-600 text-xs select-none font-bold"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">No hay colores sugeridos aún.</p>
                      )}
                    </div>

                    {/* Selector y añadidor */}
                    <div className="flex items-center gap-2 max-w-xs">
                      <input 
                        type="color"
                        value={nuevoColor}
                        onChange={(e) => setNuevoColor(e.target.value)}
                        className="w-10 h-8 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <button
                        onClick={handleAgregarColorSugerido}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 text-white transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Añadir este color
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: FAMILIA (PADRES Y PADRINOS) */}
            {panelPestana === "familia" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* PADRES */}
                <div>
                  <h3 className="text-sm font-semibold text-indigo-600 mb-3">{ETIQUETA_PADRES_POR_EVENTO[datos.tipoEvento || "xv"]}</h3>
                  
                  <div className="space-y-2 mb-4">
                    {datos.padres && datos.padres.length > 0 ? (
                      datos.padres.map((nombre, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 shadow-xs">
                          <span className="text-xs text-slate-800 font-medium">{nombre}</span>
                          <button 
                            onClick={() => handleEliminarPadre(index)} 
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition overflow-hidden"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No hay nombres de padres guardados aún.</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevoPadre}
                      onChange={(e) => setNuevoPadre(e.target.value)}
                      placeholder="Nombre del Padre o Madre"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                    />
                    <button
                      onClick={handleAgregarPadre}
                      className="px-4 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-lg text-white transition cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* PADRINOS */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-indigo-600 mb-3">Padrinos de Honor</h3>
                  
                  <div className="space-y-2 mb-4">
                    {datos.padrinos && datos.padrinos.length > 0 ? (
                      datos.padrinos.map((nombre, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 shadow-xs">
                          <span className="text-xs text-slate-800 font-medium">{nombre}</span>
                          <button 
                            onClick={() => handleEliminarPadrino(index)} 
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition overflow-hidden"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No hay nombres de padrinos guardados aún.</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevoPadrino}
                      onChange={(e) => setNuevoPadrino(e.target.value)}
                      placeholder="Nombre de los Padrinos"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                    />
                    <button
                      onClick={handleAgregarPadrino}
                      className="px-4 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-lg text-white transition cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 6: MESA DE REGALOS / LLUVIA DE SOBRES / BANCO */}
            {panelPestana === "regalos" && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-semibold text-indigo-600 mb-2">Sección Regalos</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mesa de Regalos (Liverpool, Amazon, Palacio, etc.)</label>
                  <input
                    type="text"
                    value={datos.mesaRegalos}
                    onChange={(e) => setDatos({ ...datos, mesaRegalos: e.target.value })}
                    placeholder="Ej. Liverpool (No. Evento: 50942851) y Amazon Wishlist"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Datos Bancarios para Transferencia (Lluvia de Sobres)</label>
                  <textarea
                    rows={6}
                    value={datos.datosBancarios}
                    onChange={(e) => setDatos({ ...datos, datosBancarios: e.target.value })}
                    placeholder="Banco: BBVA&#10;Beneficiario: Sophia Valeria Gómez&#10;CLABE: 0121 8001 2345 6789 01"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:border-indigo-600 outline-none leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Este texto se mostrará tal cual está justificado con un botón para que el invitado lo copie en un solo clic.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 7: GESTIÓN DE IMÁGENES (FONDO, PORTADA Y GALERÍA) */}
            {panelPestana === "fotos" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* PARTE 1: FONDO DE LA INVITACIÓN */}
                <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🖼️</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest animate-fadeIn">
                        Fondo de la Invitación ({temaActual.nombre})
                      </h4>
                      <p className="text-[10px] text-slate-500">Sube una imagen de fondo personalizada para el diseño de tu invitación.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold text-[11px]">Estado actual del fondo:</span>
                      {datos.bgImages?.[selectedTemaId] ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                          Personalizado ✨
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-250 text-slate-750 text-[10px] font-semibold">
                          Fondo del Tema
                        </span>
                      )}
                    </div>

                    {/* VISTA PREVIA DEL FONDO (LA CASILLA VISUAL) */}
                    {datos.bgImages?.[selectedTemaId] ? (
                      <div className="p-2 border border-indigo-150 rounded-xl bg-white flex items-center gap-3 animate-fadeIn">
                        <div className="w-16 h-12 rounded-lg overflow-hidden border border-indigo-200 shadow-xs shrink-0 bg-slate-50">
                          <img 
                            src={datos.bgImages[selectedTemaId]} 
                            alt="Vista previa del fondo" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] font-bold text-slate-800 truncate">Fondo Personalizado Activo</span>
                          <span className="block text-[9px] font-mono text-slate-400 truncate leading-normal">
                            {datos.bgImages[selectedTemaId]}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuitarFondoTema(selectedTemaId)}
                          title="Quitar este fondo personalizado"
                          className="shrink-0 p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 border border-slate-150 rounded-xl bg-slate-55/50 flex items-center gap-3">
                        <div className="w-16 h-12 rounded-lg border border-slate-200 bg-white shadow-xs shrink-0 flex items-center justify-center text-sm">
                          🎨
                        </div>
                        <div className="flex-1">
                          <span className="block text-[11px] font-bold text-slate-500 leading-normal">Fondo por defecto del tema</span>
                          <span className="block text-[9px] text-slate-400 leading-normal mt-0.5">
                            Se utilizará la elegante textura o gradiente nativo de "{temaActual.nombre}".
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="flex flex-col items-center justify-center p-3 border border-dashed border-indigo-200 rounded-lg bg-white hover:bg-indigo-50/30 transition cursor-pointer text-center group">
                        <Upload className={`w-4 h-4 text-indigo-500 mb-1 group-hover:text-indigo-600 ${subiendoCloudinary ? 'animate-bounce' : ''}`} />
                        <span className="text-[11px] font-bold text-indigo-700">
                          {subiendoCloudinary ? "Subiendo..." : "Subir Fondo (Cloudinary)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBgImageUpload}
                          className="hidden"
                          disabled={subiendoCloudinary}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={true}
                        title="Los fondos se mantienen hasta que subas uno nuevo para reemplazarlo"
                        className="flex flex-col items-center justify-center p-3 border rounded-lg bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4 mb-1" />
                        <span className="text-[11px] font-bold">Fondos protegidos</span>
                      </button>
                    </div>

                    <a
                      href="https://console.cloudinary.com/console/media_library"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition text-center text-slate-600 hover:text-slate-800 text-[11px] font-bold"
                      title="Abre tu cuenta de Cloudinary en una pestaña nueva para subir cualquier foto o fondo manualmente y copiar su link"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Abrir Cloudinary (subir manual) ↗
                    </a>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Pega link de Cloudinary aquí..."
                        value={enlaceCloudinary}
                        onChange={(e) => { setEnlaceCloudinary(e.target.value); setEstadoGuardadoLink('idle'); }}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-500 outline-none font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={handleGuardarEnlaceCloudinary}
                        disabled={!enlaceCloudinary.trim() || estadoGuardadoLink === 'guardando'}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition"
                      >
                        {estadoGuardadoLink === 'guardando' ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                    {estadoGuardadoLink === 'ok' && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1.5">
                        ✅ Guardado y sincronizado en todos los dispositivos
                      </div>
                    )}
                    {estadoGuardadoLink === 'error' && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold flex items-center gap-1.5">
                        ❌ No se pudo sincronizar. Revisa la conexión con Supabase.
                      </div>
                    )}
                  </div>
                </div>

                {/* PARTE 1b: FONDOS LISTOS DE GALERÍA, POR TIPO DE EVENTO (2026-11-22, v1:
                    componente compartido también en la pestaña Información Esencial, ver
                    BloqueFondosListos arriba del componente App). A diferencia del bloque de
                    arriba (fondo subido a mano, por TEMA), aquí se elige con un clic uno de los
                    fondos predefinidos de fondosListos.ts, atado al EVENTO actual de esta
                    invitación (ver handleAplicarFondoGaleria/handleQuitarFondoGaleria y
                    resolverFondoEfectivo en templates.ts). */}
                <BloqueFondosListos
                  datos={datos}
                  onAplicar={handleAplicarFondoGaleria}
                  onQuitar={handleQuitarFondoGaleria}
                />

                {/* PARTE 2: FOTO DE PORTADA O DE LA QUINCEAÑERA */}
                <div className="p-4 bg-pink-50/40 rounded-xl border border-pink-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👑</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Foto de Portada Principal</h4>
                        <p className="text-[10px] text-slate-500">La foto circular que se destaca al inicio.</p>
                      </div>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={datos.mostrarFotoPortada !== false}
                        onChange={(e) => setDatos({ ...datos, mostrarFotoPortada: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                      <span className="ml-2 text-[11px] font-bold text-slate-700">
                        {datos.mostrarFotoPortada !== false ? "Habilitada" : "Apagada"}
                      </span>
                    </label>
                  </div>

                  {datos.mostrarFotoPortada !== false && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col items-center justify-center p-3 border border-dashed border-pink-200 bg-white rounded-lg hover:bg-pink-50/40 cursor-pointer text-center group">
                          <Upload className={`w-4 h-4 text-pink-500 mb-1 group-hover:text-pink-600 ${subiendoCloudinary ? 'animate-bounce' : ''}`} />
                          <span className="text-[11px] font-bold text-pink-700">Subir Portada (Cloudinary)</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleCargarFotoPortadaLocal} 
                            disabled={subiendoCloudinary}
                            className="hidden" 
                          />
                        </label>

                        <div className="flex flex-col justify-center space-y-1">
                          <span className="text-[10px] font-bold text-slate-500">O pegar link de foto:</span>
                          <input
                            type="text"
                            value={datos.fotoPortada || ""}
                            onChange={(e) => setDatos({ ...datos, fotoPortada: e.target.value })}
                            placeholder="Ej: https://cloudinary..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-pink-500 outline-none font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      {datos.fotoPortada && (
                        <div className="flex items-center gap-3 pt-2 border-t border-pink-100/70">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pink-300 shadow-sm relative shrink-0">
                            <img src={datos.fotoPortada} alt="Portada actual" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-slate-500 truncate block">{datos.fotoPortada}</span>
                            <button
                              type="button"
                              onClick={() => setDatos({ ...datos, fotoPortada: "" })}
                              className="text-[10px] text-rose-600 font-bold hover:underline"
                            >
                              Eliminar foto de portada
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* PARTE 3: CASILLAS DE LA GALERÍA DE FOTOS */}
                <div className="space-y-4 pt-1">
                  <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest">Galería de Fotos del Álbum</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Paquete <span className="font-bold text-indigo-700 uppercase">{paquetes[datos.paquete].nombre}</span> con derecho a un máximo de <span className="font-bold text-indigo-700">{paquetes[datos.paquete].maxFotos} fotos de galería</span>.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold rounded-lg uppercase">
                      Límite: {datos.fotos?.length || 0} / {paquetes[datos.paquete].maxFotos}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Array.from({ length: paquetes[datos.paquete].maxFotos }).map((_, index) => {
                      const fotoActual = datos.fotos?.[index];
                      return (
                        <div key={index} className="relative rounded-xl border border-slate-200 bg-slate-50 aspect-3/4 flex flex-col justify-between overflow-hidden shadow-xs group">
                          {/* Número de Casilla */}
                          <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-mono font-black text-rose-300 uppercase tracking-widest">
                            FOTO #{index + 1}
                          </div>

                          {fotoActual ? (
                            <>
                              <img src={fotoActual} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                              
                              {/* Overlay de acciones */}
                              <div className="absolute inset-0 bg-slate-950/85 opacity-0 group-hover:opacity-100 transition duration-150 flex flex-col justify-center items-center p-2.5 gap-2 text-center text-white z-10">
                                <span className="text-[9px] uppercase font-bold text-slate-300">Espacio #{index + 1} Habilitado</span>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarFoto(index)}
                                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 font-bold text-[10px] uppercase rounded-md text-white transition flex items-center justify-center gap-1 cursor-pointer"
                                  title="Remover de este casillero"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remover
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center space-y-2 animate-fadeIn">
                              <span className="text-xl text-slate-300">📸</span>
                              <span className="text-[10px] font-semibold text-slate-400">Casilla vacía</span>
                              
                              <div className="w-full space-y-1.5 pt-1">
                                {/* Botón subir */}
                                <label className="block w-full py-1 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-700/90 border border-indigo-200 rounded-md cursor-pointer transition">
                                  {subiendoCloudinary ? "Subiendo..." : "Subir (Cloudinary)"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleCargarFotoGaleriaIndex(index, file);
                                    }}
                                    disabled={subiendoCloudinary}
                                    className="hidden"
                                  />
                                </label>

                                {/* Pegar Link de foto */}
                                <input
                                  type="text"
                                  placeholder="Pegar link de imagen..."
                                  className="w-full px-2 py-0.5 text-[9px] text-slate-700 bg-white border border-slate-200 rounded outline-none focus:border-indigo-400 text-center font-mono"
                                  onBlur={(e) => {
                                    if (e.target.value.trim()) {
                                      handleEstablecerFotoUrlIndex(index, e.target.value.trim());
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                      handleEstablecerFotoUrlIndex(index, (e.target as HTMLInputElement).value.trim());
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed pt-1.5 border-t border-slate-100">
                    💡 <span className="font-bold">Consejo:</span> El sistema adapta dinámicamente tu galería de fotos interactiva. Al subir tus fotos a cada casilla se guardan y cargan de forma inmediata en las nubes de Cloudinary para que tu invitación cargue a máxima velocidad.
                  </p>
                </div>

                {/* PARTE 3b: FOTOS LISTAS DE ÁLBUM, POR TIPO DE EVENTO (2026-11-22, v2) -- espejo
                    de PARTE 1b (Fondos listos): inserta fotos de MUESTRA (relleno para vestir
                    una invitación de muestra, nunca contenido real de clienta) de
                    fotosListas.ts en datos.fotoPortada/datos.fotos con un clic, sin subir nada --
                    a partir de ahí son fotos normales de la invitación (ver
                    handleInsertarFotoLista/handleInsertarSetFotosCompleto), nunca se guarda nada
                    por evento. */}
                {(() => {
                  const tipoActual: TipoEvento = (datos.tipoEvento && TEXTOS_POR_EVENTO[datos.tipoEvento]) ? datos.tipoEvento : "xv";
                  const setDelEvento = fotosListasPorEvento(tipoActual);
                  const fotosActuales = datos.fotos || [];

                  return (
                    <div className="p-4 bg-fuchsia-50/40 rounded-xl border border-fuchsia-100 shadow-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📸</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                            Fotos listas ({TIPOS_EVENTO.find(t => t.id === tipoActual)?.label || "Evento"})
                          </h4>
                          {setDelEvento.length > 0 && (
                            <p className="text-[10px] text-slate-500">
                              Fotos de MUESTRA para vestir esta invitación -- se reemplazan por las fotos reales de la clienta.
                            </p>
                          )}
                        </div>
                      </div>

                      {setDelEvento.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic p-2.5 bg-white/60 rounded-lg border border-slate-150">
                          Aún no hay fotos listas para este evento.
                        </p>
                      ) : (
                        (() => {
                          // Partir en grupos (p. ej. "niña"/"niño" en cumpleaños) conservando el
                          // orden de aparición -- sin grupo (null) es el set único de siempre,
                          // mismo comportamiento que antes de que existiera este campo.
                          const grupos: { grupo: string | null; fotos: FotoLista[] }[] = [];
                          for (const f of setDelEvento) {
                            const g = f.grupo ?? null;
                            let entrada = grupos.find(e => e.grupo === g);
                            if (!entrada) { entrada = { grupo: g, fotos: [] }; grupos.push(entrada); }
                            entrada.fotos.push(f);
                          }
                          return grupos.map((entrada, gi) => (
                            <div key={entrada.grupo ?? "unico"} className={gi > 0 ? "pt-3 border-t border-fuchsia-100/80 space-y-3" : "space-y-3"}>
                              {entrada.grupo !== null && (
                                <p className="text-[10px] font-bold text-fuchsia-700 uppercase tracking-wide">
                                  Set {entrada.grupo.charAt(0).toUpperCase() + entrada.grupo.slice(1)}
                                </p>
                              )}
                              <div className="grid grid-cols-3 gap-2">
                                {entrada.fotos.map((f: FotoLista) => {
                                  const insertada = fotosActuales.includes(f.url);
                                  return (
                                    <button
                                      key={f.url}
                                      type="button"
                                      onClick={() => handleInsertarFotoLista(f.url)}
                                      title={`Insertar "${f.nombre}" en el álbum`}
                                      className={`relative rounded-lg overflow-hidden border-2 transition text-left cursor-pointer ${insertada ? "border-fuchsia-500 ring-2 ring-fuchsia-200" : "border-slate-200 hover:border-fuchsia-300"}`}
                                    >
                                      <img src={f.url} alt={f.nombre} className="w-full h-16 object-cover" referrerPolicy="no-referrer" />
                                      <span className="block px-1.5 py-1 text-[9px] font-bold text-slate-700 bg-white/90 truncate">{f.nombre}</span>
                                      {insertada && (
                                        <span className="absolute top-1 right-1 bg-fuchsia-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow">✓</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleInsertarSetFotosCompleto(entrada.grupo ?? undefined)}
                                className="w-full px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                              >
                                {entrada.grupo !== null
                                  ? `Insertar el set completo (${entrada.grupo.charAt(0).toUpperCase() + entrada.grupo.slice(1)})`
                                  : "Insertar el set completo"}
                              </button>
                            </div>
                          ));
                        })()
                      )}
                    </div>
                  );
                })()}

              </div>
            )}

            {/* TAB 8: INVITADOS Y BOLETOS (PASES / DELUXE) */}
            {panelPestana === "invitados" && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-600 mb-2">Pases Personalizados de Invitados</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Cada invitado recibe su propio link fijo con su nombre y número de pases — genera el link de cada uno abajo en la lista.
                  </p>

                  {/* Importar lista completa de un jalón */}
                  <div className="mb-4">
                    <button
                      onClick={() => setMostrarImportarLista(v => !v)}
                      className="w-full py-1.5 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      📋 {mostrarImportarLista ? "Cerrar importar lista" : "Importar lista completa (pegar de una vez)"}
                    </button>

                    {mostrarImportarLista && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Pega la lista que te mande el cliente tal cual la manden — copiada de Excel/Sheets, de Word, o escrita en WhatsApp. Una familia por línea, por ejemplo:
                          <br />
                          <span className="font-mono text-slate-600">Familia Pérez González, 4{"\n"}Familia López - 2 pases{"\n"}Tía Lupita</span>
                          <br />
                          Si una línea no trae número, se le asignan 2 pases por default (lo puedes ajustar después en la lista).
                        </p>
                        <textarea
                          value={textoImportarInvitados}
                          onChange={(e) => setTextoImportarInvitados(e.target.value)}
                          placeholder={"Familia Pérez González, 4\nFamilia López - 2 pases\nTía Lupita"}
                          rows={6}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:border-indigo-600 outline-none resize-y"
                        />
                        <button
                          onClick={handleImportarListaInvitados}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition text-white cursor-pointer"
                        >
                          Importar lista
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Formulario nuevo invitado (uno por uno) */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 space-y-3 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Nuevo Invitado / Pase Familiar</span>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={nuevoInvitadoNombre}
                        onChange={(e) => setNuevoInvitadoNombre(e.target.value)}
                        placeholder="Ej. Familia Gómez Mendoza"
                        className="col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={nuevoInvitadoPases}
                        onChange={(e) => setNuevoInvitadoPases(Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), 20))}
                        className="col-span-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:border-indigo-600 outline-none"
                      />
                    </div>

                    <button
                      onClick={handleAgregarInvitado}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar a la Lista de Invitados
                    </button>
                  </div>

                  {/* Listado */}
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">
                      Invitados inscritos ({datos.invitados?.length || 0}):
                    </span>
                    <span className="text-[10px] text-slate-400 block mb-2">
                      El campo "Mesa" es opcional (texto libre, ej. "Mesa 5") -- si se deja vacío, el pase del invitado no muestra nada de acomodo.
                    </span>

                    {datos.invitados && datos.invitados.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50">
                        {datos.invitados.map((item, index) => (
                          <div key={index} className="p-2 bg-white rounded border border-slate-250 hover:bg-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-semibold text-slate-800">{item.nombre}</span>
                              <span className="ml-2 text-[10px] text-indigo-600 font-extrabold font-mono">({item.pases} pases)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {/* Botón copiar link del invitado */}
                              <button
                                onClick={async () => {
                                  // Compartir guarda primero (2026-11-19) -- ver nota en handleEnviarWhatsApp.
                                  const listo = await asegurarCodigoCortoParaEntregarLink();
                                  if (!listo.ok) return;
                                  const customLink = getShareUrl(index, listo.codigo);
                                  navigator.clipboard.writeText(customLink)
                                    .then(() => mostrarToast(`¡Enlace de invitación personalizado para "${item.nombre}" copiado al portapapeles! 🌸`, "success"))
                                    .catch(err => mostrarToast("Error al copiar: " + err, "error"));
                                }}
                                className="p-1 hover:bg-slate-50 text-indigo-600 hover:text-indigo-800 rounded transition cursor-pointer"
                                title="Copiar enlace personalizado"
                              >
                                <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              </button>

                              {/* Botón abrir link del invitado en pestaña nueva (2026-11-22,
                                  junto a "Copiar enlace personalizado") -- misma URL, misma
                                  resolución (asegurarCodigoCortoParaEntregarLink + getShareUrl),
                                  sin reconstruirla por otro camino. */}
                              <button
                                onClick={async () => {
                                  // Compartir guarda primero (2026-11-19) -- ver nota en handleEnviarWhatsApp.
                                  const listo = await asegurarCodigoCortoParaEntregarLink();
                                  if (!listo.ok) return;
                                  const customLink = getShareUrl(index, listo.codigo);
                                  window.open(customLink, "_blank", "noopener,noreferrer");
                                }}
                                className="p-1 hover:bg-slate-50 text-indigo-600 hover:text-indigo-800 rounded transition cursor-pointer"
                                title="Abrir enlace personalizado en pestaña nueva"
                              >
                                <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                </svg>
                              </button>

                              {/* Botón enviar por WhatsApp */}
                              <button
                                onClick={() => handleEnviarWhatsApp(index)}
                                className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded transition cursor-pointer"
                                title="Enviar invitación personalizada directo por WhatsApp"
                              >
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.503-5.714-1.458L0 24zm12.035-2.024c1.801 0 3.559-.483 5.097-1.397l.365-.217 3.793.994-.101-3.693.24-.382c.983-1.566 1.502-3.39 1.501-5.275C22.99 5.8 18.055 1.12c-2.926 0-5.677 1.14-7.747 3.212C2.193 6.405 1.05 9.155 1.05 12.08c0 2.923.77 5.666 2.23 7.728l.243.344-.997 3.642 3.743-.981.36.214a10.932 10.932 0 0 0 5.406 1.413h.001zM17.47 15.3c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                </svg>
                              </button>

                              {/* Ver QR de Control de Acceso (solo si el complemento está activo) */}
                              {datos.controlAccesoQR && (
                                <button
                                  onClick={() => setQrVisibleIndex(qrVisibleIndex === index ? null : index)}
                                  className="p-1 hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded transition cursor-pointer"
                                  title="Ver código QR de acceso"
                                >
                                  <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 21h3M21 14v3" />
                                  </svg>
                                </button>
                              )}

                              <button
                                onClick={() => handleEliminarInvitado(index)}
                                className="p-1 hover:text-rose-600 text-slate-400 rounded transition overflow-hidden cursor-pointer"
                                title="Eliminar invitado"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold shrink-0">Mesa</span>
                            <input
                              type="text"
                              value={item.mesa || ""}
                              onChange={(e) => handleActualizarMesaInvitado(index, e.target.value)}
                              placeholder="Sin asignar"
                              className="flex-1 min-w-0 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                            />
                          </div>
                          {qrVisibleIndex === index && datos.controlAccesoQR && (
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5">
                              {supabaseRowId ? (
                                <>
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                                      datos.codigoCorto
                                        ? `${URL_PUBLICA_INVITAMX}/puerta/${datos.codigoCorto}/${slugsDeInvitados(datos.invitados || [])[index]}`
                                        : `${URL_PUBLICA_INVITAMX}/?checkin=1&iid=${encodeURIComponent(supabaseRowId)}&fam=${encodeURIComponent(item.nombre)}`
                                    )}`}
                                    alt={`QR de acceso de ${item.nombre}`}
                                    className="w-16 h-16 rounded border border-amber-300 bg-white shrink-0"
                                  />
                                  <span className="text-[10px] text-amber-800 leading-relaxed">
                                    Este mismo QR se verá en el pase de "{item.nombre}" dentro de su link personalizado (sección "Pases Reservados"). Para generarlo/enviarlo, copia o manda por WhatsApp el link de esta familia con los botones de arriba.
                                  </span>
                                </>
                              ) : (
                                <span className="text-[10px] text-amber-800 leading-relaxed">
                                  ⚠️ Esta invitación todavía no se ha guardado/sincronizado — guárdala primero (el QR necesita el "iid" que se genera al guardar en Supabase).
                                </span>
                              )}
                            </div>
                          )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No hay invitados cargados para pases familiares.</p>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* TAB 9: PERSONALIZACIÓN A LA MEDIDA (SOLO TEMA "PERSONALIZADO") */}
            {panelPestana === "personalizar" && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-600 mb-1">Invitación 100% a la Medida</h3>
                  <p className="text-xs text-slate-500 mb-4">Tipografías, color de acento, tipo de apertura y más — funciona con <strong>cualquier tema</strong> del catálogo, no solo "Personalizado". Si no tocas nada aquí, se queda con lo que trae el tema elegido.</p>
                </div>

                {(() => {
                  // 2026-11-19: estos 4 overrides (tipografías, paleta, apertura, itinerario)
                  // ya aplican a cualquier tema (ver generarHTMLFinal) -- antes solo
                  // funcionaban con el tema "personalizado" y el panel lo avisaba con una
                  // advertencia que bloqueaba los controles. Se quitó el candado: ahora siempre
                  // se muestran y funcionan, sea cual sea el tema activo.
                  return (
                    <>
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Tipografías</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Encabezados</label>
                          <select
                            value={datos.personalizacion?.fontHeading || temaActual.fontHeading}
                            onChange={(e) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), fontHeading: e.target.value } }))}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                          >
                            {FUENTES_ENCABEZADO.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Texto</label>
                          <select
                            value={datos.personalizacion?.fontBody || temaActual.fontBody}
                            onChange={(e) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), fontBody: e.target.value } }))}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                          >
                            {FUENTES_TEXTO.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Cursiva</label>
                          <select
                            value={datos.personalizacion?.fontCursive || temaActual.fontCursive}
                            onChange={(e) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), fontCursive: e.target.value } }))}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                          >
                            {FUENTES_CURSIVA.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Paleta de Colores</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PALETAS_COLOR_PERSONALIZADO.map(p => {
                          const isSelected = (datos.personalizacion?.paletaColor || "neutro") === p.id;
                          const dots = [p.colors.primary, p.colors.secondary, p.colors.accent, p.colors.border].filter(Boolean) as string[];
                          return (
                            <button
                              key={p.id}
                              onClick={() => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), paletaColor: p.id } }))}
                              className={`text-left p-2.5 rounded-xl border-2 transition cursor-pointer ${isSelected ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
                            >
                              <div className="flex gap-1 mb-1.5">
                                {dots.length > 0 ? dots.map((c, i) => (
                                  <span key={i} className="w-5 h-5 rounded-full border border-white shadow-xs" style={{ backgroundColor: c }}></span>
                                )) : (
                                  <span className="w-5 h-5 rounded-full border border-white shadow-xs bg-gradient-to-br from-slate-300 to-slate-400"></span>
                                )}
                              </div>
                              <span className="block text-[10px] font-bold text-slate-700">{p.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">El degradado de fondo y los íconos se mantienen neutros; la paleta recolorea textos, botones, bordes y tarjetas.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Tipo de Apertura</h4>
                      <SelectorTipoApertura
                        tema={temaActual}
                        valorActual={datos.personalizacion?.tipoApertura || tipoAperturaPorDefectoDelTema(temaActual.id)}
                        onSelect={(id) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), tipoApertura: id } }))}
                        colorAcento="indigo"
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Diseño del Itinerario</h4>
                      <SelectorEstiloItinerario
                        tema={temaActual}
                        valorActual={datos.personalizacion?.estiloItinerario || "clasica"}
                        onSelect={(id) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), estiloItinerario: id } }))}
                        colorAcento="indigo"
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Diseño de la Portada</h4>
                      <SelectorEstiloPortada
                        tema={temaActual}
                        valorActual={datos.personalizacion?.estiloPortada || estiloPortadaPorDefectoDelTema(temaActual.id)}
                        onSelect={(id) => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), estiloPortada: id } }))}
                        colorAcento="indigo"
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-2">Animación de la Lluvia Decorativa</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {PALETAS_ANIMACION.map(a => {
                          const actual = datos.personalizacion?.simbolosCaida;
                          const isSelected = actual ? actual.join(",") === a.simbolos.join(",") : a.id === "elegante";
                          return (
                            <button
                              key={a.id}
                              onClick={() => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), simbolosCaida: a.simbolos } }))}
                              className={`text-left p-2.5 rounded-xl border-2 transition cursor-pointer ${isSelected ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
                            >
                              <span className="block text-base mb-1">{a.simbolos.join(" ")}</span>
                              <span className="block text-[10px] font-bold text-slate-700">{a.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">Solo se ve si "Efecto de Animación de Caída" está en ON (pestaña Tema/Paquete).</p>
                    </div>
                    </>
                  );
                })()}
              </div>
            )}

          </div>

          {/* PIE DE PANEL INFORMAL */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <span className="text-[10px] text-slate-500 font-sans font-medium">Generador de Invitaciones de XV Años</span>
            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Acceso Privado</span>
          </div>

        </aside>

        {/* PANEL DERECHO: VISTA PREVIA MULTIDISPOSITIVO -- en celular/tablet (<1024px) se apila
            debajo del panel izquierdo y necesita una altura propia (antes dependía de `flex-1`
            dentro de un contenedor acotado que solo existía en escritorio -- en móvil, sin esa
            altura fija, colapsaba a 0 y quedaba invisible, ver nota del contenedor raíz arriba);
            `h-[75vh]` le da suficiente alto para usar el simulador sin tener que scrollear
            demasiado. En escritorio (lg+) sigue igual que antes (`h-full`, llena el panel fijo). */}
        <section className="flex-1 bg-slate-100 flex flex-col relative overflow-hidden h-[75vh] lg:h-full">
          
          {/* BARRA DE HERRAMIENTAS DE MONITOR DE DISEÑO */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-xs z-20">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Monitor de Invitación</span>
            </div>
            
            {/* SELECTOR DE MOCKUPS */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => { setPreviewDevice("mobile"); setPreviewZoom(0.85); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${previewDevice === "mobile" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                title="Simulador de Smartphone Celular"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Móvil</span>
              </button>
              <button
                type="button"
                onClick={() => { setPreviewDevice("tablet"); setPreviewZoom(0.65); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${previewDevice === "tablet" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                title="Simulador de Tablet / iPad"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${previewDevice === "desktop" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                title="Simulador de Pantalla Completa Escritorio"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Escritorio</span>
              </button>
            </div>

            {/* CONTROLES DE ESCALA ZOOM Y NUEVA PESTAÑA */}
            <div className="flex items-center gap-2">
              {previewDevice !== "desktop" && (
                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold">Ajuste de Zoom:</span>
                  <select
                    value={previewZoom}
                    onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                    className="bg-transparent border-0 text-[11px] font-bold text-slate-700 outline-none cursor-pointer focus:ring-0"
                  >
                    <option value="0.6">60%</option>
                    <option value="0.7">70%</option>
                    <option value="0.75">75%</option>
                    <option value="0.8">80%</option>
                    <option value="0.85">85%</option>
                    <option value="0.9">90%</option>
                    <option value="0.95">95%</option>
                    <option value="1">100%</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleAbrirDemoNuevaPestana}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Prueba en pantalla completa en una nueva pestaña del navegador"
              >
                <span>Nueva Pestaña ↗️</span>
              </button>
            </div>
          </div>

          {/* ÁREA DE CONTENEDOR CENTRAL: MOCKUP RENDERER */}
          <div
            ref={previewScrollRef}
            onMouseDown={iniciarArrastrePreview}
            onMouseMove={moverArrastrePreview}
            onMouseUp={terminarArrastrePreview}
            onMouseLeave={terminarArrastrePreview}
            className={`flex-1 p-6 overflow-auto flex items-start justify-center relative min-h-0 bg-slate-100/50 select-none ${arrastrandoPreview ? "cursor-grabbing" : "cursor-grab"}`}
          >
            {/* Fondo decorativo blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>

            <div
              className="relative transition-all duration-300 ease-out z-10 flex flex-col items-center justify-center shrink-0"
              style={{
                width: previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%",
                height: previewDevice === "mobile" ? "720px" : previewDevice === "tablet" ? "980px" : "100%",
                transform: previewDevice !== "desktop" ? `scale(${previewZoom})` : "none",
                transformOrigin: "top center",
              }}
            >
              
              {previewDevice === "mobile" && (
                /* MARCO DE TELÉFONO CELULAR SMARTPHONE */
                <div className="relative w-full h-full bg-slate-100 rounded-[40px] p-3.5 shadow-2xl border-4 border-slate-300 ring-4 ring-slate-200/50 flex flex-col overflow-hidden">
                  
                  {/* Notch / Bocina */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-slate-200 rounded-b-2xl z-30 flex items-center justify-center gap-1.5 border-b border-x border-slate-300">
                    <div className="w-12 h-1 bg-slate-400 rounded-full"></div>
                    <div className="w-2.5 h-2.5 bg-slate-300 rounded-full border border-slate-400"></div>
                  </div>

                  {/* CONTENEDOR DEL IFRAME DE SIMULACIÓN */}
                  <div className="flex-1 w-full h-full rounded-[26px] overflow-hidden bg-white relative">
                    <iframe 
                      ref={iframeRef}
                      title="Live Smartphone Invitation Simulation"
                      className="w-full h-full border-0 select-none"
                      id="preview-iframe"
                    />
                  </div>

                  {/* Botón Home Virtual del Smartphone */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-400 rounded-full z-20"></div>
                </div>
              )}

              {previewDevice === "tablet" && (
                /* MARCO DE TABLETA ELECTRÓNICA */
                <div className="relative w-full h-full bg-slate-100 rounded-[32px] p-5 shadow-2xl border-4 border-slate-300 ring-4 ring-slate-200/30 flex flex-col overflow-hidden">
                  
                  {/* Cámara Frontal */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-300 rounded-full z-30 border border-slate-400"></div>

                  {/* CONTENEDOR DEL IFRAME DE SIMULACIÓN */}
                  <div className="flex-1 w-full h-full rounded-2xl overflow-hidden bg-white relative">
                    <iframe 
                      ref={iframeRef}
                      title="Live Tablet Invitation Simulation"
                      className="w-full h-full border-0 select-none"
                      id="preview-iframe"
                    />
                  </div>
                </div>
              )}

              {previewDevice === "desktop" && (
                /* CONTENEDOR ESTILO BROWSER WEB DESKTOP DE PC */
                <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
                  
                  {/* Barra superior del navegador ficticio */}
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    </div>
                    <div className="flex-1 max-w-lg bg-slate-200/60 rounded-lg px-3 py-1 flex items-center justify-between text-[11px] font-sans text-slate-500 font-medium">
                      <span className="truncate">https://invitamx.com/xv-años/{datos.nombre?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "quinceanera"}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">🔒 Seguro SSL</span>
                    </div>
                  </div>

                  {/* CONTENEDOR DEL IFRAME DE SIMULACIÓN */}
                  <div className="flex-1 w-full bg-white relative">
                    <iframe 
                      ref={iframeRef}
                      title="Live Desktop Invitation Simulation"
                      className="w-full h-full border-0"
                      id="preview-iframe"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Antes había una barra fija completa aquí (botón "Guardar Diseño en Catálogo de
              este Tema" + estatus + "Restablecer") -- quitada 2026-11-18 ("que no esté dentro
              del monitor para que tenga más espacio"): el botón y su estatus se movieron al
              panel izquierdo, en su propio grupo "Diseño de este tema en catálogo". Solo queda
              este aviso corto, de una línea, para no perder la aclaración sobre
              música/animaciones. */}
          <p className="shrink-0 text-[10px] text-slate-400 font-medium text-center leading-normal px-4 py-1.5 bg-white border-t border-slate-200">
            La simulación representa cómo se verá el archivo final según la pantalla. La música, animaciones de caída {datos.mostrarAnimacionCaida !== false ? '("ON")' : '("OFF")'} y efectos táctiles están incluidos.
          </p>

        </section>

      </div>

      {/* NOTIFICACIÓN TOAST INLINE */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] max-w-sm bg-white border border-slate-150 rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-slideIn animate-duration-300">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            toast.tipo === "success" ? "bg-emerald-50 text-emerald-700" :
            toast.tipo === "error" ? "bg-rose-50 text-rose-600" :
            "bg-blue-50 text-blue-600"
          }`}>
            {toast.tipo === "success" ? (
              <Sparkles className="w-4 h-4 text-emerald-600" />
            ) : toast.tipo === "error" ? (
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-800 leading-normal">{toast.mensaje}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)} 
            className="text-slate-400 hover:text-slate-600 select-none cursor-pointer p-0.5 rounded"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn">
            <h4 className="text-sm font-extrabold text-slate-900 mb-2">{confirmModal.titulo}</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">{confirmModal.mensaje}</p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  confirmModal.onCancelar?.();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onAceptar();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-lg transition cursor-pointer shadow-sm"
              >
                Proceder
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarFondosGuardados && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-scaleIn max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold text-slate-900">📸 Fondos guardados en Cloudinary</h3>
              <button
                onClick={() => setMostrarFondosGuardados(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {cargandoFondos ? (
              <p className="text-sm text-slate-500 py-8 text-center">Cargando fondos guardados desde Supabase...</p>
            ) : Object.keys(datos.bgImages || {}).length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No hay fondos guardados aún. Sube fondos para cada tema.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(datos.bgImages || {}).map(([temaId, url]) => {
                  const tema = temas.find(t => t.id === temaId);
                  return (
                    <div key={temaId} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{tema?.nombre || temaId}</span>
                          <code className="block text-[11px] text-slate-600 font-mono mt-1 break-all line-clamp-2">{url}</code>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            mostrarToast(`Link copiado: ${tema?.nombre}`, "success");
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-semibold rounded-lg transition whitespace-nowrap shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMostrarFondosGuardados(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarDashboardIngresos && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-3xl w-full shadow-2xl animate-scaleIn max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-extrabold text-slate-900">💰 Dashboard de Ingresos</h3>
              <button
                onClick={() => setMostrarDashboardIngresos(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Cobrado histórico (de la tabla de abonos, con fecha real de cada pago), pendiente por cobrar y desglose por paquete — de todos tus clientes guardados, no solo el que tengas abierto en el editor.
            </p>

            {cargandoDashboardIngresos ? (
              <p className="text-sm text-slate-500 py-8 text-center">Cargando ingresos desde Supabase...</p>
            ) : errorCargaInvitaciones ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-red-600 font-semibold">⚠️ No se pudieron cargar tus invitaciones. Revisa tu conexión o vuelve a iniciar sesión.</p>
                <button
                  onClick={cargarListaInvitaciones}
                  disabled={cargandoMisInvitaciones}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cargandoMisInvitaciones ? "animate-spin" : ""}`} /> Reintentar
                </button>
              </div>
            ) : listaInvitaciones.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">Aún no has guardado ninguna invitación. Usa "💾 Guardar en Supabase" para que aparezca aquí.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                    <p className="text-[11px] font-bold text-emerald-700 uppercase">Cobrado histórico</p>
                    <p className="text-xl font-extrabold text-emerald-900">${totalCobradoHistorico.toLocaleString("es-MX")} MXN</p>
                  </div>
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                    <p className="text-[11px] font-bold text-amber-700 uppercase">Pendiente por cobrar</p>
                    <p className="text-xl font-extrabold text-amber-900">${totalPendienteCobrarGlobal.toLocaleString("es-MX")} MXN</p>
                  </div>
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50">
                    <p className="text-[11px] font-bold text-indigo-700 uppercase">Total contratado</p>
                    <p className="text-xl font-extrabold text-indigo-900">${totalContratado.toLocaleString("es-MX")} MXN</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">📅 Histórico mensual (pagos registrados en "Pagos y estatus")</p>
                  {ingresosPorMes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aún no hay abonos registrados.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {ingresosPorMes.map(([mes, monto]) => (
                        <div key={mes} className="flex items-center gap-2">
                          <span className="w-16 text-[11px] font-mono text-slate-500 shrink-0">{mes}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.max((monto / maxIngresoMensual) * 100, 3)}%` }}
                            ></div>
                          </div>
                          <span className="w-24 text-right text-[11px] font-bold text-slate-700 shrink-0">${monto.toLocaleString("es-MX")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">📦 Cobrado por paquete</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(["basico", "premium", "deluxe"] as const).map(p => (
                      <div key={p} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{paquetes[p].nombre}</p>
                        <p className="text-sm font-extrabold text-slate-800">${ingresosPorPaquete[p].toLocaleString("es-MX")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => setMostrarDashboardIngresos(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalLinksPago && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-scaleIn max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-extrabold text-slate-900">💳 Links de pago</h3>
              <button
                onClick={() => setMostrarModalLinksPago(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Pega aquí tus links de pago de Mercado Pago/Clip una sola vez — se guardan en Supabase, así que están disponibles igual en esta PC, la PWA instalada o tu celular. Los botones "Cobrar anticipo"/"Cobrar liquidación" de cada invitación (en "Mis Invitaciones") los usan automáticamente. Puedes dejar cualquiera vacío sin que se rompa nada: el botón que lo necesite avisa que falta configurarlo.
            </p>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-700 block mb-1">Link anticipo Básico</span>
                <input
                  type="text"
                  value={linksPago.anticipoBasico}
                  onChange={(e) => setLinksPago(prev => ({ ...prev, anticipoBasico: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-700 block mb-1">Link anticipo Estándar</span>
                <input
                  type="text"
                  value={linksPago.anticipoEstandar}
                  onChange={(e) => setLinksPago(prev => ({ ...prev, anticipoEstandar: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-700 block mb-1">Link anticipo Premium</span>
                <input
                  type="text"
                  value={linksPago.anticipoPremium}
                  onChange={(e) => setLinksPago(prev => ({ ...prev, anticipoPremium: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-700 block mb-1">Link de monto abierto (liquidaciones y extras)</span>
                <input
                  type="text"
                  value={linksPago.montoAbierto}
                  onChange={(e) => setLinksPago(prev => ({ ...prev, montoAbierto: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setMostrarModalLinksPago(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarLinksPago}
                disabled={guardandoLinksPago}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                {guardandoLinksPago ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarMisInvitaciones && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-[95vw] max-w-6xl shadow-2xl animate-scaleIn max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-extrabold text-slate-900">📋 Mis Invitaciones</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={cargarListaInvitaciones}
                  disabled={cargandoMisInvitaciones}
                  title="Volver a traer la lista desde Supabase (por si otro colaborador guardó algo mientras tenías esto abierto)"
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cargandoMisInvitaciones ? "animate-spin" : ""}`} /> Actualizar
                </button>
                {listaInvitaciones.length > 0 && (
                  <button
                    onClick={handleExportarInvitacionesCSV}
                    title="Descargar la lista visible como CSV (Excel)"
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                  >
                    ⬇️ CSV
                  </button>
                )}
                {listaInvitaciones.length > 0 && (
                  <button
                    onClick={handleRespaldoCompletoInvitaciones}
                    disabled={generandoRespaldoCompleto}
                    title="Descargar un respaldo JSON completo (todos los campos, todas las invitaciones) para reconstruir cualquiera si hace falta"
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🗄️ {generandoRespaldoCompleto ? "Generando..." : "Respaldo completo"}
                  </button>
                )}
                {invitacionesArchivablesPorEventoPasado.length > 0 && (
                  <button
                    onClick={handleArchivarEventosPasados}
                    title={`Archivar de un solo paso las ${invitacionesArchivablesPorEventoPasado.length} invitaciones con evento ya pasado`}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                  >
                    📦 Archivar {invitacionesArchivablesPorEventoPasado.length} pasados
                  </button>
                )}
                <button
                  onClick={() => setMostrarNuevoCliente(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Nuevo Cliente
                </button>
                <button
                  onClick={() => setMostrarMisInvitaciones(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Registra aquí cada cliente desde que vende el paquete: administra pagos, estatus del pedido y complementos á la carte. Ábrelas para seguir editando el diseño, elimínalas cuando ya no las necesites, o marca hasta cuándo debe quedarse activa cada una (solo un recordatorio para ti — no bloquea el link ya compartido).
            </p>

            {listaInvitaciones.length > 0 && (
              <div className="flex gap-1.5 mb-4 flex-wrap border-b border-slate-200 pb-0">
                {([
                  { id: "atencion" as const, label: "🔥 Requieren atención", n: invitacionesUrgentes.length },
                  { id: "activas" as const, label: "Activas", n: invitacionesActivasTab.length },
                  { id: "pasados" as const, label: "Eventos pasados", n: invitacionesPasadasTab.length },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPestanaListaInvitaciones(tab.id)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition -mb-px ${pestanaListaInvitaciones === tab.id ? "border-indigo-600 text-indigo-700 bg-indigo-50/60" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                  >
                    {tab.label} ({tab.n})
                  </button>
                ))}
              </div>
            )}

            {listaInvitaciones.length > 0 && (
              <div className="flex gap-1.5 mb-3 mt-3 flex-wrap">
                {/* Filtro por tipo de evento (2026-11-19) -- se combina con la pestaña de
                    estado de arriba y el buscador de abajo, todo sobre la lista ya cargada.
                    Bautizo/Primera Comunión/Graduación/Baby Shower/Aniversario van agrupados en
                    "Otros" para no llenar esta fila de opciones poco usadas. */}
                {([
                  { id: "todos" as const, label: "Todos", n: listaInvitaciones.length },
                  { id: "xv" as const, label: "🎂 XV", n: conteoPorGrupoEvento.xv },
                  { id: "boda" as const, label: "💍 Bodas", n: conteoPorGrupoEvento.boda },
                  { id: "cumpleanos" as const, label: "🎉 Cumpleaños", n: conteoPorGrupoEvento.cumpleanos },
                  { id: "otros" as const, label: "Otros", n: conteoPorGrupoEvento.otros },
                ]).map(op => (
                  <button
                    key={op.id}
                    onClick={() => setFiltroEventoInvitaciones(op.id)}
                    disabled={op.id !== "todos" && op.n === 0}
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition disabled:opacity-40 disabled:cursor-not-allowed ${filtroEventoInvitaciones === op.id ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {op.label} ({op.n})
                  </button>
                ))}
              </div>
            )}

            {listaInvitaciones.length > 0 && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={busquedaInvitaciones}
                  onChange={(e) => setBusquedaInvitaciones(e.target.value)}
                  placeholder="🔎 Buscar por nombre de la quinceañera, tema o teléfono..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-indigo-500"
                />
                <select
                  value={filtroEstatusInvitaciones}
                  onChange={(e) => setFiltroEstatusInvitaciones(e.target.value)}
                  className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="todos">Todos los estatus</option>
                  {ESTATUS_PEDIDO.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
                {usuarioActual && (
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0">
                    <button
                      onClick={() => setFiltroCreadorInvitaciones("todas")}
                      className={`px-3 py-2 text-xs font-semibold transition ${filtroCreadorInvitaciones === "todas" ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setFiltroCreadorInvitaciones("mias")}
                      className={`px-3 py-2 text-xs font-semibold transition ${filtroCreadorInvitaciones === "mias" ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                    >
                      Mías
                    </button>
                  </div>
                )}
              </div>
            )}

            {cargandoMisInvitaciones ? (
              <p className="text-sm text-slate-500 py-8 text-center">Cargando invitaciones guardadas desde Supabase...</p>
            ) : errorCargaInvitaciones ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-red-600 font-semibold">⚠️ No se pudieron cargar tus invitaciones. Revisa tu conexión o vuelve a iniciar sesión.</p>
                <button
                  onClick={cargarListaInvitaciones}
                  disabled={cargandoMisInvitaciones}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cargandoMisInvitaciones ? "animate-spin" : ""}`} /> Reintentar
                </button>
              </div>
            ) : listaInvitaciones.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">Aún no has guardado ninguna invitación. Usa "💾 Guardar en Supabase" para que aparezca aquí.</p>
            ) : invitacionesFiltradas.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                {busquedaInvitaciones.trim() ? "Ninguna invitación coincide con tu búsqueda." : "Ninguna invitación coincide con estos filtros."}
              </p>
            ) : (
              <div className="space-y-3">
                {invitacionesFiltradas.map((row) => {
                  const tema = temas.find(t => t.id === row.tema_elegido);
                  const vigenciaVencida = !!row.activo_hasta && new Date(row.activo_hasta).getTime() < Date.now();
                  const esLaCargada = row.id === supabaseRowId;
                  const expandida = invitacionFilaExpandidaId === row.id;
                  const estatusLabelFila = ESTATUS_PEDIDO.find(e => e.id === (row.estado || "cotizacion"))?.label || row.estado || "";
                  const faltaFila = (row.precio_total || 0) - (row.precio_pagado || 0);
                  const iconoEventoFila = TIPOS_EVENTO.find(t => t.id === tipoEventoDeFila(row))?.emoji || "🎂";
                  const linkFormularioFila = urlFormularioDatos(row);
                  const linkCheckinFila = urlControlAcceso(row);
                  return (
                    <div key={row.id} className={`border rounded-xl ${esLaCargada ? "border-indigo-400 bg-indigo-50/40" : "border-slate-200 bg-slate-50"}`}>
                      {/* Renglón compacto -- un solo clic expande/colapsa el detalle completo
                          (pedido 2026-11-19: con 200+ invitaciones activas, mostrar cada una como
                          tarjeta grande siempre abierta se vuelve lento e inmanejable). */}
                      <button
                        type="button"
                        onClick={() => setInvitacionFilaExpandidaId(prev => prev === row.id ? null : row.id)}
                        className="w-full flex items-center gap-2 flex-wrap text-left px-4 py-2.5 cursor-pointer"
                      >
                        {expandida ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span className="shrink-0" title={TIPOS_EVENTO.find(t => t.id === tipoEventoDeFila(row))?.label}>{iconoEventoFila}</span>
                        <span className="text-sm font-bold text-slate-900 truncate">{row.nombre_quinceanera || "Sin nombre"}</span>
                        {row.clientes?.folio != null && (
                          // Folio de clienta (2026-11-22, "Folio de clienta en el administrador"):
                          // identifica a la PERSONA (ver tabla `clientes`), no al evento -- visible
                          // de un vistazo en la lista, sin tener que expandir la fila.
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold whitespace-nowrap" title="Folio de clienta">
                            {folioFormateado(row.clientes.folio)}
                          </span>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">{row.fecha_fiesta ? new Date(row.fecha_fiesta + "T00:00:00").toLocaleDateString("es-MX") : "Sin fecha"}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">{paquetes[row.paquete || "basico"].nombre}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">{estatusLabelFila}</span>
                        {faltaFila > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold whitespace-nowrap">Debe ${faltaFila.toLocaleString("es-MX")}</span>
                        )}
                        {esLaCargada && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold uppercase whitespace-nowrap">Abierta ahora</span>
                        )}
                        {row.bloqueada ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase whitespace-nowrap">🔒 Acceso apagado</span>
                        ) : vigenciaVencida ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold uppercase whitespace-nowrap">Vigencia vencida</span>
                        ) : null}
                      </button>

                      {expandida && (
                      <div className="px-4 pb-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap pt-1 border-t border-slate-200/60">
                        <div className="flex-1 min-w-[200px] pt-3">
                          <span className="block text-[11px] text-slate-500">
                            {tema?.nombre || row.tema_elegido || "Sin tema"}
                            {row.telefono_whatsapp?.trim() && <> · 📱 {row.telefono_whatsapp}</>}
                            {row.clientes?.folio != null && <> · 🪪 Clienta {folioFormateado(row.clientes.folio)}</>}
                            {" · "}
                            {row.intake_actualizado_en ? (
                              <span className="text-emerald-600 font-semibold" title={new Date(row.intake_actualizado_en).toLocaleString("es-MX")}>
                                📋 Cliente respondió {new Date(row.intake_actualizado_en).toLocaleDateString("es-MX")}
                              </span>
                            ) : (
                              <span className="text-slate-400">📋 Sin respuesta del cliente</span>
                            )}
                            {row.creado_por && <> · 👤 {row.creado_por}</>}
                          </span>
                          {row.datos_completos === null && (
                            <span className="block text-[10px] text-amber-600 font-semibold mt-1">⚠️ Guardada antes de esta función — solo se puede ver el resumen, no reabrir para editar.</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pt-3">
                          <button
                            onClick={() => handleAbrirInvitacionGuardada(row)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition"
                          >
                            Abrir en editor
                          </button>
                          <button
                            onClick={() => handleAdministrarCliente(row)}
                            title="Abre la ficha de este cliente: pagos/saldo, mensajes predeterminados, confirmaciones y acceso"
                            className="px-3 py-1.5 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold rounded-lg transition"
                          >
                            👤 Administrar cliente
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setInvitacionMenuAbiertoId(prev => prev === row.id ? null : row.id)}
                              title="Más acciones"
                              className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-lg transition"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {invitacionMenuAbiertoId === row.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setInvitacionMenuAbiertoId(null)} />
                                <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-white border border-slate-200 rounded-lg shadow-xl py-1">
                                  <button
                                    onClick={() => { setInvitacionMenuAbiertoId(null); handleDuplicarInvitacionGuardada(row); }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-indigo-500" /> Duplicar como cliente nuevo
                                  </button>
                                  <button
                                    onClick={() => { setInvitacionMenuAbiertoId(null); handleDescargarRespaldoInvitacion(row); }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-500" /> Descargar respaldo (JSON)
                                  </button>
                                  <button
                                    onClick={() => { setInvitacionMenuAbiertoId(null); handleEliminarInvitacionGuardada(row); }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar registro
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* "Otras invitaciones de esta clienta" (2026-11-22, "Folio de clienta"):
                          solo aparece si la clienta (misma `cliente_id`, ligada por teléfono)
                          tiene MÁS de una invitación -- si esta es la única, la sección no se
                          muestra, tal como pide el encargo. Se deriva de `listaInvitaciones`
                          (ya cargada completa) en vez de una consulta aparte. */}
                      {row.cliente_id && (() => {
                        const otras = listaInvitaciones.filter(r => r.cliente_id === row.cliente_id && r.id !== row.id);
                        if (otras.length === 0) return null;
                        return (
                          <div className="pt-2 pb-1 border-t border-slate-200/60 mt-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              🪪 Otras invitaciones de {folioFormateado(row.clientes?.folio)}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {otras.map(otra => (
                                <button
                                  key={otra.id}
                                  onClick={() => handleAbrirInvitacionDesdeHistorial(otra.id)}
                                  className="px-2.5 py-1 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-lg text-[10px] text-slate-600 hover:text-violet-700 font-semibold transition"
                                  title={`Estatus: ${ESTATUS_PEDIDO.find(e => e.id === (otra.estado || "cotizacion"))?.label || otra.estado || ""}`}
                                >
                                  {otra.nombre_quinceanera || "Sin nombre"} · {otra.link_invitacion?.split("/v/")[1]?.split("/")[0] || "sin código"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Links de la clienta (pedido 2026-11-19, con WhatsApp agregado
                          2026-11-22): para reenviar en segundos el link que ya se le mandó
                          antes, sin tener que reconstruirlo a mano ni abrir la invitación en el
                          editor -- el caso de uso es "la clienta perdió su link", buscándola por
                          nombre en el buscador de arriba. Cada link lleva sus tres acciones:
                          Copiar / Abrir (revisarlo antes de mandarlo) / WhatsApp (abre el chat
                          de la clienta con el mensaje y el link ya listos -- nunca lo manda
                          solo). "Invitación" ya es el link CORTO (/v/<codigoCorto>, ver
                          guardarEnSupabase) -- si esta fila todavía no tiene código (vieja, de
                          antes de ese cambio), cada botón lo genera y lo guarda en el momento. */}
                      <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">🔗 Links de la clienta</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-600 w-24 shrink-0">Invitación</span>
                          {row.link_invitacion ? (
                            <>
                              <span className="flex-1 min-w-0 text-[10px] text-slate-500 truncate font-mono">{row.link_invitacion}</span>
                              <button onClick={() => handleCopiarLinkInvitacionFila(row)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Copiar</button>
                              <button onClick={() => handleAbrirLinkInvitacionFila(row)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Abrir</button>
                              <button onClick={() => handleEnviarWhatsAppLinkInvitacionFila(row)} className="shrink-0 px-2 py-1 bg-[#25D366] hover:bg-[#20ba56] text-white rounded text-[10px] font-bold transition">WhatsApp</button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 min-w-0 text-[10px] text-slate-400">Todavía no tiene link corto.</span>
                              <button onClick={() => handleCopiarLinkInvitacionFila(row)} className="shrink-0 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition">Generar y copiar</button>
                              <button onClick={() => handleAbrirLinkInvitacionFila(row)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Generar y abrir</button>
                              <button onClick={() => handleEnviarWhatsAppLinkInvitacionFila(row)} className="shrink-0 px-2 py-1 bg-[#25D366] hover:bg-[#20ba56] text-white rounded text-[10px] font-bold transition">Generar y enviar</button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap pl-[6.5rem]">
                          <button onClick={() => handleCopiarLinkClasicoFila(row)} className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline">Copiar link clásico (el de siempre)</button>
                          <button onClick={() => handleAbrirLinkClasicoFila(row)} className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline">Abrir</button>
                          <button onClick={() => handleEnviarWhatsAppLinkClasicoFila(row)} className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline">WhatsApp</button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-600 w-24 shrink-0">Revisión</span>
                          <span className="flex-1 min-w-0 text-[10px] text-slate-400">Link temporal ({REVISION_DIAS_VIGENCIA} días), sin marca de agua -- para que revise antes de liquidar.</span>
                          <button onClick={() => handleCopiarLinkRevisionFila(row)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Generar y copiar</button>
                          <button onClick={() => handleAbrirLinkRevisionFila(row)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Generar y abrir</button>
                          <button onClick={() => handleEnviarRevisionWhatsApp(row)} className="shrink-0 px-2 py-1 bg-[#25D366] hover:bg-[#20ba56] text-white rounded text-[10px] font-bold transition">Enviar a revisión</button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-600 w-24 shrink-0">Formulario</span>
                          <span className="flex-1 min-w-0 text-[10px] text-slate-500 truncate font-mono">{linkFormularioFila}</span>
                          <button onClick={() => copiarLinkClienta(linkFormularioFila)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Copiar</button>
                          <button onClick={() => abrirLinkClienta(linkFormularioFila)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Abrir</button>
                          <button onClick={() => handleEnviarFormularioDatos(row)} className="shrink-0 px-2 py-1 bg-[#25D366] hover:bg-[#20ba56] text-white rounded text-[10px] font-bold transition">WhatsApp</button>
                        </div>
                        <p className="text-[9px] text-slate-400 pl-24">El cliente llena fecha, ceremonia/recepción, itinerario, padrinos y sube sus fotos directamente — se guarda solo en esta invitación.</p>
                        {row.checkin_pagado && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-slate-600 w-24 shrink-0">Control de acceso</span>
                            <span className="flex-1 min-w-0 text-[10px] text-slate-500 truncate font-mono">{linkCheckinFila}</span>
                            <button onClick={() => copiarLinkClienta(linkCheckinFila)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Copiar</button>
                            <button onClick={() => abrirLinkClienta(linkCheckinFila)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Abrir</button>
                            <button onClick={() => handleEnviarWhatsAppLinkCheckinCliente(row)} title="Manda este link al WhatsApp de LA CLIENTA -- para avisar a quien lo controle, usa el campo de teléfono de la pestaña 'Pagos'" className="shrink-0 px-2 py-1 bg-[#25D366] hover:bg-[#20ba56] text-white rounded text-[10px] font-bold transition">WhatsApp</button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-600 w-24 shrink-0">Vista previa</span>
                          {row.datos_completos ? (
                            <>
                              <span className="flex-1 min-w-0 text-[10px] text-slate-500 truncate font-mono">{getShareUrlDesdeFila(row) || "—"}</span>
                              <button onClick={() => handleCopiarLinkMuestraFila(row)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Copiar</button>
                              <button onClick={() => handleAbrirLinkMuestraFila(row)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Abrir</button>
                              <button onClick={() => handleEnviarPreviewWhatsApp(row)} className="shrink-0 px-2 py-1 bg-[#25D366] hover:bg-[#20ba56] text-white rounded text-[10px] font-bold transition">WhatsApp</button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 min-w-0 text-[10px] text-slate-400">Toca para generar la vista previa.</span>
                              <button onClick={() => handleCopiarLinkMuestraFila(row)} className="shrink-0 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition">Generar y copiar</button>
                              <button onClick={() => handleAbrirLinkMuestraFila(row)} className="shrink-0 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-bold transition">Generar y abrir</button>
                              <button onClick={() => handleEnviarPreviewWhatsApp(row)} className="shrink-0 px-2 py-1 bg-[#25D366] hover:bg-[#20ba56] text-white rounded text-[10px] font-bold transition">Generar y enviar</button>
                            </>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 pl-24">Link temporal con marca de agua, válido {MUESTRA_DIAS_VIGENCIA} días -- para que la clienta vea un avance sin entregarle todavía el link final.</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                        {([
                          { id: "pagos" as const, label: "💳 Pagos" },
                          { id: "mensajes" as const, label: "💬 Mensajes" },
                          { id: "confirmaciones" as const, label: `👥 Confirmaciones${confirmacionesPorInvitacion[row.id] ? ` · ${confirmacionesPorInvitacion[row.id].length}` : ""}` },
                          { id: "acceso" as const, label: row.bloqueada ? "🔒 Acceso (apagado)" : "🔒 Vigencia y acceso" },
                        ]).map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => abrirPestanaCliente(row, tab.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${pestanaClienteDe(row) === tab.id ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {invitacionAccesoExpandidaId === row.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Activa hasta (recordatorio para ti — no bloquea el link por sí solo)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                defaultValue={row.activo_hasta ? row.activo_hasta.substring(0, 10) : ""}
                                onBlur={(e) => handleActualizarVigenciaInvitacion(row, e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                              />
                              {row.activo_hasta && (
                                <button
                                  onClick={() => handleActualizarVigenciaInvitacion(row, "")}
                                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                                >
                                  Quitar fecha
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Acceso del invitado/cliente (esto sí bloquea de verdad el link)</label>
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={motivoBloqueoSeleccionado[row.id] ?? row.motivo_bloqueo ?? "evento_pasado"}
                                onChange={(e) => {
                                  setMotivoBloqueoSeleccionado(prev => ({ ...prev, [row.id]: e.target.value }));
                                  if (row.bloqueada) handleActualizarBloqueoInvitacion(row, true, e.target.value);
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 outline-none focus:border-indigo-500"
                              >
                                {Object.entries(MOTIVOS_BLOQUEO).map(([id, label]) => (
                                  <option key={id} value={id}>{label}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleActualizarBloqueoInvitacion(row, !row.bloqueada, motivoBloqueoSeleccionado[row.id] ?? row.motivo_bloqueo ?? "evento_pasado")}
                                className={`text-[10px] font-bold rounded-lg px-2 py-1 transition ${row.bloqueada ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                              >
                                {row.bloqueada ? "🔓 Encender acceso" : "🔒 Apagar acceso"}
                              </button>
                            </div>
                          </div>
                          {(() => {
                            const saldoPendienteAcceso = calcularSaldoPendiente(row.precio_total, row.precio_pagado);
                            return (
                              <div className="pt-3 border-t border-slate-200/60">
                                <label className="text-[10px] font-bold text-slate-600 block mb-1">⏸️ Pausa por falta de pago (independiente del acceso de arriba -- es la regla "revisión primero, entrega final al liquidar")</label>
                                {saldoPendienteAcceso > 0 && (
                                  <p className="text-[11px] font-bold text-amber-700 mb-1.5">Saldo pendiente: ${saldoPendienteAcceso.toLocaleString("es-MX")} MXN</p>
                                )}
                                {row.pausada ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] text-slate-500">
                                      Pausada{row.pausada_en ? ` el ${new Date(row.pausada_en).toLocaleDateString("es-MX")}` : ""}{row.motivo_pausa ? ` -- ${row.motivo_pausa}` : ""}
                                    </span>
                                    <button
                                      onClick={() => handleActualizarPausaInvitacion(row, false, "")}
                                      className="text-[10px] font-bold rounded-lg px-2 py-1 transition bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    >
                                      ▶️ Reactivar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <input
                                      type="text"
                                      placeholder="Motivo (ej. 'Falta de pago del saldo')"
                                      value={motivoPausaSeleccionado[row.id] ?? ""}
                                      onChange={(e) => setMotivoPausaSeleccionado(prev => ({ ...prev, [row.id]: e.target.value }))}
                                      className="flex-1 min-w-[10rem] px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                                    />
                                    <button
                                      onClick={() => handleActualizarPausaInvitacion(row, true, motivoPausaSeleccionado[row.id] ?? "")}
                                      className="text-[10px] font-bold rounded-lg px-2 py-1 transition bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    >
                                      ⏸️ Pausar invitación
                                    </button>
                                  </div>
                                )}
                                <p className="text-[9px] text-slate-400 mt-1">Pausada: todas las rutas públicas (invitación, pases por familia, control de acceso, formulario) muestran solo "Esta invitación está en pausa", sin ningún dato.</p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {invitacionPagosExpandidaId === row.id && (() => {
                        const precioSugerido = paquetes[(row.paquete || "basico")].precio.replace(/[^0-9.]/g, "");
                        const falta = (row.precio_total || 0) - (row.precio_pagado || 0);
                        const avisosPendientes = avisosPagoPorInvitacion[row.id] || [];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
                            {avisosPendientes.length > 0 && (
                              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
                                <p className="text-[11px] font-bold text-amber-800">🔔 {avisosPendientes.length} aviso(s) de pago del cliente sin revisar:</p>
                                {avisosPendientes.map(aviso => (
                                  <div key={aviso.id} className="bg-white border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                                    {aviso.comprobante_url && (
                                      <img src={aviso.comprobante_url} alt="Comprobante" className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                                    )}
                                    <div className="flex-1 min-w-0 text-[11px]">
                                      {aviso.monto ? (
                                        <p className="font-bold text-slate-800">${aviso.monto.toLocaleString("es-MX")} MXN</p>
                                      ) : (
                                        <input
                                          type="number"
                                          placeholder="El cliente no puso el monto -- escríbelo aquí"
                                          value={montoAvisoManual[aviso.id] || ""}
                                          onChange={(e) => setMontoAvisoManual(prev => ({ ...prev, [aviso.id]: e.target.value }))}
                                          className="w-full px-1.5 py-1 bg-amber-50 border border-amber-300 rounded text-[11px] outline-none focus:border-amber-500 mb-1"
                                        />
                                      )}
                                      {aviso.nota && <p className="text-slate-500 truncate">{aviso.nota}</p>}
                                      <p className="text-slate-400">{new Date(aviso.creado_en).toLocaleDateString("es-MX")}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                      <button onClick={() => handleAprobarAvisoPago(row, aviso, montoAvisoManual[aviso.id])} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition">✅ Registrar</button>
                                      <button onClick={() => handleDescartarAvisoPago(row, aviso)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg transition">Descartar</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <label className="text-[10px] font-bold text-slate-600 shrink-0">Estatus:</label>
                              <select
                                value={row.estado || "cotizacion"}
                                onChange={(e) => handleActualizarCampoInvitacion(row, "estado", e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                              >
                                {ESTATUS_PEDIDO.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <label className="text-[10px] font-bold text-slate-600 shrink-0">Paquete:</label>
                              <select
                                value={row.paquete || "basico"}
                                onChange={(e) => handleCambiarPaqueteInvitacion(row, e.target.value as "basico" | "premium" | "deluxe")}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                              >
                                {(Object.keys(paquetes) as Array<"basico" | "premium" | "deluxe">).map(k => (
                                  <option key={k} value={k}>{paquetes[k].nombre} ({paquetes[k].precio})</option>
                                ))}
                              </select>
                              <span className="text-[9px] text-slate-400">El formulario de abajo se arma según este paquete -- no se pierde nada ya capturado.</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-1">Precio total ($ MXN)</label>
                                <input
                                  // `key` (2026-11-22, mismo patrón ya usado en "Pagado hasta ahora" de al
                                  // lado): antes de los complementos, precio_total solo cambiaba por lo
                                  // que el admin tecleaba AQUÍ MISMO -- ahora también cambia desde afuera
                                  // (agregar/quitar un complemento), y sin este `key` el input, al ser
                                  // `defaultValue` (no controlado), se quedaba mostrando el número viejo
                                  // hasta que algo más forzara un remount.
                                  key={row.precio_total ?? "vacio"}
                                  type="number"
                                  defaultValue={row.precio_total ?? ""}
                                  placeholder={precioSugerido}
                                  onBlur={(e) => handleActualizarCampoInvitacion(row, "precio_total", e.target.value ? Number(e.target.value) : null)}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-1">Pagado hasta ahora ($ MXN)</label>
                                <input
                                  key={row.precio_pagado ?? "vacio"}
                                  type="number"
                                  defaultValue={row.precio_pagado ?? ""}
                                  onBlur={(e) => handleActualizarCampoInvitacion(row, "precio_pagado", e.target.value ? Number(e.target.value) : null)}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                            {!!row.precio_total && (
                              <p className={`text-[11px] font-bold ${falta > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                                {falta > 0 ? `Falta pagar: $${falta.toLocaleString("es-MX")} MXN` : "✅ Pagado por completo"}
                              </p>
                            )}

                            {/* "Enviar link de pago por WhatsApp" (2026-11-22, pedido explícito: el
                                admin no encontraba dónde se manda el link ni podía saber cuál iba a
                                salir antes de enviarlo) -- bloque con encabezado propio + un renglón
                                de vista previa ENCIMA de cada botón, calculado con el MISMO selector
                                que usan los handlers (resolverLinkAnticipo/calcularAnticipo/
                                linksPago.montoAbierto) -- nunca un cálculo aparte que pudiera
                                desalinearse del mensaje real que manda el botón. Los handlers, el
                                selector de links y los mensajes de WhatsApp NO se tocan -- esto es
                                solo presentación. */}
                            <div className="pt-2 border-t border-slate-200/60">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">✉️ Enviar link de pago por WhatsApp</p>
                              {(() => {
                                const anticipo = calcularAnticipo(row.precio_total);
                                const anticipoCobrado = !!row.precio_total && (row.precio_pagado || 0) >= anticipo;
                                const { link: linkAnticipo, esLinkAbierto: anticipoEsAbierto } = resolverLinkAnticipo(row, linksPago);
                                const faltaLinkAnticipo = !linkAnticipo?.trim();
                                const nombrePlanPreview = row.paquete ? paquetes[row.paquete].nombre : "tu plan";
                                const faltaLinkLiquidacion = !linksPago.montoAbierto?.trim();
                                const telefonoPreview = row.telefono_whatsapp?.trim() || "— sin teléfono guardado";
                                // Pedido explícito v4 (punto 4): si ya no hay nada que cobrar, decirlo
                                // en una línea en vez de dejar los dos botones apagados sin contexto.
                                const yaPagadaPorCompleto = !!row.precio_total && anticipoCobrado && falta <= 0;
                                return (
                                  <>
                                    <div className="space-y-1 mb-2">
                                      {yaPagadaPorCompleto ? (
                                        <p className="text-[10px] font-bold text-emerald-700">✅ Esta invitación ya está pagada por completo — no hay link por enviar.</p>
                                      ) : (
                                        <>
                                          {!!row.precio_total && !anticipoCobrado && (
                                            faltaLinkAnticipo ? (
                                              <p className="text-[10px] font-bold text-rose-600">⚠️ Falta configurar el link de {anticipoEsAbierto ? "monto abierto" : `anticipo ${nombrePlanPreview}`} en "💳 Links de pago".</p>
                                            ) : (
                                              <p className="text-[10px] text-slate-500">
                                                {anticipoEsAbierto
                                                  ? `Se enviará el link de monto abierto por $${anticipo.toLocaleString("es-MX")} — su total trae complementos — a ${telefonoPreview}.`
                                                  : `Se enviará el link de anticipo del paquete ${nombrePlanPreview} ($${anticipo.toLocaleString("es-MX")}) a ${telefonoPreview}.`}
                                              </p>
                                            )
                                          )}
                                          {falta > 0 && (
                                            faltaLinkLiquidacion ? (
                                              <p className="text-[10px] font-bold text-rose-600">⚠️ Falta configurar el link de monto abierto en "💳 Links de pago".</p>
                                            ) : (
                                              <p className="text-[10px] text-slate-500">Se enviará el link de monto abierto por ${falta.toLocaleString("es-MX")} a {telefonoPreview}.</p>
                                            )
                                          )}
                                        </>
                                      )}
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                      <button
                                        onClick={() => handleCobrarAnticipo(row)}
                                        disabled={!row.precio_total || anticipoCobrado || faltaLinkAnticipo}
                                        title={!row.precio_total ? "Agrega el precio total primero" : anticipoCobrado ? "El anticipo ya quedó cubierto" : faltaLinkAnticipo ? "Falta configurar ese link en \"💳 Links de pago\"" : `Abre WhatsApp con el link de pago del anticipo ($${anticipo.toLocaleString("es-MX")} MXN)`}
                                        className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba56] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition"
                                      >
                                        {anticipoCobrado ? "Anticipo cobrado" : "💬 Cobrar anticipo"}
                                      </button>
                                      <button
                                        onClick={() => handleCobrarLiquidacion(row)}
                                        disabled={falta <= 0 || faltaLinkLiquidacion}
                                        title={falta <= 0 ? "Esta invitación ya está liquidada" : faltaLinkLiquidacion ? "Falta configurar ese link en \"💳 Links de pago\"" : `Abre WhatsApp con el link de pago del saldo ($${falta.toLocaleString("es-MX")} MXN)`}
                                        className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba56] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition"
                                      >
                                        {falta <= 0 ? "Liquidada" : "💬 Cobrar liquidación"}
                                      </button>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            {/* "Links de pago -- envío manual (tú eliges)" (2026-11-22 v4, punto 6
                                del encargo: "agrégame ahí los links de Mercado Pago y yo decida cuál
                                enviarle") -- a diferencia del bloque automático de arriba (que elige
                                solo), aquí se listan los 4 links de la configuración global tal cual,
                                con su URL visible, y el admin decide cuál mandar. Nunca marca pagos ni
                                abonos -- solo abre WhatsApp, igual que los botones automáticos. */}
                            <div className="pt-2 border-t border-slate-200/60">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">📋 Links de pago — envío manual (tú eliges)</p>
                              <div className="space-y-1">
                                {LISTA_LINKS_MANUAL.map(item => {
                                  const link = linksPago[item.key];
                                  const faltaLink = !link?.trim();
                                  return (
                                    <div key={item.key} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-semibold text-slate-700 truncate">{item.etiqueta}</p>
                                        <p className={`text-[10px] truncate ${faltaLink ? "text-rose-600 font-bold" : "text-slate-400"}`}>{faltaLink ? "No configurado" : link}</p>
                                      </div>
                                      <button
                                        onClick={() => handleEnviarLinkManual(row, item.key)}
                                        disabled={faltaLink}
                                        title={faltaLink ? "Configura este link en \"💳 Links de pago\"" : `Abre WhatsApp con este link puesto`}
                                        className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba56] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition shrink-0"
                                      >
                                        💬 Enviar por WhatsApp
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* "Complementos" en UN SOLO bloque (2026-11-22 v4, punto 7 del encargo)
                                -- reúne lo agregado (igual que antes), lo incluido sin costo / lo
                                bloqueado por falta de un requisito / lo marcado como pagado desde
                                antes de este catálogo (filasExtraCatalogoComplementos, arriba, SIN
                                tocar la decisión real de precio/disponibilidad), Y el catálogo
                                completo de lo que todavía se puede agregar (catalogoComplementosDisponibles,
                                SIN tocar) -- cada renglón con su precio a la vista, como pidió el
                                encargo, en vez del picker de un solo complemento a la vez de antes.
                                Las 3 casillas sueltas "Á la carte ... pagado" que vivían al final de
                                esta pestaña YA NO existen como elementos aparte -- su mismo dato
                                (pases_pagado/pdf_pagado/checkin_pagado) se administra desde aquí. */}
                            {(() => {
                              const complementosLista = row.complementos || [];
                              const catalogoDisponible = catalogoComplementosDisponibles(row);
                              const filasExtra = filasExtraCatalogoComplementos(row);
                              const paqueteKey = row.paquete || "basico";
                              const basePaquete = PRECIO_BASE_PAQUETE[paqueteKey];
                              const sumaComplementos = complementosLista.reduce((acc, c) => acc + c.precio * c.cantidad, 0);
                              const totalOperacion = basePaquete + sumaComplementos;
                              return (
                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                  <p className="text-[10px] font-bold text-slate-600">🧩 Complementos</p>
                                  {complementosLista.length === 0 && filasExtra.length === 0 ? (
                                    <p className="text-[11px] text-slate-400">Sin complementos agregados todavía.</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {complementosLista.map((c, i) => (
                                        <div key={`agregado-${i}`} className="flex items-center justify-between gap-2 text-[11px] bg-white border border-slate-200 rounded px-2 py-1">
                                          <span className="font-semibold text-slate-700 truncate">{c.nombre} <span className="text-slate-400 font-normal">· {new Date(c.fecha).toLocaleDateString("es-MX")}</span></span>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-bold text-emerald-700">${(c.precio * c.cantidad).toLocaleString("es-MX")}</span>
                                            <button onClick={() => handleQuitarComplemento(row, i)} className="text-rose-500 hover:text-rose-700 font-bold">Quitar</button>
                                          </div>
                                        </div>
                                      ))}
                                      {filasExtra.map(f => (
                                        <div key={`extra-${f.tipo}-${f.clave}`} className="flex items-center justify-between gap-2 text-[11px] bg-white border border-slate-200 rounded px-2 py-1">
                                          <span className="font-semibold text-slate-700 truncate">{f.nombre}</span>
                                          {f.tipo === "incluido" && <span className="text-[10px] font-bold text-emerald-700 shrink-0">Incluido</span>}
                                          {f.tipo === "bloqueado" && <span className="text-[10px] text-slate-400 shrink-0">{f.detalle}</span>}
                                          {f.tipo === "legacy" && (
                                            <div className="flex items-center gap-2 shrink-0">
                                              <span className="text-[10px] text-amber-700">Marcado como pagado</span>
                                              <button
                                                onClick={() => handleActualizarCampoInvitacion(
                                                  row,
                                                  f.clave === "pases" ? "pases_pagado" : f.clave === "pdf" ? "pdf_pagado" : "checkin_pagado",
                                                  false
                                                )}
                                                className="text-rose-500 hover:text-rose-700 font-bold"
                                              >
                                                Quitar marca
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {catalogoDisponible.length > 0 && (
                                    <div className="space-y-1 pt-1 border-t border-slate-200/60">
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Catálogo disponible</p>
                                      {catalogoDisponible.map(item => {
                                        const esCantidad = item.clave === "familia-extra" || item.clave === "ajustes-extra";
                                        const llaveCantidad = `${row.id}:${item.clave}`;
                                        const cantidadActual = cantidadComplemento[llaveCantidad] || 1;
                                        return (
                                          <div key={item.clave} className="flex items-center justify-between gap-2 text-[11px] bg-white border border-slate-200 rounded px-2 py-1">
                                            <span className="font-semibold text-slate-700 truncate">{item.nombre} <span className="text-slate-400 font-normal">· +${item.precio.toLocaleString("es-MX")}{esCantidad ? " c/u" : ""}</span></span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              {esCantidad && (
                                                <input
                                                  type="number"
                                                  min={1}
                                                  value={cantidadActual}
                                                  onChange={(e) => setCantidadComplemento(prev => ({ ...prev, [llaveCantidad]: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                                                  className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                                                />
                                              )}
                                              <button
                                                onClick={async () => {
                                                  await handleAgregarComplemento(row, item, esCantidad ? cantidadActual : 1);
                                                  if (esCantidad) setCantidadComplemento(prev => ({ ...prev, [llaveCantidad]: 1 }));
                                                }}
                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition whitespace-nowrap"
                                              >
                                                + Agregar
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <p className="text-[11px] font-bold text-slate-700 pt-1 border-t border-slate-200/60">
                                    Paquete {paquetes[paqueteKey].nombre}: ${basePaquete.toLocaleString("es-MX")} + Complementos: ${sumaComplementos.toLocaleString("es-MX")} = Precio total: ${totalOperacion.toLocaleString("es-MX")}
                                  </p>
                                </div>
                              );
                            })()}

                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                              <p className="text-[10px] font-bold text-slate-600">💵 Registrar abono (queda en el historial, además de sumarse a "Pagado hasta ahora")</p>
                              <div className="flex gap-1.5">
                                <input
                                  type="number"
                                  placeholder="Monto"
                                  value={montoNuevoAbono[row.id] || ""}
                                  onChange={(e) => setMontoNuevoAbono(prev => ({ ...prev, [row.id]: e.target.value }))}
                                  className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                                />
                                <input
                                  type="text"
                                  placeholder="Nota (opcional, ej. 'Anticipo')"
                                  value={notaNuevoAbono[row.id] || ""}
                                  onChange={(e) => setNotaNuevoAbono(prev => ({ ...prev, [row.id]: e.target.value }))}
                                  className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500"
                                />
                                <button
                                  onClick={async () => {
                                    const monto = Number(montoNuevoAbono[row.id]);
                                    await handleRegistrarAbono(row, monto, notaNuevoAbono[row.id] || "");
                                    setMontoNuevoAbono(prev => ({ ...prev, [row.id]: "" }));
                                    setNotaNuevoAbono(prev => ({ ...prev, [row.id]: "" }));
                                  }}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition whitespace-nowrap"
                                >
                                  + Agregar
                                </button>
                              </div>
                              <button
                                onClick={() => toggleHistorialAbonos(row)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                {historialAbonosExpandidoId === row.id ? "Ocultar historial" : "Ver historial de abonos"}
                              </button>
                              {historialAbonosExpandidoId === row.id && (
                                cargandoAbonos && !abonosPorInvitacion[row.id] ? (
                                  <p className="text-[10px] text-slate-500">Cargando...</p>
                                ) : !abonosPorInvitacion[row.id] || abonosPorInvitacion[row.id].length === 0 ? (
                                  <p className="text-[10px] text-slate-500">Aún no hay abonos registrados.</p>
                                ) : (
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {abonosPorInvitacion[row.id].map(a => (
                                      <div key={a.id} className="flex items-center justify-between text-[10px] bg-white border border-slate-200 rounded px-2 py-1">
                                        <span className="text-slate-500">{new Date(a.creado_en).toLocaleDateString("es-MX")}{a.nota ? ` · ${a.nota}` : ""}</span>
                                        <span className="font-bold text-emerald-700">${a.monto.toLocaleString("es-MX")}</span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              )}
                            </div>

                            {/* El link de control de acceso (Copiar/Abrir/WhatsApp a la clienta) ya
                                está en el bloque "🔗 Links de la clienta" de arriba (2026-11-22,
                                quitado de aquí para no duplicar la misma acción en dos lugares) --
                                este cuadro se queda SOLO con lo que es único de aquí: el teléfono
                                del ENCARGADO de controlar la puerta (normalmente no es la clienta)
                                y el envío directo a ese número. */}
                            {row.checkin_pagado && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-1">Control de Acceso QR — avisar al encargado de la puerta</label>
                                {!row.datos_completos?.controlAccesoQR ? (
                                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                                    ⚠️ Activa el toggle "Control de Acceso QR" dentro del editor de esta invitación (requiere que "pases" esté activo) para que el QR aparezca en los pases de los invitados.
                                  </p>
                                ) : (
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Tel. del encargado de acceso (52...)"
                                      value={telefonoCheckinPorInvitacion[row.id] || ""}
                                      onChange={(e) => setTelefonoCheckinPorInvitacion(prev => ({ ...prev, [row.id]: e.target.value }))}
                                      className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500 font-mono"
                                    />
                                    <button
                                      onClick={() => handleEnviarLinkCheckin(row)}
                                      className="px-2.5 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-lg text-[10px] font-bold transition whitespace-nowrap"
                                    >
                                      Enviar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block mb-1">Notas</label>
                              <textarea
                                defaultValue={row.notas || ""}
                                onBlur={(e) => handleActualizarCampoInvitacion(row, "notas", e.target.value || null)}
                                placeholder="Qué pidió, ajustes pendientes, seguimiento..."
                                rows={2}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500 resize-none"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {invitacionMensajesExpandidaId === row.id && (() => {
                        const falta = (row.precio_total || 0) - (row.precio_pagado || 0);
                        const disponibles = MENSAJES_PREDETERMINADOS
                          .map(m => ({ ...m, texto: m.construir(row, falta) }))
                          .filter(m => m.texto !== null) as { id: string; nombre: string; texto: string }[];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                            <p className="text-[10px] text-slate-400">Abre WhatsApp con el número guardado de este cliente y el texto ya listo -- tú le das "Enviar". El link de la vista previa/muestra ya está en "🔗 Links de la clienta" de arriba (fila "Vista previa").</p>
                            {disponibles.map(m => (
                              <div key={m.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                <p className="text-[11px] font-bold text-slate-700 mb-1">{m.nombre}</p>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-2 line-clamp-3">{m.texto.replace(/\*/g, "")}</p>
                                <button
                                  onClick={() => handleEnviarMensajePredefinido(row, m.texto)}
                                  className="px-2.5 py-1 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-lg text-[10px] font-bold transition"
                                >
                                  Abrir en WhatsApp
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {invitacionExpandidaId === row.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60">
                          <p className="text-[11px] font-bold text-slate-500 mb-2">
                            📊 Aperturas: {aperturasPorInvitacion[row.id] === undefined ? "…" : aperturasPorInvitacion[row.id] === null ? "—" : aperturasPorInvitacion[row.id]}
                          </p>
                          {cargandoConfirmaciones && !confirmacionesPorInvitacion[row.id] ? (
                            <p className="text-[11px] text-slate-500">Cargando confirmaciones...</p>
                          ) : (() => {
                            const confs = confirmacionesPorInvitacion[row.id] || [];
                            const invitadosAsignados = row.datos_completos?.invitados || [];
                            const sinConfirmar = invitadosAsignados.filter(inv =>
                              !confs.some(c => c.nombre_invitado.trim().toLowerCase() === inv.nombre.trim().toLowerCase())
                            );
                            if (confs.length === 0 && sinConfirmar.length === 0) {
                              return <p className="text-[11px] text-slate-500">Nadie ha confirmado todavía desde el formulario de RSVP de esta invitación.</p>;
                            }
                            const siCount = confs.filter(c => c.asistencia === "si");
                            const totalPersonas = siCount.reduce((acc, c) => acc + (c.num_personas || 1), 0);
                            const tipoEventoFila = row.datos_completos?.tipoEvento;
                            const fraseConfirmacionFila = TEXTOS_POR_EVENTO[(tipoEventoFila && TEXTOS_POR_EVENTO[tipoEventoFila]) ? tipoEventoFila : "xv"].fraseConfirmacion;
                            const copiarRecordatorio = (nombreInvitado: string) => {
                              const msg = `¡Hola ${nombreInvitado}! 🌸 Nos encantaría contar con tu confirmación de asistencia ${fraseConfirmacionFila} ${row.nombre_quinceanera || "nuestra fiesta"}. ¿Nos confirmas cuando puedas? ¡Gracias!`;
                              navigator.clipboard.writeText(msg).then(() => mostrarToast("Mensaje copiado", "success")).catch(() => {});
                            };
                            return (
                              <>
                                {confs.length > 0 && (
                                  <>
                                    <p className="text-[11px] font-bold text-slate-700 mb-2">
                                      ✅ {siCount.length} confirmaron ({totalPersonas} personas) · ❌ {confs.length - siCount.length} no van
                                    </p>
                                    <div className="space-y-1 max-h-52 overflow-y-auto mb-2">
                                      {confs.map(c => (
                                        <div key={c.id} className="flex items-center justify-between gap-2 text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                                          <span className="font-semibold text-slate-800 truncate">{c.nombre_invitado}</span>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {c.asistencia === "si" ? (
                                              <>
                                                <span className="text-emerald-600 font-bold">✅</span>
                                                <input
                                                  type="number"
                                                  min={1}
                                                  defaultValue={c.num_personas}
                                                  onBlur={(e) => {
                                                    const valor = Number(e.target.value) || 1;
                                                    if (valor !== c.num_personas) handleActualizarPersonasConfirmacion(row.id, c.id, valor);
                                                  }}
                                                  className="w-12 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-center outline-none focus:border-indigo-500"
                                                />
                                                <span className="text-slate-500">persona(s)</span>
                                              </>
                                            ) : (
                                              <span className="text-rose-500 font-bold">❌ No asiste</span>
                                            )}
                                            <button
                                              onClick={() => handleEliminarConfirmacion(row.id, c.id)}
                                              title="Eliminar esta confirmación"
                                              className="text-slate-300 hover:text-rose-500 transition"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                                {sinConfirmar.length > 0 && (
                                  <div className="border-t border-slate-200/60 pt-2">
                                    <p className="text-[11px] font-bold text-amber-700 mb-1.5">⏳ {sinConfirmar.length} familia(s) con pases asignados que aún no responden:</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {sinConfirmar.map((inv, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2 text-[11px] bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                                          <span className="font-semibold text-slate-800 truncate">{inv.nombre} <span className="text-slate-400 font-normal">({inv.pases} pase(s))</span></span>
                                          <button onClick={() => copiarRecordatorio(inv.nombre)} className="shrink-0 text-[10px] font-bold text-indigo-600 hover:text-indigo-800">📋 Copiar recordatorio</button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMostrarMisInvitaciones(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarNuevoCliente && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-extrabold text-slate-900">✨ Nuevo Cliente</h3>
              <button
                onClick={() => setMostrarNuevoCliente(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Regístralo en cuanto venda el paquete. Se guarda de inmediato en "Mis Invitaciones" con estatus "Cotización" — el resto de la invitación (fotos, itinerario, etc.) lo llenas después con calma en el editor.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la quinceañera</label>
                <input
                  type="text"
                  value={nuevoClienteNombre}
                  onChange={(e) => setNuevoClienteNombre(e.target.value)}
                  placeholder="Ej. Sophia Valeria"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Celular / WhatsApp del cliente</label>
                <input
                  type="text"
                  value={nuevoClienteTelefono}
                  onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                  placeholder="Ej. 5212345678"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-indigo-500 font-mono"
                />
                {nuevoClienteDuplicado && (
                  <p className="text-[11px] font-bold text-amber-700 mt-1">
                    ⚠️ Ya existe un cliente con este número: {nuevoClienteDuplicado.nombre_quinceanera || "sin nombre"}
                    {nuevoClienteDuplicado.fecha_fiesta ? ` (${nuevoClienteDuplicado.fecha_fiesta})` : ""}. Puedes continuar si de verdad es otra invitación.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Paquete</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(paquetes) as Array<"basico" | "premium" | "deluxe">).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNuevoClientePaquete(key)}
                      className={`p-2 rounded-lg border text-center transition cursor-pointer ${nuevoClientePaquete === key ? "border-indigo-600 bg-indigo-50/70" : "border-slate-200 bg-slate-50 hover:bg-slate-100/80"}`}
                    >
                      <span className="block text-xs font-bold text-slate-800 capitalize">{paquetes[key].nombre}</span>
                      <span className="block text-[10px] text-indigo-600 font-mono">{paquetes[key].precio}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMostrarNuevoCliente(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearNuevoCliente}
                disabled={creandoNuevoCliente}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                {creandoNuevoCliente ? "Creando..." : "Crear y empezar a editar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
