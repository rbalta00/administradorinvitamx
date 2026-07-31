// Protege el panel administrador (el editor de invitaciones) con un login simple (HTTP Basic
// Auth) a nivel de servidor -- la contraseña vive únicamente en la variable de entorno
// ADMIN_PASSWORD de Vercel (sin prefijo VITE_, así que Vite nunca la incluye en el bundle que
// baja al navegador). Esto es justo lo que faltaba: antes cualquiera con la URL del deploy
// llegaba directo al editor completo sin pedir nada.
//
// Los links que sí deben seguir siendo 100% públicos (invitados y clientes viendo el catálogo)
// se dejan pasar sin pedir contraseña, detectando los mismos parámetros de URL que usa App.tsx
// para decidir qué modo mostrar (ver getInitialState en App.tsx):
//   - ?v=1 / ?view=true      -> vista de un invitado abriendo su invitación
//   - ?catalog=true / ?catalogo=true -> catálogo de temas de demostración
// Los archivos estáticos del build (/assets/*) también se dejan pasar siempre, si no el propio
// navegador no podría ni cargar el JS/CSS para pintar la pantalla de login.

export const config = {
  matcher: "/((?!assets/).*)",
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const esVistaPublica =
    params.has("v") ||
    params.get("view") === "true" ||
    params.get("catalog") === "true" ||
    params.get("catalogo") === "true";

  if (esVistaPublica) {
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  // Si no se configuró la variable de entorno, no bloqueamos el acceso (evita dejar el editor
  // inaccesible por un olvido de configuración) -- pero esto no debería pasar en producción.
  if (!adminPassword) {
    return;
  }

  const authHeader = request.headers.get("authorization");
  const esperado = "Basic " + btoa(`admin:${adminPassword}`);

  if (authHeader !== esperado) {
    return new Response("Acceso restringido", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Generador de Invitaciones XV - Acceso Admin"',
      },
    });
  }
}
