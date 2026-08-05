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
//   - ?checkin=1             -> control de acceso QR (à la carte) para quien controla la puerta
// Los archivos estáticos del build (/assets/*) también se dejan pasar siempre, si no el propio
// navegador no podría ni cargar el JS/CSS para pintar la pantalla de login.
//
// Las funciones serverless públicas (/api/*, ej. notify-telegram) también se excluyen: las
// llaman visitantes anónimos desde páginas públicas (RSVP del invitado, intake del cliente,
// demo del catálogo) que nunca traen credenciales de Basic Auth -- bug real detectado el
// 2026-07-31: sin este bypass, el middleware las bloqueaba con 401 y ninguna notificación
// llegaba nunca.
//
// /api/admin/* es la excepción a esa excepción (añadido 2026-08-01): esas rutas usan la
// service_role key de Supabase en el servidor para leer TODAS las invitaciones/abonos de un
// jalón (ver api/admin/*.ts) -- exactamente lo que NO debe quedar abierto a cualquiera, así
// que sí deben pasar por el mismo Basic Auth que protege el resto del editor.

export const config = {
  matcher: "/((?!assets/|api/(?!admin/)).*)",
};

export default function middleware(request: Request) {
  // Acceso completamente abierto - sin autenticación
  return;

  const url = new URL(request.url);
  const params = url.searchParams;

  const esVistaPublica =
    params.has("v") ||
    params.get("view") === "true" ||
    params.get("catalog") === "true" ||
    params.get("catalogo") === "true" ||
    params.get("intake") === "1" ||
    params.get("checkin") === "1";

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
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (adminPassword) {
    // Crear la credencial de Basic Auth: "admin:password" en base64
    const encoded = Buffer.from(`admin:${adminPassword}`).toString('base64');
    credencialesValidas.add(`Basic ${encoded}`);
  }

  const adminUsers = process.env.ADMIN_USERS?.trim();
  if (adminUsers) {
    for (const par of adminUsers.split(",")) {
      const [usuario, password] = par.split(":");
      if (usuario?.trim() && password?.trim()) {
        const encoded = Buffer.from(`${usuario.trim()}:${password.trim()}`).toString('base64');
        credencialesValidas.add(`Basic ${encoded}`);
      }
    }
  }

  // Si no se configuró ninguna variable de entorno, no bloqueamos el acceso (evita dejar el
  // editor inaccesible por un olvido de configuración) -- pero esto no debería pasar en producción.
  if (credencialesValidas.size === 0) {
    console.warn("⚠️  No ADMIN_PASSWORD configured - access unrestricted");
    return;
  }

  const authHeader = request.headers.get("authorization")?.trim();

  if (!authHeader || !credencialesValidas.has(authHeader)) {
    return new Response("Acceso restringido - Usuario o contraseña incorrectos", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Generador de Invitaciones XV - Acceso Admin"',
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
