import { useEffect, useState } from "react";
import type { TipoEvento } from "./templates";
import type { FotoLista } from "./fotosListas";
import type { FondoListo } from "./fondosListos";
import { moverDentroDeSubconjunto } from "./creativos";

// Sección «Creativos» de Gestión de Imágenes (brief "Creativos sin tocar código", Fase 1).
// Administra desde el panel las fotos listas y los fondos listos por tipo de evento: agregar
// (subida normal a Cloudinary), quitar, reordenar, editar nombre/grupo/portada/evento. Cada
// cambio se guarda al instante vía `onGuardarFotos`/`onGuardarFondos` (App.tsx), que escribe
// la columna correspondiente en Supabase y revierte si falla.

type EstadoImagen = "revisando" | "ok" | "error";

// Verifica que cada URL responda como imagen (Image + onload/onerror, sin CORS). Se ejecuta al
// montar la sección y cada vez que cambia el conjunto de URLs; "Volver a verificar" fuerza otra vuelta.
function useVerificacionImagenes(urls: string[]) {
  const [estado, setEstado] = useState<Record<string, EstadoImagen>>({});
  const [vuelta, setVuelta] = useState(0);
  const clave = urls.join("\n");

  useEffect(() => {
    let cancelado = false;
    const unicas = Array.from(new Set(urls));
    const inicial: Record<string, EstadoImagen> = {};
    unicas.forEach(u => { inicial[u] = "revisando"; });
    setEstado(inicial);

    unicas.forEach(u => {
      const img = new Image();
      const fin = (r: EstadoImagen) => {
        if (!cancelado) setEstado(prev => ({ ...prev, [u]: r }));
      };
      const timeout = window.setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        fin("error"); // sin respuesta en 12 s: se marca como problema
      }, 12000);
      img.onload = () => { window.clearTimeout(timeout); fin("ok"); };
      img.onerror = () => { window.clearTimeout(timeout); fin("error"); };
      img.src = u;
    });

    return () => { cancelado = true; };
  }, [clave, vuelta]);

  return { estado, reverificar: () => setVuelta(v => v + 1) };
}

const INSIGNIA_ESTADO: Record<EstadoImagen, { icono: string; texto: string; clase: string }> = {
  revisando: { icono: "⏳", texto: "Revisando la imagen…", clase: "bg-slate-200 text-slate-700" },
  ok: { icono: "✅", texto: "La imagen responde", clase: "bg-emerald-100 text-emerald-800" },
  error: { icono: "⚠️", texto: "La imagen no carga: revisa el archivo o vuelve a subirla", clase: "bg-rose-100 text-rose-800" },
};

interface Props {
  tiposEvento: { id: TipoEvento; label: string; emoji: string }[];
  fotos: FotoLista[];
  fondos: FondoListo[];
  onGuardarFotos: (lista: FotoLista[]) => void;
  onGuardarFondos: (lista: FondoListo[]) => void;
  onSubirImagen: (file: File) => Promise<string>;
  onAviso: (mensaje: string, tipo: "success" | "error" | "info") => void;
}

export default function EditorCreativos({ tiposEvento, fotos, fondos, onGuardarFotos, onGuardarFondos, onSubirImagen, onAviso }: Props) {
  const [evento, setEvento] = useState<TipoEvento>("xv");
  const [subiendo, setSubiendo] = useState<"fotos" | "fondos" | null>(null);
  const etiquetaEvento = tiposEvento.find(t => t.id === evento)?.label || "Evento";

  const todasLasUrls = [...fotos.map(f => f.url), ...fondos.map(f => f.url)];
  const { estado, reverificar } = useVerificacionImagenes(todasLasUrls);
  const conProblema = Object.values(estado).filter(e => e === "error").length;

  const filasFotos = fotos.map((f, i) => ({ f, i })).filter(({ f }) => f.evento === evento);
  const filasFondos = fondos.map((f, i) => ({ f, i })).filter(({ f }) => f.evento === evento);

  const subirYAgregar = async (tipo: "fotos" | "fondos", file: File) => {
    setSubiendo(tipo);
    try {
      const url = await onSubirImagen(file);
      if (tipo === "fotos") {
        const n = fotos.filter(f => f.evento === evento).length + 1;
        onGuardarFotos([...fotos, { nombre: `${etiquetaEvento} · Foto ${n}`, evento, url }]);
      } else {
        const n = fondos.filter(f => f.evento === evento).length + 1;
        onGuardarFondos([...fondos, { nombre: `${etiquetaEvento} · Fondo ${n}`, evento, url }]);
      }
    } catch (err: any) {
      onAviso("No se pudo subir la imagen: " + (err?.message || "error de red"), "error");
    } finally {
      setSubiendo(null);
    }
  };

  // Portada: una por evento y grupo. Marcar una desmarca las demás del mismo evento/grupo.
  const marcarPortada = (idx: number, valor: boolean) => {
    const ref = fotos[idx];
    const grupo = ref.grupo ?? null;
    onGuardarFotos(fotos.map((f, j) => {
      if (f.evento !== ref.evento || (f.grupo ?? null) !== grupo) return f;
      const { esPortada: _omitir, ...resto } = f;
      if (j === idx) return valor ? { ...resto, esPortada: true } : resto;
      return resto;
    }));
  };

  const cambiarCampoFoto = (idx: number, campo: "nombre" | "grupo", valor: string) => {
    const limpio = valor.trim();
    const nuevas = fotos.map((f, j) => {
      if (j !== idx) return f;
      if (campo === "nombre") return { ...f, nombre: limpio || f.nombre };
      const { grupo: _g, ...resto } = f;
      return limpio ? { ...resto, grupo: limpio } : resto;
    });
    onGuardarFotos(nuevas);
  };

  const cambiarNombreFondo = (idx: number, valor: string) => {
    const limpio = valor.trim();
    onGuardarFondos(fondos.map((f, j) => (j === idx ? { ...f, nombre: limpio || f.nombre } : f)));
  };

  const cambiarEventoFondo = (idx: number, nuevo: TipoEvento) => {
    onGuardarFondos(fondos.map((f, j) => (j === idx ? { ...f, evento: nuevo } : f)));
  };

  const linkEnVivo = `${window.location.origin}/?catalog=true${evento === "xv" ? "" : `&evento=${evento}`}`;

  const insignia = (url: string) => {
    const info = INSIGNIA_ESTADO[estado[url] || "revisando"];
    return (
      <span title={info.texto} className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow ${info.clase}`}>
        {info.icono}
      </span>
    );
  };

  const botonesOrden = (puedeSubir: boolean, puedeBajar: boolean, onSubir: () => void, onBajar: () => void, onQuitar: () => void) => (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" disabled={!puedeSubir} onClick={onSubir} title="Subir" className="w-7 h-7 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed">↑</button>
      <button type="button" disabled={!puedeBajar} onClick={onBajar} title="Bajar" className="w-7 h-7 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed">↓</button>
      <button type="button" onClick={onQuitar} title="Quitar" className="w-7 h-7 rounded bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer">✕</button>
    </div>
  );

  return (
    <div className="p-4 bg-violet-50/40 rounded-xl border border-violet-100 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Creativos</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Fotos listas y fondos listos de cada tipo de evento. Cada cambio se guarda al instante y se usa en el generador y en el catálogo, sin redesplegar.
              Lo que ya insertaste en una invitación no cambia.
            </p>
          </div>
        </div>
        <button type="button" onClick={reverificar} className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
          ↻ Volver a verificar imágenes
        </button>
      </div>

      {conProblema > 0 && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
          ⚠️ {conProblema} {conProblema === 1 ? "imagen no carga" : "imágenes no cargan"} en total (de todos los eventos). Revisa la marca ⚠️ de cada una, la URL o vuelve a subirla.
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[11px] font-bold text-slate-700">Tipo de evento:</label>
        <select
          value={evento}
          onChange={(e) => setEvento(e.target.value as TipoEvento)}
          className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white cursor-pointer"
        >
          {tiposEvento.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
        </select>
        <a href={linkEnVivo} target="_blank" rel="noopener noreferrer" className="ml-auto text-[11px] font-bold text-indigo-600 hover:underline">
          Ver en vivo ({etiquetaEvento}) ↗
        </a>
      </div>

      {/* FOTOS LISTAS */}
      <div className="space-y-2">
        <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">📸 Fotos listas — {etiquetaEvento}</h5>
        {filasFotos.length === 0 && (
          <p className="text-[11px] text-slate-500 italic p-2.5 bg-white/60 rounded-lg border border-slate-150">Aún no hay fotos listas para este evento.</p>
        )}
        {filasFotos.map(({ f, i }, pos) => {
          const primeroDeEvento = pos === 0;
          const ultimoDeEvento = pos === filasFotos.length - 1;
          return (
            <div key={`${i}-${f.url}`} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
              <div className="relative w-16 h-16 shrink-0 rounded overflow-hidden bg-slate-100">
                <img src={f.url} alt={f.nombre} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {insignia(f.url)}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  defaultValue={f.nombre}
                  onBlur={(e) => { if (e.target.value.trim() !== f.nombre) cambiarCampoFoto(i, "nombre", e.target.value); }}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200"
                  aria-label="Etiqueta de la foto"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    defaultValue={f.grupo ?? ""}
                    placeholder="Grupo (opcional, p. ej. niña)"
                    onBlur={(e) => { if (e.target.value.trim() !== (f.grupo ?? "")) cambiarCampoFoto(i, "grupo", e.target.value); }}
                    className="flex-1 min-w-[120px] px-2 py-1 text-[11px] rounded border border-slate-200"
                    aria-label="Grupo de la foto"
                  />
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={!!f.esPortada} onChange={(e) => marcarPortada(i, e.target.checked)} />
                    Portada
                  </label>
                </div>
              </div>
              {botonesOrden(!primeroDeEvento, !ultimoDeEvento,
                () => onGuardarFotos(moverDentroDeSubconjunto(fotos, x => x.evento === evento, i, -1)),
                () => onGuardarFotos(moverDentroDeSubconjunto(fotos, x => x.evento === evento, i, 1)),
                () => onGuardarFotos(fotos.filter((_, j) => j !== i))
              )}
            </div>
          );
        })}
        <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold border cursor-pointer ${subiendo === "fotos" ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"}`}>
          {subiendo === "fotos" ? "Subiendo…" : `+ Agregar foto a ${etiquetaEvento}`}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={subiendo !== null}
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) subirYAgregar("fotos", file); }}
          />
        </label>
      </div>

      {/* FONDOS LISTOS */}
      <div className="space-y-2">
        <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">🎀 Fondos listos — {etiquetaEvento}</h5>
        {filasFondos.length === 0 && (
          <p className="text-[11px] text-slate-500 italic p-2.5 bg-white/60 rounded-lg border border-slate-150">Aún no hay fondos listos para este evento.</p>
        )}
        {filasFondos.map(({ f, i }, pos) => (
          <div key={`${i}-${f.url}`} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
            <div className="relative w-16 h-16 shrink-0 rounded overflow-hidden bg-slate-100">
              <img src={f.url} alt={f.nombre} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              {insignia(f.url)}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <input
                defaultValue={f.nombre}
                onBlur={(e) => { if (e.target.value.trim() !== f.nombre) cambiarNombreFondo(i, e.target.value); }}
                className="w-full px-2 py-1 text-xs rounded border border-slate-200"
                aria-label="Nombre del fondo"
              />
              <select
                value={f.evento}
                onChange={(e) => cambiarEventoFondo(i, e.target.value as TipoEvento)}
                className="px-2 py-1 text-[11px] rounded border border-slate-200 bg-white cursor-pointer"
                aria-label="Evento del fondo"
              >
                {tiposEvento.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            {botonesOrden(pos > 0, pos < filasFondos.length - 1,
              () => onGuardarFondos(moverDentroDeSubconjunto(fondos, x => x.evento === evento, i, -1)),
              () => onGuardarFondos(moverDentroDeSubconjunto(fondos, x => x.evento === evento, i, 1)),
              () => onGuardarFondos(fondos.filter((_, j) => j !== i))
            )}
          </div>
        ))}
        <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold border cursor-pointer ${subiendo === "fondos" ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-50"}`}>
          {subiendo === "fondos" ? "Subiendo…" : `+ Agregar fondo a ${etiquetaEvento}`}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={subiendo !== null}
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) subirYAgregar("fondos", file); }}
          />
        </label>
      </div>
    </div>
  );
}
