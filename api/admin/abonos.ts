// Lee TODOS los abonos (de cualquier invitación, sin filtro) usando la service_role key --
// mismo motivo que api/admin/list-invitaciones.ts: evita que la anon key pública pueda hacer
// un SELECT sin filtro sobre la tabla completa de pagos de todos los clientes. Usado por el
// dashboard "💰 Ingresos" para el histórico mensual.
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

  try {
    const supabase = createClient(url, serviceKey);
    const { data, error } = await supabase
      .from("abonos")
      .select("invitacion_id, monto, creado_en")
      .order("creado_en", { ascending: true });

    if (error) throw error;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data || []));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err?.message || "Error al leer abonos" }));
  }
}
