// Le avisa al admin por Telegram cuando un cliente confirma RSVP, avisa un pago, o llena su
// formulario de datos -- para que no dependa de abrir "Mis Invitaciones" y notar los
// badges/chips manualmente. El token del bot y el chat_id viven SOLO aquí (variables de
// entorno de Vercel sin prefijo VITE_), nunca en el bundle público que baja al navegador.
//
// Para activarlo: crea un bot hablando con @BotFather en Telegram, y configura en Vercel
// TELEGRAM_BOT_TOKEN (el token que te da BotFather) y TELEGRAM_CHAT_ID (tu chat_id personal).
// Si cualquiera de las dos falta, este endpoint simplemente no hace nada (no rompe la app).
//
// Usa la firma clásica de Node (req, res) -- no la de Web Request/Response -- porque las
// funciones serverless de Vercel para este proyecto corren en runtime Node, y con la firma
// tipo Edge la función nunca respondía (colgada hasta 504) al no llamar nunca a res.end().
// Confirmado en vivo el 2026-08-01: GET/POST a este endpoint colgaban indefinidamente hasta
// que se cambió a esta firma.

import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    res.statusCode = 200;
    res.end("Telegram no configurado");
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const raw = Buffer.concat(chunks).toString("utf-8");
    const body = raw ? JSON.parse(raw) : {};
    const mensaje = body?.mensaje;
    if (!mensaje || typeof mensaje !== "string") {
      res.statusCode = 400;
      res.end("Falta el mensaje");
      return;
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: mensaje }),
    });

    res.statusCode = 200;
    res.end("ok");
  } catch {
    res.statusCode = 200;
    res.end("error");
  }
}
