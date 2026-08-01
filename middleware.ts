// Protege el panel administrador (el editor de invitaciones) con un login simple (HTTP Basic
// Auth) a nivel de servidor -- las contraseñas viven únicamente en variables de entorno de
// Vercel (sin prefijo VITE_, así que Vite nunca las incluye en el bundle que baja al
// navegador). Esto es justo lo que faltaba: antes cualquiera con la URL del deploy llegaba
// directo al editor completo sin pedir nada.
//
// Para agregar una segunda persona con su PROPIA contraseña (poder quitarle acceso a alguien
// sin cambiarle la contraseña a los demás): en Vercel > Settings > Environment Variables,
// agrega ADMIN_USERS = "nombre:contraseña,nombre2:contraseña2" (además de ADMIN_PASSWORD, que
// sigue siendo el usuario "admin"). El navegador pedirá usuario Y contraseña por separado.
//
// Los links que sí deben seguir siendo 100% públicos (invitados, clientes viendo el catálogo, o
// llenando su formulario de datos) se dejan pasar sin pedir contraseña, detectando los mismos
// parámetros de URL que usa App.tsx para decidir qué modo mostrar:
//   - ?v=1 / ?view=true      -> vista de un invitado abriendo su invitación
//   - ?catalog=true / ?catalogo=true -> catálogo de temas de demostración
//   - ?intake=1              -> formulario público para que el cliente capture sus datos/fotos
// Los archivos estáticos del build (/assets/*) también se dejan pasar siempre, si no el propio
// navegador no podría ni cargar el JS/CSS para pintar la pantalla de login.
//
// Las funciones serverless (/api/*, ej. notify-telegram) también se excluyen: las llaman
// visitantes anónimos desde páginas públicas (RSVP del invitado, intake del cliente, demo del
// catálogo) que nunca traen credenciales de Basic Auth -- bug real detectado el 2026-07-31:
// sin este bypass, el middleware las bloqueaba con 401 y ninguna notificación llegaba nunca.

export const config = {
  matcher: "/((?!assets/|api/).*)",
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const esVistaPublica =
    params.has("v") ||
    params.get("view") === "true" ||
    params.get("catalog") === "true" ||
    params.get("catalogo") === "true" ||
    params.get("intake") === "1";

  if (esVistaPublica) {
    return;
  }

  // Soporta más de una persona con su propia contraseña (para poder revocarle el acceso a
  // alguien sin tener que cambiarle la contraseña a todos los demás), sin romper la
  // configuración de un solo admin que ya existía:
  //   - ADMIN_PASSWORD (ya existente): sigue funcionando como el usuario "admin".
  //   - ADMIN_USERS (opcional, nuevo): lista "usuario:contraseña,usuario2:contraseña2" para
  //     agregar más personas -- cada una entra con su propio usuario/contraseña por HTTP
  //     Basic Auth (el navegador pide "usuario" y "contraseña" por separado).
  const credencialesValidas = new Set<string>();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    credencialesValidas.add("Basic " + btoa(`admin:${adminPassword}`));
  }
  const adminUsers = process.env.ADMIN_USERS;
  if (adminUsers) {
    for (const par of adminUsers.split(",")) {
      const [usuario, password] = par.split(":");
      if (usuario && password) {
        credencialesValidas.add("Basic " + btoa(`${usuario.trim()}:${password.trim()}`));
      }
    }
  }

  // Si no se configuró ninguna variable de entorno, no bloqueamos el acceso (evita dejar el
  // editor inaccesible por un olvido de configuración) -- pero esto no debería pasar en producción.
  if (credencialesValidas.size === 0) {
    return;
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !credencialesValidas.has(authHeader)) {
    return new Response("Acceso restringido", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Generador de Invitaciones XV - Acceso Admin"',
      },
    });
  }
}
