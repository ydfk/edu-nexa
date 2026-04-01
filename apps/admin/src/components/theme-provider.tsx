import { createContext, useContext, useEffect, useState } from "react";
import { useThemeStore, type ThemeMode } from "../store/theme-store";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
};

type ThemeProviderState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  toggleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  const resolved = theme === "system" ? getSystemTheme() : theme;
  root.classList.add(resolved);
}

export function ThemeProvider({ children, defaultTheme = "system", ...props }: ThemeProviderProps) {
  const themeStore = useThemeStore();
  const [theme, setThemeState] = useState<ThemeMode>(() => (themeStore.theme as ThemeMode) || defaultTheme);

  useEffect(() => {
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const value: ThemeProviderState = {
    theme,
    setTheme: (newTheme: ThemeMode) => {
      themeStore.setTheme(newTheme);
      setThemeState(newTheme);
    },
    toggleTheme: () => {
      const next = theme === "light" ? "dark" : "light";
      themeStore.setTheme(next);
      setThemeState(next);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
