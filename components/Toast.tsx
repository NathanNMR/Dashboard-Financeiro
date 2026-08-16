"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { ToastKind, ToastMessage } from "@/lib/types";
import { generateId } from "@/lib/finance";

interface ToastContextValue {
  notify: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLES: Record<ToastKind, string> = {
  success: "bg-emerald-950 border-emerald-800/60 text-emerald-300",
  error: "bg-rose-950 border-rose-800/60 text-rose-300",
  info: "bg-slate-900 border-slate-700 text-slate-200",
};

const KIND_ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, kind: ToastKind = "info") => {
    const id = generateId("toast");
    setToasts((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`${KIND_STYLES[t.kind]} border rounded-xl px-4 py-3 shadow-2xl backdrop-blur text-sm flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2`}
          >
            <span className="font-bold">{KIND_ICONS[t.kind]}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de um ToastProvider");
  return ctx;
}
