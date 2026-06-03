import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "stadion-theme";

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  localStorage.setItem(KEY, t);
  window.dispatchEvent(new CustomEvent("stadion-theme", { detail: t }));
}

// Apply immediately on module import — avoids flash of wrong theme
if (typeof document !== "undefined") applyTheme(getInitial());

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    const handler = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener("stadion-theme", handler);
    return () => window.removeEventListener("stadion-theme", handler);
  }, []);

  const toggle = () => applyTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggle };
}
