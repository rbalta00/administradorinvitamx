import { useState, useEffect, useRef, ChangeEvent, useMemo, useCallback, memo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  ArrowDown
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { InvitacionDatos, TemaConfig } from "./types";
import { temas, paquetes, datosDefault, getFotosPorTema, getOrdenSeccionesEfectivo, PALETAS_COLOR_PERSONALIZADO } from "./data";
import { generarHTMLFinal } from "./templates";

// Inicializar cliente de Supabase a partir de variables de entorno (Vite las inyecta en build time)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
if (supabaseUrl && supabaseAnonKey && typeof window !== "undefined") {
  window.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else if (typeof window !== "undefined") {
  console.warn("Supabase no configurado: faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

// Fila fija (columna `id` es uuid) usada para guardar/leer los fondos personalizados compartidos
const FONDOS_ROW_ID = "00000000-0000-0000-0000-000000000001";

// Forma de una fila de la tabla `invitaciones` tal como la usa el panel "Mis Invitaciones"
// (no son todas las columnas de la tabla, solo las que ese panel lee/muestra/edita).
interface InvitacionGuardadaRow {
  id: string;
  nombre_quinceanera: string | null;
  fecha_fiesta: string | null;
  tema_elegido: string | null;
  estado: string | null;
  activo_hasta: string | null;
  updated_at: string | null;
  link_invitacion: string | null;
  datos_completos: InvitacionDatos | null;
  telefono_whatsapp: string | null;
  precio_total: number | null;
  precio_pagado: number | null;
  pases_pagado: boolean;
  pdf_pagado: boolean;
  notas: string | null;
  link_pago: string | null;
  intake_actualizado_en: string | null;
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
  personalizacion: "pz"
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
            p: item.pases
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
            pases: item.p || 2
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
// Función para guardar en Supabase (agregar ANTES de export default function App)
// Si se pasa `existingId`, actualiza esa fila en vez de crear una nueva — evita que guardar
// varias veces mientras se edita la MISMA invitación acumule filas duplicadas en la tabla.
async function guardarEnSupabase(datosInvitacion: InvitacionDatos, temaActual: TemaConfig, shareUrl?: string, existingId?: string | null) {
  try {
    // Verificar que Supabase esté cargado
    if (!window.supabaseClient) {
      console.error('Supabase no está inicializado');
      return;
    }

    const supabase = window.supabaseClient;

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
      email_cliente: '',
      link_invitacion: shareUrl || window.location.href,
      fondos_personalizados: datosInvitacion.bgImages || {},
      // Estado completo (todos los campos de InvitacionDatos), aparte de las columnas de
      // resumen de arriba — es lo que permite reabrir esta invitación exacta en el editor
      // desde el panel "Mis Invitaciones" en vez de solo poder leer un resumen.
      datos_completos: datosInvitacion,
      estado: 'completada'
    };

    console.log('📤 Guardando en Supabase:', datosParaGuardar);

    const query = existingId
      ? supabase.from('invitaciones').update(datosParaGuardar).eq('id', existingId).select()
      : supabase.from('invitaciones').insert([datosParaGuardar]).select();

    const { data, error } = await query;

    if (error) throw error;

    console.log(existingId ? '✅ Actualizado en Supabase correctamente:' : '✅ Guardado en Supabase correctamente:', data[0]?.id);
    return data[0];

  } catch (err: any) {
    console.error('❌ Error al guardar en Supabase:', err.message);
  }
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
  return [tColors.primary, tColors.secondary, "#FFFFFF"];
};

// Genera un objeto de datos personalizado para el catálogo que garantiza que se muestren las características exactas del tema
const getDatosCatalogTema = (baseDatos: any, t: any): any => {
  const base = baseDatos || datosDefault.premium;
  // Obtener fotos del tema y seleccionar una aleatoria como portada
  const fotosTema = getFotosPorTema(t.id);
  const fotoPortadaAleatoria = fotosTema[Math.floor(Math.random() * fotosTema.length)];

  return {
    ...base,
    tema: t.id,
    fotos: [], // Vaciamos para que use las hermosas fotos temáticas del tema
    fotoPortada: fotoPortadaAleatoria, // Foto aleatoria de quinceañera como portada
    colorSugerido: getColorSugeridoPorTema(t.id, t.colors)
  };
};

// Obtiene los datos del catálogo dando prioridad a diseños guardados por el usuario para cada tema específico
const getDatosVisualizacionCatalog = (t: any, currentDatos?: any): any => {
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

  // Usamos el tier Deluxe como base para las demos del catálogo (en vez de Premium) para que
  // se vean TODAS las secciones posibles, incluida "Pases de Entrada" (exclusiva de Deluxe) —
  // así un cliente puede ver esa función antes de decidir qué paquete comprar.
  const baseData = getDatosCatalogTema(datosDefault.deluxe, t);

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

// Componente para cargar los iframes del catálogo de forma diferida (staggered), evitando bloquear el hilo principal (INP Issue)
const LazyIframe = memo(({ t, index, datos }: { t: any; index: number; datos: any }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 150 + index * 80); // Carga escalonada ligera y fluida
    return () => clearTimeout(timer);
  }, [t.id, index]);

  const srcDoc = useMemo(() => {
    if (!shouldRender) return "";
    return generarHTMLFinal({ ...getDatosVisualizacionCatalog(t, datos), seccionesExcluidas: [...(getDatosVisualizacionCatalog(t, datos).seccionesExcluidas || []), "apertura"] }, t);
  }, [shouldRender, t, datos]);

  if (!shouldRender) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-800 select-none pointer-events-none">
        <div className="animate-pulse flex flex-col items-center gap-1.5">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-[8px] text-indigo-650/80 font-bold uppercase tracking-widest">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <iframe 
      srcDoc={srcDoc}
      className="absolute border-0 pointer-events-none select-none"
      style={{
        width: "354px",
        height: "642px",
        transform: "scale(0.404)",
        transformOrigin: "top left",
        top: "0",
        left: "0",
      }}
      title={`Demo ${t.nombre}`}
    />
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
// son exactamente las fuentes que ya usan los 13 temas del catálogo, así que ya están
// cargadas y probadas — no hay riesgo de romper la carga de Google Fonts.
const FUENTES_ENCABEZADO = ["Playfair Display", "Cormorant Garamond", "Lora", "Cinzel", "Outfit", "Syne", "Orbitron"];
const FUENTES_TEXTO = ["Inter", "Garamond"];
const FUENTES_CURSIVA = ["Great Vibes", "Alex Brush", "Pinyon Script", "Monsieur La Doulaise", "Petit Formal Script", "WindSong", "Sacramento", "Parisienne", "Dancing Script"];

const TIPOS_APERTURA: { id: "sobre" | "cortina" | "tarjeta"; nombre: string; desc: string }[] = [
  { id: "tarjeta", nombre: "Tarjeta 🎴", desc: "Tarjeta simple con botón para abrir" },
  { id: "sobre", nombre: "Sobre 💌", desc: "Sobre con sello de cera que se abre" },
  { id: "cortina", nombre: "Cortina 🎭", desc: "Telón que se descorre a los lados" }
];

// Apertura por defecto de cada tema cuando el usuario no la sobreescribe manualmente.
// Debe coincidir exactamente con tipoAperturaEfectivo en templates.ts.
const tipoAperturaPorDefectoDelTema = (temaId: string): "sobre" | "cortina" | "tarjeta" =>
  ["mariposas", "floral-acuarela", "boho-chic", "coquette-pink", "coquette-luxe"].includes(temaId)
    ? "sobre"
    : ["celestial", "princesa-elegante", "neon"].includes(temaId)
      ? "cortina"
      : "tarjeta";

// Paletas de la lluvia decorativa ("Efecto de Animación de Caída"): conjuntos de emojis
// coordinados por estética, en vez de dejar elegir emoji por emoji.
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
// Deluxe lo incluye sin costo extra; en Básico/Premium es a la carte con su propio precio.
const POLITICA_PASES: Record<"basico" | "premium" | "deluxe", string> = {
  basico: "A la carte +$150 MXN",
  premium: "A la carte +$180 MXN",
  deluxe: "Incluido sin costo"
};

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
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
            <span className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[11px] font-bold truncate ${isEnabled ? 'text-emerald-900' : 'text-slate-500'}`}>
                {label}
              </span>
              {secName === "pases" && (
                <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${paquete === "deluxe" ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-700"}`}>
                  {POLITICA_PASES[paquete]}
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
        const isDarkTheme = t.id === "celestial" || t.id === "princesa-elegante" || t.id === "neon";
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

// Sube una imagen a Cloudinary sin depender de ningún estado del componente App -- usado por
// IntakeForm, que se renderiza para clientes sin sesión de admin ni acceso al resto de la app.
const subirImagenPublica = async (file: File): Promise<string> => {
  const cloudName = "dswrrm5u1";
  const uploadPreset = "invitaciones-xv";
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
};

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
  const [maxFotos, setMaxFotos] = useState(4);
  // Resumen de confirmaciones (RSVP) de SUS invitados -- de solo lectura, para que el cliente
  // pueda ver quién ya confirmó sin depender de llevar la cuenta a mano leyendo WhatsApps
  // sueltos. Se recarga cada vez que abre este mismo link.
  const [confirmaciones, setConfirmaciones] = useState<ConfirmacionRSVP[] | null>(null);
  // Estatus del pedido y avance de pago -- de solo lectura, así el cliente sabe en qué va su
  // invitación y cuánto lleva pagado sin tener que preguntarte por WhatsApp.
  const [pedidoInfo, setPedidoInfo] = useState<{ estado: string | null; precioTotal: number | null; precioPagado: number | null } | null>(null);
  // Invitados con pases asignados (solo lectura aquí -- esa lista la administra el admin,
  // no este formulario) -- se usa para saber quién de la lista de pases todavía no ha
  // confirmado por RSVP, y poder copiarle un recordatorio.
  const [invitadosAsignados, setInvitadosAsignados] = useState<{ nombre: string; pases: number }[]>([]);

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
          .select("nombre_quinceanera, datos_completos, estado, precio_total, precio_pagado")
          .eq("id", invitacionId)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          setError("No encontramos tu invitación. Pídele el link correcto a quien te lo compartió.");
          setCargando(false);
          return;
        }
        setNombreQuinceanera(data.nombre_quinceanera || "");
        setPedidoInfo({ estado: data.estado || null, precioTotal: data.precio_total ?? null, precioPagado: data.precio_pagado ?? null });
        const dc: Partial<InvitacionDatos> = data.datos_completos || {};
        setMaxFotos(paquetes[(dc.paquete as "basico" | "premium" | "deluxe") || "basico"]?.maxFotos || 4);
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

  const actualizar = (campo: keyof typeof form, valor: any) => setForm(prev => ({ ...prev, [campo]: valor }));

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

  const handleEnviar = async () => {
    if (!invitacionId || !window.supabaseClient) return;
    setEnviando(true);
    setError(null);
    try {
      const { data: actual, error: errLectura } = await window.supabaseClient
        .from("invitaciones")
        .select("datos_completos")
        .eq("id", invitacionId)
        .maybeSingle();
      if (errLectura) throw errLectura;
      const base: Partial<InvitacionDatos> = actual?.datos_completos || {};
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
        fotos: form.fotos
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
    } catch (e: any) {
      setError("No se pudo guardar tu información: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-indigo-500";
  const labelClass = "block text-xs font-semibold text-slate-700 mb-1";

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

  if (enviado) {
    return (
      <div className="w-screen h-screen fixed inset-0 flex flex-col items-center justify-center bg-slate-50 px-6 text-center gap-2">
        <span className="text-4xl mb-2">🎉</span>
        <p className="text-base font-bold text-slate-800">¡Gracias, {nombreQuinceanera}!</p>
        <p className="text-sm text-slate-500 max-w-xs">Ya recibimos tu información. Nosotros seguimos con el diseño de tu invitación.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-6 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-lg font-extrabold text-slate-900 mb-1">🌸 Datos para tu invitación de XV</h1>
        <p className="text-xs text-slate-500 mb-6">Hola{nombreQuinceanera ? `, ${nombreQuinceanera}` : ""} — llena lo que tengas listo y súbelo. Puedes volver a este mismo link después si te falta algo.</p>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-[11px] text-rose-700 font-semibold">{error}</div>
        )}

        {pedidoInfo && (pedidoInfo.estado || pedidoInfo.precioTotal) && (() => {
          const estatusLabel = ESTATUS_PEDIDO.find(e => e.id === (pedidoInfo.estado || "cotizacion"))?.label || "🗨️ Cotización";
          const falta = pedidoInfo.precioTotal != null ? pedidoInfo.precioTotal - (pedidoInfo.precioPagado || 0) : null;
          return (
            <div className="mb-6 p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
              <h3 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide mb-1">📌 Estado de tu invitación</h3>
              <p className="text-[13px] font-bold text-emerald-800 mb-1">{estatusLabel}</p>
              {pedidoInfo.precioTotal != null && (
                <p className="text-[11px] text-emerald-700">
                  Pagado: ${(pedidoInfo.precioPagado || 0).toLocaleString("es-MX")} de ${pedidoInfo.precioTotal.toLocaleString("es-MX")} MXN
                  {falta && falta > 0 ? ` · Falta: $${falta.toLocaleString("es-MX")} MXN` : " · ✅ Pagado por completo"}
                </p>
              )}
            </div>
          );
        })()}

        {confirmaciones !== null && (confirmaciones.length > 0 || invitadosAsignados.length > 0) && (() => {
          const siConfirman = confirmaciones.filter(c => c.asistencia === "si");
          const totalPersonas = siConfirman.reduce((acc, c) => acc + (c.num_personas || 1), 0);
          // Reconciliación aproximada por nombre (coincidencia exacta, sin mayúsculas/espacios):
          // familias con pases asignados que todavía no aparecen en la tabla de confirmaciones.
          const sinConfirmar = invitadosAsignados.filter(inv =>
            !confirmaciones.some(c => c.nombre_invitado.trim().toLowerCase() === inv.nombre.trim().toLowerCase())
          );
          const copiarRecordatorio = (nombreInvitado: string) => {
            const msg = `¡Hola ${nombreInvitado}! 🌸 Nos encantaría contar con tu confirmación de asistencia a los XV años de ${nombreQuinceanera || "nuestra fiesta"}. ¿Nos confirmas cuando puedas? ¡Gracias!`;
            navigator.clipboard.writeText(msg).catch(() => {});
          };
          return (
            <div className="mb-6 p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl">
              <h3 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wide mb-1">👥 Confirmaciones de tus invitados</h3>
              {confirmaciones.length > 0 && (
                <>
                  <p className="text-[11px] font-bold text-indigo-800 mb-3">
                    ✅ {siConfirman.length} familia(s) confirmaron ({totalPersonas} personas) · ❌ {confirmaciones.length - siConfirman.length} no van
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
                    {confirmaciones.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-[11px] bg-white border border-indigo-100 rounded-lg px-2.5 py-1.5">
                        <span className="font-semibold text-slate-800">{c.nombre_invitado}</span>
                        <span className={c.asistencia === "si" ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                          {c.asistencia === "si" ? `✅ ${c.num_personas} persona(s)` : "❌ No asiste"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {sinConfirmar.length > 0 && (
                <div className="border-t border-indigo-200 pt-3">
                  <p className="text-[11px] font-bold text-amber-700 mb-2">⏳ {sinConfirmar.length} familia(s) con pases asignados que aún no responden:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {sinConfirmar.map((inv, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-[11px] bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <span className="font-semibold text-slate-800 truncate">{inv.nombre} <span className="text-slate-400 font-normal">({inv.pases} pase(s))</span></span>
                        <button
                          onClick={() => copiarRecordatorio(inv.nombre)}
                          className="shrink-0 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          📋 Copiar recordatorio
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1.5">Copia el mensaje y mándaselo por el medio que uses con ellos (WhatsApp, mensaje directo, etc.).</p>
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

          <div>
            <label className={labelClass}>Mensaje de bienvenida (opcional)</label>
            <textarea value={form.mensajeBienvenida} onChange={(e) => actualizar("mensajeBienvenida", e.target.value)} rows={2} placeholder="Ej. Hay momentos que son inolvidables..." className={inputClass + " resize-none"} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide mb-2">💒 Ceremonia</h3>
            <div className="space-y-2">
              <input type="text" value={form.ceremoniaLugar} onChange={(e) => actualizar("ceremoniaLugar", e.target.value)} placeholder="Lugar" className={inputClass} />
              <input type="time" value={form.ceremoniaHora} onChange={(e) => actualizar("ceremoniaHora", e.target.value)} className={inputClass} />
              <input type="text" value={form.ceremoniaDireccion} onChange={(e) => actualizar("ceremoniaDireccion", e.target.value)} placeholder="Dirección" className={inputClass} />
              <input type="text" value={form.ceremoniaMaps} onChange={(e) => actualizar("ceremoniaMaps", e.target.value)} placeholder="Link de Google Maps (opcional)" className={inputClass} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide mb-2">🎉 Recepción</h3>
            <div className="space-y-2">
              <input type="text" value={form.recepcionLugar} onChange={(e) => actualizar("recepcionLugar", e.target.value)} placeholder="Lugar" className={inputClass} />
              <input type="time" value={form.recepcionHora} onChange={(e) => actualizar("recepcionHora", e.target.value)} className={inputClass} />
              <input type="text" value={form.recepcionDireccion} onChange={(e) => actualizar("recepcionDireccion", e.target.value)} placeholder="Dirección" className={inputClass} />
              <input type="text" value={form.recepcionMaps} onChange={(e) => actualizar("recepcionMaps", e.target.value)} placeholder="Link de Google Maps (opcional)" className={inputClass} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">🗓️ Itinerario</h3>
              <button type="button" onClick={agregarItinerario} className="text-[10px] font-bold text-indigo-600">+ Agregar</button>
            </div>
            <div className="space-y-2">
              {form.itinerario.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input type="time" value={item.hora} onChange={(e) => actualizarItinerario(i, "hora", e.target.value)} className={inputClass + " w-28"} />
                  <input type="text" value={item.evento} onChange={(e) => actualizarItinerario(i, "evento", e.target.value)} placeholder="Ej. Cena de gala" className={inputClass} />
                  <button type="button" onClick={() => quitarItinerario(i)} className="text-rose-500 px-2">✕</button>
                </div>
              ))}
              {form.itinerario.length === 0 && <p className="text-[11px] text-slate-400">Sin actividades todavía.</p>}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelClass}>Código de vestimenta</label>
            <input type="text" value={form.dressCode} onChange={(e) => actualizar("dressCode", e.target.value)} placeholder="Ej. Formal / Etiqueta" className={inputClass} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide mb-2">👪 Padres</h3>
            <div className="space-y-2">
              <input type="text" value={form.padres[0] || ""} onChange={(e) => actualizar("padres", [e.target.value, form.padres[1] || ""])} placeholder="Nombre del papá" className={inputClass} />
              <input type="text" value={form.padres[1] || ""} onChange={(e) => actualizar("padres", [form.padres[0] || "", e.target.value])} placeholder="Nombre de la mamá" className={inputClass} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">🤵👰 Padrinos</h3>
              <button type="button" onClick={agregarPadrino} className="text-[10px] font-bold text-indigo-600">+ Agregar</button>
            </div>
            <div className="space-y-2">
              {form.padrinos.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={p} onChange={(e) => actualizarPadrino(i, e.target.value)} placeholder="Nombre del padrino/madrina" className={inputClass} />
                  <button type="button" onClick={() => quitarPadrino(i)} className="text-rose-500 px-2">✕</button>
                </div>
              ))}
              {form.padrinos.length === 0 && <p className="text-[11px] text-slate-400">Sin padrinos todavía.</p>}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelClass}>Mesa de regalos</label>
            <textarea value={form.mesaRegalos} onChange={(e) => actualizar("mesaRegalos", e.target.value)} rows={2} placeholder="Ej. Liverpool No. Evento 12345" className={inputClass + " resize-none mb-3"} />
            <label className={labelClass}>Datos bancarios (opcional)</label>
            <textarea value={form.datosBancarios} onChange={(e) => actualizar("datosBancarios", e.target.value)} rows={2} placeholder="Banco, CLABE, beneficiario..." className={inputClass + " resize-none"} />
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Hashtag (opcional)</label>
              <input type="text" value={form.hashtag} onChange={(e) => actualizar("hashtag", e.target.value)} placeholder="#MisXV" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Link de tu canción (opcional)</label>
              <input type="text" value={form.cancion} onChange={(e) => actualizar("cancion", e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide mb-2">📸 Fotos</h3>
            <label className={labelClass}>Foto de portada</label>
            {form.fotoPortada && (
              <img src={form.fotoPortada} alt="Portada" className="w-full h-40 object-cover rounded-lg mb-2 border border-slate-200" referrerPolicy="no-referrer" />
            )}
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-50/40 transition mb-4">
              <span className="text-xs font-bold text-indigo-700">{subiendoFoto === "portada" ? "Subiendo..." : "Subir foto de portada"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleSubirPortada} disabled={!!subiendoFoto} />
            </label>

            <label className={labelClass}>Galería ({form.fotos.length}/{maxFotos})</label>
            {form.fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {form.fotos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
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
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-50/40 transition">
                <span className="text-xs font-bold text-indigo-700">{subiendoFoto === "galeria" ? "Subiendo..." : `Subir fotos (hasta ${maxFotos})`}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleSubirGaleria} disabled={!!subiendoFoto} />
              </label>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleEnviar}
          disabled={enviando || !!subiendoFoto}
          className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-bold rounded-xl transition"
        >
          {enviando ? "Guardando..." : "Guardar mi información"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // Cargar estado inicial desde la URL si existe o desde localStorage, o el editor precargado
  const getInitialState = (): { initialDatos: InvitacionDatos; initialTemaId: string; isView: boolean; isCatalog: boolean; initialCatalogTemaId: string | null; isEmbed: boolean } => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isView = params.get("v") === "1" || params.get("view") === "true";
      const isCatalog = params.get("catalog") === "true" || params.get("catalogo") === "true";
      const isEmbed = params.get("embed") === "true";
      const initialCatalogTemaId = params.get("tema") || null;
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
        isEmbed: false
      };
    }
  };

  const { initialDatos, initialTemaId, isView: isViewMode, isCatalog: isCatalogInitial, initialCatalogTemaId, isEmbed: isEmbedMode } = getInitialState();

  // Detectar parámetro ?catalog=true para mostrar el catálogo
  const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isCatalogMode_url = queryParams.get('catalog') === 'true';

  // Modo "formulario de datos del cliente" (?intake=1&iid=<id de la fila en Supabase>): un link
  // público (sin login) que el admin le manda al cliente desde "Mis Invitaciones" en cuanto
  // sabe su paquete, para que el cliente mismo capture sus datos y suba sus fotos -- en vez de
  // que el admin tenga que escribir todo a mano. No usa el blob `d` de la URL como el resto de
  // los modos: lee y escribe directo la fila de Supabase por su id, así el link es cortito.
  const isIntakeMode = queryParams.get('intake') === '1';
  const intakeInvitacionId = queryParams.get('iid');

  // Estado principal de los datos de la invitación
  const [datos, setDatos] = useState<InvitacionDatos>(initialDatos);

  // Sincronizar modo con parámetro: ?catalog=true muestra catálogo, sin parámetro muestra generador
  useEffect(() => {
    setIsCatalogMode(isCatalogMode_url);
  }, [isCatalogMode_url]);

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
          .select('fondos_personalizados')
          .eq('id', FONDOS_ROW_ID)
          .maybeSingle();

        if (error) {
          console.warn('Error al cargar fondos desde Supabase:', error.message);
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
      } catch (err) {
        console.warn('Error al cargar fondos desde Supabase:', err);
      } finally {
        setCargandoFondos(false);
      }
    };

    cargarFondosDesdeSupabase();
  }, []);

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

  // Estado para notificaciones Toast no bloqueantes (reemplazo de alert)
  const [toast, setToast] = useState<{ mensaje: string; tipo: "success" | "error" | "info" } | null>(null);

  // Estado para modal de confirmación personalizado (reemplazo de window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    titulo: string;
    mensaje: string;
    onAceptar: () => void;
  } | null>(null);

  const mostrarToast = (mensaje: string, tipo: "success" | "error" | "info" = "success") => {
    setToast({ mensaje, tipo });
  };

  const toggleSeccion = useCallback((secName: string) => {
    setDatos(prev => {
      const ex = prev.seccionesExcluidas || [];
      const newEx = ex.includes(secName) ? ex.filter(s => s !== secName) : [...ex, secName];
      return { ...prev, seccionesExcluidas: newEx };
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

  // Función para subir archivos a Cloudinary con los datos provistos
  const subirACloudinary = async (file: File): Promise<string> => {
    const cloudName = "dswrrm5u1";
    const uploadPreset = "invitaciones-xv";
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || "Ocurrió un error al cargar la imagen.");
    }

    const resData = await response.json();
    return resData.secure_url;
  };

  // Estado del tema seleccionado
  const [selectedTemaId, setSelectedTemaId] = useState<string>(initialTemaId);

  // Estados para el catálogo de demostración de temas
  const [isCatalogMode, setIsCatalogMode] = useState<boolean>(isCatalogInitial);
  const [selectedCatalogTemaId, setSelectedCatalogTemaId] = useState<string | null>(initialCatalogTemaId);

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

  // Manejo de carga de imágenes de fondo por tema por separado
  const handleBgImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoCloudinary(true);
    try {
      const url = await subirACloudinary(file);

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

  const handleBgImageUrlChange = (url: string) => {
    // Solo permitir cambios si el URL es válido y diferente al actual
    if (!url.trim()) return;

    // Guardar en el almacenamiento persistente global de fondos
    try {
      const savedBgs = localStorage.getItem('xv_fondos_personalizados');
      const customBgs = savedBgs ? JSON.parse(savedBgs) : {};
      customBgs[selectedTemaId] = url;
      localStorage.setItem('xv_fondos_personalizados', JSON.stringify(customBgs));
    } catch (err) {
      console.error("Error al guardar fondo personalizado en localStorage:", err);
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
  };

  const handleClearBgImage = () => {
    // Eliminar del almacenamiento persistente global de fondos
    try {
      const savedBgs = localStorage.getItem('xv_fondos_personalizados');
      if (savedBgs) {
        const customBgs = JSON.parse(savedBgs);
        delete customBgs[selectedTemaId];
        localStorage.setItem('xv_fondos_personalizados', JSON.stringify(customBgs));
      }
    } catch (err) {
      console.error("Error al limpiar fondo de localStorage:", err);
    }

    setDatos(prev => {
      const currentBgImages = { ...(prev.bgImages || {}) };
      delete currentBgImages[selectedTemaId];
      return {
        ...prev,
        bgImages: currentBgImages
      };
    });
    mostrarToast(`Se ha restablecido el fondo por defecto del tema "${temaActual.nombre}".`, "info");
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

  // Estado para controles de copiado temporal
  const [htmlCopiado, setHtmlCopiado] = useState(false);
  const [datosCopiados, setDatosCopiados] = useState(false);
  const [generandoEnlace, setGenerandoEnlace] = useState(false);

  // Estado para mostrar modal de fondos guardados
  const [mostrarFondosGuardados, setMostrarFondosGuardados] = useState(false);
  const [cargandoFondos, setCargandoFondos] = useState(true);

  // Estado para el panel "Mis Invitaciones": lista de invitaciones de clientes guardadas en
  // Supabase, para poder reabrirlas y seguir editándolas, borrarlas, o marcar hasta cuándo
  // deben quedarse activas (bookkeeping propio del admin, ver InvitacionGuardadaRow).
  const [mostrarMisInvitaciones, setMostrarMisInvitaciones] = useState(false);
  const [cargandoMisInvitaciones, setCargandoMisInvitaciones] = useState(false);
  const [listaInvitaciones, setListaInvitaciones] = useState<InvitacionGuardadaRow[]>([]);
  // Confirmaciones (RSVP) por invitación, cargadas bajo demanda al expandir una fila en el
  // panel (evita N+1 queries al abrir la lista si hay muchas invitaciones guardadas).
  const [confirmacionesPorInvitacion, setConfirmacionesPorInvitacion] = useState<Record<string, ConfirmacionRSVP[]>>({});
  const [invitacionExpandidaId, setInvitacionExpandidaId] = useState<string | null>(null);
  const [invitacionPagosExpandidaId, setInvitacionPagosExpandidaId] = useState<string | null>(null);
  // Historial de abonos por invitación (tabla `abonos`), cargado bajo demanda al ver el
  // historial en el panel de Pagos y estatus.
  const [abonosPorInvitacion, setAbonosPorInvitacion] = useState<Record<string, Abono[]>>({});
  const [historialAbonosExpandidoId, setHistorialAbonosExpandidoId] = useState<string | null>(null);
  const [cargandoAbonos, setCargandoAbonos] = useState(false);
  const [montoNuevoAbono, setMontoNuevoAbono] = useState<Record<string, string>>({});
  const [notaNuevoAbono, setNotaNuevoAbono] = useState<Record<string, string>>({});
  const [busquedaInvitaciones, setBusquedaInvitaciones] = useState("");
  const [filtroEstatusInvitaciones, setFiltroEstatusInvitaciones] = useState("todos");
  const [filtroRapidoInvitaciones, setFiltroRapidoInvitaciones] = useState<"ninguno" | "pendientes" | "proximos">("ninguno");
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

  const [nuevoFotoUrl, setNuevoFotoUrl] = useState("");

  // Referencia al iframe para actualizar la vista previa de forma aislada
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Tema seleccionado real
  const temaActual = temas.find(t => t.id === selectedTemaId) || temas[0];

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

    const htmlString = generarHTMLFinal(datos, temaActual);

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
  useEffect(() => {
    actualizarVistaPrevia();
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
          setDatos(prev => ({
            ...prev,
            paquete: paqKey,
            fotos: (prev.fotos || []).slice(0, maxFotosNuevoPaquete)
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
    try {
      const { data, error } = await window.supabaseClient
        .from("invitaciones")
        .select("id, nombre_quinceanera, fecha_fiesta, tema_elegido, estado, activo_hasta, updated_at, link_invitacion, datos_completos, telefono_whatsapp, precio_total, precio_pagado, pases_pagado, pdf_pagado, notas, link_pago, intake_actualizado_en")
        .neq("id", FONDOS_ROW_ID)
        .order("updated_at", { ascending: false });

      if (error) throw error;
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
    } finally {
      setCargandoMisInvitaciones(false);
    }
  };

  // Muestra/oculta las confirmaciones (RSVP) de una fila en el panel "Mis Invitaciones",
  // cargándolas de Supabase la primera vez que se expande (luego quedan en caché en el estado).
  const toggleConfirmacionesInvitacion = async (row: InvitacionGuardadaRow) => {
    if (invitacionExpandidaId === row.id) {
      setInvitacionExpandidaId(null);
      return;
    }
    setInvitacionExpandidaId(row.id);
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
  // de cargar un estado incompleto/roto.
  const handleAbrirInvitacionGuardada = (row: InvitacionGuardadaRow) => {
    if (!row.datos_completos) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para recargar.", "error");
      return;
    }
    setDatos(row.datos_completos);
    setSelectedTemaId(row.datos_completos.tema || "dorado-clasico");
    setSupabaseRowId(row.id);
    try { localStorage.setItem("xv_supabase_row_id", row.id); } catch {}
    setMostrarMisInvitaciones(false);
    setPanelPestana("ajustes");
    mostrarToast(`Invitación de "${row.nombre_quinceanera || "cliente"}" cargada en el editor ✏️`, "success");
  };

  // Descarga un respaldo del CONTENIDO completo de una invitación (todo InvitacionDatos: fotos,
  // itinerario, padrinos, mensaje, etc.) como archivo JSON -- el CSV de "Mis Invitaciones" solo
  // trae los campos de administración (nombre, pagos, estatus), no el diseño en sí.
  const handleDescargarRespaldoInvitacion = (row: InvitacionGuardadaRow) => {
    if (!row.datos_completos) return;
    const slug = (row.nombre_quinceanera || "invitacion").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const blob = new Blob([JSON.stringify(row.datos_completos, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respaldo-${slug}-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clona una invitación ya guardada como punto de partida para un cliente nuevo (mismo
  // tema/estilo/secciones, distinto nombre) -- crea una FILA NUEVA en Supabase (no toca la
  // original) y la deja cargada en el editor lista para renombrar y ajustar.
  const handleDuplicarInvitacionGuardada = async (row: InvitacionGuardadaRow) => {
    if (!row.datos_completos) {
      mostrarToast("Esta invitación se guardó antes de esta función y no tiene el estado completo disponible para duplicar.", "error");
      return;
    }
    const temaDuplicado = temas.find(t => t.id === row.datos_completos!.tema) || temas[0];
    try {
      const nuevaFila = await guardarEnSupabase(row.datos_completos, temaDuplicado, row.link_invitacion || undefined, null);
      if (!nuevaFila?.id) {
        mostrarToast("No se pudo duplicar la invitación", "error");
        return;
      }
      setDatos(row.datos_completos);
      setSelectedTemaId(row.datos_completos.tema || "dorado-clasico");
      setSupabaseRowId(nuevaFila.id);
      try { localStorage.setItem("xv_supabase_row_id", nuevaFila.id); } catch {}
      setMostrarMisInvitaciones(false);
      setPanelPestana("ajustes");
      mostrarToast(`Copia de "${row.nombre_quinceanera || "la invitación"}" creada y cargada en el editor — cambia el nombre antes de compartirla ✏️`, "success");
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

  // Actualiza un solo campo de administración de pedido (estatus, precios, pases/PDF pagado,
  // notas, link de pago) de una fila ya guardada, sin tocar el resto de columnas -- separado a
  // propósito de guardarEnSupabase (que guarda el DISEÑO) para que abrir/guardar la invitación
  // en el editor nunca pise estos datos de administración, y viceversa.
  const handleActualizarCampoInvitacion = async (
    row: InvitacionGuardadaRow,
    campo: "estado" | "precio_total" | "precio_pagado" | "pases_pagado" | "pdf_pagado" | "notas" | "link_pago",
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
      const nuevaFila = await guardarEnSupabase(nuevosDatos, temaConfig, undefined, null);
      if (!nuevaFila?.id) {
        mostrarToast("No se pudo crear el cliente", "error");
        return;
      }
      // guardarEnSupabase siempre inserta con estado:"completada" -- lo corregimos aparte a
      // "cotizacion" para no tener que tocar esa función compartida por el resto de la app.
      if (window.supabaseClient) {
        await window.supabaseClient.from("invitaciones").update({ estado: "cotizacion" }).eq("id", nuevaFila.id);
      }
      setDatos(nuevosDatos);
      setSelectedTemaId("dorado-clasico");
      setSupabaseRowId(nuevaFila.id);
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

  // Manda el link de pago guardado de esta fila por WhatsApp al número del cliente.
  const handleEnviarLinkPago = (row: InvitacionGuardadaRow) => {
    if (!row.link_pago?.trim()) {
      mostrarToast("Primero pega el link de pago en esta invitación", "error");
      return;
    }
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    const msg = `¡Hola! 🌸 Te comparto el link de pago para tu invitación de XV Años de *${row.nombre_quinceanera || "tu evento"}*:\n${row.link_pago.trim()}`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Manda por WhatsApp el link público (?intake=1&iid=<id>) del formulario de datos/fotos para
  // que el cliente lo llene él mismo, en vez de que el admin capture todo a mano.
  const handleEnviarFormularioDatos = (row: InvitacionGuardadaRow) => {
    if (!row.telefono_whatsapp?.trim()) {
      mostrarToast("Esta invitación no tiene un número de WhatsApp guardado", "error");
      return;
    }
    const numeroLimpio = row.telefono_whatsapp.replace(/[^0-9]/g, "");
    const urlFormulario = `${window.location.origin}/?intake=1&iid=${row.id}`;
    const msg = `¡Hola! 🌸 Para seguir con tu invitación de XV Años de *${row.nombre_quinceanera || "tu evento"}*, por favor llena tus datos y sube tus fotos en este link:\n${urlFormulario}`;
    window.open(`https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Exporta la lista de "Mis Invitaciones" (respetando los filtros/búsqueda activos) a un CSV
  // descargable, para llevar cuentas fuera de la app (Excel, contador, etc.).
  const escapeCSV = (valor: string | number | null | undefined): string => {
    const texto = String(valor ?? "");
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const handleExportarInvitacionesCSV = () => {
    const encabezados = ["Nombre", "Tema", "Fecha del evento", "Estatus", "Teléfono", "Precio total", "Precio pagado", "Falta pagar", "Pases pagado", "PDF pagado", "Notas"];
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
      const htmlCompleto = generarHTMLFinal(datos, temaActual);

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
      problemas.push("Falta el nombre de la quinceañera");
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
    return problemas;
  };

  const getShareUrl = (invitadoIndex = selectedInvitadoIndex) => {
    const appUrl = window.location.origin + "/";
    const invitadoObjetivo =
      invitadoIndex !== -1 && datos.invitados && datos.invitados[invitadoIndex]
        ? datos.invitados[invitadoIndex]
        : null;

    // Sincronizar el tema activo de forma explícita en los datos decodificables antes de codificar la URL
    const datosListos = {
      ...datos,
      tema: selectedTemaId,
      invitados: invitadoObjetivo ? [invitadoObjetivo] : []
    };

    let url = `${appUrl}?v=1&d=${encodeState(datosListos)}`;
    if (invitadoObjetivo) {
      url += `&g=${encodeURIComponent(invitadoObjetivo.nombre)}`;
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
  const MUESTRA_DIAS_VIGENCIA = 5;
  const aplicarModoMuestra = (url: string): string => {
    if (!esEnlaceMuestra) return url;
    const exp = Date.now() + MUESTRA_DIAS_VIGENCIA * 24 * 60 * 60 * 1000;
    return `${url}&muestra=1&exp=${exp}`;
  };

  // Compartir datos de la invitación final por WhatsApp
  const handleEnviarWhatsApp = (overrideInvitadoIndex?: number) => {
    const targetIndex = typeof overrideInvitadoIndex === "number" ? overrideInvitadoIndex : selectedInvitadoIndex;
    const urlFinal = aplicarModoMuestra(getShareUrl(targetIndex));
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
      const url = await subirACloudinary(file);
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
      const url = await subirACloudinary(file);
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
      const url = await subirACloudinary(file);
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
      const pases = parseInt(match[2], 10);
      return { nombre: match[1].trim(), pases: pases > 0 ? pases : 1 };
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
  const muestraExpirada = !!muestraExp && Date.now() > parseInt(muestraExp, 10);

  // Reemplazar el DOM de la página para la vista de los invitados (isViewMode = true)
  // Esto elimina las restricciones severas de iframe y sandbox del navegador,
  // permitiendo que el copiado de cuentas de banco, itinerarios, música y mapas funcionen de manera nativa y confiable.
  useEffect(() => {
    if (isViewMode && !muestraExpirada) {
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
        htmlContent = htmlContent.replace(/<body([^>]*)>/i, `<body$1>${bannerHTML}`);
      }

      document.open();
      document.write(htmlContent);
      document.close();
    }
  }, [isViewMode, datos, temaActual, esVistaDeMuestra, muestraExpirada]);

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
  useEffect(() => {
    if (isEmbedMode) {
      const embedTema = temas.find(t => t.id === initialCatalogTemaId) || temas[0];
      const datosEmbed = getDatosVisualizacionCatalog(embedTema, datos);
      const htmlContent = generarHTMLFinal({ ...datosEmbed, seccionesExcluidas: [...(datosEmbed.seccionesExcluidas || []), "apertura"] }, embedTema);

      document.open();
      document.write(htmlContent);
      document.close();
    }
  }, [isEmbedMode, initialCatalogTemaId, datos]);

  if (isEmbedMode) {
    return <div className="w-screen h-screen fixed inset-0 bg-white" />;
  }

  if (isIntakeMode) {
    return <IntakeForm invitacionId={intakeInvitacionId} />;
  }

  if (isCatalogMode) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col animate-fadeIn">
        {/* ENCABEZADO DENTRO DE VISTA CATALOGO */}
        {selectedCatalogTemaId ? (
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCatalogTemaId(null)}
                className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer"
              >
                ← Volver al Catálogo
              </button>
              <div>
                <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Visualizando Demo Interactiva</h2>
                <p className="text-xs font-extrabold text-indigo-600 flex items-center gap-1">
                  {temas.find(t => t.id === selectedCatalogTemaId)?.nombre || "Tema Elegido"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <a
                href="https://w.app/invitamx"
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
                Explora cada uno de nuestros 12 temas exclusivos con todos los efectos interactivos en vivo: música, mapas de ceremonia, control de pases de invitados y galerías de fotos.
              </p>
            </div>
          </header>
        )}

        {/* CONTAINER DEL CONTENIDO */}
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
          {selectedCatalogTemaId ? (
            /* Render del Demo en vivo dentro de un iframe interactivo */
            <div className="w-full h-[calc(100vh-140px)] rounded-2xl border border-slate-200 overflow-hidden shadow-xl bg-white">
              <iframe
                srcDoc={generarHTMLFinal({ ...getDatosVisualizacionCatalog(temas.find(t => t.id === selectedCatalogTemaId) || temas[0], datos), seccionesExcluidas: ["apertura"] }, temas.find(t => t.id === selectedCatalogTemaId) || temas[0])}
                className="w-full h-full border-0"
                title="Invitación Demo en Vivo"
              />
            </div>
          ) : (
            /* Listado de tarjetas de catálogo de todos los temas */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {temas.filter(t => !t.oculto).map((t, idx) => {
                  const isDarkTheme = t.id === "celestial" || t.id === "princesa-elegante" || t.id === "neon";
                  const isVisorOscuro = t.id === "celestial" || t.id === "neon";
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
                  if (t.id === "marmol-oro") descripcion = "Sofisticado, contemporáneo y ultra premium. Vetas de mármol pulido realzado con costuras de oro pulido 💎";
                  if (t.id === "neon") descripcion = "Ciberpunk, vibrante y electrizante. Un fondo oscuro de noche urbana iluminado con espectaculares destellos de luz de neón rosa, cian y amarillo-bizarro ⚡";

                  return (
                    <div 
                      key={t.id} 
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-300 flex flex-col h-full"
                    >
                      {/* Cabecera visual del tema + Mini Vista Previa Interactiva en Vivo en forma de Celular */}
                      <div className="relative h-80 overflow-hidden border-b border-slate-150 group flex items-center justify-center select-none" style={{ backgroundColor: lightBgColor }}>
                        
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
                        <div className="relative z-10 w-[154px] h-[262px] bg-slate-100 rounded-[28px] p-[3.5px] border-[2px] border-slate-300 shadow-[0_12px_30px_-5px_rgba(15,23,42,0.15),0_8px_16px_-6px_rgba(15,23,42,0.1)] flex flex-col transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-300 group-hover:shadow-[0_18px_38px_-8px_rgba(99,102,241,0.22),0_8px_18px_rgba(15,23,42,0.12)]">
                          
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
                              <LazyIframe t={t} index={idx} datos={datos} />
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
                                Sofía Valeria
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
                            onClick={() => setSelectedCatalogTemaId(t.id)}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5"
                          >
                            Ver Demo en Vivo 👁️✨
                          </button>
                          <a
                            href="https://w.app/invitamx"
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
        <a href="https://w.app/invitamx" className="text-xs text-indigo-600 font-semibold underline">Contáctanos por WhatsApp</a>
      </div>
    );
  }

  // Saldo pendiente y "evento en los próximos 14 días" -- se usan tanto para los chips-resumen
  // clicables como para el filtro rápido de la lista, así que van en un solo lugar.
  const invitacionTienePendiente = (row: InvitacionGuardadaRow) =>
    row.estado !== "archivada" && ((row.precio_total || 0) - (row.precio_pagado || 0)) > 0;
  const invitacionEsProxima = (row: InvitacionGuardadaRow) => {
    if (!row.fecha_fiesta || row.estado === "archivada" || row.estado === "evento_pasado") return false;
    const dias = (new Date(row.fecha_fiesta + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return dias >= 0 && dias <= 14;
  };
  const invitacionesConSaldoPendiente = listaInvitaciones.filter(invitacionTienePendiente);
  const totalSaldoPendiente = invitacionesConSaldoPendiente.reduce((acc, r) => acc + ((r.precio_total || 0) - (r.precio_pagado || 0)), 0);
  const invitacionesProximas = listaInvitaciones.filter(invitacionEsProxima);

  // Filtro del panel "Mis Invitaciones" por nombre de la quinceañera/tema, estatus, y el chip
  // rápido de "con saldo pendiente" / "evento próximo" que se activa desde el resumen de arriba.
  const invitacionesFiltradas = (() => {
    const q = busquedaInvitaciones.trim().toLowerCase();
    return listaInvitaciones.filter(row => {
      if (filtroEstatusInvitaciones !== "todos" && (row.estado || "cotizacion") !== filtroEstatusInvitaciones) return false;
      if (filtroRapidoInvitaciones === "pendientes" && !invitacionTienePendiente(row)) return false;
      if (filtroRapidoInvitaciones === "proximos" && !invitacionEsProxima(row)) return false;
      if (!q) return true;
      const temaNombre = temas.find(t => t.id === row.tema_elegido)?.nombre || row.tema_elegido || "";
      return (row.nombre_quinceanera || "").toLowerCase().includes(q) || temaNombre.toLowerCase().includes(q);
    });
  })();

  return (
    <div className="lg:h-screen lg:overflow-hidden min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* HEADER PRINCIPAL DE LA HERRAMIENTA PRIVADA */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-sm">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">GENERADOR PRIVADO XV</h1>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full">
                ADMIN WORKSPACE
              </span>
            </div>
            <p className="text-xs text-slate-500">Diseña, compila y exporta invitaciones de 15 años profesionales en segundos.</p>
          </div>
        </div>

        {/* ACCIONES DEL FORMULARIO */}
        <div id="control-panel-actions" className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={actualizarVistaPrevia} 
            className={`px-3.5 py-2 ${generandoEnlace ? 'bg-emerald-650 text-white border-emerald-600 font-extrabold scale-102 shadow-md' : 'bg-white hover:bg-indigo-50/20 hover:border-indigo-200 text-slate-700 border border-slate-200'} text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-300 cursor-pointer shadow-sm`}
            title="Sincronizar y generar enlace con tus cambios actuales"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generandoEnlace ? 'text-white animate-spin' : 'text-indigo-600'}`} />
            <span>{generandoEnlace ? "¡Sincronizado! ✨" : "Generar invitación"}</span>
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

          <button 
            onClick={handleLimpiarFormulario} 
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Limpiar</span>
          </button>

          <button
            onClick={handleDescargarHTML}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer transform active:scale-95"
            id="descargar-btn"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Descargar index.html</span>
          </button>

          <button
            onClick={() => {
              setMostrarMisInvitaciones(true);
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
              const finalLink = getShareUrl();
              guardarEnSupabase(datos, temaActual, finalLink, supabaseRowId)
                .then((row) => {
                  if (row?.id) {
                    setSupabaseRowId(row.id);
                    try { localStorage.setItem('xv_supabase_row_id', row.id); } catch {}
                  }
                  mostrarToast('✅ Guardado en Supabase correctamente', 'success');
                })
                .catch(() => mostrarToast('❌ Error al guardar', 'error'));
            }}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <span>💾 Guardar en Supabase</span>
          </button>

          <button
            onClick={handleDescargarPDF}
            disabled={generandoPDF}
            title={datos.paquete === "deluxe" ? "Incluido sin costo extra en el paquete Deluxe" : "Complemento a la carta en este paquete — confirma que el cliente ya lo pagó antes de entregarlo"}
            className="px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer transform active:scale-95"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>{generandoPDF ? "Generando PDF..." : "🎁 Descargar PDF de Regalo"}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${datos.paquete === "deluxe" ? "bg-white/25" : "bg-black/20"}`}>
              {datos.paquete === "deluxe" ? "Incluido" : "A la carte"}
            </span>
          </button>
        </div>
      </header>

      {/* DASHBOARD PRINCIPAL DE TRABAJO */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:overflow-hidden">
        
        {/* PANEL IZQUIERDO: SECCIONES DE CONFIGURACIÓN Y FORMULARIO */}
        <aside className="w-full lg:w-[48%] xl:w-[45%] border-r border-slate-200 flex flex-col bg-white shrink-0 lg:h-full lg:overflow-hidden">
          
          {/* BARRA DE PESTAÑAS DEL EXPEDIENTE */}
          <div className="flex border-b border-slate-200 bg-white overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth shrink-0">
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

          {/* CONTENIDOR DEL FORMULARIO CON SCROLL */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

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
                      <span className="block text-[10px] font-semibold text-slate-500">O pegar link directo (se actualiza automáticamente):</span>
                      <input
                        type="text"
                        value={datos.bgImages?.[selectedTemaId] && !datos.bgImages[selectedTemaId].startsWith("data:") ? datos.bgImages[selectedTemaId] : ""}
                        onChange={(e) => handleBgImageUrlChange(e.target.value)}
                        placeholder="El fondo se mostrará aquí al subir..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 text-[11px] outline-none font-mono"
                      />
                      <span className="text-[9px] text-slate-500 italic">💾 Los fondos se guardan automáticamente y persisten para cada tema</span>
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
                    <div className="flex items-center justify-between">
                      <div className="pr-3">
                        <span className="block text-xs font-bold text-slate-800">
                          Cajas de fondo en textos de secciones
                        </span>
                        <span className="block text-[11px] text-slate-500 leading-normal mt-0.5">
                          Apaga o enciende los cajones/tarjetas blancas y translúcidas donde se presentan los textos principales (iglesia, salón, mesa de regalos, etc.). Si los apagas, los textos se mostrarán directamente sobre el fondo general.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={datos.mostrarCajasSecciones !== false}
                          onChange={(e) => setDatos({ ...datos, mostrarCajasSecciones: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-550"></div>
                        <span className="ml-2 text-xs font-bold text-pink-700 w-12 text-right uppercase">
                          {datos.mostrarCajasSecciones !== false ? "ON" : "OFF"}
                        </span>
                      </label>
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {TIPOS_APERTURA.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), tipoApertura: t.id } }))}
                            className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${(datos.personalizacion?.tipoApertura || tipoAperturaPorDefectoDelTema(temaActual.id)) === t.id ? "border-purple-500 bg-purple-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
                          >
                            <span className="block text-xs font-bold text-slate-700">{t.nombre}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">{t.desc}</span>
                          </button>
                        ))}
                      </div>
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
                            🎀 Muestra (5 días)
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
                            onClick={() => {
                              navigator.clipboard.writeText(aplicarModoMuestra(getShareUrl()))
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
                    
                    <div className="border-t border-emerald-100/50 pt-2.5">
                      <p className="text-[10px] text-slate-500 font-medium">
                        El link de edición se actualizará automáticamente con tus cambios actuales para que el destinatario los visualice en su simulación.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ENLACE DEL CATÁLOGO DE DEMOS */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    4. Catálogo Digital de Temas (Demos Interactivas)
                  </h3>
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100/70 rounded-xl space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">
                      Genera y comparte un link público para que tus clientes o invitados visualicen un precioso catálogo con botones para probar en vivo la demo interactiva de cada uno de los 12 temas.
                    </p>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Enlace de Tu Catálogo de Temas 🔗</label>
                      <div className="flex gap-1.5 w-full">
                        <input
                          type="text"
                          readOnly
                          value={getCatalogUrl()}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-[10px] outline-none font-mono truncate"
                          title="Haz clic en copiar para compartir este link de catálogo de demostraciones en vivo"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const catUrl = getCatalogUrl();
                            navigator.clipboard.writeText(catUrl)
                              .then(() => mostrarToast("¡Enlace del Catálogo de Temas copiado con éxito! 📂✨ Admite navegación por todos los demos en vivo.", "success"))
                              .catch(err => mostrarToast("Error al copiar enlace: " + err, "error"));
                          }}
                          className="px-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs"
                          title="Copiar enlace del catálogo"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          // Deferimos la actualización pesada del estado para mantener la interactividad instantánea (INP óptimo)
                          setTimeout(() => {
                            setIsCatalogMode(true);
                          }, 0);
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-indigo-500/10 font-sans"
                      >
                        <Sparkles className="w-4 h-4" />
                        Abrir / Probar Catálogo de Temas 👁️
                      </button>
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
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5">Nombre de la Quinceañera *</label>
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
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5">Fecha y Hora del Evento Principal *</label>
                  <input
                    type="datetime-local"
                    value={datos.fecha ? datos.fecha.substring(0, 16) : ""}
                    onChange={(e) => setDatos({ ...datos, fecha: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Usa la hora de la Ceremonia Principal para calcular la cuenta regresiva.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5">Mensaje de Bienvenida / Agradecimiento</label>
                  <textarea
                    rows={4}
                    value={datos.mensajeBienvenida}
                    onChange={(e) => setDatos({ ...datos, mensajeBienvenida: e.target.value })}
                    placeholder="Escribe el poema, dedicatoria o palabras de bienvenida para los invitados..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5">Hashtag de Redes Sociales (Opcional)</label>
                  <input
                    type="text"
                    value={datos.hashtag}
                    onChange={(e) => setDatos({ ...datos, hashtag: e.target.value })}
                    placeholder="Ej. #SophiaValeriaXV"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5">WhatsApp de Confirmación de Asistencia (Lada + Número)*</label>
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
                  <label className="block text-xs font-semibold text-slate-650 mb-1.5">Enlace a Música de Fondo (Debe ser un .mp3 público)*</label>
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
                        <span className="block text-xs font-semibold text-slate-650">Subir nueva Foto de Portada (Directo a Cloudinary)</span>
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
                        <label className="block text-xs font-semibold text-slate-650 mb-1">
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
                  <h3 className="text-sm font-semibold text-indigo-600 mb-3">Padres de la Quinceañera</h3>
                  
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
                        onChange={(e) => setNuevoInvitadoPases(parseInt(e.target.value) || 1)}
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
                    <span className="text-[11px] uppercase font-bold text-slate-500 block mb-2">
                      Invitados inscritos ({datos.invitados?.length || 0}):
                    </span>

                    {datos.invitados && datos.invitados.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50">
                        {datos.invitados.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-slate-250 hover:bg-slate-100">
                            <div>
                              <span className="text-xs font-semibold text-slate-800">{item.nombre}</span>
                              <span className="ml-2 text-[10px] text-indigo-600 font-extrabold font-mono">({item.pases} pases)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {/* Botón copiar link del invitado */}
                              <button
                                onClick={() => {
                                  const customLink = getShareUrl(index);
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

                              <button 
                                onClick={() => handleEliminarInvitado(index)}
                                className="p-1 hover:text-rose-600 text-slate-400 rounded transition overflow-hidden cursor-pointer"
                                title="Eliminar invitado"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            </div>
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
                  <p className="text-xs text-slate-500 mb-4">Tipografías, color de acento y tipo de apertura, para invitaciones que el cliente pidió totalmente personalizadas.</p>
                </div>

                {datos.tema !== "personalizado" ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
                    ⚠️ Esta personalización solo aplica al tema <strong>"Personalizado 🎨 (A Medida)"</strong>. Selecciona ese tema en la pestaña <strong>Tema/Paquete</strong> para habilitar estos controles.
                  </div>
                ) : (
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {TIPOS_APERTURA.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setDatos(prev => ({ ...prev, personalizacion: { ...(prev.personalizacion || {}), tipoApertura: t.id } }))}
                            className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${(datos.personalizacion?.tipoApertura || tipoAperturaPorDefectoDelTema(temaActual.id)) === t.id ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
                          >
                            <span className="block text-xs font-bold text-slate-700">{t.nombre}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">{t.desc}</span>
                          </button>
                        ))}
                      </div>
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
                )}
              </div>
            )}

          </div>

          {/* PIE DE PANEL INFORMAL */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <span className="text-[10px] text-slate-500 font-sans font-medium">Generador de Invitaciones de XV Años</span>
            <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Acceso Privado</span>
          </div>

        </aside>

        {/* PANEL DERECHO: VISTA PREVIA MULTIDISPOSITIVO (OPTIMIZADO PARA TRABAJO EN PC) */}
        <section className="flex-1 bg-slate-100 flex flex-col relative overflow-hidden lg:h-full">
          
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${previewDevice === "mobile" ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                title="Simulador de Smartphone Celular"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Móvil</span>
              </button>
              <button
                type="button"
                onClick={() => { setPreviewDevice("tablet"); setPreviewZoom(0.65); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${previewDevice === "tablet" ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                title="Simulador de Tablet / iPad"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${previewDevice === "desktop" ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
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
          <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center relative min-h-0 bg-slate-100/50">
            {/* Fondo decorativo blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
            
            <div 
              className="relative transition-all duration-300 ease-out z-10 flex flex-col items-center justify-center"
              style={{
                width: previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%",
                height: previewDevice === "mobile" ? "720px" : previewDevice === "tablet" ? "980px" : "100%",
                transform: previewDevice !== "desktop" ? `scale(${previewZoom})` : "none",
                transformOrigin: "center center",
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

          {/* BARRA INFERIOR DE ACCIONES DE VISTA PREVIA (FIRMADO Y CATÁLOGO DE ESTE TEMA) */}
          <div className="bg-white border-t border-slate-200 p-4 shrink-0 flex flex-col items-center justify-center gap-2 z-10">
            <div className="w-full max-w-md px-4 flex flex-col items-center gap-1.5">
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
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                title="Guarda esta invitación como la versión activa de este tema en el catálogo"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Guardar Diseño en Catálogo de este Tema 🌸
              </button>

              <div className="flex items-center justify-between w-full text-[11px] text-slate-500 font-medium px-1">
                <div className="flex items-center gap-1.5">
                  {tieneDiseñoGuardado ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span>✓</span> Diseño personalizado activo
                    </span>
                  ) : (
                    <span className="text-slate-400">Usando diseño predeterminado</span>
                  )}
                </div>

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
                    className="text-rose-500 hover:text-rose-700 transition font-bold underline cursor-pointer select-none"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-medium text-center leading-normal max-w-xl">
              La simulación representa cómo se verá el archivo final según la pantalla. La música, animaciones de caída {datos.mostrarAnimacionCaida !== false ? '("ON")' : '("OFF")'} y efectos táctiles están incluidos.
            </p>
          </div>

        </section>

      </div>

      {/* NOTIFICACIÓN TOAST INLINE */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] max-w-sm bg-white border border-slate-150 rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-slideIn animate-duration-300">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            toast.tipo === "success" ? "bg-emerald-50 text-emerald-650" :
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn">
            <h4 className="text-sm font-extrabold text-slate-900 mb-2">{confirmModal.titulo}</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">{confirmModal.mensaje}</p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
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
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-lg transition cursor-pointer shadow-sm"
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

      {mostrarMisInvitaciones && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-4xl w-full shadow-2xl animate-scaleIn max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-extrabold text-slate-900">📋 Mis Invitaciones</h3>
              <div className="flex items-center gap-2">
                {listaInvitaciones.length > 0 && (
                  <button
                    onClick={handleExportarInvitacionesCSV}
                    title="Descargar la lista visible como CSV (Excel)"
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                  >
                    ⬇️ CSV
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
              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  onClick={() => setFiltroRapidoInvitaciones(prev => prev === "pendientes" ? "ninguno" : "pendientes")}
                  disabled={invitacionesConSaldoPendiente.length === 0}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition disabled:opacity-40 disabled:cursor-not-allowed ${filtroRapidoInvitaciones === "pendientes" ? "bg-amber-600 border-amber-600 text-white" : "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"}`}
                >
                  💰 {invitacionesConSaldoPendiente.length} con saldo pendiente (${totalSaldoPendiente.toLocaleString("es-MX")} MXN)
                </button>
                <button
                  onClick={() => setFiltroRapidoInvitaciones(prev => prev === "proximos" ? "ninguno" : "proximos")}
                  disabled={invitacionesProximas.length === 0}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition disabled:opacity-40 disabled:cursor-not-allowed ${filtroRapidoInvitaciones === "proximos" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100"}`}
                >
                  📅 {invitacionesProximas.length} con evento en los próximos 14 días
                </button>
              </div>
            )}

            {listaInvitaciones.length > 0 && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={busquedaInvitaciones}
                  onChange={(e) => setBusquedaInvitaciones(e.target.value)}
                  placeholder="🔎 Buscar por nombre de la quinceañera o tema..."
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
              </div>
            )}

            {cargandoMisInvitaciones ? (
              <p className="text-sm text-slate-500 py-8 text-center">Cargando invitaciones guardadas desde Supabase...</p>
            ) : listaInvitaciones.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">Aún no has guardado ninguna invitación. Usa "💾 Guardar en Supabase" para que aparezca aquí.</p>
            ) : invitacionesFiltradas.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">Ninguna invitación coincide con estos filtros{busquedaInvitaciones ? ` ("${busquedaInvitaciones}")` : ""}.</p>
            ) : (
              <div className="space-y-3">
                {invitacionesFiltradas.map((row) => {
                  const tema = temas.find(t => t.id === row.tema_elegido);
                  const vigenciaVencida = !!row.activo_hasta && new Date(row.activo_hasta).getTime() < Date.now();
                  const esLaCargada = row.id === supabaseRowId;
                  return (
                    <div key={row.id} className={`border rounded-xl p-4 ${esLaCargada ? "border-indigo-400 bg-indigo-50/40" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="block text-sm font-bold text-slate-900">{row.nombre_quinceanera || "Sin nombre"}</span>
                            {esLaCargada && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold uppercase">Abierta ahora</span>
                            )}
                            {vigenciaVencida && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold uppercase">Vigencia vencida</span>
                            )}
                            {row.intake_actualizado_en ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold" title={new Date(row.intake_actualizado_en).toLocaleString("es-MX")}>
                                📋 Cliente respondió {new Date(row.intake_actualizado_en).toLocaleDateString("es-MX")}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-bold">📋 Sin respuesta del cliente</span>
                            )}
                          </div>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {tema?.nombre || row.tema_elegido || "Sin tema"} · {row.fecha_fiesta ? new Date(row.fecha_fiesta + "T00:00:00").toLocaleDateString("es-MX") : "Sin fecha"}
                          </span>
                          {!row.datos_completos && (
                            <span className="block text-[10px] text-amber-600 font-semibold mt-1">⚠️ Guardada antes de esta función — solo se puede ver el resumen, no reabrir para editar.</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleAbrirInvitacionGuardada(row)}
                            disabled={!row.datos_completos}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded-lg transition"
                          >
                            Abrir en editor
                          </button>
                          <button
                            onClick={() => handleDuplicarInvitacionGuardada(row)}
                            disabled={!row.datos_completos}
                            title="Duplicar como punto de partida para un cliente nuevo"
                            className="p-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDescargarRespaldoInvitacion(row)}
                            disabled={!row.datos_completos}
                            title="Descargar respaldo completo (JSON) de esta invitación"
                            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminarInvitacionGuardada(row)}
                            className="p-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-500 rounded-lg transition"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-2 flex-wrap">
                        <label className="text-[10px] font-bold text-slate-600">Activa hasta:</label>
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
                        <button
                          onClick={() => setInvitacionPagosExpandidaId(prev => prev === row.id ? null : row.id)}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                        >
                          💳 {invitacionPagosExpandidaId === row.id ? "Ocultar pagos" : "Pagos y estatus"}
                        </button>
                        <button
                          onClick={() => toggleConfirmacionesInvitacion(row)}
                          className="ml-auto text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          👥 {invitacionExpandidaId === row.id ? "Ocultar confirmaciones" : "Ver confirmaciones"}
                          {confirmacionesPorInvitacion[row.id] && (
                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{confirmacionesPorInvitacion[row.id].length}</span>
                          )}
                        </button>
                      </div>

                      {invitacionPagosExpandidaId === row.id && (() => {
                        const precioSugerido = paquetes[(row.datos_completos?.paquete || "basico")].precio.replace(/[^0-9.]/g, "");
                        const falta = (row.precio_total || 0) - (row.precio_pagado || 0);
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
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

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-1">Precio total ($ MXN)</label>
                                <input
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

                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={row.pases_pagado}
                                  onChange={(e) => handleActualizarCampoInvitacion(row, "pases_pagado", e.target.checked)}
                                />
                                Á la carte "pases" pagado
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={row.pdf_pagado}
                                  onChange={(e) => handleActualizarCampoInvitacion(row, "pdf_pagado", e.target.checked)}
                                />
                                Á la carte "PDF" pagado
                              </label>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block mb-1">Link de pago (Mercado Pago, PayPal.me, etc.)</label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  defaultValue={row.link_pago || ""}
                                  onBlur={(e) => handleActualizarCampoInvitacion(row, "link_pago", e.target.value || null)}
                                  placeholder="Pega aquí el link de pago..."
                                  className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 outline-none focus:border-indigo-500 font-mono"
                                />
                                <button
                                  onClick={() => handleEnviarLinkPago(row)}
                                  className="px-2.5 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-lg text-[10px] font-bold transition whitespace-nowrap"
                                >
                                  Enviar
                                </button>
                              </div>
                            </div>

                            <div>
                              <button
                                onClick={() => handleEnviarFormularioDatos(row)}
                                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-bold transition"
                              >
                                📋 Enviar formulario de datos y fotos al cliente
                              </button>
                              <p className="text-[9px] text-slate-400 mt-1">El cliente llena fecha, ceremonia/recepción, itinerario, padrinos y sube sus fotos directamente — se guarda solo en esta invitación.</p>
                            </div>

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

                      {invitacionExpandidaId === row.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60">
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
                            const copiarRecordatorio = (nombreInvitado: string) => {
                              const msg = `¡Hola ${nombreInvitado}! 🌸 Nos encantaría contar con tu confirmación de asistencia a los XV años de ${row.nombre_quinceanera || "nuestra fiesta"}. ¿Nos confirmas cuando puedas? ¡Gracias!`;
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
