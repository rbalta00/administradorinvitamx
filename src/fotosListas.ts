import type { TipoEvento } from "./templates";

// Fotos "listas" de álbum (2026-11-22, v2) -- catálogo fijo de FOTOS DE MUESTRA (relleno, NUNCA
// contenido real de una clienta) que el admin puede insertar en el álbum de una INVITACIÓN DE
// MUESTRA con un clic, en vez de subirlas una por una a mano. El propósito: en la muestra
// gratis la prospecta solo manda nombre/fecha/tema por WhatsApp, sin fotos -- estos sets visten
// la muestra con una pareja ficticia (caso boda) para que se vea lo más parecida posible a la
// invitación final y la prospecta la aprecie completa. Cuando se vuelve clienta y llegan sus
// fotos reales, la invitación final se arma con esas, nunca con este set. Agrupadas por TIPO DE
// EVENTO (no por tema), espejo de fondosListos.ts -- hoy solo hay un set de boda, pero la lista
// está pensada para crecer: agregar una foto o un evento nuevo es solo agregar una entrada
// aquí, sin tocar ningún otro archivo. Al insertarse, las URLs quedan escritas directo en
// `datos.fotoPortada`/`datos.fotos` de ESA invitación, exactamente como si se hubieran subido a
// mano -- esta lista es solo el menú de opciones, nunca se guarda nada aquí ni se recuerda la
// inserción por evento.
export interface FotoLista {
  nombre: string;
  evento: TipoEvento;
  url: string;
  esPortada?: boolean; // la foto sugerida como portada del set
}

export const FOTOS_LISTAS: FotoLista[] = [
  {
    nombre: "Boda · Portada",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795389602/mp3pgf2orgnhevjo3f4d.webp",
    esPortada: true
  },
  {
    nombre: "Boda · Jardín",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795389605/bwydnzvskhvnx12pezam.webp"
  },
  {
    nombre: "Boda · Novia",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795389607/a19hymwy3semhdferazq.webp"
  },
  {
    nombre: "Boda · Novio",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795389608/g8lq72hmcfk8o8hjbyql.webp"
  },
  {
    nombre: "Boda · Anillos",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795389610/ydnetg2jjlankv3hayzx.webp"
  },
  {
    nombre: "Boda · Baile",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795389612/ec7hj7uv1yww2pemvh28.webp"
  },
  {
    nombre: "Boda · Celebración",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795389615/yrm96ushrjq1bcgiptgf.webp"
  },
  {
    nombre: "Boda · Romántica",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795389617/idzhmhzfrbe5eunl0v6i.webp"
  }
];

export const fotosListasPorEvento = (evento: TipoEvento): FotoLista[] =>
  FOTOS_LISTAS.filter(f => f.evento === evento);
