import type { TipoEvento } from "./templates";

// Fondos "listos" de galería (2026-11-24, v2) -- catálogo fijo de fondos predefinidos que el
// admin puede aplicar a una invitación con un clic, en vez de subir un archivo a mano (ver
// "Fondo de la Invitación" en el editor). Agrupados por TIPO DE EVENTO (no por tema): ya hay
// fondos de boda y de cumpleaños, y la lista está pensada para crecer -- agregar un fondo
// nuevo o un evento nuevo es solo agregar una entrada aquí, sin tocar ningún otro archivo. El
// fondo elegido se guarda dentro de cada invitación (`datos.fondosGaleriaPorEvento`, ver
// types.ts), nunca aquí ni en el catálogo de temas -- esta lista es solo el menú de opciones.
export interface FondoListo {
  nombre: string;
  evento: TipoEvento;
  url: string;
}

export const FONDOS_LISTOS: FondoListo[] = [
  {
    nombre: "Boda · Dorado clásico",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795381734/cbsreufdqa9uikw9mjc5.webp"
  },
  {
    nombre: "Boda · Blanco minimalista",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795381730/gv9vb7kmegoryzkkpgrl.webp"
  },
  {
    nombre: "Boda · Botánico salvia",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795381732/pmassaxgpiq9izsrisoo.webp"
  },
  {
    nombre: "Boda · Azul empolvado",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795381728/itcblarwik0xbdauqrsc.webp"
  },
  {
    nombre: "Boda · Rosa empolvado",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795381736/llzbwrzbda3hoi3p0psj.webp"
  },
  {
    nombre: "Boda · Vino elegante",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795381739/hkbmyfsza2ryypmjts6s.webp"
  },
  {
    nombre: "Cumpleaños · Rosa pastel",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526420/nyq6b0oeqim6ys2dzkol.webp"
  },
  {
    nombre: "Cumpleaños · Espacial",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526421/gidr7u2c3ttb0zpo3yiv.webp"
  },
  {
    nombre: "Cumpleaños · Globos de colores",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526423/ail5mnpsj97gpw2ihp92.webp"
  },
  {
    nombre: "Cumpleaños · Jardín",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526424/mg1eoezo53vnjwtvfssw.webp"
  },
  {
    nombre: "Cumpleaños · Arcoíris pastel",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526425/potjxnaxnrcxhyk3zfeg.webp"
  },
  {
    nombre: "Cumpleaños · Dorado fiesta",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795526426/ecloloi5zyjjehqvaprq.webp"
  }
];

export const fondosListosPorEvento = (evento: TipoEvento): FondoListo[] =>
  FONDOS_LISTOS.filter(f => f.evento === evento);
