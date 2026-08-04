// Genera (o recibe) una contraseña nueva para el login del editor
// (ADMIN_PASSWORD) y la sube directo a Vercel (production + preview), luego
// redeploya para que tome efecto.
//
// Uso:
//   npm run reset-admin-password                    -> genera una aleatoria
//   npm run reset-admin-password -- "MiContraseña123" -> usa la que tú elijas
//
// Requiere tener la Vercel CLI ya autenticada en esta máquina (npx vercel login).
// No hace falta pedirle a nadie más la contraseña vieja -- ADMIN_PASSWORD está
// marcada como "sensitive" en Vercel, así que ni el dashboard la vuelve a
// mostrar una vez guardada. Este script simplemente la reemplaza por una nueva.

import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";

const passwordElegida = process.argv[2];

if (passwordElegida && passwordElegida.length < 8) {
  console.error("La contraseña que diste es muy corta (menos de 8 caracteres) -- esto protege datos reales de clientes (teléfonos, datos bancarios). Usa algo más largo.");
  process.exit(1);
}

const nuevaPassword = passwordElegida || randomBytes(15)
  .toString("base64")
  .replace(/[/+=]/g, "")
  .slice(0, 20);

const run = (cmd, input) => {
  execSync(cmd, { stdio: input ? ["pipe", "inherit", "inherit"] : "inherit", input });
};

console.log("Quitando la contraseña anterior...");
for (const env of ["production", "preview"]) {
  try {
    run(`npx vercel env rm ADMIN_PASSWORD ${env} --yes`);
  } catch {
    // Si no existía todavía en ese entorno, no pasa nada -- seguimos.
  }
}

console.log("Guardando la contraseña nueva...");
for (const env of ["production", "preview"]) {
  run(`npx vercel env add ADMIN_PASSWORD ${env}`, nuevaPassword);
}

console.log("Redesplegando a producción...");
run("npx vercel --prod --yes");

console.log("\n================================================================");
console.log("Listo. Nueva contraseña del editor (usuario: admin):\n");
console.log(`  ${nuevaPassword}`);
console.log("\nGuárdala en tu gestor de contraseñas -- no se puede volver a ver");
console.log("después de esto (queda marcada como \"sensitive\" en Vercel).");
console.log("================================================================\n");
