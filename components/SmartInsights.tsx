"use client";

import { useMemo } from "react";
import { Transaction, CreditCard, Goal } from "@/lib/types";
import {
  calculateCardUsage,
  compareToPreviousMonth,
  formatCurrency,
  forecastEndOfMonthBalance,
  formatMonthLabel,
  getGoalProgress,
  percentIncomeCommitted,
} from "@/lib/finance";
import { CATEGORY_ICONS } from "@/lib/constants";

interface SmartInsightsProps {
  transactions: Transaction[];
  cards: CreditCard[];
  goals: Goal[];
  monthKey: string;
}

function InsightCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
      ? "text-rose-400"
      : tone === "warning"
      ? "text-amber-400"
      : "text-slate-100";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
        <span>{icon}</span> {label}
      </span>
      <span className={`text-base sm:text-lg font-semibold break-words ${toneClass}`}>{value}</span>
      {hint && <span className="text-xs text-slate-500 leading-snug">{hint}</span>}
    </div>
  );
}

/**
 * Painel de indicadores inteligentes: em vez de só mostrar gráficos, traduz os
 * números em frases diretas ("você gastou X% a menos que no mês passado"),
 * cobrindo patrimônio, evolução mensal, metas, cartões, categoria-líder,
 * % da renda comprometida e previsão de saldo no fim do mês.
 */
export function SmartInsights({ transactions, cards, goals, monthKey }: SmartInsightsProps) {
  const totalBalance = useMemo(() => {
    let income = 0, expense = 0;
    transactions.forEach((t) => (t.type === "income" ? (income += t.amount) : (expense += t.amount)));
    return income - expense;
  }, [transactions]);

  const comparison = useMemo(() => compareToPreviousMonth(transactions, monthKey), [transactions, monthKey]);

  const monthExpensesByCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense" && t.date.substring(0, 7) === monthKey)
      .forEach((t) => (acc[t.category] = (acc[t.category] || 0) + t.amount));
    return acc;
  }, [transactions, monthKey]);

  const topCategory = useMemo(() => {
    const entries = Object.entries(monthExpensesByCategory);
    if (entries.length === 0) return null;
    return entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max));
  }, [monthExpensesByCategory]);

  const incomeCommittedPct = useMemo(
    () => percentIncomeCommitted(comparison.currentIncome, comparison.currentExpense),
    [comparison]
  );

  const forecast = useMemo(() => forecastEndOfMonthBalance(transactions, monthKey), [transactions, monthKey]);

  const cardUsages = useMemo(() => cards.map((c) => calculateCardUsage(c, transactions)), [cards, transactions]);
  const totalCardSpend = useMemo(() => cardUsages.reduce((s, u) => s + u.currentInvoiceAmount, 0), [cardUsages]);

  const goalsAvgProgress = useMemo(() => {
    if (goals.length === 0) return null;
    const total = goals.reduce((s, g) => s + getGoalProgress(g).progressPct, 0);
    return Math.round(total / goals.length);
  }, [goals]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-200">Indicadores Inteligentes</h3>
        <p className="text-xs text-slate-500">Um retrato direto da sua situação financeira em {formatMonthLabel(monthKey)}.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <InsightCard
          icon="💰"
          label="Patrimônio / Saldo total"
          value={formatCurrency(totalBalance)}
          tone={totalBalance >= 0 ? "positive" : "negative"}
        />

        <InsightCard
          icon="📉"
          label="Comparação com mês anterior"
          value={
            comparison.expenseDeltaPct === null
              ? "Sem dados do mês anterior"
              : `${comparison.expenseDeltaPct <= 0 ? "-" : "+"}${Math.abs(comparison.expenseDeltaPct)}%`
          }
          hint={
            comparison.expenseDeltaPct === null
              ? undefined
              : comparison.expenseDeltaPct <= 0
              ? `Você gastou ${Math.abs(comparison.expenseDeltaPct)}% menos que no mês passado.`
              : `Seus gastos subiram ${comparison.expenseDeltaPct}% em relação ao mês passado.`
          }
          tone={comparison.expenseDeltaPct === null ? "neutral" : comparison.expenseDeltaPct <= 0 ? "positive" : "negative"}
        />

        <InsightCard
          icon="📊"
          label="% da renda comprometida"
          value={incomeCommittedPct === null ? "—" : `${incomeCommittedPct}%`}
          hint={incomeCommittedPct === null ? "Sem receitas lançadas neste mês." : undefined}
          tone={incomeCommittedPct === null ? "neutral" : incomeCommittedPct <= 70 ? "positive" : incomeCommittedPct <= 100 ? "warning" : "negative"}
        />

        <InsightCard
          icon="⚠️"
          label="Previsão de saldo no fim do mês"
          value={formatCurrency(forecast.projectedBalance)}
          hint={`Baseado no ritmo de gasto dos últimos ${forecast.daysElapsed} dia(s).`}
          tone={forecast.projectedBalance >= 0 ? "positive" : "negative"}
        />

        <InsightCard
          icon="🔥"
          label="Maior categoria de gasto"
          value={topCategory ? `${CATEGORY_ICONS[topCategory[0]] ?? ""} ${topCategory[0]}` : "Sem gastos no mês"}
          hint={topCategory ? formatCurrency(topCategory[1]) : undefined}
        />

        <InsightCard
          icon="💳"
          label="Gastos nos cartões (fatura atual)"
          value={cards.length === 0 ? "Nenhum cartão" : formatCurrency(totalCardSpend)}
          hint={cards.length > 0 ? `${cards.length} cartão(ões) cadastrado(s)` : undefined}
        />

        <InsightCard
          icon="🎯"
          label="Progresso médio das metas"
          value={goalsAvgProgress === null ? "Nenhuma meta" : `${goalsAvgProgress}%`}
          tone={goalsAvgProgress === null ? "neutral" : goalsAvgProgress >= 70 ? "positive" : "neutral"}
        />

        <InsightCard
          icon="📈"
          label="Evolução financeira"
          value={comparison.incomeDeltaPct === null ? "—" : `${comparison.incomeDeltaPct >= 0 ? "+" : ""}${comparison.incomeDeltaPct}% receita`}
          hint="Variação de receita em relação ao mês anterior."
        />
      </div>
    </div>
  );
}
