"use client";

import { useEffect, useState } from "react";
import { applyTheme, readStoredTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-lift hover:text-ink"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
