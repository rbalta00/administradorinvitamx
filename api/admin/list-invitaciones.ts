// Lee TODAS las invitaciones guardadas usando la service_role key de Supabase (nunca la
// anon key) -- endpoint solo para el admin, protegido por el mismo Basic Auth de
// middleware.ts (ese archivo deja pasar /api/* en general para que RSVP/intake/
// notify-telegram funcionen sin sesión, pero excluye /api/admin/* de esa excepción a propósito).
//
// Por qué existe: antes App.tsx leía esta lista directo con la anon key desde el navegador.
// La anon key vive en el bundle público y las políticas RLS de Supabase son "allow all" para
// SELECT, así que cualquiera que la extrajera del bundle podía hacer un SELECT * sin filtro y
// descargar los datos de TODOS los clientes (nombre, teléfono, notas, datos bancarios) de un
// jalón -- no solo de una invitación puntual (que sí requiere adivinar un UUID al azar, riesgo
// aceptado, igual que un link "cualquiera con el link" de Google Docs). Este endpoint corre en
// el servidor con la service_role key (nunca baja al navegador) y solo responde si la petición
// ya pasó el Basic Auth del admin.
import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";

const FONDOS_ROW_ID = "00000000-0000-0000-0000-000000000001";

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
      .from("invitaciones")
      .select("id, nombre_quinceanera, fecha_fiesta, tema_elegido, estado, activo_hasta, updated_at, link_invitacion, datos_completos, telefono_whatsapp, precio_total, precio_pagado, pases_pagado, pdf_pagado, notas, link_pago, intake_actualizado_en, bloqueada, motivo_bloqueo, checkin_pagado")
      .neq("id", FONDOS_ROW_ID)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data || []));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err?.message || "Error al leer invitaciones" }));
  }
}
