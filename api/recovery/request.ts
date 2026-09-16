// Primer paso de "Recuperar acceso" (?recuperar=1 en App.tsx): genera un código de 6 dígitos,
// lo manda por correo (Resend) a ADMIN_RECOVERY_EMAIL, y le regresa al navegador un token
// firmado (HMAC con ADMIN_RECOVERY_SECRET) que contiene el hash del código y su expiración --
// el código en sí nunca viaja de vuelta al cliente, solo por correo. api/recovery/confirm.ts
// hace la otra mitad: valida ese código y de verdad resetea ADMIN_PASSWORD en Vercel.
//
// Firma clásica de Node (req, res), igual que notify-telegram.ts y api/admin/*.ts -- la firma
// tipo Edge Request/Response deja la función colgada en este proyecto (ver notify-telegram.ts).
//
// Variables de entorno requeridas (Vercel > Settings > Environment Variables):
//   ADMIN_RECOVERY_EMAIL  -> a qué correo se manda el código (ej. rbalta00@gmail.com)
//   ADMIN_RECOVERY_SECRET -> cualquier string largo al azar, solo para firmar el token
//   RESEND_API_KEY        -> API key de resend.com (plan gratis alcanza de sobra para esto)
// Si alguna falta, el endpoint responde 500 sin intentar nada -- nunca falla en silencio.

import type { IncomingMessage, ServerResponse } from "http";
import { createHmac, randomInt } from "node:crypto";

const CODE_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_SECONDS = 60;

function firmar(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function leerCookie(req: IncomingMessage, nombre: string): string | null {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map(p => p.trim()).find(p => p.startsWith(`${nombre}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const email = process.env.ADMIN_RECOVERY_EMAIL;
  const secret = process.env.ADMIN_RECOVERY_SECRET;
  const resendKey = process.env.RESEND_API_KEY;
  if (!email || !secret || !resendKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "La recuperación por correo no está configurada en el servidor (falta ADMIN_RECOVERY_EMAIL, ADMIN_RECOVERY_SECRET o RESEND_API_KEY)." }));
    return;
  }

  if (leerCookie(req, "rec_cd")) {
    res.statusCode = 429;
    res.end(JSON.stringify({ error: "Ya se envió un código hace poco. Espera un minuto antes de pedir otro." }));
    return;
  }

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const exp = Date.now() + CODE_TTL_MS;
  const codeHash = firmar(secret, codigo);
  const payload = Buffer.from(JSON.stringify({ exp, codeHash })).toString("base64url");
  const sig = firmar(secret, payload);
  const token = `${payload}.${sig}`;

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Generador de Invitaciones XV <onboarding@resend.dev>",
        to: [email],
        subject: "Código para restablecer el acceso al editor",
        html: `<p>Alguien pidió restablecer la contraseña del editor de <strong>administradorinvitamx</strong>.</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${codigo}</p><p>Este código vence en 10 minutos. Si no fuiste tú, ignora este correo -- no pasa nada, la contraseña actual sigue funcionando.</p>`,
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      res.statusCode = 502;
      res.end(JSON.stringify({ error: "No se pudo enviar el correo. " + detalle.slice(0, 200) }));
      return;
    }
  } catch (e: any) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: "No se pudo enviar el correo: " + e.message }));
    return;
  }

  res.setHeader("Set-Cookie", `rec_cd=1; Max-Age=${COOLDOWN_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`);
  res.statusCode = 200;
  res.end(JSON.stringify({ token }));
}
