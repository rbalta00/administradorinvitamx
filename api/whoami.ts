// Le dice al editor con qué usuario entró la persona que está viendo la página, leyendo el
// mismo header de HTTP Basic Auth que el navegador ya manda solo (el usuario ya se autenticó
// para poder cargar la página en primer lugar -- este endpoint solo decodifica ese mismo
// header, no agrega ningún login nuevo). Se usa para etiquetar qué invitaciones creó cada
// quien (isaac/vladimir/nidia) sin tener que pedirle su nombre a mano en ningún formulario.
//
// No necesita estar detrás de /api/admin/* (ver middleware.ts) -- no expone nada sensible, solo
// repite el usuario que ya viene en la petición.
import type { IncomingMessage, ServerResponse } from "http";

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader("Content-Type", "application/json");

  const authHeader = req.headers.authorization || "";
  const [scheme, encoded] = authHeader.split(" ");

  if (scheme !== "Basic" || !encoded) {
    res.statusCode = 200;
    res.end(JSON.stringify({ usuario: null }));
    return;
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const usuario = decoded.split(":")[0] || null;
    res.statusCode = 200;
    res.end(JSON.stringify({ usuario }));
  } catch {
    res.statusCode = 200;
    res.end(JSON.stringify({ usuario: null }));
  }
}
