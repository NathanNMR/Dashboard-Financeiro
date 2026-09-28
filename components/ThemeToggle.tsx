"use client";

import { useEffect, useState } from "react";

const KEY = "smartfinance_theme";

export function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    document.documentElement.dataset.theme = saved === "light" || saved === "dark"
      ? saved : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }, []);
  return null;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    const next = saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, next);
    document.documentElement.dataset.theme = next;
    setTheme(next);
  };

  return <button type="button" onClick={toggle} aria-label={`Ativar modo ${theme === "dark" ? "claro" : "escuro"}`}
    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800">
    {theme === "dark" ? "☀️ Claro" : "🌙 Escuro"}
  </button>;
}
