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
    nombre: "Boda · Marfil y perlas",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861604/ddhfbc8ebydxlgnoyc31.webp"
  },
  {
    nombre: "Boda · Jardín de peonías",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861605/mprovj75mscilkpigh0j.webp"
  },
  {
    nombre: "Boda · Esmeralda",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861607/all2urlhvnucj9ni4vb2.webp"
  },
  {
    nombre: "Boda · Lavanda",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861608/p64csokxlptvhtafo8fe.webp"
  },
  {
    nombre: "Boda · Oro rosado",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861610/pzyzweunzrxeswi5nzoq.webp"
  },
  {
    nombre: "Boda · Celeste y plata",
    evento: "boda",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861611/xcgzg3f1ys9timc1yaw4.webp"
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
    nombre: "Cumpleaños · Turquesa",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861621/uxomixgsfeq376cftnll.webp"
  },
  {
    nombre: "Cumpleaños · Dinosaurios",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861623/bp5z0rotigxmjzwsg2uq.webp"
  },
  {
    nombre: "Cumpleaños · Unicornio",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861624/fmrmrnvs72qv7ncczvfh.webp"
  },
  {
    nombre: "Cumpleaños · Náutico",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861625/a00k6udakzuv7afxj7cc.webp"
  },
  {
    nombre: "Cumpleaños · Dulces",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861627/hjt9ehukcqmjnykwgc3s.webp"
  },
  {
    nombre: "Cumpleaños · Neón",
    evento: "cumpleanos",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861628/zawcnyyo0mq84eudlhxt.webp"
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
    nombre: "Bautizo · Nubes",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861605/dezqg6dzncoaqrc3jffg.webp"
  },
  {
    nombre: "Bautizo · Encaje dorado",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861606/eeny8lyt4bdmgs8lnhz5.webp"
  },
  {
    nombre: "Bautizo · Salvia",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861608/v9p9qf4fvab3t0zy1ejz.webp"
  },
  {
    nombre: "Bautizo · Lila",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861609/n41fayinwdsbvifep08u.webp"
  },
  {
    nombre: "Bautizo · Durazno",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861610/mndjg3m35r8k8vdi9zjf.webp"
  },
  {
    nombre: "Bautizo · Halo dorado",
    evento: "bautizo",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861611/v2pkgsmu4uij65zeec6x.webp"
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
    nombre: "Comunión · Trigo dorado",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861599/e22fu2esgugoexgmucyh.webp"
  },
  {
    nombre: "Comunión · Lirios",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861600/rzx13ierajygxhqpdopi.webp"
  },
  {
    nombre: "Comunión · Azul sereno",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861601/aun2tcxgoyiuse5cumak.webp"
  },
  {
    nombre: "Comunión · Olivo",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861603/vo15d7s6r4q14wioygqq.webp"
  },
  {
    nombre: "Comunión · Perla",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861605/fynfabbqck9p4qbbtzlw.webp"
  },
  {
    nombre: "Comunión · Vitral",
    evento: "primera-comunion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861606/xhel4vajgw3t02figznf.webp"
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
  },
  {
    nombre: "Graduación · Esmeralda",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861620/eqn1n2lgxqsxqccvcofa.webp"
  },
  {
    nombre: "Graduación · Platino",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861621/wgp0gieljpvun9mnsfbl.webp"
  },
  {
    nombre: "Graduación · Medianoche",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861623/sycu8i2ndepbwohzbvhh.webp"
  },
  {
    nombre: "Graduación · Cobre",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861624/qqh8fsxlrxc46mzumkv8.webp"
  },
  {
    nombre: "Graduación · Monocromo",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861626/j8wmxkzbjtazrdennwtb.webp"
  },
  {
    nombre: "Graduación · Champán",
    evento: "graduacion",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861627/dm7bqdvn9vzibtvpksds.webp"
  },
  // Set de Baby Shower (2026-11-27) -- 6 fondos, mismo criterio que los sets de arriba.
  {
    nombre: "Baby Shower · Menta",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790171/pcejdlzyidmgpxkxlyrc.webp"
  },
  {
    nombre: "Baby Shower · Rosa globos",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790172/tupbnz3mzymbm4rmzoy7.webp"
  },
  {
    nombre: "Baby Shower · Azul luna",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790168/ywvjmny7gv9z7tqchlhd.webp"
  },
  {
    nombre: "Baby Shower · Lavanda",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790170/sqmmjutlurwehip0mgvi.webp"
  },
  {
    nombre: "Baby Shower · Amarillo",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790166/yogoabhbypj1bgitqsgp.webp"
  },
  {
    nombre: "Baby Shower · Bosque",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790169/vinmbvfa2miyj7bbrbyk.webp"
  },
  {
    nombre: "Baby Shower · Durazno",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861609/isqfmxwzq4l48l8wfmpv.webp"
  },
  {
    nombre: "Baby Shower · Ositos",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861610/pc1lbfmkedd8hlzkmxn0.webp"
  },
  {
    nombre: "Baby Shower · Arcoíris boho",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861612/wh6wy042lyxl0rltyf25.webp"
  },
  {
    nombre: "Baby Shower · Conejitos",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861613/uygoiselh2ezfuayseio.webp"
  },
  {
    nombre: "Baby Shower · Estrellas",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861615/in4svxju2piuoiwvtth3.webp"
  },
  {
    nombre: "Baby Shower · Flores silvestres",
    evento: "baby-shower",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861616/pudc0yr1dzubkslarhcf.webp"
  },
  // Set de Aniversario (2026-11-27) -- 6 fondos, mismo criterio que los sets de arriba.
  {
    nombre: "Aniversario · Dorado y rosas",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790869/gesz0uxmrclefw92ahdb.webp"
  },
  {
    nombre: "Aniversario · Plata",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790870/dbvdmlcvbcuuvnchyynp.webp"
  },
  {
    nombre: "Aniversario · Blanco y dorado",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790867/kc3swpmvdtrfkhdtat69.webp"
  },
  {
    nombre: "Aniversario · Vino y rosas",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790873/qwgc2vvnobbmq1icblh9.webp"
  },
  {
    nombre: "Aniversario · Velas",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790872/xw6xwbgeewr2ul6k9ged.webp"
  },
  {
    nombre: "Aniversario · Botánico",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795790868/yseutyaxyjggcbksl2st.webp"
  },
  {
    nombre: "Aniversario · Negro y dorado",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861599/bkdww6j9ujeujfspjaai.webp"
  },
  {
    nombre: "Aniversario · Medianoche",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861600/y5wjfy8hmpee51x3wirm.webp"
  },
  {
    nombre: "Aniversario · Champán",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861601/xgyj8i4y1h6fykwvzdwj.webp"
  },
  {
    nombre: "Aniversario · Atardecer",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861603/lgyef3arnnow2ibwg43t.webp"
  },
  {
    nombre: "Aniversario · Olivo",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861604/bzeisacyofltkapwhxxi.webp"
  },
  {
    nombre: "Aniversario · Rubí",
    evento: "aniversario",
    url: "https://res.cloudinary.com/dswrrm5u1/image/upload/v1795861606/txrptrlk08so1k34m1hl.webp"
  }
];

export const fondosListosPorEvento = (evento: TipoEvento): FondoListo[] =>
  FONDOS_LISTOS.filter(f => f.evento === evento);
