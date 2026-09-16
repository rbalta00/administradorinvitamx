// Service worker mínimo -- este editor siempre necesita internet para funcionar (Supabase,
// Cloudinary), así que no cachea nada para uso offline. Existe únicamente porque Chrome/Edge
// exigen un service worker registrado como parte de los requisitos de instalabilidad de una
// PWA -- sin esto, el navegador nunca dispara "beforeinstallprompt" y el botón "Instalar app"
// del editor (ver App.tsx) se queda escondido para siempre aunque el manifest.json esté bien.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through: deja pasar todas las peticiones tal cual, sin cachear ni interceptar nada.
self.addEventListener("fetch", () => {});
