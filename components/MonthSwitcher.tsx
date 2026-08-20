"use client";

import { formatMonthLabel } from "@/lib/finance";

interface MonthSwitcherProps {
  /** Chaves de mês disponíveis ("YYYY-MM"), em ordem crescente */
  months: string[];
  /** Mês selecionado, ou "all" para ver tudo (quando allowAll é true) */
  value: string;
  onChange: (month: string) => void;
  allowAll?: boolean;
  className?: string;
}

/**
 * Seletor de mês reutilizado em Compromissos Financeiros, Extrato Consolidado
 * e Despesas por Categoria, para o usuário poder isolar um mês por vez em vez
 * de ver tudo misturado.
 */
export function MonthSwitcher({ months, value, onChange, allowAll = true, className }: MonthSwitcherProps) {
  const currentIndex = months.indexOf(value);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < months.length - 1;

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => canPrev && onChange(months[currentIndex - 1])}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-slate-800 transition"
        aria-label="Mês anterior"
      >
        ‹
      </button>
      <select
        aria-label="Selecionar mês"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition flex-1 min-w-0"
      >
        {allowAll && <option value="all">Todos os meses</option>}
        {months.map((m) => (
          <option key={m} value={m}>
            {formatMonthLabel(m)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => canNext && onChange(months[currentIndex + 1])}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:bg-slate-800 transition"
        aria-label="Próximo mês"
      >
        ›
      </button>
    </div>
  );
}
