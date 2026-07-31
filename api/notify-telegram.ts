// Le avisa al admin por Telegram cuando un cliente confirma RSVP, avisa un pago, o llena su
// formulario de datos -- para que no dependa de abrir "Mis Invitaciones" y notar los
// badges/chips manualmente. El token del bot y el chat_id viven SOLO aquí (variables de
// entorno de Vercel sin prefijo VITE_), nunca en el bundle público que baja al navegador.
//
// Para activarlo: crea un bot hablando con @BotFather en Telegram, y configura en Vercel
// TELEGRAM_BOT_TOKEN (el token que te da BotFather) y TELEGRAM_CHAT_ID (tu chat_id personal).
// Si cualquiera de las dos falta, este endpoint simplemente no hace nada (no rompe la app).

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return new Response("Telegram no configurado", { status: 200 });
  }

  try {
    const { mensaje } = await request.json();
    if (!mensaje || typeof mensaje !== "string") {
      return new Response("Falta el mensaje", { status: 400 });
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: mensaje }),
    });

    return new Response("ok", { status: 200 });
  } catch {
    return new Response("error", { status: 200 });
  }
}
