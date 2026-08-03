"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type AccentColor = "orange" | "blue" | "green" | "purple" | "pink" | "teal" | "red" | "indigo" | "rose" | "amber";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  followDeviceTheme: boolean;
  setFollowDeviceTheme: (follow: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const accentColorMap: Record<AccentColor, Record<string, string>> = {
  orange: {
    "--accent-50": "#fff7ed",
    "--accent-100": "#ffedd5",
    "--accent-200": "#fed7aa",
    "--accent-300": "#fdba74",
    "--accent-400": "#fb923c",
    "--accent-700": "#f97316",
    "--accent-600": "#ea580c",
    "--accent-700": "#c2410c",
    "--accent-800": "#9a3412",
    "--accent-900": "#7c2d12",
    "--accent-950": "#431407",
  },
  blue: {
    "--accent-50": "#eff6ff",
    "--accent-100": "#dbeafe",
    "--accent-200": "#bfdbfe",
    "--accent-300": "#93c5fd",
    "--accent-400": "#60a5fa",
    "--accent-700": "#3b82f6",
    "--accent-600": "#2563eb",
    "--accent-700": "#1d4ed8",
    "--accent-800": "#1e40af",
    "--accent-900": "#1e3a8a",
    "--accent-950": "#172554",
  },
  green: {
    "--accent-50": "#f0fdf4",
    "--accent-100": "#dcfce7",
    "--accent-200": "#bbf7d0",
    "--accent-300": "#86efac",
    "--accent-400": "#4ade80",
    "--accent-700": "#22c55e",
    "--accent-600": "#16a34a",
    "--accent-700": "#15803d",
    "--accent-800": "#166534",
    "--accent-900": "#14532d",
    "--accent-950": "#052e16",
  },
  purple: {
    "--accent-50": "#faf5ff",
    "--accent-100": "#f3e8ff",
    "--accent-200": "#e9d5ff",
    "--accent-300": "#d8b4fe",
    "--accent-400": "#c084fc",
    "--accent-700": "#a855f7",
    "--accent-600": "#9333ea",
    "--accent-700": "#7e22ce",
    "--accent-800": "#6b21a8",
    "--accent-900": "#581c87",
    "--accent-950": "#3b0764",
  },
  pink: {
    "--accent-50": "#fdf2f8",
    "--accent-100": "#fce7f3",
    "--accent-200": "#fbcfe8",
    "--accent-300": "#f9a8d4",
    "--accent-400": "#f472b6",
    "--accent-700": "#ec4899",
    "--accent-600": "#db2777",
    "--accent-700": "#be185d",
    "--accent-800": "#9d174d",
    "--accent-900": "#831843",
    "--accent-950": "#500724",
  },
  teal: {
    "--accent-50": "#f0fdfa",
    "--accent-100": "#ccfbf1",
    "--accent-200": "#99f6e4",
    "--accent-300": "#5eead4",
    "--accent-400": "#2dd4bf",
    "--accent-700": "#14b8a6",
    "--accent-600": "#0d9488",
    "--accent-700": "#0f766e",
    "--accent-800": "#115e59",
    "--accent-900": "#134e4a",
    "--accent-950": "#042f2e",
  },
  red: {
    "--accent-50": "#fef2f2",
    "--accent-100": "#fee2e2",
    "--accent-200": "#fecaca",
    "--accent-300": "#fca5a5",
    "--accent-400": "#f87171",
    "--accent-700": "#ef4444",
    "--accent-600": "#dc2626",
    "--accent-700": "#b91c1c",
    "--accent-800": "#991b1b",
    "--accent-900": "#7f1d1d",
    "--accent-950": "#450a0a",
  },
  indigo: {
    "--accent-50": "#eef2ff",
    "--accent-100": "#e0e7ff",
    "--accent-200": "#c7d2fe",
    "--accent-300": "#a5b4fc",
    "--accent-400": "#818cf8",
    "--accent-700": "#6366f1",
    "--accent-600": "#4f46e5",
    "--accent-700": "#4338ca",
    "--accent-800": "#3730a3",
    "--accent-900": "#312e81",
    "--accent-950": "#1e1b4b",
  },
  rose: {
    "--accent-50": "#fff1f2",
    "--accent-100": "#ffe4e6",
    "--accent-200": "#fecdd3",
    "--accent-300": "#fda4af",
    "--accent-400": "#fb7185",
    "--accent-700": "#f43f5e",
    "--accent-600": "#e11d48",
    "--accent-700": "#be123c",
    "--accent-800": "#9f1239",
    "--accent-900": "#881337",
    "--accent-950": "#4c0519",
  },
  amber: {
    "--accent-50": "#fffbeb",
    "--accent-100": "#fef3c7",
    "--accent-200": "#fde68a",
    "--accent-300": "#fcd34d",
    "--accent-400": "#fbbf24",
    "--accent-700": "#f59e0b",
    "--accent-600": "#d97706",
    "--accent-700": "#b45309",
    "--accent-800": "#92400e",
    "--accent-900": "#78350f",
    "--accent-950": "#451a03",
  },
};

const defaultAccentColor: AccentColor = "orange";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [accentColor, setAccentColor] = useState<AccentColor>(defaultAccentColor);
  const [isLoaded, setIsLoaded] = useState(false);
  const [followDeviceTheme, setFollowDeviceTheme] = useState(true);

  // Load saved preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedAccent = localStorage.getItem("accentColor") as AccentColor | null;
    const savedFollowDevice = localStorage.getItem("followDeviceTheme");

    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setTheme(savedTheme);
      setFollowDeviceTheme(savedTheme === "system");
    } else {
      setTheme("system");
      setFollowDeviceTheme(true);
    }

    if (savedAccent && accentColorMap[savedAccent]) {
      setAccentColor(savedAccent);
    }

    setIsLoaded(true);
  }, []);

  // Detect system theme
  useEffect(() => {
    if (!isLoaded) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (followDeviceTheme) {
        setResolvedTheme(e.matches ? "dark" : "light");
      }
    };

    // Set initial resolved theme
    if (followDeviceTheme) {
      setResolvedTheme(mediaQuery.matches ? "dark" : "light");
    } else {
      setResolvedTheme(theme === "dark" ? "dark" : "light");
    }

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, [followDeviceTheme, theme, isLoaded]);

  // Apply theme class to document
  useEffect(() => {
    if (!isLoaded) return;

    const root = document.documentElement;
    const currentTheme = followDeviceTheme ? resolvedTheme : theme;
    
   if (currentTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    localStorage.setItem("theme", theme);
    localStorage.setItem("followDeviceTheme", String(followDeviceTheme));
  }, [theme, resolvedTheme, followDeviceTheme, isLoaded]);

  // Apply accent color CSS variables
  useEffect(() => {
    if (!isLoaded) return;

    const root = document.documentElement;
    const accentVars = accentColorMap[accentColor];
    
    if (!accentVars) {
      console.warn(`Accent color "${accentColor}" not found, using default`);
      const defaultVars = accentColorMap[defaultAccentColor];
      if (defaultVars) {
        Object.entries(defaultVars).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
      }
      return;
    }

    Object.entries(accentVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    localStorage.setItem("accentColor", accentColor);
  }, [accentColor, isLoaded]);

  const toggleTheme = () => {
    if (followDeviceTheme) {
      // If following device, switch to manual mode with opposite of current
      const newTheme = resolvedTheme === "light" ? "dark" : "light";
      setTheme(newTheme);
      setFollowDeviceTheme(false);
    } else {
      // Cycle through: light -> dark -> system
      if (theme === "light") {
        setTheme("dark");
      } else if (theme === "dark") {
        setTheme("system");
        setFollowDeviceTheme(true);
      }
    }
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setFollowDeviceTheme(newTheme === "system");
  };

  const handleSetFollowDeviceTheme = (follow: boolean) => {
    setFollowDeviceTheme(follow);
    if (follow) {
      setTheme("system");
    }
  };

  const handleSetAccentColor = (color: AccentColor) => {
    if (accentColorMap[color]) {
      setAccentColor(color);
    } else {
      console.warn(`Invalid accent color: ${color}`);
    }
  };

  const value = {
    theme,
    resolvedTheme,
    toggleTheme,
    setTheme: handleSetTheme,
    accentColor,
    setAccentColor: handleSetAccentColor,
    followDeviceTheme,
    setFollowDeviceTheme: handleSetFollowDeviceTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}