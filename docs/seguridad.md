# Checklist de seguridad (para revisar a mano, Isaac)

Este documento es **solo una lista de verificación para ti** — no es código, y nadie
tocó la lógica de seguridad de la app al crear este archivo (eso está explícitamente
fuera de alcance, es trabajo de otra fase aparte). La idea es que revises estos tres
puntos cuando tengas un rato, directamente en los paneles de Vercel/Supabase/Cloudinary,
y anotes aquí mismo (o donde prefieras) lo que encuentres.

## Por qué esto importa (explicado en español sencillo)

Hoy, **toda la app funciona usando la "anon key" pública de Supabase** — esa llave
viaja dentro del código que se manda al navegador de cualquiera que abra la página
(se puede ver con herramientas gratuitas de cualquier navegador, "ver código fuente").
Eso significa que, en teoría, **cualquiera que se tome la molestia de sacar esa llave
del código podría llamar directamente a la API de Supabase** — sin pasar por la
pantalla de la app, sin la contraseña del editor, sin nada de lo que ve un usuario
normal.

Por eso la pantalla de contraseña del editor (la que pide usuario/contraseña para
entrar a `administradorinvitamx.vercel.app`) **no es la protección real** de los
datos. Esa pantalla solo le pone una traba a quien entra por la puerta normal (el
navegador). La protección real — la que de verdad decide qué puede hacer alguien que
llama a la API directamente, sin pasar por ninguna pantalla — son las **reglas de RLS
(Row Level Security)** configuradas del lado de Supabase. Si esas reglas dicen "cualquiera
puede leer/escribir todo", entonces cualquiera CON la llave (que es pública, viaja en
el código) puede leer o escribir todo, sin importar qué tan buena sea la contraseña del
editor.

En resumen: la contraseña del editor protege la puerta de la app. Las reglas de RLS
protegen los datos en sí. Son dos cosas distintas, y hoy solo la primera está
fuertemente cerrada — vale la pena que sepas exactamente qué tan abierta está la
segunda, para decidir con esa información si quieres cerrarla más en algún momento.

---

## (a) Variables de entorno del admin en Vercel

En el dashboard de Vercel, entra al proyecto `administradorinvitamx` → **Settings →
Environment Variables**, y confirma que de verdad existen (no solo que crees que las
pusiste):

- [ ] `ADMIN_PASSWORD` (o `ADMIN_USERS`, si en algún momento se cambió a soportar
  varios usuarios) — debe existir, al menos en el ambiente de **Production**.
- [ ] Anótala como existente o faltante aquí: ______________________________

Si falta, la pantalla de contraseña del editor podría estar fallando en silencio o
usando un valor por default inseguro — vale la pena confirmarlo entrando a la app en
una ventana de incógnito y viendo si de verdad pide usuario/contraseña.

## (b) Políticas de RLS en Supabase

En el dashboard de Supabase (proyecto `ahwcilcejffgddeeuiux`) → **Authentication →
Policies** (o **Table Editor** → ícono de escudo en cada tabla), revisa y anota qué
le permite hacer el rol `anon` a cada una de estas tablas — específicamente si puede
`SELECT` (leer), `INSERT` (crear), `UPDATE` (modificar) y `DELETE` (borrar) filas, y
si esos permisos están limitados de alguna forma (por ejemplo "solo su propia fila")
o son completamente abiertos ("cualquier fila, sin restricción"):

- [ ] `invitaciones` — anon puede: ______________________________
- [ ] `confirmaciones` — anon puede: ______________________________
- [ ] `checkins` — anon puede: ______________________________
- [ ] `abonos` — anon puede: ______________________________
- [ ] `avisos_pago` — anon puede: ______________________________

**Nota de contexto** (de lo último que se revisó en este proyecto, puede haber
cambiado desde entonces — por eso vale la pena que lo confirmes tú mismo en vivo en
vez de confiar en esta nota): históricamente estas tablas han tenido políticas del
tipo `USING (true)` para todos los comandos, es decir, completamente abiertas al rol
`anon`. Las lecturas masivas sin filtro de `invitaciones` y `abonos` ya se movieron a
endpoints `/api/admin/*` protegidos con la contraseña del editor (ver `CLAUDE.md` del
repo, sección "Bulk-read exposure closed via /api/admin/*") — pero cualquier otra
lectura o escritura directa a estas tablas (por fila conocida, vía la anon key) sigue
dependiendo de lo que digan las políticas de RLS, no de la app.

## (c) Preset de subida de Cloudinary

En el dashboard de Cloudinary → **Settings → Upload** → busca el preset
`invitaciones-xv` (es un preset "unsigned", es decir, cualquiera con el nombre del
preset y el "cloud name" puede subir archivos usando ese preset, sin necesitar login
ni firma — así está usado hoy en la app, directo desde el navegador).

- [ ] ¿Se puede restringir ese preset a subir solo dentro de una carpeta específica
  (en vez de cualquier carpeta de la cuenta)? Revisa la opción "Folder" / "Asset
  folder" del preset.
- [ ] ¿Se puede poner un límite de tamaño máximo por archivo (para que nadie suba,
  por accidente o a propósito, un archivo gigante que consuma tu cuota del plan
  gratis/de paga)? Revisa la opción "Max file size" del preset.
- [ ] Anota qué encontraste y si decidiste cambiar algo: ______________________________

Igual que con Supabase: como el preset es público (su nombre viaja en el código del
navegador), cualquiera que lo encuentre podría subir archivos a tu cuenta de
Cloudinary usándolo — limitar carpeta/tamaño no evita que alguien suba algo, pero
sí acota el daño posible si alguien lo intenta.

---

## Qué NO cubre esta lista

Esta lista es deliberadamente acotada a los tres puntos de arriba. No incluye (por
ser una fase de trabajo distinta, explícitamente no autorizada para esta tarea):
cambiar el modelo de acceso de Supabase (anon key / políticas de RLS en sí), tocar la
lógica de la contraseña del editor (`middleware.ts`), ni ninguna otra reescritura de
seguridad del código. Si después de revisar esta lista decides que quieres cerrar
algo de lo que encontraste, eso es trabajo nuevo — pídelo como una tarea aparte.
