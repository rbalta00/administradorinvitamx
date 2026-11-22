export interface InvitacionDatos {
  paquete: "basico" | "premium" | "deluxe";
  tema: string;
  /** Tipo de evento (2026-11-19): solo cambia las PALABRAS que ve el invitado (ver
   *  `textosEvento` en templates.ts) -- nunca los temas, paquetes, precios, secciones
   *  disponibles ni el resto del comportamiento. Ausente o un valor desconocido = "xv"
   *  (el comportamiento de siempre), para que cualquier invitación guardada antes de este
   *  campo se siga generando idéntica. */
  tipoEvento?: "xv" | "boda" | "cumpleanos" | "bautizo" | "primera-comunion" | "graduacion" | "baby-shower" | "aniversario";
  /** Código del link corto (`/v/<codigoCorto>`, 2026-11-19) -- slug del nombre + 4 caracteres
   *  aleatorios (ver generarCodigoCortoUnico en App.tsx), asignado la primera vez que la
   *  invitación se guarda en Supabase. Nunca cambia una vez asignado -- una fila NUEVA (alta o
   *  "Duplicar como cliente nuevo") siempre recibe el suyo propio, nunca hereda el de otra. No
   *  viaja en el blob `d` de los links largos (no está en KEY_MAP a propósito): solo vive en la
   *  fila de Supabase, resuelta por src/App.tsx al abrir `/v/<codigoCorto>`. */
  codigoCorto?: string;
  nombre: string;
  fecha: string;
  mensajeBienvenida: string;
  ceremonia: {
    lugar: string;
    hora: string;
    direccion: string;
    maps: string;
  };
  recepcion: {
    lugar: string;
    hora: string;
    direccion: string;
    maps: string;
  };
  itinerario: Array<{
    hora: string;
    evento: string;
    icono?: string;
  }>;
  dressCode: string;
  colorSugerido: string[];
  padres: string[];
  padrinos: string[];
  mesaRegalos: string;
  datosBancarios: string;
  fotos: string[];
  fotoPortada?: string;
  mostrarFotoPortada?: boolean;
  mostrarCajasSecciones?: boolean;
  /** Reemplaza a mostrarCajasSecciones con una tercera opción ("solo_borde"). Si no está
   *  definido, se deriva de mostrarCajasSecciones (ver App.tsx/generarHTMLFinal) para no
   *  cambiarle el look a invitaciones guardadas antes de este campo. */
  estiloCajasSecciones?: "normal" | "sin_cajon" | "solo_borde";
  /** Formato de la sección "Mi Álbum de Fotos". Si no está definido se usa "grid" (el look de
   *  siempre), para no cambiarle el look a invitaciones guardadas antes de este campo. */
  estiloGaleria?: "grid" | "carrusel" | "polaroid";
  hashtag: string;
  whatsappConfirmacion: string;
  cancion: string;
  linkPersonalizado: string;
  invitados: Array<{
    nombre: string;
    pases: number;
    /** Acomodo de mesas: texto libre ("Mesa 5", "Familia Gómez", etc.), opcional -- si no está
     *  asignada no se muestra nada en el pase del invitado. */
    mesa?: string;
  }>;
  /** Complemento à la carte "Control de Acceso QR" (requiere que la sección "pases" esté
   *  activa -- ver toggle junto a SeccionesToggleList en App.tsx). Cuando es true, cada pase
   *  de familia muestra un QR de check-in en generarHTMLFinal (ver mostrarPaseFijo en
   *  templates.ts) que apunta a /?checkin=1&iid=...&fam=... */
  controlAccesoQR?: boolean;
  bgImages?: Record<string, string>;
  /** Fondos "listos" de galería elegidos por EVENTO (2026-11-22, ver `fondosListos.ts` y
   *  `resolverFondoEfectivo` en templates.ts) -- a diferencia de `bgImages` (subido a mano,
   *  por TEMA), este fondo se elige con un clic de una galería de fondos predefinidos y se
   *  recuerda SOLO dentro de esta invitación, un fondo distinto por cada tipo de evento que
   *  esta invitación haya tenido. Al cambiar el tipo de evento, la invitación muestra el
   *  fondo de galería de ESE evento (si tiene uno elegido) o cae al comportamiento de
   *  siempre (bgImages/el default del tema) -- nunca toca el catálogo de temas ni la fila
   *  global `fondos_personalizados`. La unión de llaves duplica a propósito la de
   *  `tipoEvento` arriba (no se puede referenciar ese campo desde su propio tipo sin crear
   *  un tipo recursivo más confuso de leer). */
  fondosGaleriaPorEvento?: Partial<Record<
    "xv" | "boda" | "cumpleanos" | "bautizo" | "primera-comunion" | "graduacion" | "baby-shower" | "aniversario",
    string
  >>;
  /** Opacidad (0-1) del velo que se pone encima del fondo personalizado para mantener el
   *  texto legible. Si no está definida, se usa el valor por tema en generarHTMLFinal
   *  (0.55 claros / 0.65 oscuros). Ver control deslizante "Nitidez del fondo" en el editor. */
  fondoVeloOpacidad?: number;
  seccionesExcluidas?: string[];
  mostrarAnimacionCaida?: boolean;
  /** Orden personalizado de las secciones de contenido (todas menos "apertura"/"cierre",
   *  que siempre quedan fijas al inicio y al final). Ver getOrdenSeccionesEfectivo en data.ts. */
  ordenSecciones?: string[];
  /** Overrides de tipografía/color/apertura. fontHeading/fontBody/fontCursive/paletaColor
   *  solo tienen efecto cuando `tema` es "personalizado" (ver generarHTMLFinal); tipoApertura
   *  y simbolosCaida, en cambio, aplican al tema activo sea cual sea. */
  personalizacion?: {
    fontHeading?: string;
    fontBody?: string;
    fontCursive?: string;
    /** Id de una paleta en PALETAS_COLOR_PERSONALIZADO (data.ts). */
    paletaColor?: string;
    tipoApertura?: "sobre" | "cortina" | "tarjeta" | "puertas" | "destellos" | "caligrafia";
    /** Set de emojis para la lluvia decorativa (ver "Efecto de Animación de Caída").
     *  Solo aplica cuando esa animación está encendida (mostrarAnimacionCaida !== false). */
    simbolosCaida?: string[];
    /** Diseño visual de la sección "Nuestro Itinerario" -- aplica al tema activo sea cual sea,
     *  igual que tipoApertura. Si no está definido o trae un valor desconocido, cae a "clasica"
     *  (el diseño original) -- ver estiloItinerarioEfectivo en templates.ts. */
    estiloItinerario?: "clasica" | "editorial" | "minimalista";
    /** Diseño visual de la Portada -- aplica al tema activo sea cual sea. Si no está definido o
     *  trae un valor desconocido, cae al default propio del tema (2026-11-19, ver
     *  estiloPortadaPorDefectoDelTema en App.tsx) -- ya no siempre "circular". Elegir "fondo"
     *  sin ninguna foto capturada cae a "circular" de todas formas (ver estiloPortadaEfectivo
     *  en templates.ts). Una elección explícita, incluyendo "circular" a propósito, siempre
     *  manda sobre el default del tema. */
    estiloPortada?: "circular" | "arco" | "fondo" | "marco";
    /** Animación de entrada por scroll de cada sección de contenido. "ninguna" (o ausente) es
     *  el comportamiento de siempre -- las secciones aparecen sin animación propia (solo la
     *  portada anima al cargar, como hoy). "suave" activa un IntersectionObserver con
     *  fallback seguro (nunca deja contenido oculto si algo falla) -- ver DOMContentLoaded en
     *  templates.ts. */
    animacionScroll?: "ninguna" | "suave";
    /** Diseño visual de la Cuenta Regresiva -- aplica al tema activo sea cual sea. Si no está
     *  definido o trae un valor desconocido, cae a "cajas" (el diseño original) -- ver
     *  estiloCuentaEfectivo en templates.ts. */
    estiloCuenta?: "cajas" | "elegante" | "linea";
  };
}

export interface PaqueteConfig {
  nombre: string;
  precio: string;
  maxFotos: number;
  secciones: string[];
}

export interface TemaConfig {
  id: string;
  nombre: string;
  fontHeading: string;
  fontBody: string;
  fontCursive?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    light: string;
    bg: string;
    border: string;
  };
  bgGradient: string;
  textDark: string;
  textLight: string;
  iconStyle: string;
  decorativeEmoji: string;
  customStyle?: string;
  /** Si es true, el tema no aparece en el catálogo público (?catalog=true) ni en las
   *  demos embebidas, pero sigue disponible en el selector del editor. Se usa para
   *  temas base pensados como lienzo en blanco para invitaciones 100% personalizadas. */
  oculto?: boolean;
}
