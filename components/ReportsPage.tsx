"use client";

import { useMemo, useState } from "react";
import { CreditCard, Transaction } from "@/lib/types";
import { calculateCardUsage, currentMonthKey, formatCurrency, toLocalISODate } from "@/lib/finance";
import { CATEGORY_ICONS } from "@/lib/constants";
import { exportReportCsv, exportReportPdf, exportReportXlsx } from "@/lib/reportExport";
import { EmptyState } from "./EmptyState";

interface ReportsPageProps {
  transactions: Transaction[];
  cards: CreditCard[];
}

type ReportTab = "monthly" | "annual" | "categories" | "income" | "expense" | "cards";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "monthly", label: "Mensal" },
  { id: "annual", label: "Anual" },
  { id: "categories", label: "Categorias" },
  { id: "income", label: "Receitas" },
  { id: "expense", label: "Despesas" },
  { id: "cards", label: "Cartões" },
];

export function ReportsPage({ transactions, cards }: ReportsPageProps) {
  const [tab, setTab] = useState<ReportTab>("monthly");
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [year, setYear] = useState(new Date().getFullYear());

  const filtered = useMemo(() => {
    switch (tab) {
      case "monthly":
        return transactions.filter((t) => t.date.substring(0, 7) === monthKey);
      case "annual":
        return transactions.filter((t) => t.date.substring(0, 4) === String(year));
      case "income":
        return transactions.filter((t) => t.type === "income");
      case "expense":
        return transactions.filter((t) => t.type === "expense");
      case "cards":
        return transactions.filter((t) => !!t.cardId);
      case "categories":
      default:
        return transactions;
    }
  }, [tab, transactions, monthKey, year]);

  const summary = useMemo(() => {
    let income = 0, expense = 0;
    filtered.forEach((t) => (t.type === "income" ? (income += t.amount) : (expense += t.amount)));
    return { income, expense, balance: income - expense, count: filtered.length };
  }, [filtered]);

  const categoryTotals = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => (acc[t.category] = (acc[t.category] || 0) + t.amount));
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const reportTitle = TABS.find((t) => t.id === tab)?.label ?? "Relatório";
  const filenameBase = `relatorio_${tab}_${toLocalISODate()}`;
  const exportSummary = [
    { label: "Receitas", value: formatCurrency(summary.income) },
    { label: "Despesas", value: formatCurrency(summary.expense) },
    { label: "Saldo", value: formatCurrency(summary.balance) },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">📊 Relatórios</h3>
          <p className="text-xs text-slate-500">Explore seus dados por período e exporte no formato que preferir.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportReportCsv(filtered, filenameBase)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => exportReportXlsx(filtered, filenameBase)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition"
          >
            Exportar Excel
          </button>
          <button
            onClick={() => exportReportPdf(filtered, filenameBase, `Relatório ${reportTitle} — SmartFinance`, exportSummary)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4 border-b border-slate-800 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              tab === t.id ? "bg-cyan-600 text-white" : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "monthly" && (
        <div className="mb-4">
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200"
          />
        </div>
      )}
      {tab === "annual" && (
        <div className="mb-4">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 w-28"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Receitas</div>
          <div className="text-sm font-semibold text-emerald-400">{formatCurrency(summary.income)}</div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Despesas</div>
          <div className="text-sm font-semibold text-rose-400">{formatCurrency(summary.expense)}</div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Saldo</div>
          <div className={`text-sm font-semibold ${summary.balance >= 0 ? "text-slate-200" : "text-amber-400"}`}>
            {formatCurrency(summary.balance)}
          </div>
        </div>
      </div>

      {tab === "categories" ? (
        categoryTotals.length === 0 ? (
          <EmptyState message="Sem despesas para detalhar por categoria." />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {categoryTotals.map(([cat, value]) => (
              <div key={cat} className="flex justify-between items-center text-sm border-b border-slate-800/60 pb-2">
                <span className="text-slate-300">
                  {CATEGORY_ICONS[cat] ?? ""} {cat}
                </span>
                <span className="text-slate-200 font-medium">{formatCurrency(value)}</span>
              </div>
            ))}
          </div>
        )
      ) : tab === "cards" ? (
        cards.length === 0 ? (
          <EmptyState message="Nenhum cartão cadastrado." />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {cards.map((card) => {
              const usage = calculateCardUsage(card, transactions);
              return (
                <div key={card.id} className="flex justify-between items-center text-sm border-b border-slate-800/60 pb-2">
                  <span className="text-slate-300">💳 {card.name}</span>
                  <span className="text-slate-200 font-medium">{formatCurrency(usage.currentInvoiceAmount)} (fatura atual)</span>
                </div>
              );
            })}
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState message="Sem transações para este filtro." />
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {filtered
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 100)
            .map((t) => (
              <div key={t.id} className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400 w-16 shrink-0">{t.date.split("-").reverse().join("/")}</span>
                <span className="text-slate-300 flex-1 truncate px-2">{t.description}</span>
                <span className={t.type === "income" ? "text-emerald-400" : "text-rose-400"}>
                  {t.type === "income" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          {filtered.length > 100 && (
            <p className="text-xs text-slate-600 pt-2">Mostrando 100 de {filtered.length} lançamentos. Exporte para ver todos.</p>
          )}
        </div>
      )}
    </div>
  );
}
