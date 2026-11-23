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
  },
  // Set de XV años (2026-11-22, v3) -- mismas 12 fotos ficticias de la quinceañera que ya usa
  // `fotosFicticiasDefault`/`getFotosPorTema` en data.ts como respaldo automático; aquí se
  // reutilizan tal cual, solo para que también sean elegibles a mano desde "Fotos listas".
  {
    nombre: "XV · Portada",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238790/yfl5jblsbo3v8g89ypah.webp",
    esPortada: true
  },
  {
    nombre: "XV · Retrato de estudio",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238798/pxp4yrnr5ieqlfdlxwcr.webp"
  },
  {
    nombre: "XV · Detalle zapatilla",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238799/joyl3txv8jbqlowg2k88.webp"
  },
  {
    nombre: "XV · Con mamá",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238800/kaio442qnly8kzrkdmfo.webp"
  },
  {
    nombre: "XV · Jardín entre rosas",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238801/v5gcmfyiyw30qlddlnhb.webp"
  },
  {
    nombre: "XV · Fiesta con amigos",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238803/iw4seyifvdbdeyktizpn.webp"
  },
  {
    nombre: "XV · Vals",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238805/cuqrbnq3hil0xvdazds3.webp"
  },
  {
    nombre: "XV · Baile con papá",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238806/v553t8kwufvqtqpx9bie.webp"
  },
  {
    nombre: "XV · Salón",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238807/gkwtvgbtnibotxdop4yw.webp"
  },
  {
    nombre: "XV · Pastel",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238808/qwerh0s8b7bljorset1o.webp"
  },
  {
    nombre: "XV · Detalle tiara y ramo",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238810/wmjpxuf3yy7l6e4s5v2i.webp"
  },
  {
    nombre: "XV · Vestido",
    evento: "xv",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795238811/qoxwwnnrhkkhtgp1vwlg.webp"
  }
];

export const fotosListasPorEvento = (evento: TipoEvento): FotoLista[] =>
  FOTOS_LISTAS.filter(f => f.evento === evento);
