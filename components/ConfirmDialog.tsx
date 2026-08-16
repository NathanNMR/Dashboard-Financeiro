"use client";

import { useCallback, useState } from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
}

/** Hook que expõe um <ConfirmDialog/> pronto para renderizar e uma função `confirm()` baseada em Promise */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handle = (result: boolean) => {
    resolver?.(result);
    setOptions(null);
    setResolver(null);
  };

  const dialog = options ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">{options.title}</h3>
        {options.description && <p className="text-sm text-slate-400">{options.description}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => handle(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => handle(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/30 transition"
          >
            {options.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
