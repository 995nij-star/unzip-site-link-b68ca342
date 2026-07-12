import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { initCapacitor } from "@/lib/capacitor";
import App from "./App.tsx";
import "./index.css";

// Force permanent dark mode across the entire app
document.documentElement.classList.add("dark");
document.documentElement.style.colorScheme = "dark";

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
