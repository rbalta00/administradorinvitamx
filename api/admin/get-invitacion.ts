// Trae UNA invitación completa (incluyendo `datos_completos`, el jsonb con todo el diseño:
// fotos, itinerario, padrinos, etc.) por id, usando la service_role key -- mismo patrón y
// mismo porqué que list-invitaciones.ts, protegido por el mismo Basic Auth de middleware.ts.
//
// Por qué existe (2026-11-19): list-invitaciones.ts dejó de incluir `datos_completos` de cada
// fila para que el panel "Mis Invitaciones" cargue rápido con 200+ invitaciones. Las acciones
// que de verdad necesitan el contenido completo de UNA invitación puntual (abrir en el editor,
// exportar su JSON, duplicarla, mandar su vista previa por WhatsApp, revisar sus confirmaciones
// contra la lista de invitados, etc.) lo piden aquí bajo demanda en el momento en que se usan.
import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Supabase no está configurado en el servidor" }));
    return;
  }

  const reqUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const id = reqUrl.searchParams.get("id");
  if (!id) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Falta el parámetro id" }));
    return;
  }

  try {
    const supabase = createClient(url, serviceKey);
    const { data, error } = await supabase
      .from("invitaciones")
      .select("id, nombre_quinceanera, fecha_fiesta, tema_elegido, estado, activo_hasta, updated_at, link_invitacion, datos_completos, telefono_whatsapp, precio_total, precio_pagado, pases_pagado, pdf_pagado, notas, link_pago, intake_actualizado_en, bloqueada, motivo_bloqueo, checkin_pagado, creado_por, complementos, pausada, pausada_en, motivo_pausa")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invitación no encontrada" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err?.message || "Error al leer la invitación" }));
  }
}
