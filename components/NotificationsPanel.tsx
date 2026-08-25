"use client";

import { useMemo } from "react";
import { Budget, CreditCard, Goal, Transaction } from "@/lib/types";
import { calculateCardUsage, getGoalProgress, previousMonthKey } from "@/lib/finance";
import { CATEGORY_ICONS } from "@/lib/constants";
import { EmptyState } from "./EmptyState";

interface NotificationsPanelProps {
  transactions: Transaction[];
  cards: CreditCard[];
  goals: Goal[];
  budgets: Budget;
  monthKey: string;
}

interface Notification {
  id: string;
  icon: string;
  text: string;
  tone: "danger" | "warning" | "info" | "success";
}

const TONE_CLASSES: Record<Notification["tone"], string> = {
  danger: "bg-rose-950/30 border-rose-900/50 text-rose-300",
  warning: "bg-amber-950/30 border-amber-900/50 text-amber-300",
  info: "bg-cyan-950/30 border-cyan-900/50 text-cyan-300",
  success: "bg-emerald-950/30 border-emerald-900/50 text-emerald-300",
};

function daysUntil(dateStr: string, from: Date): number {
  const target = new Date(dateStr + "T00:00:00");
  const diffMs = target.getTime() - new Date(from.toDateString()).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Deriva alertas acionáveis a partir dos dados já existentes (sem exigir
 * cadastro extra do usuário): vencimento de faturas, aumento de gastos por
 * categoria, metas próximas da conclusão e orçamentos estourados.
 */
export function NotificationsPanel({ transactions, cards, goals, budgets, monthKey }: NotificationsPanelProps) {
  const notifications = useMemo(() => {
    const now = new Date();
    const list: Notification[] = [];

    // Vencimento de faturas
    cards.forEach((card) => {
      const usage = calculateCardUsage(card, transactions, now);
      const diff = daysUntil(usage.dueDate, now);
      if (diff >= 0 && diff <= 5 && usage.currentInvoiceAmount > 0) {
        list.push({
          id: `card-due-${card.id}`,
          icon: "⚠️",
          text:
            diff === 0
              ? `Sua fatura do ${card.name} vence hoje.`
              : `Sua fatura do ${card.name} vence em ${diff} dia${diff > 1 ? "s" : ""}.`,
          tone: diff <= 2 ? "danger" : "warning",
        });
      }
    });

    // Aumento de gastos por categoria (mês atual vs anterior)
    const prevKey = previousMonthKey(monthKey);
    const currentByCategory: Record<string, number> = {};
    const previousByCategory: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const m = t.date.substring(0, 7);
        if (m === monthKey) currentByCategory[t.category] = (currentByCategory[t.category] || 0) + t.amount;
        else if (m === prevKey) previousByCategory[t.category] = (previousByCategory[t.category] || 0) + t.amount;
      });

    Object.entries(currentByCategory).forEach(([cat, value]) => {
      const prev = previousByCategory[cat];
      if (prev && prev > 0) {
        const deltaPct = Math.round(((value - prev) / prev) * 100);
        if (deltaPct >= 20) {
          list.push({
            id: `cat-up-${cat}`,
            icon: "📈",
            text: `Seus gastos com ${CATEGORY_ICONS[cat] ?? ""} ${cat} aumentaram ${deltaPct}%.`,
            tone: "warning",
          });
        }
      }
    });

    // Orçamento por categoria ultrapassado
    Object.entries(budgets).forEach(([cat, limit]) => {
      const spent = currentByCategory[cat] || 0;
      if (limit > 0 && spent > limit) {
        list.push({
          id: `budget-over-${cat}`,
          icon: "🔴",
          text: `Seu orçamento de ${cat} foi ultrapassado.`,
          tone: "danger",
        });
      }
    });

    // Progresso de metas
    goals.forEach((goal) => {
      const progress = getGoalProgress(goal, now);
      if (progress.progressPct >= 100) {
        list.push({ id: `goal-done-${goal.id}`, icon: "🎉", text: `Você concluiu a meta "${goal.title}"!`, tone: "success" });
      } else if (progress.progressPct >= 80) {
        list.push({
          id: `goal-close-${goal.id}`,
          icon: "🎯",
          text: `Você atingiu ${progress.progressPct}% da meta "${goal.title}".`,
          tone: "info",
        });
      }
    });

    return list;
  }, [transactions, cards, goals, budgets, monthKey]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20">
      <h3 className="text-lg font-semibold text-slate-200 mb-1">Notificações Inteligentes</h3>
      <p className="text-xs text-slate-500 mb-4">Alertas gerados automaticamente a partir dos seus dados.</p>
      {notifications.length === 0 ? (
        <EmptyState message="Nenhum alerta no momento. Tudo sob controle." />
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {notifications.map((n) => (
            <div key={n.id} className={`border rounded-lg px-3 py-2.5 text-sm flex items-start gap-2 ${TONE_CLASSES[n.tone]}`}>
              <span>{n.icon}</span>
              <span>{n.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
