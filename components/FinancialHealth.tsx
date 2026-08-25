"use client";

import { useMemo } from "react";
import { Budget, CreditCard, Goal, Transaction } from "@/lib/types";
import { calculateFinancialHealth } from "@/lib/finance";

interface FinancialHealthProps {
  transactions: Transaction[];
  budgets: Budget;
  cards: CreditCard[];
  goals: Goal[];
  monthKey: string;
}

const LEVEL_META: Record<string, { label: string; dot: string; ring: string }> = {
  excellent: { label: "Excelente", dot: "🟢", ring: "text-emerald-400" },
  good: { label: "Boa", dot: "🟢", ring: "text-emerald-400" },
  attention: { label: "Atenção", dot: "🟡", ring: "text-amber-400" },
  critical: { label: "Crítica", dot: "🔴", ring: "text-rose-400" },
};

const DIMENSION_LABELS: Record<string, string> = {
  reserve: "Reserva financeira",
  control: "Controle de gastos",
  budget: "Orçamento",
  debt: "Endividamento",
  goals: "Metas",
};

function DimensionBar({ label, value }: { label: string; value: number }) {
  const barColor = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400 font-medium">{value}/100</span>
      </div>
      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
        <div className={`h-full transition-all ${barColor}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/**
 * Página "Saúde Financeira": combina 5 dimensões em uma pontuação única de 0-100,
 * com explicação em linguagem natural — a identidade própria do dashboard.
 */
export function FinancialHealth({ transactions, budgets, cards, goals, monthKey }: FinancialHealthProps) {
  const result = useMemo(
    () => calculateFinancialHealth({ transactions, budgets, cards, goals, monthKey }),
    [transactions, budgets, cards, goals, monthKey]
  );

  const meta = LEVEL_META[result.level];

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (result.score / 100) * circumference;
  const strokeColor = result.score >= 70 ? "#10b981" : result.score >= 40 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-8 shadow-lg shadow-black/20">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-slate-200 mb-1">Saúde Financeira</h3>
        <p className="text-xs text-slate-500">Uma pontuação única que resume sua situação financeira.</p>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl sm:text-4xl font-bold text-slate-100">{result.score}</span>
            <span className="text-xs text-slate-500">/100</span>
          </div>
        </div>
        <div className={`mt-3 font-medium flex items-center gap-1.5 ${meta.ring}`}>
          <span>{meta.dot}</span>
          <span>{meta.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
        {Object.entries(result.breakdown).map(([key, value]) => (
          <DimensionBar key={key} label={DIMENSION_LABELS[key]} value={value} />
        ))}
      </div>

      <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
        <p className="text-sm text-slate-300 leading-relaxed">{result.message}</p>
      </div>
    </div>
  );
}
