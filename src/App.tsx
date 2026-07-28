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
const SeccionesToggleList = memo(({ secciones, seccionesExcluidas, onToggle, onMover }: {
  secciones: string[];
  seccionesExcluidas: string[];
  onToggle: (secName: string) => void;
  onMover: (secName: string, direccion: 1 | -1) => void;
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
            <span className={`text-[11px] font-bold truncate ${isEnabled ? 'text-emerald-900' : 'text-slate-500'}`}>
              {label}
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

  // Estado principal de los datos de la invitación
  const [datos, setDatos] = useState<InvitacionDatos>(initialDatos);

  // Sincronizar modo con parámetro: ?catalog=true muestra catálogo, sin parámetro muestra generador
  useEffect(() => {
    setIsCatalogMode(isCatalogMode_url);
  }, [isCatalogMode_url]);

  // Cargar fondos personalizados desde Supabase al iniciar
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

  // Manejo de carga de imágenes de fondo por tema por separado
  const handleBgImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoCloudinary(true);
    try {
      const url = await subirACloudinary(file);
      
      // Guardar en el almacenamiento persistente global de fondos
      try {
        const savedBgs = localStorage.getItem('xv_fondos_personalizados');
        const customBgs = savedBgs ? JSON.parse(savedBgs) : {};
        customBgs[selectedTemaId] = url;
        localStorage.setItem('xv_fondos_personalizados', JSON.stringify(customBgs));

        // Guardar también en Supabase para sincronizar entre dispositivos
        try {
          if (window.supabaseClient) {
            const supabase = window.supabaseClient;
            // Usar upsert para actualizar o crear si no existe
            await supabase
              .from('invitaciones')
              .upsert([{
                id: FONDOS_ROW_ID,
                nombre_quinceanera: datos.nombre || 'Sin nombre',
                tema_elegido: selectedTemaId,
                fondos_personalizados: customBgs,
                estado: 'fondos_personalizados',
                updated_at: new Date().toISOString()
              }], { onConflict: 'id' });
            console.log('✅ Fondo guardado en Supabase');
          }
        } catch (err) {
          console.warn("Advertencia: Error al guardar fondo en Supabase:", err);
        }
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
      // Guardar en el almacenamiento persistente global de fondos
      const savedBgs = localStorage.getItem('xv_fondos_personalizados');
      const customBgs = savedBgs ? JSON.parse(savedBgs) : {};
      customBgs[selectedTemaId] = enlaceCloudinary.trim();
      localStorage.setItem('xv_fondos_personalizados', JSON.stringify(customBgs));

      // Guardar también en Supabase para sincronizar entre dispositivos
      if (!window.supabaseClient) {
        setEstadoGuardadoLink('error');
        mostrarToast('❌ Supabase no está disponible: el link solo se guardó en este navegador', 'error');
        return;
      }

      const supabase = window.supabaseClient;
      const { error } = await supabase
        .from('invitaciones')
        .upsert([{
          id: FONDOS_ROW_ID,
          nombre_quinceanera: datos.nombre || 'Sin nombre',
          tema_elegido: selectedTemaId,
          fondos_personalizados: customBgs,
          estado: 'fondos_personalizados',
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });

      if (error) {
        console.error('Error de Supabase al guardar link:', error.message);
        setEstadoGuardadoLink('error');
        mostrarToast('❌ Error al guardar en Supabase: ' + error.message, 'error');
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

  // Optimizaciones de PC: Dispositivo de vista previa y escala de zoom
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);

  // Estados para compartir por WhatsApp
  const [whatsappDestino, setWhatsappDestino] = useState("522217445410");
  const [whatsappTemplateId, setWhatsappTemplateId] = useState("completo");
  const [selectedInvitadoIndex, setSelectedInvitadoIndex] = useState<number>(-1);

  // Estados locales para nuevos elementos interactivos de listas
  const [nuevoItinHora, setNuevoItinHora] = useState("");
  const [nuevoItinEvento, setNuevoItinEvento] = useState("");
  
  const [nuevoPadre, setNuevoPadre] = useState("");
  const [nuevoPadrino, setNuevoPadrino] = useState("");

  const [nuevoInvitadoNombre, setNuevoInvitadoNombre] = useState("");
  const [nuevoInvitadoPases, setNuevoInvitadoPases] = useState(2);

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

  // Actualizar la vista previa dentro del iframe de simulación de smartphone
  const actualizarVistaPrevia = () => {
    if (!iframeRef.current) return;
    const htmlString = generarHTMLFinal(datos, temaActual);
    
    // Asignamos el HTML al iframe usando srcdoc para evitar contaminación global de estilos y permitir scripts
    iframeRef.current.srcdoc = htmlString;

    setGenerandoEnlace(true);
    setTimeout(() => {
      setGenerandoEnlace(false);
    }, 1200);
  };

  // Escucha cambios en datos o tema para refrescar la visualización en vivo
  useEffect(() => {
    actualizarVistaPrevia();
  }, [datos, temaActual]);

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

  // Generar URL del catálogo de demos. Siempre apunta al despliegue público sin
  // protección SSO (invitacionmx-demo.vercel.app) para que el link funcione para
  // cualquier cliente, sin importar desde dónde se genere (editor privado, localhost, etc.).
  //
  // Importante: NO se codifica `datos` aquí. Este link se pensó para reutilizarse muchas
  // veces con distintos clientes potenciales, y si incluyera el estado de la invitación que
  // esté abierta en ese momento en el editor, filtraría datos privados de un cliente real
  // (cuenta bancaria, lista de invitados, teléfono) de forma decodificable en la URL. El
  // catálogo no necesita esos datos: los fondos personalizados por tema ya se sincronizan
  // vía Supabase para cualquiera que abra la página.
  const getCatalogUrl = () => {
    const appUrl = "https://invitacionmx-demo.vercel.app/";
    return `${appUrl}?catalog=true`;
  };

  // Generar URL de compartir con todos los datos y el invitado seleccionado. Siempre apunta
  // al despliegue público sin protección SSO (invitacionmx-demo.vercel.app) para que los
  // invitados reales puedan abrir su invitación sin toparse con el login de Vercel.
  const getShareUrl = (invitadoIndex = selectedInvitadoIndex) => {
    const appUrl = "https://invitacionmx-demo.vercel.app/";

    // Sincronizar el tema activo de forma explícita en los datos decodificables antes de codificar la URL
    const datosListos = {
      ...datos,
      tema: selectedTemaId
    };

    let url = `${appUrl}?v=1&d=${encodeState(datosListos)}`;
    if (invitadoIndex !== -1 && datos.invitados && datos.invitados[invitadoIndex]) {
      url += `&g=${encodeURIComponent(datos.invitados[invitadoIndex].nombre)}`;
    }
    return url;
  };

  // Compartir datos de la invitación final por WhatsApp
  const handleEnviarWhatsApp = (overrideInvitadoIndex?: number) => {
    const targetIndex = typeof overrideInvitadoIndex === "number" ? overrideInvitadoIndex : selectedInvitadoIndex;
    const urlFinal = getShareUrl(targetIndex);
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

  // Reemplazar el DOM de la página para la vista de los invitados (isViewMode = true)
  // Esto elimina las restricciones severas de iframe y sandbox del navegador,
  // permitiendo que el copiado de cuentas de banco, itinerarios, música y mapas funcionen de manera nativa y confiable.
  useEffect(() => {
    if (isViewMode) {
      const htmlContent = generarHTMLFinal(datos, temaActual);

      document.open();
      document.write(htmlContent);
      document.close();
    }
  }, [isViewMode, datos, temaActual]);

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
            className="px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer transform active:scale-95"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>{generandoPDF ? "Generando PDF..." : "🎁 Descargar PDF de Regalo"}</span>
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
                      className="w-full flex items-center justify-center gap-2 p-2 border border-emerald-200 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition text-emerald-700 font-semibold text-[11px]"
                    >
                      <Eye className="w-4 h-4" />
                      Ver fondos guardados ({Object.keys(datos.bgImages || {}).length} temas)
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {TIPOS_APERTURA.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setDatos(prev => ({ ...prev, tipoApertura: t.id }))}
                            className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${(datos.tipoApertura || "tarjeta") === t.id ? "border-purple-500 bg-purple-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
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
                          const actual = datos.simbolosCaida;
                          const isSelected = actual ? actual.join(",") === a.simbolos.join(",") : a.id === "elegante";
                          return (
                            <button
                              key={a.id}
                              onClick={() => setDatos(prev => ({ ...prev, simbolosCaida: a.simbolos }))}
                              className={`text-left p-2.5 rounded-xl border-2 transition cursor-pointer ${isSelected ? "border-purple-500 bg-purple-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
                            >
                              <span className="block text-base mb-1">{a.simbolos.join(" ")}</span>
                              <span className="block text-[10px] font-bold text-slate-700">{a.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">💡 Solo visible si "Efecto de Animación de Caída" está en ON</p>
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

                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Enlace de Invitación Resultante (Elección Actual)</label>
                        <div className="flex gap-1.5 w-full">
                          <input
                            type="text"
                            readOnly
                            value={getShareUrl()}
                            className="flex-1 px-3 py-2 bg-white/75 border border-slate-200 rounded-lg text-slate-600 text-[10px] outline-none font-mono truncate"
                            title="Este enlace incluye toda tu configuración guardada encriptada en tiempo real"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(getShareUrl())
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
                  <h3 className="text-sm font-semibold text-indigo-600 mb-2">Buscador de Pases Personalizados</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Introduce los nombres de las familias para que puedan consultarlo con el buscador interactivo del pase.
                  </p>

                  {/* Formulario nuevo invitado */}
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
                            onClick={() => setDatos(prev => ({ ...prev, tipoApertura: t.id }))}
                            className={`text-left p-3 rounded-xl border-2 transition cursor-pointer ${(datos.tipoApertura || "tarjeta") === t.id ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}
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
                          const actual = datos.simbolosCaida;
                          const isSelected = actual ? actual.join(",") === a.simbolos.join(",") : a.id === "elegante";
                          return (
                            <button
                              key={a.id}
                              onClick={() => setDatos(prev => ({ ...prev, simbolosCaida: a.simbolos }))}
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

            {Object.keys(datos.bgImages || {}).length === 0 ? (
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

    </div>
  );
}
