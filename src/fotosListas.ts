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
  grupo?: string; // set dentro del evento cuando hay más de uno (p. ej. "niña" / "niño" en cumpleaños); sin grupo = set único del evento
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
  },
  // Set de Cumpleaños (2026-11-24, v2) -- DOS sets ficticios distintos, niña (vestido rosa
  // pastel, diadema de flores) y niño (tema espacial azul), distinguidos por `grupo` -- el
  // festejado puede ser cualquiera de los dos, así que el bloque "Fotos listas" los muestra y
  // los inserta por separado (ver botonesFotosListasPorEvento/handleInsertarSetFotosCompleto en
  // App.tsx), nunca mezclados en una sola cuadrícula/botón.
  {
    nombre: "Cumpleaños niña · Portada",
    evento: "cumpleanos",
    grupo: "niña",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795525912/emldpcc99tubtlvvzk4w.webp",
    esPortada: true
  },
  {
    nombre: "Cumpleaños niña · Pastel",
    evento: "cumpleanos",
    grupo: "niña",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795525914/rrb2plmwqw9kcv9j8mde.webp"
  },
  {
    nombre: "Cumpleaños niña · Con sus papás",
    evento: "cumpleanos",
    grupo: "niña",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795525915/rzp3b24ce6cmbkp0lnoy.webp"
  },
  {
    nombre: "Cumpleaños niña · Piñata",
    evento: "cumpleanos",
    grupo: "niña",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795525917/tl3mlp1eta09hthsocoq.webp"
  },
  {
    nombre: "Cumpleaños niña · Amigos",
    evento: "cumpleanos",
    grupo: "niña",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795525918/ejn3978x83vpoy6pipja.webp"
  },
  {
    nombre: "Cumpleaños niña · Mesa de dulces",
    evento: "cumpleanos",
    grupo: "niña",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795525920/umullwh7u95lzudp8u3f.webp"
  },
  {
    nombre: "Cumpleaños niña · Regalos",
    evento: "cumpleanos",
    grupo: "niña",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795525921/l2fslcbngyxru2ch3gt3.webp"
  },
  {
    nombre: "Cumpleaños niña · Retrato",
    evento: "cumpleanos",
    grupo: "niña",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795525922/kcbfwawdtw1u7ntgqdz6.webp"
  },
  {
    nombre: "Cumpleaños niño · Portada",
    evento: "cumpleanos",
    grupo: "niño",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526157/beq6eliv8bjxpuv0loax.webp",
    esPortada: true
  },
  {
    nombre: "Cumpleaños niño · Pastel",
    evento: "cumpleanos",
    grupo: "niño",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526158/o6ydohr0sykl1xx4es3x.webp"
  },
  {
    nombre: "Cumpleaños niño · Con sus papás",
    evento: "cumpleanos",
    grupo: "niño",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526159/rfy1rzyavaxlw761aszz.webp"
  },
  {
    nombre: "Cumpleaños niño · Piñata",
    evento: "cumpleanos",
    grupo: "niño",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526161/xlic9y88wppq6vxlosa6.webp"
  },
  {
    nombre: "Cumpleaños niño · Amigos",
    evento: "cumpleanos",
    grupo: "niño",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526162/mtmkzbxtab1p34g3ujar.webp"
  },
  {
    nombre: "Cumpleaños niño · Mesa de dulces",
    evento: "cumpleanos",
    grupo: "niño",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526163/gashfrckeb78glwnvkgf.webp"
  },
  {
    nombre: "Cumpleaños niño · Regalos",
    evento: "cumpleanos",
    grupo: "niño",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526164/ctoteczy2irehbibw8ek.webp"
  },
  {
    nombre: "Cumpleaños niño · Retrato",
    evento: "cumpleanos",
    grupo: "niño",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526165/zq2qkiahjazpk4xa80ms.webp"
  }
];

export const fotosListasPorEvento = (evento: TipoEvento): FotoLista[] =>
  FOTOS_LISTAS.filter(f => f.evento === evento);
