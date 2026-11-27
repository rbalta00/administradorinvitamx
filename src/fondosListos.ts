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
  },
  {
    nombre: "Bautizo · Blanco y dorado",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795786767/rtsns9tekgeiv22r5pyo.webp"
  },
  {
    nombre: "Bautizo · Azul pastel",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795786766/qat0ren5cpga4kqvwzr9.webp"
  },
  {
    nombre: "Bautizo · Rosa pastel",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795786770/tgmahzhf5uurgtvxtnue.webp"
  },
  {
    nombre: "Bautizo · Botánico blanco",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795786768/lepb51avunj69cnqm6tj.webp"
  },
  {
    nombre: "Bautizo · Angelical",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795786765/qadb4izmp38kobq7hola.webp"
  },
  {
    nombre: "Bautizo · Iglesia y luz",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795786769/nfdwaltevxsl8gosu5i2.webp"
  },
  {
    nombre: "Primera Comunión · Blanco y dorado",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795788103/hdlu0wkem00kgmgdfnuo.webp"
  },
  {
    nombre: "Primera Comunión · Celeste",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795788106/zyi8wjgopmx3vkuvuq58.webp"
  },
  {
    nombre: "Primera Comunión · Rosa pastel",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795788109/cjwui0dwjjdzxsbsjuo7.webp"
  },
  {
    nombre: "Primera Comunión · Botánico blanco",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795788104/mqdl7ns3xsiakecrjxpy.webp"
  },
  {
    nombre: "Primera Comunión · Luz dorada",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795788108/qzxrqkbk4p7e2s6vvqfo.webp"
  },
  {
    nombre: "Primera Comunión · Encaje y perlas",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795788107/wbyztgyv8xzzcca1r1dk.webp"
  },
  {
    nombre: "Graduación · Azul marino y dorado",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795789310/qdseqigx0ofo7yxnb2je.webp"
  },
  {
    nombre: "Graduación · Negro y dorado",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795789312/u0v3knvapamahoje5p6y.webp"
  },
  {
    nombre: "Graduación · Blanco y dorado",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795789312/dgfrhrkhxz13gvh6tfug.webp"
  },
  {
    nombre: "Graduación · Vino",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795789316/zyaop4ltfu9osu5thv27.webp"
  },
  {
    nombre: "Graduación · Gris perla",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795789314/kt8oecm1qpcnvgpbux8u.webp"
  },
  {
    nombre: "Graduación · Terracota",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795789315/fqyalwnertpplew57bgc.webp"
  }
];

export const fondosListosPorEvento = (evento: TipoEvento): FondoListo[] =>
  FONDOS_LISTOS.filter(f => f.evento === evento);
