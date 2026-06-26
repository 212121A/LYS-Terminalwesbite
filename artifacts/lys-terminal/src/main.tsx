import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { precacheMenuImages } from "@/lib/precacheImages";

createRoot(document.getElementById("root")!).render(<App />);

// Service-Worker nur in Production: cached die Menübilder (instant + offline)
// und lädt sie nach dem ersten Aufruf im Hintergrund komplett vor.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        // Bilder nach kurzem Idle im Hintergrund komplett vorladen.
        window.setTimeout(() => void precacheMenuImages(), 2500);
      })
      .catch(() => {
        // SW-Registrierung fehlgeschlagen – App läuft normal (nur ohne Bild-Cache).
      });
  });
}
