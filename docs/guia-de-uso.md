# Guía de uso — Generador de Invitaciones XV

Esta guía es para cualquier persona que vaya a usar el editor para generar invitaciones digitales que vendemos — no asume conocimiento técnico. Si buscas documentación de arquitectura/código, eso vive en `CLAUDE.md`, no aquí.

## 1. Cómo entrar

Abre **https://administradorinvitamx.vercel.app**. El navegador te va a pedir usuario y contraseña (es el login del editor, distinto a cualquier cuenta de cliente). Si no tienes las credenciales, pídeselas a quien administra el proyecto.

Una vez dentro, caes directo en el editor — no hay una pantalla de bienvenida aparte.

## 2. Primeros pasos: empezar un cliente nuevo

1. Clic en **"Mis Invitaciones"** (grupo "Ver todo" de la barra de botones).
2. Clic en **"+ Nuevo Cliente"**.
3. Captura nombre, teléfono y el paquete que compró (Básico / Premium / Deluxe).

Esto crea el registro del cliente en Supabase **de inmediato** (antes de diseñar nada), así la venta queda registrada desde el momento en que se hace. Después puedes volver a este cliente en cualquier momento desde "Mis Invitaciones" para seguir editando, sin perder lo que ya llevas.

> Si solo quieres probar algo sin crear un cliente real, puedes editar directo en la pantalla principal — pero si no lo guardas con "Guardar en Supabase", se pierde al cerrar el navegador (sí queda un respaldo automático en este dispositivo mientras no lo cierres).

## 3. Las 9 pestañas del expediente (orden recomendado)

Estas son las secciones donde capturas los datos de la invitación. Son 9 — si tu pantalla no es muy ancha, se acomodan solas en varias filas, no hace falta arrastrar ni buscar flechas.

| # | Pestaña | Qué captura aquí |
|---|---------|-------------------|
| 1 | **Tema/Paquete** | El paquete contratado (define cuántas fotos caben y qué secciones están disponibles), el tema visual (de los 13 diseños o "Personalizado"), y qué secciones quieres prender/apagar en esta invitación específica. Empieza siempre aquí. |
| 2 | **Quinceañera** | Nombre, fecha y hora del evento, mensaje de bienvenida, hashtag, WhatsApp para confirmaciones, enlace de música de fondo, foto de portada. |
| 3 | **Direcciones** | Ubicación de la ceremonia y de la recepción, con su link a Google Maps. |
| 4 | **Agenda y Vestido** | El itinerario/programa del evento (hora por hora) y el código de vestimenta. |
| 5 | **Familia** | Padres y padrinos. |
| 6 | **Regalos** | Mesa de regalos y datos bancarios (con botón de copiar para el invitado). |
| 7 | **Álbum** | Las fotos de la galería (el número máximo depende del paquete — ver tabla abajo). |
| 8 | **Lista Pases** | Los invitados/familias con su número de pases, para generarles un link personalizado. Aquí también se asigna la mesa de cada familia (opcional) y se activa, si se contrató, el **Control de Acceso QR**. |
| 9 | **A Medida** | Personalización libre de colores, tipografía, estilo de apertura y más — **solo funciona si en la pestaña 1 elegiste el tema "Personalizado 🎨 (A Medida)"**, si no, estos controles no hacen nada. |

**Máximo de fotos por paquete:** Básico 4 — Premium 8 — Deluxe 14.

## 4. Mientras editas: el Monitor de Invitación

El panel derecho ("Monitor de Invitación") muestra una vista previa en vivo. Puedes cambiar entre **Móvil / Tablet / Escritorio** (así se ve cada invitado según su pantalla) y ajustar el zoom. Usa "Nueva Pestaña" para abrir la vista previa completa en una pestaña aparte.

## 5. Los botones de acción (panel izquierdo, arriba)

Están agrupados por lo que hacen — cada grupo tiene su propia etiqueta:

- **Esta invitación**
  - *Generar invitación*: sincroniza tus cambios y arma el enlace para compartir. Haz clic aquí antes de copiar/descargar, para asegurarte de que lleva lo último que capturaste.
  - *Guardar en Supabase*: guarda el diseño completo en la base de datos, para que aparezca/se actualice en "Mis Invitaciones" y no se pierda si cierras el navegador.
- **Exportar / copiar**
  - *Descargar index.html*: el archivo final listo para subir donde sea.
  - *Descargar PDF de Regalo*: versión PDF de recuerdo (incluida sin costo en Deluxe, complemento à la carte en los demás paquetes — revisa que el cliente lo haya pagado antes de entregarlo).
  - *Copiar HTML* / *Copiar Datos*: copian el código o el JSON de configuración, para respaldo o soporte técnico.
- **Ver todo**
  - *Mis Invitaciones*: la lista de todos los clientes/pedidos guardados — ábrela para retomar, duplicar, archivar o eliminar cualquiera.
  - *Ingresos*: dashboard de cobros totales, histórico mensual y lo que falta por cobrar, de todos los clientes (no solo el que tienes abierto).
- **Cuenta / dispositivo**
  - *Instalar app*: instala el editor como app en tu celular/computadora (acceso directo, sin abrir el navegador cada vez).
  - *📖 Manual de uso*: abre este manual completo en una pestaña nueva — también sirve para capacitar a alguien que apenas está aprendiendo a usar el editor.
  - *Cerrar sesión*: cierra tu sesión en este navegador (te va a volver a pedir usuario y contraseña).
- **Limpiar** (en rojo, separado a propósito): borra el formulario actual para empezar de cero. Úsalo con cuidado — no es lo mismo que eliminar un cliente guardado.

## 6. Entregar la invitación al cliente

1. Revisa el Monitor de Invitación en las 3 vistas (Móvil/Tablet/Escritorio).
2. Clic en **"Generar invitación"**.
3. Comparte el enlace generado por WhatsApp (el botón de compartir ya arma el mensaje).
4. Si el cliente pagó el PDF de regalo, descárgalo y envíaselo también.
5. Guarda en Supabase para que quede registrado en "Mis Invitaciones".

## 7. Otras funciones que puedes usar según el caso

- **Formulario del cliente (intake)**: en vez de que tú captures todo, puedes mandarle al cliente un link para que él mismo llene su fecha, ceremonia, recepción, itinerario, padrinos y suba sus fotos — se genera desde "Mis Invitaciones", en la fila de ese cliente. El formulario solo le pregunta las secciones que de verdad vienen en lo que compró (según su paquete y lo que haya pagado a la carte) — nunca le muestra algo que no pagó. Cada una de esas secciones trae su propio interruptor "Incluida / No incluida": aunque haya pagado el paquete completo, el cliente puede decidir no usar alguna (ej. no quiere poner padrinos) sin que eso afecte el resto. En cuanto guarda, esa decisión queda guardada como el mismo apagado/encendido de sección que usas tú en la pestaña "Tema/Paquete" del editor — reabre la invitación ahí y vas a ver exactamente lo que el cliente quiso, independientemente del paquete que compró. Subir menos fotos de las que su paquete permite también es válido, no hace falta llenar todos los espacios.
- **Pases personalizados por familia** (pestaña "Lista Pases"): cada familia puede tener su propio link con su nombre y número de pases — útil para controlar quién entra.
- **Control de Acceso QR** (complemento, requiere tener pases activo): cada pase trae un QR que se escanea con la cámara normal del celular en la puerta, para confirmar la entrada sin listas en papel.
- **Confirmación de asistencia (RSVP)**: el invitado puede confirmar directo desde su invitación — te llega un aviso por WhatsApp y queda un conteo en vivo.
- **Bloquear acceso a una invitación ya entregada**: en "Mis Invitaciones", cada cliente tiene un interruptor para apagar/encender el acceso a su link (por ejemplo, si el evento ya pasó o hay un problema de pago) — es 100% manual, nunca se bloquea solo.
- **Mensajes predeterminados por WhatsApp**: en "Mis Invitaciones", botón "💬 Mensajes" de cada cliente — textos ya listos (invitación lista, saldo pendiente, faltan datos/fotos, evento próximo, agradecimiento) que abren WhatsApp directo con el número guardado de ESE cliente y el texto ya puesto, sin tener que escribirlo cada vez. Tú sigues teniendo que darle "Enviar" — WhatsApp no deja mandarlo solo sin su API de Negocios de pago. El de saldo pendiente y el de evento próximo solo aparecen cuando aplican (si de verdad debe algo, o si ya tiene fecha capturada). Ahí mismo hay un botón "📤 Vista previa de su invitación" que manda el link de ESA invitación tal cual está guardada, sin necesidad de abrirla primero en el editor.
- **"👤 Administrar cliente"** (junto a "Abrir en editor" en "Mis Invitaciones"): un solo clic abre de golpe los 3 paneles de ese cliente — Pagos y estatus, Mensajes (con la vista previa) y Confirmaciones — para tener todo su seguimiento a la vista sin ir botón por botón. El teléfono guardado también se muestra ahora en la ficha de cada cliente. "Activa hasta" y "Acceso del invitado/cliente" (apagar/encender el link) siguen siempre visibles en la ficha, sin necesidad de abrir nada.

## 8. Preguntas frecuentes

**¿Por qué las pestañas se ven en varias filas?**
Son 9 y en pantallas angostas no caben en una sola línea — se acomodan solas en la fila de abajo, es normal, no falta ninguna.

**Cambié algo pero el link que compartí no se actualizó.**
Los links ya compartidos NO se actualizan solos. Tienes que generar y volver a compartir un link nuevo cada vez que cambies algo después de haber entregado.

**¿Dónde quedan guardados los datos del cliente?**
En Supabase, una vez que uses "Guardar en Supabase" o "+ Nuevo Cliente". Mientras no lo guardes ahí, solo vive en este navegador/dispositivo (respaldo automático en `localStorage`, se pierde si borras datos de navegación).

**¿Puedo editar una invitación que ya entregué?**
Sí — ábrela desde "Mis Invitaciones", edítala, y genera/comparte un nuevo link. El link viejo no se actualiza solo (ver pregunta anterior).

## 9. ¿Dónde está la lista de funcionalidades para vender/escribir copy?

En `CLAUDE.md` (raíz del repo), sección **"Lista de funcionalidades para copy de venta / landing page"** — ahí está todo lo que el producto de verdad entrega al cliente (temas, secciones, pases, tiempos, paquetes y precios) listo para usarse en `invitacionmx-landing` o cualquier material de venta, más una lista de lo que **no** hay que prometer para no generar expectativas falsas. Se actualiza cada vez que cambia una sección/tema/precio real — no inventar datos aparte de esa lista.
