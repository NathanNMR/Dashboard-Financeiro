"use client";

import { useState } from "react";
import { generateId, toLocalISODate } from "@/lib/finance";
import { roundMoney } from "@/lib/money";
import { ShoppingList } from "@/lib/types";
import { CategoryOptions } from "./CategoryOptions";

const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const moneyInput = (value: string): number | null => {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? roundMoney(number) : null;
};

interface Props {
  lists: ShoppingList[];
  onChange: (lists: ShoppingList[]) => void;
  onRemove: (list: ShoppingList) => void;
  onRecord: (list: ShoppingList, category: string) => void;
  status: "loading" | "idle" | "saving" | "error";
  error: string | null;
  onRetry: () => void;
}

export function ShoppingLists({ lists, onChange, onRemove, onRecord, status, error, onRetry }: Props) {
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Record<string, string>>({});

  const update = (id: string, change: (list: ShoppingList) => ShoppingList) =>
    onChange(lists.map((list) => list.id === id ? change(list) : list));

  const addList = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const id = generateId("shop");
    onChange([{ id, title: title.trim(), budget: moneyInput(budget), paidAmount: null,
      completedAt: null, recordedTransactionId: null, items: [] }, ...lists]);
    setActiveId(id);
    setTitle("");
    setBudget("");
  };

  if (status === "loading") return <p className="text-slate-400">Carregando listas de compras...</p>;
  if (error && lists.length === 0) return (
    <div className="rounded-xl border border-rose-800 bg-rose-950/20 p-5 text-rose-300" role="alert">
      <p>Não foi possível carregar as listas: {error}</p>
      <button className="mt-3 underline" onClick={onRetry}>Tentar novamente</button>
    </div>
  );

  return (
    <section className="space-y-6" aria-label="Listas de compras">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Listas de compras</h2>
        <p className="text-sm text-slate-400">Planeje a compra, some os preços dos itens e registre o valor final do caixa.</p>
      </div>
      {error && <p role="alert" className="rounded-lg border border-rose-800 p-3 text-rose-300">
        Falha ao salvar: {error}. Suas alterações ainda podem não estar no servidor.
      </p>}
      {status === "saving" && <p className="text-xs text-slate-400" role="status">Salvando listas...</p>}
      <form onSubmit={addList} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-48 text-sm text-slate-300">O que vai comprar?
          <input required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Compras do mês"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-100" />
        </label>
        <label className="w-44 text-sm text-slate-300">Quanto pretende gastar? (opcional)
          <input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="R$ 0,00"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-100" />
        </label>
        <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2.5 font-medium text-white hover:bg-cyan-500">Criar lista</button>
      </form>
      {lists.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">Crie uma lista para começar a planejar sua próxima compra.</p>}
      {lists.map((list) => {
        const total = roundMoney(list.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0));
        const missing = list.items.filter((item) => item.unitPrice === null).length;
        const difference = list.paidAmount === null ? null : roundMoney(list.paidAmount - total);
        const open = activeId === list.id || (activeId === null && lists[0]?.id === list.id);
        return (
          <article key={list.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <button type="button" onClick={() => setActiveId(open ? "" : list.id)}
                  aria-expanded={open} className="text-left text-lg font-semibold text-slate-100 hover:text-cyan-400">
                  {open ? "▾" : "▸"} {list.title}
                </button>
                <p className="text-sm text-slate-400">{list.items.length} item(ns) · {list.completedAt ? `Compra em ${new Date(list.completedAt + "T12:00:00").toLocaleDateString("pt-BR")}` : "Em planejamento"}</p>
              </div>
              <button type="button" onClick={() => onRemove(list)} className="text-sm text-rose-400 hover:underline">Excluir lista</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-slate-950 p-3"><span className="text-slate-400">Planejado</span><strong className="block text-slate-100">{list.budget === null ? "Sem limite" : brl(list.budget)}</strong></div>
              <div className="rounded-lg bg-slate-950 p-3"><span className="text-slate-400">Total dos itens</span><strong className="block text-slate-100">{brl(total)}</strong></div>
              <div className="rounded-lg bg-slate-950 p-3"><span className="text-slate-400">Pago no caixa</span><strong className="block text-slate-100">{list.paidAmount === null ? "Não informado" : brl(list.paidAmount)}</strong></div>
            </div>
            {list.budget !== null && total > list.budget && <p className="text-sm text-amber-400" role="status">O total dos itens ultrapassou o planejado em {brl(total - list.budget)}.</p>}
            {difference !== null && <p className="text-sm text-slate-300">Diferença no caixa: {difference < 0 ? `economia de ${brl(-difference)}` : difference > 0 ? `${brl(difference)} a mais` : "valor igual ao total dos itens"}. {missing > 0 && "Ainda há itens sem preço."}</p>}
            {open && <div className="space-y-4 border-t border-slate-800 pt-4">
              <label className="block max-w-xs text-sm text-slate-300">Orçamento (opcional)
                <input type="number" min="0" step="0.01" value={list.budget ?? ""}
                  onChange={(e) => update(list.id, (prev) => ({ ...prev, budget: moneyInput(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-100" />
              </label>
              <ul className="space-y-2">
                {list.items.map((item) => <li key={item.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 p-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300" title="Marcar como colocado no carrinho">
                    <input type="checkbox" checked={item.checked} onChange={(e) => update(list.id, (prev) => ({ ...prev, items: prev.items.map((it) => it.id === item.id ? { ...it, checked: e.target.checked } : it) }))} />
                    No carrinho
                  </label>
                  <label className="flex-1 min-w-36 text-xs text-slate-400">Item
                    <input aria-label="Nome do item" maxLength={150} value={item.name} onChange={(e) => update(list.id, (prev) => ({ ...prev, items: prev.items.map((it) => it.id === item.id ? { ...it, name: e.target.value } : it) }))}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100" />
                  </label>
                  <label className="w-20 text-xs text-slate-400">Qtd.
                    <input aria-label={`Quantidade de ${item.name}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => update(list.id, (prev) => ({ ...prev, items: prev.items.map((it) => it.id === item.id ? { ...it, quantity: Number(e.target.value) } : it) }))}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100" />
                  </label>
                  <label className="w-28 text-xs text-slate-400">Preço unitário
                    <input aria-label={`Preço de ${item.name}`} type="number" min="0" step="0.01" value={item.unitPrice ?? ""} onChange={(e) => update(list.id, (prev) => ({ ...prev, items: prev.items.map((it) => it.id === item.id ? { ...it, unitPrice: moneyInput(e.target.value) } : it) }))}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100" />
                  </label>
                  <span className="w-28 pb-2 text-sm text-slate-300">{item.unitPrice === null ? "Sem preço" : brl(roundMoney(item.quantity * item.unitPrice))}</span>
                  <button type="button" aria-label={`Remover ${item.name}`} onClick={() => update(list.id, (prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== item.id) }))} className="pb-2 text-sm text-rose-400">Remover</button>
                </li>)}
              </ul>
              {missing > 0 && <p className="text-xs text-amber-400">{missing} item(ns) sem preço não entram no total.</p>}
              <form className="flex flex-wrap gap-2" onSubmit={(e) => {
                e.preventDefault();
                const name = newItems[list.id]?.trim();
                if (!name) return;
                update(list.id, (prev) => ({ ...prev, items: [...prev.items, { id: generateId("item"), name, quantity: 1, unitPrice: null, checked: false }] }));
                setNewItems((prev) => ({ ...prev, [list.id]: "" }));
              }}>
                <input required maxLength={150} aria-label="Novo item" placeholder="Adicionar item" value={newItems[list.id] ?? ""} onChange={(e) => setNewItems((prev) => ({ ...prev, [list.id]: e.target.value }))}
                  className="min-w-44 flex-1 rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-100" />
                <button type="submit" className="rounded-lg border border-cyan-600 px-3 py-2 text-cyan-400">Adicionar item</button>
              </form>
              <div className="flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4">
                <label className="text-sm text-slate-300">Valor pago no caixa (opcional)
                  <input type="number" min="0" step="0.01" value={list.paidAmount ?? ""} disabled={!!list.recordedTransactionId}
                    onChange={(e) => update(list.id, (prev) => ({ ...prev, paidAmount: moneyInput(e.target.value), completedAt: e.target.value === "" ? null : prev.completedAt ?? toLocalISODate() }))}
                    className="mt-1 block w-44 rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-100 disabled:opacity-50" />
                </label>
                {list.paidAmount !== null && !list.recordedTransactionId && <>
                  <label className="text-sm text-slate-300">Categoria da despesa
                    <select value={categories[list.id] ?? "Alimentação"} onChange={(e) => setCategories((prev) => ({ ...prev, [list.id]: e.target.value }))}
                      className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-100">
                      <CategoryOptions type="expense" />
                    </select>
                  </label>
                  <button type="button" onClick={() => onRecord(list, categories[list.id] ?? "Alimentação")}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white">Lançar despesa no extrato</button>
                </>}
                {list.recordedTransactionId && <p className="text-sm text-emerald-400">Despesa lançada no extrato. Ajustes posteriores devem ser feitos na transação.</p>}
              </div>
            </div>}
          </article>
        );
      })}
    </section>
  );
}
