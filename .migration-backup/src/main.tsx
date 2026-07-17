import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { initCapacitor } from "@/lib/capacitor";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme BEFORE React mounts so there's no flash.
// Default = dark (matches previous behavior) unless the user explicitly picked light.
(() => {
  const saved = localStorage.getItem("user-dark-mode");
  const isDark = saved === null ? true : saved === "true";
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
})();

// Register service worker with auto-update (web only)
registerSW({
  onRegisteredSW(swUrl, registration) {
    console.log("[PWA] Service worker registered:", swUrl);
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    }
  },
  onOfflineReady() {
    console.log("[PWA] App ready to work offline");
  },
});

// Initialize Capacitor native plugins
initCapacitor();

createRoot(document.getElementById("root")!).render(<App />);
