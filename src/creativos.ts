import type { TipoEvento } from "./templates";
import { FOTOS_LISTAS, FotoLista } from "./fotosListas";
import { FONDOS_LISTOS, FondoListo } from "./fondosListos";

// Creativos administrables desde el panel (brief "Creativos sin tocar código", Fase 1).
// Las listas viven en la fila global de Supabase (columnas `fotos_listas` y `fondos_listos`,
// jsonb, misma fila que `links_pago`/`fondos_personalizados`). Regla de lectura efectiva:
//   - si la columna trae al menos una entrada válida, manda Supabase;
//   - si está vacía/nula, o la lectura falló, se usa el respaldo de fotosListas.ts / fondosListos.ts.
// Los .ts NO se borran: son la semilla y el respaldo. Al primer guardado desde el panel se
// escribe la lista completa efectiva (la semilla más el cambio), así que a partir de ahí
// Supabase manda y los cambios futuros en el .ts ya no llegan solos.

export const EVENTOS_CREATIVOS: TipoEvento[] = [
  "xv", "boda", "cumpleanos", "bautizo", "primera-comunion", "graduacion", "baby-shower", "aniversario"
];

const esEventoValido = (v: unknown): v is TipoEvento =>
  typeof v === "string" && (EVENTOS_CREATIVOS as string[]).includes(v);

const esUrlValida = (v: unknown): v is string =>
  typeof v === "string" && /^https?:\/\/\S+$/.test(v);

// Valida cada entrada de lo que llega de Supabase: descarta lo que no tenga forma correcta,
// para que una fila mal escrita nunca rompa el panel ni el catálogo.
export function sanearFotosListas(raw: unknown): FotoLista[] | null {
  if (!Array.isArray(raw)) return null;
  const limpias: FotoLista[] = [];
  for (const f of raw) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    if (!esEventoValido(o.evento) || !esUrlValida(o.url)) continue;
    limpias.push({
      nombre: typeof o.nombre === "string" && o.nombre.trim() ? o.nombre : "Foto",
      evento: o.evento,
      url: o.url,
      ...(o.esPortada === true ? { esPortada: true } : {}),
      ...(typeof o.grupo === "string" && o.grupo.trim() ? { grupo: o.grupo.trim() } : {}),
    });
  }
  return limpias.length ? limpias : null;
}

export function sanearFondosListos(raw: unknown): FondoListo[] | null {
  if (!Array.isArray(raw)) return null;
  const limpios: FondoListo[] = [];
  for (const f of raw) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    if (!esEventoValido(o.evento) || !esUrlValida(o.url)) continue;
    limpios.push({
      nombre: typeof o.nombre === "string" && o.nombre.trim() ? o.nombre : "Fondo",
      evento: o.evento,
      url: o.url,
    });
  }
  return limpios.length ? limpios : null;
}

// Lectura efectiva: lo guardado en Supabase si hay, si no el respaldo del código.
export const fotosListasEfectivas = (guardadas: FotoLista[] | null | undefined): FotoLista[] =>
  guardadas && guardadas.length ? guardadas : FOTOS_LISTAS;

export const fondosListosEfectivos = (guardados: FondoListo[] | null | undefined): FondoListo[] =>
  guardados && guardados.length ? guardados : FONDOS_LISTOS;

// Mueve un elemento dentro de SU subconjunto (p. ej. las fotos de un evento) intercambiándolo
// con el vecino de ese mismo subconjunto, sin alterar el lugar de los demás elementos de la lista.
export function moverDentroDeSubconjunto<T>(
  lista: T[],
  perteneceAlSubconjunto: (x: T) => boolean,
  indiceGlobal: number,
  direccion: -1 | 1
): T[] {
  const indices = lista.map((x, i) => (perteneceAlSubconjunto(x) ? i : -1)).filter(i => i >= 0);
  const pos = indices.indexOf(indiceGlobal);
  if (pos < 0) return lista;
  const vecino = indices[pos + direccion];
  if (vecino === undefined) return lista;
  const copia = [...lista];
  [copia[indiceGlobal], copia[vecino]] = [copia[vecino], copia[indiceGlobal]];
  return copia;
}
