"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function AccountSwitcher() {
  const { user, accounts, currentAccount, switchAccount, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!currentAccount) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 transition"
      >
        <span>{currentAccount.type === "company" ? "🏢" : "👤"}</span>
        <span className="max-w-[140px] truncate">{currentAccount.name}</span>
        <span className="text-slate-600 text-xs">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-lg shadow-black/40 z-20 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-800">
              <p className="text-sm text-slate-200 font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <div className="py-1 max-h-56 overflow-y-auto">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    switchAccount(acc.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-800 transition ${
                    acc.id === currentAccount.id ? "text-cyan-400" : "text-slate-300"
                  }`}
                >
                  <span>{acc.type === "company" ? "🏢" : "👤"}</span>
                  <span className="flex-1 truncate">{acc.name}</span>
                  {acc.id === currentAccount.id && <span>✓</span>}
                </button>
              ))}
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-950/30 border-t border-slate-800 transition"
            >
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
