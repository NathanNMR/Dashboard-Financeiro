"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/finance";
import { CATEGORY_ICONS } from "@/lib/constants";
import { TextInput, SelectInput } from "./FormField";
import { CategoryOptions } from "./CategoryOptions";

interface TransactionsTableProps {
  transactions: Transaction[];
  filterCategory: string;
  filterSearch: string;
  onFilterCategoryChange: (value: string) => void;
  onFilterSearchChange: (value: string) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

type SortKey = "date" | "amount";

export function TransactionsTable({
  transactions,
  filterCategory,
  filterSearch,
  onFilterCategoryChange,
  onFilterSearchChange,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  const [filterType, setFilterType] = useState<"All" | "income" | "expense">("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);

  const visibleTransactions = useMemo(() => {
    const filtered = filterType === "All" ? transactions : transactions.filter((t) => t.type === filterType);
    const sorted = [...filtered].sort((a, b) => {
      const cmp = sortKey === "date" ? a.date.localeCompare(b.date) : a.amount - b.amount;
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [transactions, filterType, sortKey, sortDesc]);

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-semibold text-slate-200">Extrato Consolidado</h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <TextInput
            aria-label="Buscar por descrição"
            type="text"
            placeholder="Buscar descrição..."
            value={filterSearch}
            onChange={(e) => onFilterSearchChange(e.target.value)}
            className="sm:w-52"
          />
          <SelectInput
            aria-label="Filtrar por tipo"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "All" | "income" | "expense")}
            className="sm:w-36"
          >
            <option value="All">Receitas e Despesas</option>
            <option value="income">Só Receitas</option>
            <option value="expense">Só Despesas</option>
          </SelectInput>
          <SelectInput
            aria-label="Filtrar por categoria"
            value={filterCategory}
            onChange={(e) => onFilterCategoryChange(e.target.value)}
            className="sm:w-48"
          >
            <option value="All">Todas as Categorias</option>
            <CategoryOptions />
          </SelectInput>
        </div>
      </div>

      <div className="overflow-x-auto">
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
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : (
              visibleTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{t.date}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">{t.description}</td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-800 text-cyan-300 text-xs px-2.5 py-1 rounded-full border border-slate-700 whitespace-nowrap">
                      {CATEGORY_ICONS[t.category] ?? ""} {t.category}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold whitespace-nowrap ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
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
                      onClick={() => onDelete(t)}
                      className="text-rose-400 hover:text-rose-300 text-xs bg-rose-950/40 border border-rose-900/50 px-2.5 py-1 rounded-lg transition"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {visibleTransactions.length > 0 && (
        <p className="text-xs text-slate-500 pt-1">
          Exibindo {visibleTransactions.length} de {transactions.length} transações.
        </p>
      )}
    </div>
  );
}
