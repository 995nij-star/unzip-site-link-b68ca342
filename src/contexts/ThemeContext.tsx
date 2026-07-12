import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { useSiteSettings, ThemeSettings } from "@/hooks/useSiteSettings";

interface ThemeContextType {
  theme: ThemeSettings;
  isLoading: boolean;
  userDarkMode: boolean | null;
  setUserDarkMode: (mode: boolean | null) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Load Google Font dynamically
function loadGoogleFont(fontName: string) {
  const formattedName = fontName.replace(/ /g, "+");
  const linkId = `google-font-${formattedName}`;
  
  if (document.getElementById(linkId)) return;
  
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, isLoading } = useSiteSettings();
  const loadedFonts = useRef<Set<string>>(new Set(["Orbitron", "Rajdhani"]));
  
  const [userDarkMode, setUserDarkModeState] = useState<boolean | null>(() => {
    const saved = localStorage.getItem("user-dark-mode");
    return saved !== null ? saved === "true" : null;
  });

  const setUserDarkMode = (mode: boolean | null) => {
    setUserDarkModeState(mode);
    if (mode === null) {
      localStorage.removeItem("user-dark-mode");
    } else {
      localStorage.setItem("user-dark-mode", String(mode));
    }
  };

  // User preference overrides admin setting; fallback to admin
  const isDark = userDarkMode !== null ? userDarkMode : theme.darkMode;

  // Apply the dark class + color-scheme immediately whenever isDark changes,
  // independent of admin theme loading, so the toggle works everywhere on every page.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;

    root.style.setProperty("--primary", theme.primaryColor);
    root.style.setProperty("--button-color", theme.buttonColor);
    root.style.setProperty("--secondary", theme.secondaryColor);
    root.style.setProperty("--ring", theme.primaryColor);

    root.style.setProperty("--sidebar-primary", theme.primaryColor);
    root.style.setProperty("--sidebar-ring", theme.primaryColor);

    if (theme.headingFont && !loadedFonts.current.has(theme.headingFont)) {
      loadGoogleFont(theme.headingFont);
      loadedFonts.current.add(theme.headingFont);
    }
    if (theme.bodyFont && !loadedFonts.current.has(theme.bodyFont)) {
      loadGoogleFont(theme.bodyFont);
      loadedFonts.current.add(theme.bodyFont);
    }

    root.style.setProperty("--font-heading", `"${theme.headingFont}", sans-serif`);
    root.style.setProperty("--font-body", `"${theme.bodyFont}", sans-serif`);
  }, [theme, isLoading]);

  return (
    <ThemeContext.Provider value={{ theme, isLoading, userDarkMode, setUserDarkMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
