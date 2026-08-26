"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/types";
import { formatCurrency, formatMonthLabel, currentMonthKey } from "@/lib/finance";
import { CATEGORY_ICONS, RECURRENCE_LABELS } from "@/lib/constants";
import { TextInput, SelectInput } from "./FormField";
import { CategoryOptions } from "./CategoryOptions";
import { MonthSwitcher } from "./MonthSwitcher";

interface TransactionsTableProps {
  transactions: Transaction[];
  filterCategory: string;
  filterSearch: string;
  onFilterCategoryChange: (value: string) => void;
  onFilterSearchChange: (value: string) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction, scope: "single" | "series") => void;
  onDeleteAll: () => void;
}

type SortKey = "date" | "amount";

function RecurrenceBadge({ t }: { t: Transaction }) {
  if (!t.recurrence || t.recurrence === "none") return null;
  return (
    <span className="text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded-full whitespace-nowrap">
      ↻ {RECURRENCE_LABELS[t.recurrence]}
    </span>
  );
}

export function TransactionsTable({
  transactions,
  filterCategory,
  filterSearch,
  onFilterCategoryChange,
  onFilterSearchChange,
  onEdit,
  onDelete,
  onDeleteAll,
}: TransactionsTableProps) {
  const [filterType, setFilterType] = useState<"All" | "income" | "expense">("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);

  // Meses com transações, para o usuário isolar um mês por vez em vez de ver
  // tudo (inclusive lançamentos recorrentes futuros) misturado.
  const monthKeys = useMemo(() => Array.from(new Set(transactions.map((t) => t.date.substring(0, 7)))).sort(), [transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const keys = Array.from(new Set(transactions.map((t) => t.date.substring(0, 7)))).sort();
    if (keys.length === 0) return "all";
    const today = currentMonthKey();
    if (keys.includes(today)) return today;
    // Prefere o mês passado mais recente a abrir direto num mês futuro
    // distante (o que aconteceria facilmente por causa de lançamentos
    // recorrentes que já populam vários meses à frente).
    const past = keys.filter((k) => k < today);
    return past.length > 0 ? past[past.length - 1] : keys[0];
  });

  const visibleTransactions = useMemo(() => {
    let filtered = filterType === "All" ? transactions : transactions.filter((t) => t.type === filterType);
    if (selectedMonth !== "all") {
      filtered = filtered.filter((t) => t.date.substring(0, 7) === selectedMonth);
    }
    const sorted = [...filtered].sort((a, b) => {
      const cmp = sortKey === "date" ? a.date.localeCompare(b.date) : a.amount - b.amount;
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [transactions, filterType, selectedMonth, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const SortArrow = ({ active }: { active: boolean }) => (
    <span className={`inline-block ml-1 transition ${active ? "opacity-100" : "opacity-0"}`}>{sortDesc ? "↓" : "↑"}</span>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20 flex flex-col space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-200">Extrato Consolidado</h3>
          <div className="flex items-center gap-3">
            <MonthSwitcher months={monthKeys} value={selectedMonth} onChange={setSelectedMonth} className="sm:w-72" />
            {transactions.length > 0 && (
              <button
                onClick={onDeleteAll}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline whitespace-nowrap"
              >
                🗑️ Apagar todas
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <TextInput
            aria-label="Buscar por descrição"
            type="text"
            placeholder="Buscar descrição..."
            value={filterSearch}
            onChange={(e) => onFilterSearchChange(e.target.value)}
          />
          <SelectInput
            aria-label="Filtrar por tipo"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "All" | "income" | "expense")}
          >
            <option value="All">Receitas e Despesas</option>
            <option value="income">Só Receitas</option>
            <option value="expense">Só Despesas</option>
          </SelectInput>
          <SelectInput
            aria-label="Filtrar por categoria"
            value={filterCategory}
            onChange={(e) => onFilterCategoryChange(e.target.value)}
          >
            <option value="All">Todas as Categorias</option>
            <CategoryOptions type={filterType !== "All" ? filterType : undefined} />
          </SelectInput>
        </div>

        {/* Ordenação: em telas pequenas viram botões (cabeçalho de tabela não existe no card view) */}
        <div className="flex md:hidden gap-2">
          <button
            onClick={() => toggleSort("date")}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
              sortKey === "date" ? "border-cyan-700 bg-cyan-950/40 text-cyan-300" : "border-slate-800 text-slate-400"
            }`}
          >
            Data <SortArrow active={sortKey === "date"} />
          </button>
          <button
            onClick={() => toggleSort("amount")}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
              sortKey === "amount" ? "border-cyan-700 bg-cyan-950/40 text-cyan-300" : "border-slate-800 text-slate-400"
            }`}
          >
            Valor <SortArrow active={sortKey === "amount"} />
          </button>
        </div>
      </div>

      {visibleTransactions.length === 0 ? (
        <p className="py-6 text-center text-slate-500 text-sm">
          {selectedMonth !== "all" ? `Nenhuma transação em ${formatMonthLabel(selectedMonth)}.` : "Nenhuma transação encontrada."}
        </p>
      ) : (
        <>
          {/* Mobile: cards empilhados */}
          <ul className="md:hidden space-y-3">
            {visibleTransactions.map((t) => (
              <li key={t.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-slate-200 text-sm truncate">{t.description}</p>
                      <RecurrenceBadge t={t} />
                    </div>
                    <p className="text-xs text-slate-500">{t.date}</p>
                  </div>
                  <span
                    className={`text-sm font-bold whitespace-nowrap ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {t.type === "income" ? "+ " : "- "}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-slate-800 text-cyan-300 text-xs px-2.5 py-1 rounded-full border border-slate-700">
                    {CATEGORY_ICONS[t.category] ?? ""} {t.category}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onEdit(t)} className="text-cyan-400 text-xs bg-cyan-950/40 border border-cyan-900/50 px-2.5 py-1 rounded-lg">
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(t, "single")}
                      className="text-rose-400 text-xs bg-rose-950/40 border border-rose-900/50 px-2.5 py-1 rounded-lg"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                {t.recurrenceGroupId && (
                  <button
                    onClick={() => onDelete(t, "series")}
                    className="text-slate-500 text-[11px] underline decoration-dotted"
                  >
                    excluir série completa
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Desktop / tablet: tabela tradicional */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 select-none">
                  <th className="py-3 px-4 cursor-pointer hover:text-slate-200" onClick={() => toggleSort("date")}>
                    Data
                    <SortArrow active={sortKey === "date"} />
                  </th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-200" onClick={() => toggleSort("amount")}>
                    Valor
                    <SortArrow active={sortKey === "amount"} />
                  </th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {visibleTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{t.date}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{t.description}</span>
                        <RecurrenceBadge t={t} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-800 text-cyan-300 text-xs px-2.5 py-1 rounded-full border border-slate-700 whitespace-nowrap">
                        {CATEGORY_ICONS[t.category] ?? ""} {t.category}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold whitespace-nowrap ${
                        t.type === "income" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {t.type === "income" ? "+ " : "- "}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => onEdit(t)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs bg-cyan-950/40 border border-cyan-900/50 px-2.5 py-1 rounded-lg transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(t, "single")}
                        className="text-rose-400 hover:text-rose-300 text-xs bg-rose-950/40 border border-rose-900/50 px-2.5 py-1 rounded-lg transition"
                      >
                        Excluir
                      </button>
                      {t.recurrenceGroupId && (
                        <button
                          onClick={() => onDelete(t, "series")}
                          className="text-slate-500 hover:text-rose-400 text-[11px] underline decoration-dotted transition"
                          title="Remove esta e todas as outras ocorrências desta série recorrente"
                        >
                          excluir série
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500 pt-1">
            Exibindo {visibleTransactions.length} de {transactions.length} transações
            {selectedMonth !== "all" ? ` (${formatMonthLabel(selectedMonth)})` : ""}.
          </p>
        </>
      )}
    </div>
  );
}
