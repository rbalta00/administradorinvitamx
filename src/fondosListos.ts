import type { TipoEvento } from "./templates";

// Fondos "listos" de galería (2026-11-22) -- catálogo fijo de fondos predefinidos que el
// admin puede aplicar a una invitación con un clic, en vez de subir un archivo a mano (ver
// "Fondo de la Invitación" en el editor). Agrupados por TIPO DE EVENTO (no por tema): hoy
// solo hay fondos de boda, pero la lista está pensada para crecer -- agregar un fondo nuevo o
// un evento nuevo es solo agregar una entrada aquí, sin tocar ningún otro archivo. El fondo
// elegido se guarda dentro de cada invitación (`datos.fondosGaleriaPorEvento`, ver types.ts),
// nunca aquí ni en el catálogo de temas -- esta lista es solo el menú de opciones.
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
  }
];

export const fondosListosPorEvento = (evento: TipoEvento): FondoListo[] =>
  FONDOS_LISTOS.filter(f => f.evento === evento);
