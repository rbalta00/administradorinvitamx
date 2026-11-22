# Guía de uso — Generador de Invitaciones XV

Esta guía es para cualquier persona que vaya a usar el editor para generar invitaciones digitales que vendemos — no asume conocimiento técnico. Si buscas documentación de arquitectura/código, eso vive en `CLAUDE.md`, no aquí.

## 1. Cómo entrar

Abre **https://administradorinvitamx.vercel.app**. El navegador te va a pedir usuario y contraseña (es el login del editor, distinto a cualquier cuenta de cliente). Si no tienes las credenciales, pídeselas a quien administra el proyecto.

Una vez dentro, caes directo en el editor — no hay una pantalla de bienvenida aparte.

## 2. Primeros pasos: empezar un cliente nuevo

1. Clic en **"Mis Invitaciones"** (grupo "Ver todo" de la barra de botones).
2. Clic en **"+ Nuevo Cliente"**.
3. Captura nombre, teléfono y el paquete que compró (Básico / Estándar / Premium).

Esto crea el registro del cliente en Supabase **de inmediato** (antes de diseñar nada), así la venta queda registrada desde el momento en que se hace. Después puedes volver a este cliente en cualquier momento desde "Mis Invitaciones" para seguir editando, sin perder lo que ya llevas.

> Si solo quieres probar algo sin crear un cliente real, puedes editar directo en la pantalla principal — pero si no lo guardas con "Guardar en Supabase", se pierde al cerrar el navegador (sí queda un respaldo automático en este dispositivo mientras no lo cierres).

## 3. Las 9 pestañas del expediente (orden recomendado)

Estas son las secciones donde capturas los datos de la invitación. Son 9 — si tu pantalla no es muy ancha, se acomodan solas en varias filas, no hace falta arrastrar ni buscar flechas.

| # | Pestaña | Qué captura aquí |
|---|---------|-------------------|
| 1 | **Tema/Paquete** | El paquete contratado (define cuántas fotos caben y qué secciones están disponibles), el tema visual (de los 14 diseños o "Personalizado"), y qué secciones quieres prender/apagar en esta invitación específica. Empieza siempre aquí. |
| 2 | **Quinceañera** | **Tipo de Evento** (XV Años / Boda / Cumpleaños / Bautizo / Primera Comunión / Graduación / Baby Shower / Aniversario — solo cambia las palabras que ve el invitado, nunca el tema, el paquete ni las secciones), nombre, fecha y hora del evento, mensaje de bienvenida, hashtag, WhatsApp para confirmaciones, enlace de música de fondo, foto de portada. |
| 3 | **Direcciones** | Ubicación de la ceremonia y de la recepción, con su link a Google Maps. |
| 4 | **Agenda y Vestido** | El itinerario/programa del evento (hora por hora) y el código de vestimenta. |
| 5 | **Familia** | Padres y padrinos. |
| 6 | **Regalos** | Mesa de regalos y datos bancarios (con botón de copiar para el invitado). |
| 7 | **Álbum** | Las fotos de la galería (el número máximo depende del paquete — ver tabla abajo), el fondo de la invitación (subido a mano, o elegido con un clic de "Fondos listos" si tu evento ya tiene fondos predefinidos — hoy solo Boda — ver abajo) y la foto de portada. |
| 8 | **Lista Pases** | Los invitados/familias con su número de pases, para generarles un link personalizado. Aquí también se asigna la mesa de cada familia (opcional) y se activa, si se contrató, el **Control de Acceso QR**. |
| 9 | **A Medida** | Personalización libre de colores, tipografía, estilo de apertura, itinerario, portada y más — **funciona con cualquier tema del catálogo**, no solo "Personalizado 🎨" (desde el 2026-11-19). Si no tocas nada aquí, cada control se queda con lo que trae el tema elegido. |

**Máximo de fotos por paquete:** Básico 4 — Estándar 8 — Premium 14.

**Fondos listos (pestaña Álbum, 2026-11-22)**: debajo del fondo subido a mano, un bloque nuevo muestra fondos prediseñados que puedes aplicar con un clic, sin subir nada — la lista depende del **Tipo de Evento** que elegiste en la pestaña "Quinceañera" (hoy solo hay fondos de Boda; si el evento no tiene ninguno todavía, el bloque avisa que aún no hay). El fondo que elijas se recuerda por separado para cada tipo de evento que esta invitación use: si cambias de Boda a XV Años, se usa el fondo normal de ese caso (el subido a mano o el del tema); si vuelves a Boda, tu elección de fondo listo reaparece sola. Cuando hay un fondo listo elegido para el evento actual, ese manda sobre cualquier fondo subido a mano — un aviso en el propio bloque te lo recuerda.

**Tipo de Apertura (pestañas 1 y 9, mismo control en ambos lugares)**: la pantalla animada que ve el invitado antes de entrar a la invitación. 5 opciones, cada una con su mini-vista previa animada en los colores del tema activo — **aplica a cualquier tema**, no solo a "Personalizado" (a diferencia de fuente/colores de la pestaña 9, que sí requieren ese tema):
- **Tarjeta 🎴**: tarjeta con brillo metálico y botón "Tocar para abrir" — usa de fondo la foto de portada si ya la subiste, difuminada.
- **Sobre 💌**: sobre de papel con sello de cera (la inicial de la quinceañera) que se rompe y se abre.
- **Cortina 🎭**: telón de tela que se recoge hacia los lados, con cenefa y resplandor de luz de escenario.
- **Puertas 🚪 (Puertas de gala)**: dos hojas con marco que se abren hacia afuera revelando luz desde el centro.
- **Destellos ✨ (Lluvia de luz)**: explosión de destellos que disuelve la pantalla — la más ligera/rápida, pensada para temas oscuros como Místico Celestial y Ciber Cyber Neon.

Si no eliges ninguna, cada tema trae su propia apertura por default (ver `tipoAperturaPorDefectoDelTema` en el código si necesitas la lista exacta). Las 5 respetan "Reducir movimiento" del sistema del invitado — si lo tiene activo, la animación se salta y entra directo.

**Diseño del Itinerario (pestañas 1 y 9, junto a Tipo de Apertura)**: cómo se ve la sección "Nuestro Itinerario" — también aplica a cualquier tema. 3 opciones, con mini-vista previa en los colores del tema:
- **Clásica 🕰️** (default si no eliges nada): línea vertical con nodos e íconos — el diseño de siempre.
- **Editorial 📜**: sin línea, tarjetas amplias con fondo del tema (nunca blanco fijo), hora grande en la fuente de encabezado — como un programa de gala impreso.
- **Minimalista ⋯**: sin tarjetas, filas limpias con línea de puntos guía entre la hora y el evento — pensada para leerse bien en temas oscuros (Místico Celestial, Ciber Cyber Neon).

Los íconos (misa/iglesia → libro, brindis/cena → campana, recepción/coctel → edificio, baile/vals/show → música, cualquier otro → reloj) se detectan solos por palabras clave del texto del evento, igual en los 3 estilos — no hace falta elegirlos a mano. Una invitación guardada antes de que existiera este selector se ve exactamente igual que siempre (Clásica).

**Diseño de la Portada (pestañas 1 y 9, junto a Itinerario)**: cómo se presenta la foto principal arriba de la invitación — también aplica a cualquier tema. 4 opciones, con mini-vista previa en los colores del tema:
- **Circular ⚪**: foto redonda con anillo y efecto de flotación — el diseño de siempre.
- **Arco 🪟**: foto tipo ventana, en forma de arco, con borde doble de acento.
- **Fondo 🖼️**: la foto ocupa TODA la portada de fondo, con un velo del color del tema encima para que el texto se siga leyendo bien. Si todavía no subiste ninguna foto, cae automáticamente a "Circular" (sin foto no hay nada que poner de fondo).
- **Marco 🖼️**: foto rectangular con marco ornamental doble y esquinas decorativas (florituras/emoji del tema).

Si no eliges ninguno a mano, **cada tema trae su propio diseño de portada por default** (desde el 2026-11-19 — antes todos caían a "Circular" por igual): Marco en Dorado Clásico y Mármol & Oro; Arco en Floral Acuarela, Eucalipto Botánico, Rustique Boho Chic, Princesa Elegante, Vuelo de Mariposas, XV Coquette Listones Rose y XV Coquette Luxe; Fondo en Místico Celestial, Ciber Cyber Neon, Aurora Boreal, Vino Elegante y Glam Rose Oro; Circular en el resto (incluido Personalizado). El panel siempre marca "✓ Elegido" sobre el que esté activo de verdad (tu elección manual, o el default del tema si no tocaste nada) — una elección manual, incluyendo "Circular" a propósito, siempre manda sobre el default del tema.

Los 4 estilos conservan el nombre, "Mis XV Años", la pastilla "15 Primaveras", la fecha y la flecha de scroll tal cual — solo cambia cómo se presenta la foto.

**Fuentes y Paleta de Colores (pestaña 9, "A Medida") — ya funcionan con cualquier tema desde el 2026-11-19**: antes solo tenían efecto con el tema "Personalizado 🎨" — ahora se pueden usar para ajustar la tipografía o el color de acento de CUALQUIERA de los 14 temas del catálogo, sin perder el resto del diseño del tema (fondo, íconos, decoración). Si no tocas nada aquí, el tema se queda con su tipografía/color original. Fuentes disponibles: Inter, Garamond, Poppins, Montserrat, Jost.

**Animación al Hacer Scroll (pestaña 1, junto a "Efecto de Animación de Caída")**: activa que cada sección entre con una subida suave y desvanecido al llegar a ella, en vez de aparecer de golpe (como hoy, si lo dejas apagado). Respeta "Reducir movimiento" del dispositivo del invitado, y nunca deja contenido oculto permanentemente aunque algo falle en el navegador del invitado.

**Diseño de la Cuenta Regresiva (pestaña 1, junto a Formato de la Galería)**: 3 opciones —
- **Cajas** (default): 4 cajas con fondo del tema — el diseño de siempre.
- **Elegante**: sin cajas, números grandes en la fuente de encabezado del tema.
- **Línea**: una sola fila compacta ("23 días · 04 hrs · 12 min · 05 seg") en una pastilla translúcida — ideal para temas oscuros como Místico Celestial o Ciber Cyber Neon.

**Formato de la Galería de Fotos (pestaña 1)** — ahora con 3 opciones, cada una con mini-vista previa en los colores del tema:
- **Cuadrícula** (default): todas las fotos a la vista, en columnas — como siempre.
- **Carrusel**: una fila que se desliza, no crece en alto sin importar cuántas fotos tenga el álbum.
- **Polaroid 📸**: fotos instantáneas con marco blanco y rotación alternada, como pegadas en un álbum. Las tres reusan el mismo lightbox (toca una foto y se abre en grande).

**Analítica de aperturas**: cada vez que un invitado real abre su invitación (no solo que cargue el link), se registra en silencio cuántas aperturas lleva esa invitación — sin guardar nada más (ni IP, ni dispositivo, ni ubicación). En "Mis Invitaciones", al expandir la fila de confirmaciones de una invitación verás "📊 Aperturas: N" arriba de la lista de RSVP. Si ves "—" en vez de un número, es que esa consulta no se pudo completar (por ejemplo, si el administrador del sistema no corrió la configuración necesaria en la base de datos) — nunca rompe la lista, solo deja ese dato sin mostrar.

### 3.1 Qué secciones vienen en cada paquete

Precios y estructura vigentes desde el rediseño de 2026-11-18. Esto está prendido/apagado por default según el paquete que compró el cliente — no hay que preguntar caso por caso, el editor ya lo filtra solo (pestaña "Tema/Paquete" → "Personalizar Secciones Habilitadas"):

| Sección | Básico ($299) | Estándar ($499) | Premium ($799) |
|---|---|---|---|
| Apertura, Portada, Cuenta regresiva, Mensaje, Ceremonia, Recepción, Itinerario, Vestimenta, Galería, Confirmación/RSVP, Hashtag, Calendario, Cierre (13 secciones) | ✅ Incluidas | ✅ Incluidas | ✅ Incluidas |
| Familia/Padrinos, Mesa de Regalos | 🔒 Apagadas por default (badge "Exclusiva Estándar/Premium"), +$99 c/u a la carta | ✅ Incluidas | ✅ Incluidas |
| Pases de entrada | 💲 A la carta, +$150 MXN, hasta 10 familias (apagada por default) | 💲 A la carta, +$180 MXN, hasta 20 familias (apagada por default) | ✅ Incluida gratis, hasta 40 familias |
| Descarga en PDF de regalo | 💲 A la carta, +$99 MXN | 💲 A la carta, +$99 MXN | ✅ Incluida gratis |

Extras disponibles en cualquier paquete: familia extra arriba del tope de pases +$20 c/u; Control de Acceso QR (requiere pases activos) +$150 fijo; ronda de ajustes extra (después de las 2 incluidas) $99 fijo.

**Regla:** si un cliente Básico pide Familia/Regalos, o un cliente Básico/Estándar pide Pases o PDF, se prende manualmente en "Personalizar Secciones Habilitadas" — solo porque el cliente lo pidió/pagó puntual, nunca por default. Hashtag y Calendario ya vienen incluidos por default desde Básico (no son una excepción que haya que negociar).

Ese mismo panel trae el botón **🔄 Habilitar Todas** (prende absolutamente todo, sin importar lo que incluya el paquete). Se probó un segundo botón "Fijar según paquete" (2026-11-18) que deshacía los apagados manuales de familia/regalos/pases según el paquete, pero se quitó el mismo día: el admin debe poder apagar CUALQUIER sección para un cliente puntual (aunque su paquete sí la incluya gratis, ej. "Mesa de Regalos") y que se quede apagada — un botón que la reactivara solo generaba confusión. Las secciones a la carte/exclusivas de cada paquete siguen marcadas con su badge (ver tabla de 3.1), pero apagar/prender cualquier sección siempre es decisión manual, nunca automática.

## 4. Mientras editas: el Monitor de Invitación

El panel derecho ("Monitor de Invitación") muestra una vista previa en vivo. Puedes cambiar entre **Móvil / Tablet / Escritorio** (así se ve cada invitado según su pantalla) y ajustar el zoom. Usa "Nueva Pestaña" para abrir la vista previa completa en una pestaña aparte.

## 5. Los botones de acción (panel izquierdo, arriba)

Están agrupados por lo que hacen — cada grupo tiene su propia etiqueta:

- **Esta invitación**
  - *Generar invitación*: sincroniza tus cambios y arma el enlace para compartir. Haz clic aquí antes de copiar/descargar, para asegurarte de que lleva lo último que capturaste.
  - *Guardar en Supabase*: guarda el diseño completo en la base de datos, para que aparezca/se actualice en "Mis Invitaciones" y no se pierda si cierras el navegador.
- **Exportar / copiar**
  - *Descargar index.html*: el archivo final listo para subir donde sea.
  - *Descargar PDF de Regalo*: versión PDF de recuerdo (incluida sin costo en Premium, complemento à la carte +$99 MXN en Básico/Estándar — revisa que el cliente lo haya pagado antes de entregarlo).
  - *Copiar HTML* / *Copiar Datos*: copian el código o el JSON de configuración, para respaldo o soporte técnico.
- **Ver todo**
  - *Mis Invitaciones*: la lista de todos los clientes/pedidos guardados — ábrela para retomar, duplicar, archivar o eliminar cualquiera.
  - *Ingresos*: dashboard de cobros totales, histórico mensual y lo que falta por cobrar, de todos los clientes (no solo el que tienes abierto).
  - *💳 Links de pago*: pega aquí UNA sola vez tus 4 links de pago (anticipo Básico/Estándar/Premium y uno de monto abierto para liquidaciones y extras) — se guardan en Supabase, no en este navegador, así que están disponibles igual en PC, PWA y celular. Con esto configurado, cada invitación en "Mis Invitaciones" gana los botones "💬 Cobrar anticipo"/"💬 Cobrar liquidación" (ver sección 7).
- **Cuenta / dispositivo**
  - *Instalar app*: instala el editor como app en tu celular/computadora (acceso directo, sin abrir el navegador cada vez).
  - *⟳ Actualizar*: recarga la app por completo. Útil si algo se ve viejo, raro, o no coincide con lo que esperabas — sobre todo en la ventana instalada (PWA), que no tiene botón de recargar ni barra de direcciones como un navegador normal. No es lo mismo que el "Actualizar" de dentro de "Mis Invitaciones" (ese solo vuelve a pedir la lista a Supabase, no recarga toda la app).
  - *📖 Manual de uso*: abre este manual completo en una pestaña nueva — también sirve para capacitar a alguien que apenas está aprendiendo a usar el editor.
  - *💬 Enviar link a colaborador*: abre WhatsApp con el link de este administrador ya escrito, listo para mandárselo a quien te esté ayudando (otro vendedor, un asistente) — tú eliges a quién o a qué grupo se lo mandas. No incluye la contraseña (eso se lo compartes tú por separado).
  - *📂 Enviar link del catálogo*: abre WhatsApp con el link del catálogo de los 14 temas ya escrito, para compartirlo con un cliente o prospecto (reemplaza la caja "4. Catálogo Digital de Temas" que antes vivía dentro de la pestaña "Tema/Paquete" — ocupaba mucho espacio, ahora es solo este botón).
  - *🌐 Enviar link de la landing*: abre WhatsApp con el link de la página de ventas pública (invitamx.app) ya escrito — precios, paquetes y todo lo que incluye, para mandarle a alguien que todavía no decide comprar.
  - *👁️ Abrir catálogo de temas*: abre el catálogo de temas directo en esta pestaña, para probarlo en vivo tú mismo antes de mandarlo.
  - *Cerrar sesión*: cierra tu sesión en este navegador (te va a volver a pedir usuario y contraseña).
- **Limpiar** (en rojo, separado a propósito): borra el formulario actual para empezar de cero. Úsalo con cuidado — no es lo mismo que eliminar un cliente guardado.

## 6. Entregar la invitación al cliente

1. Revisa el Monitor de Invitación en las 3 vistas (Móvil/Tablet/Escritorio).
2. Clic en **"Generar invitación"**.
3. Comparte el enlace generado por WhatsApp (el botón de compartir ya arma el mensaje).
4. Si el cliente pagó el PDF de regalo, descárgalo y envíaselo también.
5. Guarda en Supabase para que quede registrado en "Mis Invitaciones".

## 7. Otras funciones que puedes usar según el caso

- **Formulario del cliente (intake)**: en vez de que tú captures todo, puedes mandarle al cliente un link para que él mismo llene su fecha, ceremonia, recepción, itinerario, padrinos y suba sus fotos — se genera desde "Mis Invitaciones", en la fila de ese cliente (pestaña 💳 Pagos). Junto al botón de enviarlo por WhatsApp hay un botón "👁️ Abrir" que lo abre en una pestaña nueva tal cual lo ve el cliente, para revisarlo o probarlo antes de mandarlo. El formulario solo le pregunta las secciones que de verdad vienen en lo que compró (según su paquete y lo que haya pagado a la carte) — nunca le muestra algo que no pagó. Cada una de esas secciones trae su propio interruptor "Incluida / No incluida": aunque haya pagado el paquete completo, el cliente puede decidir no usar alguna (ej. no quiere poner padrinos) sin que eso afecte el resto. En cuanto guarda, esa decisión queda guardada como el mismo apagado/encendido de sección que usas tú en la pestaña "Tema/Paquete" del editor — reabre la invitación ahí y vas a ver exactamente lo que el cliente quiso, independientemente del paquete que compró. Subir menos fotos de las que su paquete permite también es válido, no hace falta llenar todos los espacios.
- **Pases personalizados por familia** (pestaña "Lista Pases"): cada familia puede tener su propio link con su nombre y número de pases — útil para controlar quién entra.
- **Control de Acceso QR** (complemento, requiere tener pases activo): cada pase trae un QR que se escanea con la cámara normal del celular en la puerta, para confirmar la entrada sin listas en papel.
- **Confirmación de asistencia (RSVP)**: el invitado puede confirmar directo desde su invitación — te llega un aviso por WhatsApp y queda un conteo en vivo.
- **Bloquear acceso a una invitación ya entregada**: en "Mis Invitaciones", pestaña "🔒 Vigencia y acceso" de cada cliente, hay un interruptor para apagar/encender el acceso a su link (por ejemplo, si el evento ya pasó o hay un problema de pago) — es 100% manual, nunca se bloquea solo.
- **Mensajes predeterminados por WhatsApp**: en "Mis Invitaciones", pestaña "💬 Mensajes" de cada cliente — textos ya listos (invitación lista, saldo pendiente, faltan datos/fotos, evento próximo, agradecimiento) que abren WhatsApp directo con el número guardado de ESE cliente y el texto ya puesto, sin tener que escribirlo cada vez. Tú sigues teniendo que darle "Enviar" — WhatsApp no deja mandarlo solo sin su API de Negocios de pago. El de saldo pendiente y el de evento próximo solo aparecen cuando aplican (si de verdad debe algo, o si ya tiene fecha capturada). Ahí mismo hay un botón "📤 Vista previa de su invitación" que manda el link de ESA invitación tal cual está guardada, sin necesidad de abrirla primero en el editor.
- **Cobrar por WhatsApp**: en "Mis Invitaciones", pestaña "💳 Pagos" de cada cliente — "💬 Cobrar anticipo" calcula el 50% del precio total y manda el link fijo de ese plan (o el de monto abierto si la invitación trae extras); se deshabilita solo ("Anticipo cobrado") en cuanto lo pagado ya cubre ese monto. "💬 Cobrar liquidación" manda el saldo exacto con el link de monto abierto; se deshabilita ("Liquidada") cuando el saldo llega a $0. Los dos solo ABREN WhatsApp con el mensaje y el link ya listos — tú le das "Enviar", y el pago se sigue registrando igual que siempre (abajo, en "Registrar abono") cuando se refleje. Requiere haber configurado antes tus links en "💳 Links de pago" (cabecera del panel) — si falta alguno, el botón te avisa en vez de abrir WhatsApp con un link vacío.
- **La ficha de cada cliente, en pestañas (rediseño 2026-11-18)**: cada fila de "Mis Invitaciones" trae 4 pestañas — 💳 Pagos, 💬 Mensajes, 👥 Confirmaciones y 🔒 Vigencia y acceso — mutuamente excluyentes (abrir una cierra la anterior), en vez de 3-4 bloques apilados a la vez como antes. "👤 Administrar cliente" (junto a "Abrir en editor") es el atajo de un clic: abre la ficha en la pestaña de Pagos si estaba cerrada, o la cierra si ya estaba abierta. Las acciones poco usadas (Duplicar, Respaldo JSON, Eliminar) se movieron al menú "⋯" junto a esos dos botones, para no saturar la fila con botones de solo-ícono. El teléfono, el tema y la fecha del cliente se ven siempre en la fila, sin tener que abrir ninguna pestaña.
- **La "Vista previa" que se manda desde "Mis Invitaciones" siempre es temporal y con marca de agua**: deja de funcionar a los 7 días (antes era 5, ahora cualquier "Muestra" de la app dura 1 semana) y mientras esté vigente se ve con el texto "VISTA PREVIA" repetido en diagonal sobre toda la invitación, además del banner de arriba — para que un cliente no pueda usarla como si ya fuera la final antes de pagar. Esto es automático, no depende de ningún toggle que se te pueda olvidar activar.

## 8. Preguntas frecuentes

**¿Por qué las pestañas se ven en varias filas?**
Son 9 y en pantallas angostas no caben en una sola línea — se acomodan solas en la fila de abajo, es normal, no falta ninguna.

**Cambié algo pero el link que compartí no se actualizó.**
Los links ya compartidos NO se actualizan solos. Tienes que generar y volver a compartir un link nuevo cada vez que cambies algo después de haber entregado.

**¿Dónde quedan guardados los datos del cliente?**
En Supabase, una vez que uses "Guardar en Supabase" o "+ Nuevo Cliente". Mientras no lo guardes ahí, solo vive en este navegador/dispositivo (respaldo automático en `localStorage`, se pierde si borras datos de navegación).

**¿Puedo editar una invitación que ya entregué?**
Sí — ábrela desde "Mis Invitaciones", edítala, y genera/comparte un nuevo link. El link viejo no se actualiza solo (ver pregunta anterior).

**¿Por qué no veo Familia/Regalos en un cliente Básico?**
Son exclusivas de Estándar/Premium por default (ver tabla en 3.1) — no es un error. Hashtag y Calendario SÍ vienen incluidos en Básico desde el rediseño de 2026-11-18. Si el cliente pidió Familia/Regalos aparte, prénderlas a mano en "Personalizar Secciones Habilitadas"; no asumas que vienen incluidas sin que el cliente lo haya pedido/pagado.

## 9. ¿Dónde está la lista de funcionalidades para vender/escribir copy?

En `CLAUDE.md` (raíz del repo), sección **"Lista de funcionalidades para copy de venta / landing page"** — ahí está todo lo que el producto de verdad entrega al cliente (temas, secciones, pases, tiempos, paquetes y precios) listo para usarse en `invitacionmx-landing` o cualquier material de venta, más una lista de lo que **no** hay que prometer para no generar expectativas falsas. Se actualiza cada vez que cambia una sección/tema/precio real — no inventar datos aparte de esa lista.
