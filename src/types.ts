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
  seccionesExcluidas?: string[];
  mostrarAnimacionCaida?: boolean;
  /** Orden personalizado de las secciones de contenido (todas menos "apertura"/"cierre",
   *  que siempre quedan fijas al inicio y al final). Ver getOrdenSeccionesEfectivo en data.ts. */
  ordenSecciones?: string[];
  /** Overrides de tipografía/color/apertura para invitaciones 100% a la medida.
   *  Solo tiene efecto cuando `tema` es "personalizado" (ver generarHTMLFinal). */
  personalizacion?: {
    fontHeading?: string;
    fontBody?: string;
    fontCursive?: string;
    colorPrimario?: string;
    colorAcento?: string;
    tipoApertura?: "sobre" | "cortina" | "tarjeta";
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
