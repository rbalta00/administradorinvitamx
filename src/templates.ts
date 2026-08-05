import { InvitacionDatos, TemaConfig } from "./types";
import { paquetes, getFotosPorTema, getOrdenSeccionesEfectivo, getColoresEfectivos } from "./data";

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
};

const construirUrlGoogleFonts = (tema: TemaConfig): string => {
  const familias = new Set<string>();
  [tema.fontHeading, tema.fontBody, tema.fontCursive].forEach(f => {
    if (f) familias.add(f);
  });
  const segmentos = Array.from(familias)
    .map(f => FONT_URL_SEGMENTS[f] || f.replace(/\s+/g, '+'))
    .join('&family=');
  return `https://fonts.googleapis.com/css2?family=${segmentos}&display=swap`;
};

export function generarHTMLFinal(datos: InvitacionDatos, tema: TemaConfig, opciones?: { esDemoDeCatalogo?: boolean }): string {
  const esDemoDeCatalogo = opciones?.esDemoDeCatalogo === true;
  // Invitaciones 100% a la medida: el tema "personalizado" acepta overrides de tipografía,
  // paleta de color y tipo de apertura definidos por el admin para ESA invitación en particular.
  // El resto de temas del catálogo no se ven afectados por esto.
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
  }

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

  // Generamos los items del itinerario con Timeline elegante
  const itinerarioHTML = (datos.itinerario || [])
    .map((item, index) => {
      // Iconos representativos basados en palabras clave comunes
      let iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      const evLower = item.evento.toLowerCase();
      if (evLower.includes("misa") || evLower.includes("iglesia") || evLower.includes("ceremonia") || evLower.includes("templo")) {
        iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`;
      } else if (evLower.includes("brindis") || evLower.includes("cena") || evLower.includes("banquete") || evLower.includes("comida")) {
        iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 5a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`;
      } else if (evLower.includes("recepcion") || evLower.includes("coctel") || evLower.includes("salón") || evLower.includes("salon")) {
        iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`;
      } else if (evLower.includes("baile") || evLower.includes("vals") || evLower.includes("baile") || evLower.includes("show")) {
        iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>`;
      }

      return `
      <div class="relative pl-10 pb-10 last:pb-0 itinerario-item">
        <div class="absolute left-0 top-2 bg-white border-3 border-[${tema.colors.primary}] rounded-full p-1.5 z-10 text-[${tema.colors.accent}] shadow-md">
          ${iconSvg}
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
      </div>`;
    })
    .join("");

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
  const isSectionActive = (secName: string) => seccionesActivas.includes(secName);

  // Tipo de pantalla de apertura ("carta"): cada tema trae un tipo por defecto, pero el
  // control "Tipo de Apertura" del editor lo puede sobreescribir para cualquier tema, ya
  // que sobre/cortina/tarjeta se pintan con los colores del tema activo, no con CSS fijo.
  const tipoAperturaEfectivo: "sobre" | "cortina" | "tarjeta" =
    datos.personalizacion?.tipoApertura
      ? datos.personalizacion.tipoApertura
      : ["mariposas", "floral-acuarela", "boho-chic", "coquette-pink", "coquette-luxe"].includes(tema.id)
        ? "sobre"
        : ["celestial", "princesa-elegante", "neon"].includes(tema.id)
          ? "cortina"
          : "tarjeta";

  // Estilo de los cajones/tarjetas de sección: si ya se eligió con los botones nuevos, se
  // respeta; si no, se deriva del boolean legacy `mostrarCajasSecciones` para no cambiarle el
  // look a invitaciones guardadas antes de este campo.
  const estiloCajasEfectivo: "normal" | "sin_cajon" | "solo_borde" =
    datos.estiloCajasSecciones || (datos.mostrarCajasSecciones === false ? "sin_cajon" : "normal");

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
        background: ${tema.colors.light};
        border-radius: 0 0 16px 16px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.18);
        margin-top: 20px;
        transition: all 0.5s ease;
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
        transform-origin: top;
        transition: transform 0.6s ease-in-out;
        z-index: 30;
      }
      .envelope-pocket {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${tema.colors.bg};
        border-radius: 0 0 16px 16px;
        border: 2px solid ${tema.colors.border};
        z-index: 20;
      }
      .envelope-letter {
        position: absolute;
        bottom: 10px;
        left: 15px;
        right: 15px;
        height: 170px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        border: 1.5px solid ${tema.colors.border}30;
        padding: 16px 12px;
        text-align: center;
        transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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
        background: ${tema.colors.accent};
        color: ${tema.textLight};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.22);
        z-index: 40;
        font-size: 22px;
        transition: all 0.4s ease;
        border: 2px solid white;
        cursor: pointer;
      }
      .envelope-wax-seal:hover {
        transform: translate(-50%, -50%) scale(1.08);
      }
      .envelope-container.open .envelope-flap {
        transform: rotateX(180deg);
        z-index: 5;
      }
      .envelope-container.open .envelope-letter {
        transform: translateY(-90px) scale(1.05);
        z-index: 25;
      }
      .envelope-container.open .envelope-wax-seal {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0);
        pointer-events: none;
      }
    </style>

    <div class="max-w-md w-full flex flex-col items-center animate-float" onclick="event.stopPropagation()">
      <p class="text-xs uppercase tracking-[0.25em] font-serif mb-2" style="color: ${tema.colors.accent}; font-weight: 600;">💌 Tienes una invitación exclusiva</p>
      
      <div class="envelope-container" id="sobre-interactivo" onclick="comenzarExperienciaEnvoltura()">
        <div class="envelope-flap"></div>
        <div class="envelope-letter font-sans">
          <span class="text-3xl mb-1">${tema.decorativeEmoji}</span>
          <h4 class="font-serif text-[9px] uppercase tracking-wider text-gray-500">Mis Quince Años</h4>
          <h3 class="font-cursive text-3.5xl text-accent my-1 font-serif font-black" style="font-family: ${tema.fontHeading}">${datos.nombre}</h3>
          <p class="text-[9px] text-gray-400 font-sans italic">Es un honor invitarte</p>
        </div>
        <div class="envelope-pocket"></div>
        <div class="envelope-wax-seal">
          <span>✉️</span>
        </div>
      </div>
      
      <p class="text-[10px] text-gray-500 mt-6 font-light font-sans">Haz clic en el sobre o el sello para abrir la invitación 🌸</p>
    </div>
  </div>`;
    } else if (tipoAperturaEfectivo === "cortina") {
      const ribbonColor = tema.id === "neon" ? "#FF007F" : tema.colors.accent;
      const oppositeColor = tema.id === "neon" ? "#00F0FF" : tema.colors.border;
      aperturaHTML = `
  <div id="pantalla-apertura" class="fixed inset-0 z-50 flex overflow-hidden select-none" style="background: ${tema.colors.bg};" onclick="comenzarExperienciaCortina()">
    <style>
      .curtain-panel {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 50%;
        background: ${tema.id === "neon" ? "linear-gradient(to bottom, #090616 0%, #030307 100%)" : "linear-gradient(to bottom, " + tema.colors.dark + " 0%, " + (tema.colors.light === "#FCF9F2" ? "#1A150B" : tema.colors.dark) + " 100%)"};
        transition: transform 1.2s cubic-bezier(0.77, 0, 0.175, 1);
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
        transform: translateX(-100%);
      }
      .curtains-opened .curtain-right {
        transform: translateX(100%);
      }
      .curtains-opened .curtain-seal-container {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0);
      }
    </style>

    <div class="curtain-panel curtain-left">
      <div class="pr-6 text-right w-full font-serif font-black" style="opacity: 0.12; font-size: 80px; color: ${ribbonColor}; line-height: 100px;">XV</div>
    </div>
    
    <div class="curtain-panel curtain-right">
      <div class="pl-6 text-left w-full font-serif font-black" style="opacity: 0.12; font-size: 80px; color: ${oppositeColor}; line-height: 100px;">XV</div>
    </div>

    <div class="curtain-seal-container" id="contenedor-sello">
      <div class="curtain-seal-circle" onclick="comenzarExperienciaCortina()">
        <span class="text-3xl animate-bounce" style="margin-top: 4px;">✨</span>
        <span class="text-[9px] uppercase tracking-wider font-extrabold mt-1 font-sans">Gala XV</span>
        <span class="text-[8px] opacity-75 font-sans font-medium">Entrar</span>
      </div>
      <div class="mt-8 px-6">
        <h2 class="text-xs uppercase tracking-[0.3em] font-semibold font-sans mb-2 text-white/90 drop-shadow-md">Pase de Gala Oficial</h2>
        <h1 class="font-cursive text-5xl text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] my-1">${datos.nombre}</h1>
        <p class="text-[9px] text-gray-300 tracking-widest font-sans uppercase">Toca el sello para descorrer el telón 🎭</p>
      </div>
    </div>
  </div>`;
    } else {
      aperturaHTML = `
  <div id="pantalla-apertura" class="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center transition-all duration-1000" style="background: ${tema.bgGradient};">
    <div class="max-w-md w-full bg-white/75 backdrop-blur-md rounded-3xl p-8 border border-borderTheme/40 shadow-2xl flex flex-col items-center animate-float">
      <span class="text-4xl mb-4 text-accent animate-pulse">${tema.decorativeEmoji}</span>
      <h2 class="font-serif text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">Estás cordialmente invitado a los</h2>
      <h1 class="font-cursive text-5xl text-accent my-3">XV Años de</h1>
      <h3 class="font-serif text-3xl font-bold tracking-tight text-dark mb-6">${datos.nombre}</h3>
      <p class="text-xs text-gray-600 mb-8 font-light italic">Por favor activa el sonido antes de entrar para disfrutar de una mejor experiencia.</p>
      
      <button onclick="comenzarExperiencia()" class="relative px-8 py-4 bg-accent text-white font-serif tracking-widest text-xs uppercase rounded-full shadow-lg hover:shadow-xl hover:bg-accent/95 cursor-pointer transform hover:scale-105 active:scale-95 transition-all">
        ✨ Tocar Para Abrir ✨
      </button>
    </div>
  </div>`;
    }
  }

  // Sección de contenido: portada
  const portadaSeccionHTML = isSectionActive("portada") ? `
    <section data-section="portada" class="relative min-h-[92vh] flex flex-col justify-between p-6 text-center overflow-hidden border-b border-borderTheme/10" style="background: ${tema.bgGradient};">
      <!-- Decorativos de fondo premium -->
      <div class="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-primary/15 blur-3xl animate-pulse-slow"></div>
      <div class="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-accent/10 blur-3xl animate-pulse-slow" style="animation-delay: 1s;"></div>
      <div class="absolute top-1/3 right-10 w-32 h-32 rounded-full bg-secondary/10 blur-2xl"></div>

      <!-- Orla Decorativa Superior Premium -->
      <div class="mt-10 z-10 animate-fade-in">
        <p class="text-xs uppercase tracking-[0.3em] font-serif text-gray-500 mb-2">Mis XV Años</p>
        <div class="flex justify-center items-center gap-3 mb-1">
          <div class="w-12 h-[1px] bg-gradient-to-r from-transparent to-primary/60"></div>
          <span class="text-accent/80">${tema.decorativeEmoji}</span>
          <div class="w-12 h-[1px] bg-gradient-to-l from-transparent to-primary/60"></div>
        </div>
      </div>

      <!-- Nombre central de la quinceañera con animación -->
      <div class="my-auto z-10 py-6 animate-fade-in" style="animation-delay: 0.2s;">
        <p class="text-sm font-serif text-gray-500 italic mb-3 tracking-wide">¡Bienvenidos a mi celebración especial!</p>
        <h1 class="cursive-text text-6xl md:text-7xl mb-5 drop-shadow-lg">${datos.nombre}</h1>
        <div class="flex items-center justify-center gap-3 mb-8">
          <span class="w-12 h-[1px] bg-gradient-to-r from-transparent to-borderTheme/60"></span>
          <span class="text-accent text-[11px] tracking-widest uppercase font-semibold px-4 py-2 bg-white/30 backdrop-blur rounded-full border border-white/50">⚜️ 15 Primaveras ⚜️</span>
          <span class="w-12 h-[1px] bg-gradient-to-l from-transparent to-borderTheme/60"></span>
        </div>

        <!-- Foto Principal con efecto premium -->
        ${datos.mostrarFotoPortada !== false ? `
          ${(datos.fotoPortada && datos.fotoPortada.trim() !== "") || fotosFiltradas.length > 0 ? `
          <div class="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-white shadow-2xl mb-6 ring-4 ring-primary/20 animate-float">
            <img src="${(datos.fotoPortada && datos.fotoPortada.trim() !== "") ? datos.fotoPortada.trim() : fotosFiltradas[0]}" alt="${datos.nombre}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
          </div>
          ` : `
          <div class="w-56 h-56 mx-auto rounded-full bg-gradient-to-br from-[${tema.colors.light}] to-[${tema.colors.secondary}] border-4 border-white flex items-center justify-center mb-6 shadow-2xl animate-float ring-4 ring-primary/10">
            <div class="text-center p-4">
              <span class="text-7xl block mb-2 animate-bounce">${tema.decorativeEmoji}</span>
              <span class="font-serif text-[10px] uppercase tracking-widest text-accent text-xs">Mis XV Años</span>
            </div>
          </div>
          `}
        ` : ''}
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
    ` : "";

  // Sección de contenido: cuenta
  const cuentaSeccionHTML = isSectionActive("cuenta") ? `
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
    ` : "";

  // Sección de contenido: mensaje
  const mensajeSeccionHTML = isSectionActive("mensaje") ? `
    <section data-section="mensaje" class="p-8 text-center bg-transparent relative">
      <div class="absolute inset-x-0 top-0 flex justify-center transform -translate-y-1/2">
        <span class="bg-white px-4 py-1.5 border border-borderTheme/40 rounded-full shadow-xs text-accent text-sm font-semibold">${tema.decorativeEmoji}</span>
      </div>
      <div class="max-w-xs mx-auto py-4">
        <span class="font-cursive text-3xl text-primary/80 block mb-1">Mi Agradecimiento</span>
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
        <h3 class="font-serif text-lg text-dark mb-1">Con la Bendición de Mis Padres</h3>
        <div class="py-2 mb-4">
          ${padresHTML}
        </div>

        ${padrinosHTML.length > 0 ? `
        <div class="border-t border-borderTheme/20 pt-4 mt-2">
          <h4 class="font-serif text-md text-accent italic mb-2">Y de mis amados Padrinos</h4>
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

  // Sección de contenido: galeria premium
  const galeriaSeccionHTML = isSectionActive("galeria") && fotosFiltradas.length > 0 ? `
    <section data-section="galeria" class="p-6">
      <div class="text-center mb-8">
        <span class="cursive-text text-3xl text-primary/80">Recuerdos Inolvidables</span>
        <h3 class="font-serif text-xl text-dark font-bold">Mi Álbum de Fotos</h3>
        <p class="text-[10px] uppercase tracking-widest text-gray-400 mt-1">✨ Capturando momentos especiales ✨</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        ${galeriaFotosHTML}
      </div>
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
  <title>XV Años de ${datos.nombre}</title>
  
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

    ${datos.bgImages && datos.bgImages[tema.id] ? `
    /* Imagen de fondo cargada para este tema por separado (solo se muestra al abrir el sobre).
       El fondo de respaldo usa el degradado real del tema (no transparent) -- si esta imagen
       en particular se cae (link roto, borrada del hosting, etc.), la invitación no se queda
       en blanco: se ve el degradado normal del tema por debajo mientras se resuelve. */
    html {
      background: ${tema.bgGradient} !important;
    }
    body.experiencia-iniciada {
      background: ${tema.bgGradient} !important;
    }
    body.experiencia-iniciada, body.experiencia-iniciada.theme-container {
      background-image: url('${datos.bgImages[tema.id]}') !important;
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
      background-attachment: fixed !important;
    }
    /* Capa de fondo fija de respaldo para cobertura total garantizada en smartphones */
    body.experiencia-iniciada::after, body.experiencia-iniciada.theme-container::after {
      content: "";
      position: fixed;
      inset: 0;
      background-image: url('${datos.bgImages[tema.id]}') !important;
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
        const esOscuro = tema.id === "celestial" || tema.id === "neon";
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
      background-color: ${tema.id === "celestial" || tema.id === "neon" ? "rgba(15, 23, 42, 0.90)" : "rgba(255, 255, 255, 0.93)"} !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      border: 1px solid ${tema.id === "celestial" || tema.id === "neon" ? "rgba(255,255,255,0.18)" : "rgba(255, 255, 255, 0.65)"} !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08) !important;
    }

    /* Soporte de accesibilidad y alto contraste para Temas Oscuros en textos grises */
    ${tema.id === "celestial" || tema.id === "neon" ? `
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

    /* Ocultar/Apagar cajas del fondo de los textos de las secciones si el cliente lo prefiere */
    ${estiloCajasEfectivo !== "normal" ? `
    /* Transparentar contenedores y tarjetas internas p/integrar con el fondo original */
    .theme-container .bg-white.rounded-3xl,
    .theme-container .gold-card,
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
      <p class="text-[9px] font-mono tracking-widest text-gray-400">INIVTACIÓN DIGITAL PRIVADA • EXCLUSIVA</p>
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
        // invitación (le enseña su pase de volada) -- las demos del catálogo siempre rellenan
        // un invitado de muestra para poder enseñar esa sección, así que sin este candado el
        // scroll se disparaba en TODAS las demos del catálogo, alejándolas de la portada del
        // tema que se supone deben enseñar primero.
        if (huboPase && !${esDemoDeCatalogo ? "true" : "false"}) {
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

      // Si no hay pantalla de apertura, activar la experiencia de inmediato
      if (!document.getElementById('pantalla-apertura')) {
        document.body.classList.add('experiencia-iniciada');
        const sw = document.getElementById('music-widget');
        if (sw) sw.classList.remove('hidden');
        iniciarAnimacionCaida();
      }
    });

    // 1. Manejo del reproductor de sonido
    const audioPlayer = document.getElementById('musica-invitacion');
    const speakerBtn = document.getElementById('btn-audio-control');
    const speakerWidget = document.getElementById('music-widget');
    let isPlaying = false;

    function comenzarExperienciaEnvoltura() {
      const container = document.getElementById('sobre-interactivo');
      if (container) {
        if (container.classList.contains('open')) return;
        container.classList.add('open');
      }
      setTimeout(() => {
        comenzarExperiencia();
      }, 1500);
    }

    function comenzarExperienciaCortina() {
      const container = document.getElementById('pantalla-apertura');
      if (container) {
        if (container.classList.contains('curtains-opened')) return;
        container.classList.add('curtains-opened');
      }
      setTimeout(() => {
        comenzarExperiencia();
      }, 1250);
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

      // Símbolos de caída dependiendo del tema
      const simbolosPorTema = {
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

      const simbolosOverride = ${(datos.personalizacion?.simbolosCaida && datos.personalizacion.simbolosCaida.length > 0) ? JSON.stringify(datos.personalizacion.simbolosCaida) : 'null'};
      const simbolos = simbolosOverride || simbolosPorTema['${tema.id}'] || ['✨', '🌸', '🍃'];

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

        // Complemento à la carte "Control de Acceso QR": el QR es solo un link de check-in
        // (?checkin=1&iid=...&fam=...) convertido a imagen por un servicio público -- no hay
        // librería de generación de QR en este proyecto ni falta hacerla. Requiere que el link
        // traiga &iid= (invitación ya guardada), igual que el registro de RSVP más abajo.
        if (${datos.controlAccesoQR ? "true" : "false"}) {
          const iid = new URLSearchParams(window.location.search).get('iid');
          const qrBloque = document.getElementById('qr-acceso-bloque');
          const qrImg = document.getElementById('qr-acceso-img');
          if (iid && qrBloque && qrImg) {
            const checkinUrl = window.location.origin + '/?checkin=1&iid=' + encodeURIComponent(iid) + '&fam=' + encodeURIComponent(invitado.nombre);
            qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(checkinUrl);
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
            body: JSON.stringify({ mensaje: '🎉 ' + nombre + ' confirmó: ' + txtEstadoAviso + ' (' + pases + ' pases) a los XV de ${escBacktick(datos.nombre)}' })
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
      const name = "XV Años de ${escDoubleQuote(datos.nombre)}";
      const location = "${escDoubleQuote(datos.ceremonia.lugar)} & ${escDoubleQuote(datos.recepcion.lugar)}";

      // Fecha en formato Google Cal UTC
      const eventDate = new Date("${escDoubleQuote(datos.fecha)}");
      const startDateUTC = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      
      // Sumamos 5 horas para estimar duración
      const endDate = new Date(eventDate.getTime() + (5 * 60 * 60 * 1000));
      const endDateUTC = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const details = "¡Te espero con gran alegría para celebrar juntos mis 15 años! Trae tu invitación digital.";
      
      const link = \`https://calendar.google.com/calendar/render?action=TEMPLATE&text=\${encodeURIComponent(name)}&dates=\${startDateUTC}/\${endDateUTC}&details=\${encodeURIComponent(details)}&location=\${encodeURIComponent(location)}&sf=true&output=xml\`;
      
      window.open(link, '_blank');
    }
  </script>
</body>
</html>`;
}
