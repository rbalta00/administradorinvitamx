-- Analítica de aperturas (2026-11-19)
--
-- Qué registra: cada vez que un invitado real ABRE su invitación (no cuando se carga la
-- página, ver comenzarExperiencia() en src/templates.ts), se inserta un renglón mínimo y
-- anónimo: solo invitacion_id (el mismo "iid" que ya usa la tabla `confirmaciones` para
-- identificar la invitación) y una fecha automática. NADA de IP, dispositivo, navegador ni
-- ubicación -- a propósito, no se captura nada de eso.
--
-- Este archivo lo corre el DUEÑO manualmente en el SQL Editor de Supabase (proyecto
-- ahwcilcejffgddeeuiux). El código del generador (src/templates.ts) ya está escrito para
-- funcionar aunque esta tabla todavía no exista -- el INSERT va envuelto en try/catch con un
-- fetch().catch(() => {}) silencioso, igual que el resto de las escrituras "mejor esfuerzo"
-- de este proyecto (RSVP, avisos de pago, etc.). Si la tabla no existe, la invitación no
-- muestra ningún error ni deja de funcionar -- simplemente no se cuenta esa apertura.
--
-- Mismo patrón de seguridad que `confirmaciones`: RLS abierto a la anon key (el modelo de
-- seguridad de todo este proyecto -- ver CLAUDE.md, "Bulk-read exposure" -- no se está
-- cambiando esa decisión aquí, solo replicándola).

create table if not exists public.aperturas (
  id uuid primary key default gen_random_uuid(),
  invitacion_id text not null,
  creada_en timestamptz not null default now()
);

create index if not exists aperturas_invitacion_id_idx on public.aperturas (invitacion_id);

alter table public.aperturas enable row level security;

-- INSERT abierto a la anon key: es el invitado (sin sesión, sin login) quien registra su
-- propia apertura directo desde el HTML generado -- mismo mecanismo que usa `confirmaciones`
-- para el RSVP.
drop policy if exists "aperturas_insert_anon" on public.aperturas;
create policy "aperturas_insert_anon"
  on public.aperturas
  for insert
  to anon
  with check (true);

-- SELECT abierto a la anon key: el panel admin (App.tsx) ya lee `confirmaciones` con la misma
-- anon key del navegador del admin -- este SELECT usa exactamente el mismo acceso, para poder
-- mostrar "Aperturas: N" por invitación sin necesitar la service_role key ni un endpoint nuevo.
drop policy if exists "aperturas_select_anon" on public.aperturas;
create policy "aperturas_select_anon"
  on public.aperturas
  for select
  to anon
  using (true);
