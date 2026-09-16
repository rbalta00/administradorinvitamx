// Segundo paso de "Recuperar acceso": recibe el token que regresó request.ts + el código de 6
// dígitos que le llegó al admin por correo, lo valida, y si es correcto genera una contraseña
// nueva y la sube directo a Vercel (production + preview) + redeploya -- el mismo resultado que
// scripts/reset-admin-password.mjs, pero llamado desde la API de Vercel en vez de la CLI local,
// porque una función serverless no tiene la CLI ni una sesión de "vercel login" a mano.
//
// Requiere además, más allá de lo que ya pide request.ts:
//   VERCEL_API_TOKEN -> Vercel > Account Settings > Tokens. Dale el scope más angosto posible
//                        (idealmente solo este proyecto/equipo) -- con este token cualquiera que
//                        lo tenga puede tocar el proyecto igual que con acceso al dashboard, así
//                        que es el secreto más sensible de todo este flujo.
//
// El projectId/teamId de abajo NO son secretos (son los mismos que .vercel/project.json, que ya
// vive en el repo) -- solo identifican el proyecto, no dan acceso a nada por sí solos.

import type { IncomingMessage, ServerResponse } from "http";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const PROJECT_ID = "prj_3NGVrGZxsEgE28r00ZOGNrV06CAk";
const TEAM_ID = "team_jIutM0AoPJs93za5xqLWmY2E";
const MAX_INTENTOS = 5;

function firmar(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function igualesSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function leerCookie(req: IncomingMessage, nombre: string): string | null {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map(p => p.trim()).find(p => p.startsWith(`${nombre}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function leerBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function vercelFetch(path: string, init: RequestInit, token: string) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`;
  const r = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const detalle = await r.text();
    throw new Error(`Vercel API ${path} -> ${r.status}: ${detalle.slice(0, 300)}`);
  }
  return r.json();
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const secret = process.env.ADMIN_RECOVERY_SECRET;
  const vercelToken = process.env.VERCEL_API_TOKEN;
  if (!secret) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Falta configurar ADMIN_RECOVERY_SECRET en el servidor." }));
    return;
  }
  if (!vercelToken) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Falta configurar VERCEL_API_TOKEN en el servidor." }));
    return;
  }

  let body: any;
  try {
    body = await leerBody(req);
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Cuerpo de la petición inválido." }));
    return;
  }

  const { token, code } = body || {};
  if (typeof token !== "string" || typeof code !== "string" || !token.includes(".")) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Faltan datos." }));
    return;
  }

  const intentosPrevios = parseInt(leerCookie(req, "rec_att") || "0", 10) || 0;
  if (intentosPrevios >= MAX_INTENTOS) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Demasiados intentos con este código. Pide uno nuevo." }));
    return;
  }

  const [payload, sig] = token.split(".");
  if (!igualesSeguro(firmar(secret, payload), sig)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Código inválido o expirado. Pide uno nuevo." }));
    return;
  }

  let datosToken: { exp: number; codeHash: string };
  try {
    datosToken = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Código inválido o expirado. Pide uno nuevo." }));
    return;
  }

  if (Date.now() > datosToken.exp) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Este código ya venció. Pide uno nuevo." }));
    return;
  }

  if (!igualesSeguro(firmar(secret, code), datosToken.codeHash)) {
    res.setHeader("Set-Cookie", `rec_att=${intentosPrevios + 1}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`);
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Código incorrecto." }));
    return;
  }

  // Código correcto -- generar la contraseña nueva y aplicarla en Vercel (mismo algoritmo que
  // scripts/reset-admin-password.mjs). Si algo de esto falla, el código/token siguen siendo
  // válidos hasta que expiren -- no se "queman" solo porque Vercel haya tenido un hiccup, así el
  // admin puede reintentar sin pedir otro correo.
  const nuevaPassword = randomBytes(15).toString("base64").replace(/[/+=]/g, "").slice(0, 20);

  try {
    const { envs } = await vercelFetch(`/v10/projects/${PROJECT_ID}/env`, { method: "GET" }, vercelToken);
    const filas = (envs || []).filter((e: any) => e.key === "ADMIN_PASSWORD");

    if (filas.length > 0) {
      for (const fila of filas) {
        await vercelFetch(
          `/v9/projects/${PROJECT_ID}/env/${fila.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "ADMIN_PASSWORD", target: fila.target, type: fila.type || "sensitive", value: nuevaPassword }),
          },
          vercelToken
        );
      }
    } else {
      await vercelFetch(
        `/v10/projects/${PROJECT_ID}/env`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "ADMIN_PASSWORD", value: nuevaPassword, type: "sensitive", target: ["production", "preview"] }),
        },
        vercelToken
      );
    }

    const { deployments } = await vercelFetch(
      `/v7/deployments?projectId=${PROJECT_ID}&target=production&limit=1&state=READY`,
      { method: "GET" },
      vercelToken
    );
    const ultimoDeploy = deployments?.[0]?.uid;
    if (!ultimoDeploy) {
      throw new Error("No se encontró un deployment de producción existente para redesplegar.");
    }

    await vercelFetch(
      `/v13/deployments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "administradorinvitamx", project: PROJECT_ID, deploymentId: ultimoDeploy, target: "production", withLatestCommit: true }),
      },
      vercelToken
    );
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "El código era correcto pero no se pudo actualizar en Vercel: " + e.message + " -- puedes reintentar, el código sigue siendo válido." }));
    return;
  }

  res.setHeader("Set-Cookie", [
    "rec_cd=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    "rec_att=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
  ]);
  res.statusCode = 200;
  res.end(JSON.stringify({ password: nuevaPassword }));
}
