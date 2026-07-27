import { InvitacionDatos, PaqueteConfig, TemaConfig } from "./types";

export const paquetes: Record<"basico" | "premium" | "deluxe", PaqueteConfig> = {
  basico: {
    nombre: "Básico",
    precio: "$499 MXN",
    maxFotos: 4,
    // "pases" está disponible aquí como opción a la carta (ver datosDefault.basico, donde
    // queda apagada por default vía seccionesExcluidas) — no es exclusiva de Deluxe, el
    // cliente puede pagarla aparte y el admin la enciende manualmente para esa invitación.
    secciones: [
      "apertura",
      "portada",
      "cuenta",
      "mensaje",
      "ceremonia",
      "recepcion",
      "itinerario",
      "vestimenta",
      "galeria",
      "pases",
      "confirmacion",
      "cierre"
    ]
  },
  premium: {
    nombre: "Premium",
    precio: "$799 MXN",
    maxFotos: 8,
    // Igual que en Básico: "pases" es opcional a la carta aquí, apagada por default.
    secciones: [
      "apertura",
      "portada",
      "cuenta",
      "mensaje",
      "ceremonia",
      "recepcion",
      "itinerario",
      "vestimenta",
      "familia",
      "regalos",
      "galeria",
      "hashtag",
      "calendario",
      "pases",
      "confirmacion",
      "cierre"
    ]
  },
  deluxe: {
    nombre: "Deluxe",
    precio: "$1,199 MXN",
    maxFotos: 14,
    secciones: [
      "apertura",
      "portada",
      "cuenta",
      "mensaje",
      "ceremonia",
      "recepcion",
      "itinerario",
      "vestimenta",
      "familia",
      "regalos",
      "galeria",
      "hashtag",
      "calendario",
      "pases",
      "confirmacion",
      "cierre"
    ]
  }
};

// Calcula el orden efectivo de las secciones de CONTENIDO (todas menos "apertura" y "cierre",
// que siempre quedan fijas al inicio/final de la invitación). Si el admin guardó un orden
// personalizado (`ordenSecciones`), se respeta para las secciones que sigan disponibles en el
// paquete actual, y cualquier sección disponible que falte en ese orden (por cambio de paquete
// o por ser nueva) se agrega al final en su posición por defecto.
export function getOrdenSeccionesEfectivo(paquete: "basico" | "premium" | "deluxe", ordenSecciones?: string[]): string[] {
  const disponibles = paquetes[paquete].secciones.filter(s => s !== "apertura" && s !== "cierre");
  if (!ordenSecciones || ordenSecciones.length === 0) return disponibles;
  const ordenValido = ordenSecciones.filter(s => disponibles.includes(s));
  const faltantes = disponibles.filter(s => !ordenValido.includes(s));
  return [...ordenValido, ...faltantes];
}

export const temas: TemaConfig[] = [
  {
    id: "dorado-clasico",
    nombre: "Dorado Clásico ✨",
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    fontCursive: "Great Vibes",
    colors: {
      primary: "#D4AF37",
      secondary: "#DFBA54",
      accent: "#B8860B",
      dark: "#2A2415",
      light: "#FCF9F2",
      bg: "#FDFBF7",
      border: "#E9D295"
    },
    bgGradient: "linear-gradient(135deg, #FCF9F2 0%, #F5EEDB 100%)",
    textDark: "#3A321B",
    textLight: "#FFFFFF",
    iconStyle: "border-2 border-[#D4AF37] rounded-full text-[#D4AF37] p-2 bg-[#FCF9F2]",
    decorativeEmoji: "⚜️",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #FDFBF7;
        color: #3A321B;
      }
      .heading-text {
        font-family: 'Playfair Display', serif;
        color: #B8860B;
        letter-spacing: 0.05em;
      }
      .cursive-text {
        font-family: 'Great Vibes', cursive;
        color: #D4AF37;
      }
      .gold-card {
        border: 1px solid #E9D295;
        background: linear-gradient(145deg, #FFFFFF, #FCF9F2);
        box-shadow: 0 4px 15px rgba(212, 175, 55, 0.1);
      }
    `
  },
  {
    id: "mariposas",
    nombre: "Vuelo de Mariposas 🦋",
    fontHeading: "Cormorant Garamond",
    fontBody: "Inter",
    fontCursive: "Alex Brush",
    colors: {
      primary: "#E0B0FF",
      secondary: "#F3D5FF",
      accent: "#AB70D5",
      dark: "#2D1D3A",
      light: "#FCF5FE",
      bg: "#FFF9FF",
      border: "#E8C1F5"
    },
    bgGradient: "linear-gradient(135deg, #FCF5FE 0%, #FAECFC 100%)",
    textDark: "#3E2B4B",
    textLight: "#FFFFFF",
    iconStyle: "border border-[#AB70D5] rounded-full text-[#AB70D5] p-2 bg-[#FCF5FE] shadow-sm",
    decorativeEmoji: "🦋",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #FFF9FF;
        color: #3E2B4B;
      }
      .heading-text {
        font-family: 'Cormorant Garamond', serif;
        color: #AB70D5;
        font-weight: 600;
        letter-spacing: 0.03em;
      }
      .cursive-text {
        font-family: 'Alex Brush', cursive;
        color: #8E44AD;
      }
      .gold-card {
        border: 1px solid #E8C1F5;
        background: linear-gradient(145deg, #FFFFFF, #FCF5FE);
        box-shadow: 0 4px 15px rgba(171, 112, 213, 0.08);
        border-radius: 20px;
      }
    `
  },
  {
    id: "floral-acuarela",
    nombre: "Floral Acuarela 🌸",
    fontHeading: "Lora",
    fontBody: "Inter",
    fontCursive: "Pinyon Script",
    colors: {
      primary: "#E2879F",
      secondary: "#FCD0D9",
      accent: "#AF5B71",
      dark: "#401B24",
      light: "#FCF6F7",
      bg: "#FFFDFD",
      border: "#F5C9D3"
    },
    bgGradient: "linear-gradient(135deg, #FCF6F7 0%, #FAEDF0 100%)",
    textDark: "#4D2831",
    textLight: "#FFFFFF",
    iconStyle: "border border-[#E2879F] rounded-full text-[#E2879F] p-2 bg-[#FCF6F7]",
    decorativeEmoji: "💐",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #FFFDFD;
        color: #4D2831;
      }
      .heading-text {
        font-family: 'Lora', serif;
        color: #AF5B71;
        letter-spacing: 0.01em;
      }
      .cursive-text {
        font-family: 'Pinyon Script', cursive;
        color: #E2879F;
        font-size: 2.2rem;
      }
      .gold-card {
        border: 1px solid #F5C9D3;
        background: linear-gradient(145deg, #FFFFFF, #FCF6F7);
        box-shadow: 0 4px 15px rgba(226, 135, 159, 0.08);
      }
    `
  },
  {
    id: "celestial",
    nombre: "Místico Celestial 🌙 (Noche)",
    fontHeading: "Cinzel",
    fontBody: "Inter",
    fontCursive: "Monsieur La Doulaise",
    colors: {
      primary: "#87CEEB",
      secondary: "#1C3B57",
      accent: "#FFD700",
      dark: "#080C14",
      light: "#111B30",
      bg: "#0B132B",
      border: "#1C3B57"
    },
    bgGradient: "linear-gradient(185deg, #070B19 0%, #111B30 100%)",
    textDark: "#E2E8F0",
    textLight: "#FFFFFF",
    iconStyle: "border border-[#87CEEB]/40 rounded-full text-[#FFD700] p-2 bg-[#0B132B] shadow-[0_0_10px_rgba(135,206,235,0.2)]",
    decorativeEmoji: "✨",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #070B19;
        color: #E2E8F0;
      }
      .heading-text {
        font-family: 'Cinzel', serif;
        color: #FFD700;
        letter-spacing: 0.12em;
        text-shadow: 0 1px 8px rgba(255, 215, 0, 0.3);
      }
      .cursive-text {
        font-family: 'Monsieur La Doulaise', cursive;
        color: #87CEEB;
        font-size: 2.5rem;
      }
      .gold-card {
        border: 1px solid rgba(135, 206, 235, 0.2);
        background: linear-gradient(145deg, #111B30, #0B132B);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }
    `
  },
  {
    id: "botanico",
    nombre: "Eucalipto Botánico 🌿",
    fontHeading: "Cormorant Garamond",
    fontBody: "Inter",
    fontCursive: "Petit Formal Script",
    colors: {
      primary: "#556B2F",
      secondary: "#D0E1D4",
      accent: "#B89D4B",
      dark: "#1C281F",
      light: "#F4F7F5",
      bg: "#F8FAF8",
      border: "#C1D2C6"
    },
    bgGradient: "linear-gradient(135deg, #F4F7F5 0%, #E8EDE9 100%)",
    textDark: "#26352A",
    textLight: "#FFFFFF",
    iconStyle: "border border-[#556B2F] rounded-full text-[#556B2F] p-2 bg-[#F4F7F5]",
    decorativeEmoji: "🌿",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #F8FAF8;
        color: #26352A;
      }
      .heading-text {
        font-family: 'Cormorant Garamond', serif;
        color: #556B2F;
        font-weight: 600;
        letter-spacing: 0.04em;
      }
      .cursive-text {
        font-family: 'Petit Formal Script', cursive;
        color: #B89D4B;
        font-size: 1.25rem;
      }
      .gold-card {
        border: 1px solid #C1D2C6;
        background: linear-gradient(145deg, #FFFFFF, #F4F7F5);
        box-shadow: 0 4px 15px rgba(85, 107, 47, 0.05);
      }
    `
  },
  {
    id: "glam-rose",
    nombre: "Glam Rose Oro 💖",
    fontHeading: "Outfit",
    fontBody: "Inter",
    fontCursive: "Great Vibes",
    colors: {
      primary: "#B76E79",
      secondary: "#FCD5DB",
      accent: "#9E5561",
      dark: "#3B2226",
      light: "#FAF3F4",
      bg: "#FDF9FA",
      border: "#E8B9C1"
    },
    bgGradient: "linear-gradient(135deg, #FAF3F4 0%, #F5E3E6 100%)",
    textDark: "#4D3135",
    textLight: "#FFFFFF",
    iconStyle: "border border-[#B76E79] rounded-full text-[#B76E79] p-2 bg-[#FAF3F4] shadow-pink",
    decorativeEmoji: "💖",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #FDF9FA;
        color: #4D3135;
      }
      .heading-text {
        font-family: 'Outfit', sans-serif;
        color: #9E5561;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .cursive-text {
        font-family: 'Great Vibes', cursive;
        color: #B76E79;
      }
      .gold-card {
        border: 1px solid #E8B9C1;
        background: linear-gradient(145deg, #FFFFFF, #FAF3F4);
        box-shadow: 0 4px 15px rgba(183, 110, 121, 0.1);
      }
    `
  },
  {
    id: "boho-chic",
    nombre: "Rustique Boho Chic 🌾",
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    fontCursive: "WindSong",
    colors: {
      primary: "#C27A5B",
      secondary: "#EED9C4",
      accent: "#A0522D",
      dark: "#361D13",
      light: "#FDF8F5",
      bg: "#FEFBF9",
      border: "#E9CDBC"
    },
    bgGradient: "linear-gradient(135deg, #FDF8F5 0%, #F9EFE7 100%)",
    textDark: "#472A1E",
    textLight: "#FFFFFF",
    iconStyle: "border border-[#C27A5B] rounded-full text-[#C27A5B] p-2 bg-[#FDF8F5]",
    decorativeEmoji: "🌾",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #FEFBF9;
        color: #472A1E;
      }
      .heading-text {
        font-family: 'Playfair Display', serif;
        color: #C27A5B;
        font-weight: 600;
      }
      .cursive-text {
        font-family: 'WindSong', cursive;
        color: #A0522D;
        font-size: 2.2rem;
      }
      .gold-card {
        border: 1px solid #E9CDBC;
        background: linear-gradient(145deg, #FFFFFF, #FDF8F5);
        box-shadow: 0 4px 12px rgba(194, 122, 91, 0.07);
        border-radius: 12px;
      }
    `
  },
  {
    id: "princesa-elegante",
    nombre: "Princesa Elegante 👑 (Gala)",
    fontHeading: "Cinzel",
    fontBody: "Inter",
    fontCursive: "Pinyon Script",
    colors: {
      primary: "#1A365D",
      secondary: "#BFDBFE",
      accent: "#93C5FD",
      dark: "#0F172A",
      light: "#F0F4FE",
      bg: "#F8FAFF",
      border: "#93C5FD"
    },
    bgGradient: "linear-gradient(135deg, #F0F4FE 0%, #DCE4FC 100%)",
    textDark: "#1E293B",
    textLight: "#FFFFFF",
    iconStyle: "border-2 border-[#1A365D] rounded-full text-[#1A365D] p-2 bg-[#F0F4FE] shadow-sm",
    decorativeEmoji: "👑",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #F8FAFF;
        color: #1E293B;
      }
      .heading-text {
        font-family: 'Cinzel', serif;
        color: #1A365D;
        letter-spacing: 0.08em;
      }
      .cursive-text {
        font-family: 'Pinyon Script', cursive;
        color: #1A365D;
        font-size: 2.6rem;
      }
      .gold-card {
        border: 1px solid #BFDBFE;
        background: linear-gradient(145deg, #FFFFFF, #F0F4FE);
        box-shadow: 0 4px 15px rgba(26, 54, 93, 0.08);
      }
    `
  },
  {
    id: "marmol-oro",
    nombre: "Mármol & Oro Geométrico 📐",
    fontHeading: "Syne",
    fontBody: "Inter",
    fontCursive: "Sacramento",
    colors: {
      primary: "#C59B27",
      secondary: "#E5E5E5",
      accent: "#1A1A1A",
      dark: "#1A1A1A",
      light: "#F4F4F4",
      bg: "#FAFAFA",
      border: "#E5C572"
    },
    bgGradient: "linear-gradient(145deg, #F9F9F9 0%, #EFEFEF 100%)",
    textDark: "#222222",
    textLight: "#FFFFFF",
    iconStyle: "border-2 border-[#C59B27] rounded-none rotate-45 text-[#1A1A1A] p-2 bg-white",
    decorativeEmoji: "⚜️",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #FAFAFA;
        color: #222222;
        background-image: radial-gradient(rgba(197, 155, 39, 0.04) 1px, transparent 0);
        background-size: 20px 20px;
      }
      .heading-text {
        font-family: 'Syne', sans-serif;
        color: #1A1A1A;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .cursive-text {
        font-family: 'Sacramento', cursive;
        color: #C59B27;
        font-size: 2.5rem;
      }
      .gold-card {
        border: 1.5px solid #E5C572;
        background: #FFFFFF;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
        border-radius: 0;
      }
    `
  },
  {
    id: "neon",
    nombre: "Ciber Cyber Neon ⚡ (Glow)",
    fontHeading: "Orbitron",
    fontBody: "Inter",
    fontCursive: "Sacramento",
    colors: {
      primary: "#FF007F",
      secondary: "#00F0FF",
      accent: "#DFFF00",
      dark: "#05050B",
      light: "#181824",
      bg: "#020205",
      border: "#FF007F"
    },
    bgGradient: "linear-gradient(135deg, #05050B 0%, #150E28 100%)",
    textDark: "#00F0FF",
    textLight: "#FFFFFF",
    iconStyle: "border-2 border-[#FF007F] rounded-lg text-[#00F0FF] p-2 bg-[#05050B] shadow-[0_0_15px_rgba(255,0,127,0.6)]",
    decorativeEmoji: "⚡",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #020205;
        color: #E2E8F0;
      }
      .heading-text {
        font-family: 'Orbitron', sans-serif;
        color: #00F0FF;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        text-shadow: 0 0 10px rgba(0, 240, 255, 0.6), 0 0 20px rgba(255, 0, 127, 0.4);
      }
      .cursive-text {
        font-family: 'Sacramento', cursive;
        color: #FF007F;
        font-size: 2.8rem;
        text-shadow: 0 0 8px rgba(255, 0, 127, 0.7);
      }
      .gold-card {
        border: 2px solid #FF007F;
        background: rgba(24, 24, 36, 0.85);
        box-shadow: 0 0 15px rgba(255, 0, 127, 0.25), inset 0 0 10px rgba(0, 240, 255, 0.15);
        border-radius: 16px;
      }
    `
  },
  {
    id: "coquette-pink",
    nombre: "XV Coquette Listones Rose 🎀 (Glam & Sparkle)",
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    fontCursive: "Parisienne",
    colors: {
      primary: "#E45D8C",
      secondary: "#FFA6C9",
      accent: "#E45D8C",
      dark: "#472F35",
      light: "#FEE2E7",
      bg: "#FDECEF",
      border: "#FCB5C9"
    },
    bgGradient: "linear-gradient(135deg, #FEE2E7 0%, #FAECF0 100%)",
    textDark: "#472F35",
    textLight: "#FFFFFF",
    iconStyle: "border border-[#E45D8C] rounded-full text-[#E45D8C] p-2.5 bg-white shadow-[0_2px_10px_rgba(228,93,140,0.08)]",
    decorativeEmoji: "🎀",
    customStyle: `
      .theme-container {
        font-family: 'Inter', sans-serif;
        background-color: #FDECEF;
        color: #472F35;
        background-image: radial-gradient(#FCB5C965 1.5px, transparent 1.5px);
        background-size: 24px 24px;
        position: relative;
      }
      .heading-text {
        font-family: 'Playfair Display', serif;
        color: #E45D8C;
        letter-spacing: 0.05em;
        font-weight: 700;
        text-shadow: 0 1px 1px rgba(0,0,0,0.02);
      }
      .cursive-text {
        font-family: 'Parisienne', cursive;
        color: #E45D8C;
        font-size: 3.4rem;
        line-height: 1.1;
        position: relative;
        display: inline-block;
        padding-left: 20px;
        padding-right: 20px;
        text-shadow: 0 1px 2px rgba(228,93,140,0.1);
      }
      
      /* Destellos ✨ a los lados de los textos cursivos o títulos */
      .cursive-text::before {
        content: '✨';
        position: absolute;
         left: -6px;
        top: 20%;
        font-size: 16px;
        color: #FFA6C9;
        animation: coquette-sparkle-pulse 2s infinite ease-in-out;
      }
      .cursive-text::after {
        content: '✨';
        position: absolute;
        right: -6px;
        top: 20%;
        font-size: 16px;
        color: #FFA6C9;
        animation: coquette-sparkle-pulse 2s infinite ease-in-out 1s;
      }

      /* Listón de raso rosa con moño elegante y ondas colgantes de la portada */
      [data-section="portada"] .font-serif.text-gray-500.mb-1::before {
        content: "" !important;
        display: block !important;
        width: 140px !important;
        height: 140px !important;
        margin: -45px auto 5px auto !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Cpath d='M45 43C42 56 28 68 22 88L31 82L36 86C36 71 43 58 45 43Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M55 43C58 56 72 68 78 88L69 82L64 86C64 71 57 58 55 43Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M44 40C30 24 12 32 20 48C25 56 41 45 44 40Z' fill='%23FFA6C9' stroke='%23E45D8C' stroke-width='1.5'/%3E%3Cpath d='M25 40C32 44 40 42 44 40' stroke='%23E45D8C' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M56 40C70 24 88 32 80 48C75 56 59 45 56 40Z' fill='%23FFA6C9' stroke='%23E45D8C' stroke-width='1.5'/%3E%3Cpath d='M75 40C68 44 60 42 56 40' stroke='%23E45D8C' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M44 40C44 37 56 37 56 40C56 45 44 45 44 40Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1.5'/%3E%3C/svg%3E") !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        filter: drop-shadow(0 4px 8px rgba(228, 93, 140, 0.3)) !important;
        animation: coquette-float-bow 3.5s ease-in-out infinite alternate !important;
      }

      /* Cajones / Cuadros de Sección Coquette con Ondas Dobles y Listones */
      .gold-card, 
      [data-section] > .bg-white.rounded-3xl, 
      [data-section] > .rounded-3xl {
        border: 4px double #FCB5C9 !important;
        background-color: rgba(255, 249, 250, 0.35) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        background-image: 
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FFA6C9'%3E%3Cpath d='M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z'/%3E%3C/svg%3E"),
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FFA6C9'%3E%3Cpath d='M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z'/%3E%3C/svg%3E") !important;
        background-position: top 14px right 14px, bottom 14px left 14px !important;
        background-size: 18px 18px, 18px 18px !important;
        background-repeat: no-repeat !important;
        box-shadow: 0 10px 25px rgba(228, 93, 140, 0.08) !important;
        border-radius: 20px !important;
        position: relative !important;
        padding: 1.5rem !important;
        overflow: visible !important;
        margin-top: 1rem !important;
        margin-bottom: 1rem !important;
      }

      /* Listón elegante de raso rosa con moño y ondas superiores izquierdas */
      .gold-card::before, 
      [data-section] > .bg-white.rounded-3xl::before, 
      [data-section] > .rounded-3xl::before {
        content: '' !important;
        position: absolute !important;
        top: -24px !important;
        left: -20px !important;
        width: 65px !important;
        height: 65px !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Cpath d='M45 43C42 56 28 68 22 88L31 82L36 86C36 71 43 58 45 43Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M55 43C58 56 72 68 78 88L69 82L64 86C64 71 57 58 55 43Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M44 40C30 24 12 32 20 48C25 56 41 45 44 40Z' fill='%23FFA6C9' stroke='%23E45D8C' stroke-width='1.5'/%3E%3Cpath d='M25 40C32 44 40 42 44 40' stroke='%23E45D8C' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M56 40C70 24 88 32 80 48C75 56 59 45 56 40Z' fill='%23FFA6C9' stroke='%23E45D8C' stroke-width='1.5'/%3E%3Cpath d='M75 40C68 44 60 42 56 40' stroke='%23E45D8C' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M44 40C44 37 56 37 56 40C56 45 44 45 44 40Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1.5'/%3E%3C/svg%3E") !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        z-index: 20 !important;
        filter: drop-shadow(0 4px 8px rgba(228, 93, 140, 0.3)) !important;
        animation: coquette-float-bow 2.8s ease-in-out infinite alternate !important;
      }
      
      /* Listón elegante de raso rosa con moño y ondas inferiores derechas */
      .gold-card::after, 
      [data-section] > .bg-white.rounded-3xl::after, 
      [data-section] > .rounded-3xl::after {
        content: '' !important;
        position: absolute !important;
        bottom: -24px !important;
        right: -20px !important;
        width: 65px !important;
        height: 65px !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Cpath d='M45 43C42 56 28 68 22 88L31 82L36 86C36 71 43 58 45 43Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M55 43C58 56 72 68 78 88L69 82L64 86C64 71 57 58 55 43Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M44 40C30 24 12 32 20 48C25 56 41 45 44 40Z' fill='%23FFA6C9' stroke='%23E45D8C' stroke-width='1.5'/%3E%3Cpath d='M25 40C32 44 40 42 44 40' stroke='%23E45D8C' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M56 40C70 24 88 32 80 48C75 56 59 45 56 40Z' fill='%23FFA6C9' stroke='%23E45D8C' stroke-width='1.5'/%3E%3Cpath d='M75 40C68 44 60 42 56 40' stroke='%23E45D8C' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M44 40C44 37 56 37 56 40C56 45 44 45 44 40Z' fill='%23E45D8C' stroke='%23FCB5C9' stroke-width='1.5'/%3E%3C/svg%3E") !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        z-index: 20 !important;
        filter: drop-shadow(0 4px 8px rgba(228, 93, 140, 0.3)) !important;
        animation: coquette-float-bow-reverse 2.8s ease-in-out infinite alternate !important;
      }

      /* Decorativo interior de los cajones h3 */
      .gold-card h3::before,
      [data-section] h3::before {
        content: '✨ ';
        color: #E45D8C;
        font-size: 14px;
        opacity: 0.85;
      }
      .gold-card h3::after,
      [data-section] h3::after {
        content: ' ✨';
        color: #E45D8C;
        font-size: 14px;
        opacity: 0.85;
      }

      /* Estilo de los campos de entrada */
      .gold-card input, 
      .gold-card select,
      [data-section] input,
      [data-section] select {
        border-color: #FCB5C9 !important;
        background-color: #FFFFFF !important;
        color: #472F35 !important;
        border-width: 1.5px !important;
      }
      .gold-card input:focus, 
      .gold-card select:focus,
      [data-section] input:focus,
      [data-section] select:focus {
        border-color: #E45D8C !important;
        box-shadow: 0 0 0 3px rgba(228, 93, 140, 0.15) !important;
        outline: none !important;
      }

      /* Animaciones */
      @keyframes coquette-float-bow {
        0% { transform: translateY(0) rotate(-6deg) scale(1); }
        100% { transform: translateY(-3px) rotate(6deg) scale(1.05); }
      }
      @keyframes coquette-float-bow-reverse {
        0% { transform: translateY(0) rotate(6deg) scale(1.02); }
        100% { transform: translateY(3px) rotate(-6deg) scale(0.97); }
      }
      @keyframes coquette-sparkle-pulse {
        0%, 100% { transform: scale(0.9) rotate(0deg); opacity: 0.5; }
        50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
      }
    `
  },
  {
    id: "coquette-luxe",
    nombre: "XV Coquette Luxe 💎 (Elegancia & Oro)",
    fontHeading: "Playfair Display",
    fontBody: "Garamond",
    fontCursive: "Parisienne",
    colors: {
      primary: "#C66B8F",
      secondary: "#D4AF37",
      accent: "#6B2545",
      dark: "#1A1A1A",
      light: "#E5E5E5",
      bg: "#FBF8F3",
      border: "#D4AF37"
    },
    bgGradient: "linear-gradient(135deg, #FBF8F3 0%, #F5EEDB 50%, #C66B8F 100%)",
    textDark: "#1A1A1A",
    textLight: "#FFFFFF",
    iconStyle: "border border-[#D4AF37] rounded-full text-[#C66B8F] p-2.5 bg-white shadow-[0_2px_10px_rgba(212,175,55,0.15)]",
    decorativeEmoji: "💎",
    customStyle: `
      .theme-container {
        font-family: 'Garamond', 'Inter', sans-serif;
        background-color: #FBF8F3;
        color: #1A1A1A;
        background-image: radial-gradient(#D4AF3740 1.5px, transparent 1.5px);
        background-size: 28px 28px;
        position: relative;
      }
      .heading-text {
        font-family: 'Playfair Display', 'Didot', 'Bodoni MT', serif;
        color: #C66B8F;
        letter-spacing: 0.08em;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(212,175,55,0.2);
      }
      .cursive-text {
        font-family: 'Parisienne', cursive;
        color: #C66B8F;
        font-size: 3.4rem;
        line-height: 1.1;
        position: relative;
        display: inline-block;
        padding-left: 20px;
        padding-right: 20px;
        text-shadow: 0 1px 2px rgba(107,37,69,0.15);
      }
      
      /* Destellos ✨ a los lados de los textos cursivos o títulos */
      .cursive-text::before {
        content: '✨';
        position: absolute;
        left: -6px;
        top: 20%;
        font-size: 16px;
        color: #D4AF37;
        animation: coquette-sparkle-pulse 2s infinite ease-in-out;
      }
      .cursive-text::after {
        content: '✨';
        position: absolute;
        right: -6px;
        top: 20%;
        font-size: 16px;
        color: #D4AF37;
        animation: coquette-sparkle-pulse 2s infinite ease-in-out 1s;
      }

      /* Listón de raso rosa con moño elegante y ondas colgantes de la portada */
      [data-section="portada"] .font-serif.text-gray-500.mb-1::before {
        content: "" !important;
        display: block !important;
        width: 140px !important;
        height: 140px !important;
        margin: -45px auto 5px auto !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Cpath d='M45 43C42 56 28 68 22 88L31 82L36 86C36 71 43 58 45 43Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M55 43C58 56 72 68 78 88L69 82L64 86C64 71 57 58 55 43Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M44 40C30 24 12 32 20 48C25 56 41 45 44 40Z' fill='%23C66B8F' stroke='%23D4AF37' stroke-width='1.5'/%3E%3Cpath d='M25 40C32 44 40 42 44 40' stroke='%23D4AF37' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M56 40C70 24 88 32 80 48C75 56 59 45 56 40Z' fill='%23C66B8F' stroke='%23D4AF37' stroke-width='1.5'/%3E%3Cpath d='M75 40C68 44 60 42 56 40' stroke='%23D4AF37' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M44 40C44 37 56 37 56 40C56 45 44 45 44 40Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1.5'/%3E%3C/svg%3E") !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        filter: drop-shadow(0 4px 8px rgba(198, 107, 143, 0.4)) !important;
        animation: coquette-float-bow 3.5s ease-in-out infinite alternate !important;
      }

      /* Cajones / Cuadros de Sección Coquette Luxe con Ondas Dobles y Listones Dorados */
      .gold-card, 
      [data-section] > .bg-white.rounded-3xl, 
      [data-section] > .rounded-3xl {
        border: 4px double #D4AF37 !important;
        background-color: rgba(251, 248, 243, 0.85) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        background-image: 
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23D4AF37'%3E%3Cpath d='M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z'/%3E%3C/svg%3E"),
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23D4AF37'%3E%3Cpath d='M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z'/%3E%3C/svg%3E") !important;
        background-position: top 14px right 14px, bottom 14px left 14px !important;
        background-size: 18px 18px, 18px 18px !important;
        background-repeat: no-repeat !important;
        box-shadow: 0 15px 35px rgba(198, 107, 143, 0.15) !important;
        border-radius: 20px !important;
        position: relative !important;
        padding: 1.5rem !important;
        overflow: visible !important;
        margin-top: 1rem !important;
        margin-bottom: 1rem !important;
      }

      /* Listón elegante de raso rosa con moño y ondas superiores izquierdas */
      .gold-card::before, 
      [data-section] > .bg-white.rounded-3xl::before, 
      [data-section] > .rounded-3xl::before {
        content: '' !important;
        position: absolute !important;
        top: -24px !important;
        left: -20px !important;
        width: 65px !important;
        height: 65px !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Cpath d='M45 43C42 56 28 68 22 88L31 82L36 86C36 71 43 58 45 43Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M55 43C58 56 72 68 78 88L69 82L64 86C64 71 57 58 55 43Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M44 40C30 24 12 32 20 48C25 56 41 45 44 40Z' fill='%23C66B8F' stroke='%23D4AF37' stroke-width='1.5'/%3E%3Cpath d='M25 40C32 44 40 42 44 40' stroke='%23D4AF37' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M56 40C70 24 88 32 80 48C75 56 59 45 56 40Z' fill='%23C66B8F' stroke='%23D4AF37' stroke-width='1.5'/%3E%3Cpath d='M75 40C68 44 60 42 56 40' stroke='%23D4AF37' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M44 40C44 37 56 37 56 40C56 45 44 45 44 40Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1.5'/%3E%3C/svg%3E") !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        z-index: 20 !important;
        filter: drop-shadow(0 4px 8px rgba(198, 107, 143, 0.4)) !important;
        animation: coquette-float-bow 2.8s ease-in-out infinite alternate !important;
      }
      
      /* Listón elegante de raso rosa con moño y ondas inferiores derechas */
      .gold-card::after, 
      [data-section] > .bg-white.rounded-3xl::after, 
      [data-section] > .rounded-3xl::after {
        content: '' !important;
        position: absolute !important;
        bottom: -24px !important;
        right: -20px !important;
        width: 65px !important;
        height: 65px !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Cpath d='M45 43C42 56 28 68 22 88L31 82L36 86C36 71 43 58 45 43Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M55 43C58 56 72 68 78 88L69 82L64 86C64 71 57 58 55 43Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M44 40C30 24 12 32 20 48C25 56 41 45 44 40Z' fill='%23C66B8F' stroke='%23D4AF37' stroke-width='1.5'/%3E%3Cpath d='M25 40C32 44 40 42 44 40' stroke='%23D4AF37' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M56 40C70 24 88 32 80 48C75 56 59 45 56 40Z' fill='%23C66B8F' stroke='%23D4AF37' stroke-width='1.5'/%3E%3Cpath d='M75 40C68 44 60 42 56 40' stroke='%23D4AF37' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M44 40C44 37 56 37 56 40C56 45 44 45 44 40Z' fill='%236B2545' stroke='%23D4AF37' stroke-width='1.5'/%3E%3C/svg%3E") !important;
        background-size: contain !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        z-index: 20 !important;
        filter: drop-shadow(0 4px 8px rgba(198, 107, 143, 0.4)) !important;
        animation: coquette-float-bow-reverse 2.8s ease-in-out infinite alternate !important;
      }

      /* Decorativo interior de los cajones h3 */
      .gold-card h3::before,
      [data-section] h3::before {
        content: '💎 ';
        color: #D4AF37;
        font-size: 14px;
        opacity: 0.85;
      }
      .gold-card h3::after,
      [data-section] h3::after {
        content: ' 💎';
        color: #D4AF37;
        font-size: 14px;
        opacity: 0.85;
      }

      /* Estilo de los campos de entrada */
      .gold-card input, 
      .gold-card select,
      [data-section] input,
      [data-section] select {
        border-color: #D4AF37 !important;
        background-color: #FFFFFF !important;
        color: #1A1A1A !important;
        border-width: 1.5px !important;
      }
      .gold-card input:focus, 
      .gold-card select:focus,
      [data-section] input:focus,
      [data-section] select:focus {
        border-color: #C66B8F !important;
        box-shadow: 0 0 0 3px rgba(198, 107, 143, 0.15) !important;
        outline: none !important;
      }

      /* Animaciones */
      @keyframes coquette-float-bow {
        0% { transform: translateY(0) rotate(-6deg) scale(1); }
        100% { transform: translateY(-3px) rotate(6deg) scale(1.05); }
      }
      @keyframes coquette-float-bow-reverse {
        0% { transform: translateY(0) rotate(6deg) scale(1.02); }
        100% { transform: translateY(3px) rotate(-6deg) scale(0.97); }
      }
      @keyframes coquette-sparkle-pulse {
        0%, 100% { transform: scale(0.9) rotate(0deg); opacity: 0.5; }
        50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
      }
    `
  },
  {
    id: "aurora-boreal",
    nombre: "Aurora Boreal 🌌 (Luces Nórdicas)",
    fontHeading: "Cinzel",
    fontBody: "Inter",
    fontCursive: "Dancing Script",
    colors: {
      primary: "#00D9FF",
      secondary: "#6FFF00",
      accent: "#9D4EDD",
      dark: "#E0F7FF",
      light: "#1a2a4f",
      bg: "#050f2d",
      border: "#00D9FF"
    },
    bgGradient: "linear-gradient(135deg, #050f2d 0%, #0a1e3f 50%, #1a0a3f 100%)",
    textDark: "#00D9FF",
    textLight: "#E0F7FF",
    iconStyle: "border-2 border-[#00D9FF] rounded-full text-[#6FFF00] p-2 bg-[#0a1e3f] shadow-lg shadow-[#00D9FF]/40",
    decorativeEmoji: "🌌",
    customStyle: `
      body {
        background: linear-gradient(135deg, #050f2d 0%, #0a1e3f 50%, #1a0a3f 100%) !important;
        color: #E0F7FF !important;
      }

      .theme-container {
        font-family: 'Inter', sans-serif;
        background: transparent !important;
        color: #E0F7FF !important;
      }

      h1, h2, h3, h4, h5, h6 {
        color: #6FFF00 !important;
        text-shadow: 0 0 15px rgba(111, 255, 0, 0.6);
      }

      .heading-text {
        font-family: 'Cinzel', serif !important;
        color: #00D9FF !important;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-shadow: 0 0 20px rgba(0, 217, 255, 0.7);
      }

      .cursive-text {
        font-family: 'Dancing Script', cursive !important;
        color: #6FFF00 !important;
        font-size: 2.8rem;
        text-shadow: 0 0 20px rgba(111, 255, 0, 0.8);
      }

      .gold-card,
      [data-section] > .bg-white.rounded-3xl,
      [data-section] > .rounded-3xl,
      section {
        border: 2px solid #00D9FF !important;
        background: linear-gradient(135deg, rgba(10, 30, 63, 0.7) 0%, rgba(26, 14, 63, 0.7) 100%) !important;
        backdrop-filter: blur(8px) !important;
        box-shadow: 0 0 25px rgba(0, 217, 255, 0.4) !important;
        border-radius: 18px !important;
      }

      [data-section] h3 {
        color: #6FFF00 !important;
        text-shadow: 0 0 10px rgba(111, 255, 0, 0.7);
      }

      [data-section] p {
        color: #E0F7FF !important;
      }

      input, select, textarea {
        background-color: rgba(10, 30, 63, 0.85) !important;
        border: 1.5px solid #00D9FF !important;
        color: #E0F7FF !important;
        border-radius: 8px !important;
      }

      input::placeholder, textarea::placeholder {
        color: rgba(0, 217, 255, 0.6) !important;
      }

      input:focus, select:focus, textarea:focus {
        border-color: #6FFF00 !important;
        box-shadow: 0 0 20px rgba(111, 255, 0, 0.5) !important;
        outline: none !important;
      }

      button {
        background-color: #9D4EDD !important;
        color: white !important;
        text-shadow: 0 0 10px rgba(157, 78, 221, 0.5);
        border: 1px solid #6FFF00 !important;
        box-shadow: 0 0 15px rgba(157, 78, 221, 0.4) !important;
      }

      button:hover {
        background-color: #6FFF00 !important;
        color: #050f2d !important;
        box-shadow: 0 0 25px rgba(111, 255, 0, 0.7) !important;
      }

      .text-gray-500 {
        color: rgba(0, 217, 255, 0.7) !important;
      }

      .text-gray-700 {
        color: #E0F7FF !important;
      }

      .text-accent {
        color: #6FFF00 !important;
      }

      .text-primary {
        color: #00D9FF !important;
      }

      .text-dark {
        color: #6FFF00 !important;
      }

      .bg-gray-50, .bg-white {
        background-color: rgba(10, 30, 63, 0.6) !important;
        border-color: #00D9FF !important;
      }
    `
  },
  {
    id: "personalizado",
    nombre: "Personalizado 🎨 (A Medida)",
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    fontCursive: "Great Vibes",
    colors: {
      primary: "#8A8578",
      secondary: "#C9C2B2",
      accent: "#4A4640",
      dark: "#2E2B26",
      light: "#F7F5F0",
      bg: "#FBFAF7",
      border: "#DAD5C8"
    },
    bgGradient: "linear-gradient(135deg, #FBFAF7 0%, #F2EFE7 100%)",
    textDark: "#2E2B26",
    textLight: "#FBFAF7",
    iconStyle: "border-2 border-[#DAD5C8] rounded-full text-[#4A4640] p-2 bg-[#F7F5F0]",
    decorativeEmoji: "🎨",
    oculto: true
  }
];

export const fotosFicticiasDefault: Record<string, string[]> = {
  "dorado-clasico": [
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221472/galeria_14_lxes6z.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221472/galeria_11_bpjkfg.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221471/galeria_9_fav4yb.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221471/galeria_13_u9b4yy.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221470/galeria_2_qzis0h.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221470/galeria_10_ivhusz.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221470/galeria_8_pen1l9.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221469/galeria_3_unnvjq.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221469/galeria_4_xezb3u.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221469/galeria_7_v8wlcb.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221467/galeria_6_eknlb7.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221466/galeria_5_qndgra.png"
  ],
  "mariposas": [
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221472/galeria_14_lxes6z.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221472/galeria_11_bpjkfg.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221471/galeria_9_fav4yb.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221471/galeria_13_u9b4yy.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221470/galeria_2_qzis0h.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221470/galeria_10_ivhusz.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221470/galeria_8_pen1l9.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221469/galeria_3_unnvjq.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221469/galeria_4_xezb3u.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221469/galeria_7_v8wlcb.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221467/galeria_6_eknlb7.png",
    "https://res.cloudinary.com/dswrrm5u1/image/upload/v1783221466/galeria_5_qndgra.png"
  ]
};

export const getFotosPorTema = (temaId: string): string[] => {
  // Retorna fotos ficticias predefinidas para el tema o las generales
  const actualId = (temaId === "coquette-pink" || temaId === "coquette-luxe") ? "mariposas" : temaId;
  return fotosFicticiasDefault[actualId] || fotosFicticiasDefault["dorado-clasico"];
};

export const datosDefault: Record<"basico" | "premium" | "deluxe", InvitacionDatos> = {
  basico: {
    paquete: "basico",
    tema: "dorado-clasico",
    nombre: "Sophia Valeria",
    fecha: "2026-10-18T18:00:00",
    mensajeBienvenida: "Hay momentos que son inolvidables, pero compartirlos con quienes más amamos los hace eternos. Hoy celebro mis quince años y me encantaría contar con tu presencia.",
    ceremonia: {
      lugar: "Parroquia de San Juan Bautista",
      hora: "17:00",
      direccion: "Plaza Centenario #12, Centro Histórico, Coyoacán, CDMX",
      maps: "https://maps.app.goo.gl/9u8nZED52U1A827y9"
    },
    recepcion: {
      lugar: "Salón de Eventos Las Gardenias",
      hora: "19:30",
      direccion: "Calzada de Tlalpan #3240, Col. Bosques, CDMX",
      maps: "https://maps.app.goo.gl/tWp7tN69J9yA829y2"
    },
    itinerario: [
      { hora: "17:00", evento: "Solemne Misa de Acción de Gracias" },
      { hora: "19:00", evento: "Recepción de Invitados en el Salón" },
      { hora: "20:00", evento: "Presentación de la Quinceañera & Vals Familiar" },
      { hora: "21:00", evento: "Cena de Gala" },
      { hora: "22:30", evento: "Brindis & Apertura de la Pista de Baile" }
    ],
    dressCode: "Gala Formal - Caballeros de Traje, Damas de Vestido Largo",
    colorSugerido: ["#D4AF37", "#E9D295", "#FFFFFF"],
    padres: [
      "Roberto Gómez Herrera",
      "Valeria Mendoza Castillo"
    ],
    padrinos: [
      "Carlos Mendoza Castillo",
      "Elena Rivas de Mendoza"
    ],
    mesaRegalos: "Liverpool (No. Evento: 50942851) y Amazon Wishlist",
    datosBancarios: "Banco: BBVA\nBeneficiaria: Sophia Valeria Gómez\nCLABE: 0121 8001 2345 6789 01\nConcepto: Regalo Sophia XV",
    fotos: [], // Se llenan con fotos ficticias según el tema si está vacío
    hashtag: "#SophiaValeriaXV",
    mostrarCajasSecciones: true,
    whatsappConfirmacion: "525512345678",
    cancion: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    linkPersonalizado: "sophia-gomez-xv",
    invitados: [
      { nombre: "Familia Gómez Mendoza", pases: 4 },
      { nombre: "Tío Ernesto & Acompañante", pases: 2 }
    ],
    // "Pases de Entrada" es a la carta en este paquete: apagada por default, el admin la
    // enciende manualmente (quitándola de esta lista) si el cliente pagó por ella.
    seccionesExcluidas: ["pases"]
  },
  premium: {
    paquete: "premium",
    tema: "mariposas",
    nombre: "Emma Elizabeth",
    fecha: "2026-11-21T18:00:00",
    mensajeBienvenida: "Bajo las alas del amor de mi familia, hoy emprendo un nuevo vuelo. Te espero para celebrar juntos el día más esperado de mi juventud: mis 15 años.",
    ceremonia: {
      lugar: "Capilla del Santo Relicario",
      hora: "16:30",
      direccion: "Av. de la Paz #45, Col. San Ángel, CDMX",
      maps: "https://maps.app.goo.gl/9u8nZED52U1A827y9"
    },
    recepcion: {
      lugar: "Finca Santa Rosa de las Rosas",
      hora: "19:00",
      direccion: "Camino Real a Toluca Km 14.5, Álvaro Obregón, CDMX",
      maps: "https://maps.app.goo.gl/tWp7tN69J9yA829y2"
    },
    itinerario: [
      { hora: "16:30", evento: "Misa de Ceremonia" },
      { hora: "18:00", evento: "Cóctel de Bienvenida en Finca" },
      { hora: "19:30", evento: "Entrada de Emma & Vals de Honor" },
      { hora: "20:30", evento: "Cena Exquisita de Tres Tiempos" },
      { hora: "22:00", evento: "Show Sorpresa Especial" },
      { hora: "22:30", evento: "DJ Live Set & Fiesta" }
    ],
    dressCode: "Formal de Gala (Por favor evitar el color Lila o Morado ya que están reservados para la Quinceañera)",
    colorSugerido: ["#F3D5FF", "#FCF5FE", "#AB70D5"],
    padres: [
      "Ing. Fernando Soto Cruz",
      "Dra. Elizabeth Reyes de Soto"
    ],
    padrinos: [
      "Lic. Hugo Reyes Martínez",
      "Carmen Ortiz de Reyes"
    ],
    mesaRegalos: "El Palacio de Hierro (Evento: EMMA15XV)",
    datosBancarios: "Banco: Santander\nCLABE: 0141 8000 9876 5432 10\nBeneficiario: Emma Elizabeth Soto\n¡Lluvia de sobres en la entrada también es bienvenida!",
    fotos: [],
    hashtag: "#EmmaXVVuela",
    mostrarCajasSecciones: true,
    whatsappConfirmacion: "525598765432",
    cancion: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    linkPersonalizado: "emma-soto-15",
    invitados: [
      { nombre: "Sr. Francisco Soto y Familia", pases: 5 },
      { nombre: "Dra. Sofía Rentería", pases: 1 }
    ],
    // Igual que en Básico: "Pases de Entrada" es a la carta, apagada por default.
    seccionesExcluidas: ["pases"]
  },
  deluxe: {
    paquete: "deluxe",
    tema: "celestial",
    nombre: "Luna Isabella",
    fecha: "2026-12-05T19:00:00",
    mensajeBienvenida: "Bajo la luz del sol crecí, pero es bajo el brillo de las estrellas de esta noche inolvidable que quiero bailar contigo mis quince primaveras.",
    ceremonia: {
      lugar: "Basílica de Nuestra Señora del Carmen",
      hora: "18:00",
      direccion: "Av. Universidad #1900, Col. Florida, CDMX",
      maps: "https://maps.app.goo.gl/9u8nZED52U1A827y9"
    },
    recepcion: {
      lugar: "Hacienda del Bosque / Jardín de las Estrellas",
      hora: "20:30",
      direccion: "Antigua Vía del Desierto de los Leones #78, Álvaro Obregón, CDMX",
      maps: "https://maps.app.goo.gl/tWp7tN69J9yA829y2"
    },
    itinerario: [
      { hora: "18:00", evento: "Misa de Acción de Gracias" },
      { hora: "20:30", evento: "Alfombra Azul de Bienvenida" },
      { hora: "21:00", evento: "Vals de las Velas & Coronación" },
      { hora: "22:00", evento: "Banquete Imperial de Gala" },
      { hora: "23:00", evento: "Espectáculo de Fuegos Artificiales Fríos" },
      { hora: "23:30", evento: "Mariachi en Vivo & Gran Baile" }
    ],
    dressCode: "Etiqueta Rigurosa / Black Tie (Hombres de Esmóquin, Mujeres de Vestido de Alta Costura)",
    colorSugerido: ["#0B132B", "#1C3B57", "#FFD700", "#7F9FDC"],
    padres: [
      "Gabriel Montes Arriaga",
      "Beatriz Alatorre de Montes"
    ],
    padrinos: [
      "Samuel Montes Arriaga",
      "Patricia Robles de Montes"
    ],
    mesaRegalos: "Mesa Digital de Regalos (Efectivo) Walmart y Liverpool No. 876115",
    datosBancarios: "Banco: Banorte\nCLABE: 0721 8000 1234 5678 99\nBeneficiaria: Luna Isabella Montes",
    hashtag: "#MilMilagrosLunaXV",
    mostrarCajasSecciones: true,
    fotos: [],
    whatsappConfirmacion: "525544332211",
    cancion: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    linkPersonalizado: "luna-isabella-xv",
    invitados: [
      { nombre: "Héctor Montes & Sra.", pases: 2 },
      { nombre: "Familia Alatorre Silva", pases: 6 },
      { nombre: "Danna Paola (Amiga)", pases: 1 }
    ]
  }
};
