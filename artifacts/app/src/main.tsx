import { createRoot } from "react-dom/client";
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

// Initialize Capacitor native plugins (no-op on web)
initCapacitor();

createRoot(document.getElementById("root")!).render(<App />);
