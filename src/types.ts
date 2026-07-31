export interface InvitacionDatos {
  paquete: "basico" | "premium" | "deluxe";
  tema: string;
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
  hashtag: string;
  whatsappConfirmacion: string;
  cancion: string;
  linkPersonalizado: string;
  invitados: Array<{
    nombre: string;
    pases: number;
  }>;
  bgImages?: Record<string, string>;
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
    tipoApertura?: "sobre" | "cortina" | "tarjeta";
    /** Set de emojis para la lluvia decorativa (ver "Efecto de Animación de Caída").
     *  Solo aplica cuando esa animación está encendida (mostrarAnimacionCaida !== false). */
    simbolosCaida?: string[];
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
