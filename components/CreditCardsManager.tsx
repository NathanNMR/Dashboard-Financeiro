"use client";

import { FormEvent, useMemo, useState } from "react";
import { CreditCard, Transaction } from "@/lib/types";
import { calculateCardUsage, formatCurrency, formatMonthLabel, generateId } from "@/lib/finance";
import { parseMoneyInput } from "@/lib/money";
import { FieldWrapper, TextInput } from "./FormField";
import { EmptyState } from "./EmptyState";

interface CreditCardsManagerProps {
  cards: CreditCard[];
  transactions: Transaction[];
  onAddCard: (card: CreditCard) => void;
  onRemoveCard: (id: string) => void;
}

const CARD_COLORS = ["#a855f7", "#f97316", "#0ea5e9", "#22c55e", "#ec4899", "#eab308"];

function ProgressBar({ percentage, danger }: { percentage: number; danger: boolean }) {
  return (
    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
      <div
        className={`h-full transition-all ${danger ? "bg-rose-500" : "bg-cyan-500"}`}
        style={{ width: `${Math.min(100, percentage)}%` }}
      />
    </div>
  );
}

export function CreditCardsManager({ cards, transactions, onAddCard, onRemoveCard }: CreditCardsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("25");
  const [dueDay, setDueDay] = useState("10");
  const [error, setError] = useState<string | null>(null);

  const usages = useMemo(() => cards.map((c) => calculateCardUsage(c, transactions)), [cards, transactions]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedLimit = parseMoneyInput(limit);
    const closing = Number(closingDay);
    const due = Number(dueDay);

    if (!name.trim() || !Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      setError("Informe um nome e um limite maior que zero.");
      return;
    }
    if (!(closing >= 1 && closing <= 31) || !(due >= 1 && due <= 31)) {
      setError("Dias de fechamento e vencimento devem estar entre 1 e 31.");
      return;
    }

    onAddCard({
      id: generateId("card"),
      name: name.trim(),
      limit: parsedLimit,
      closingDay: closing,
      dueDay: due,
      color: CARD_COLORS[cards.length % CARD_COLORS.length],
    });

    setName("");
    setLimit("");
    setClosingDay("25");
    setDueDay("10");
    setError(null);
    setShowForm(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">💳 Cartões de Crédito</h3>
          <p className="text-xs text-slate-500">Limite, fatura atual e próximas faturas de cada cartão.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
        >
          {showForm ? "Cancelar" : "+ Novo cartão"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 mb-5 bg-slate-950/50 border border-slate-800 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label="Nome do cartão" htmlFor="card-name">
              <TextInput id="card-name" placeholder="Ex: Nubank" value={name} onChange={(e) => setName(e.target.value)} />
            </FieldWrapper>
            <FieldWrapper label="Limite (R$)" htmlFor="card-limit">
              <TextInput id="card-limit" type="number" step="0.01" min="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} />
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Dia de fechamento" htmlFor="card-closing">
              <TextInput id="card-closing" type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
            </FieldWrapper>
            <FieldWrapper label="Dia de vencimento" htmlFor="card-due">
              <TextInput id="card-due" type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </FieldWrapper>
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-lg transition">
            Salvar cartão
          </button>
        </form>
      )}

      {cards.length === 0 ? (
        <EmptyState message="Nenhum cartão cadastrado ainda." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usages.map(({ card, used, available, currentInvoiceAmount, nextInvoices, dueDate }) => {
            const usagePct = card.limit > 0 ? Math.round((used / card.limit) * 100) : 0;
            return (
              <div key={card.id} className="border border-slate-800 rounded-xl p-4 bg-slate-950/40">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                    <span className="font-semibold text-slate-200">💳 {card.name}</span>
                  </div>
                  <button onClick={() => onRemoveCard(card.id)} className="text-xs text-rose-400 hover:underline">
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <div className="text-slate-500">Limite</div>
                    <div className="text-slate-200 font-medium">{formatCurrency(card.limit)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Utilizado</div>
                    <div className="text-amber-400 font-medium">{formatCurrency(used)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Disponível</div>
                    <div className="text-emerald-400 font-medium">{formatCurrency(available)}</div>
                  </div>
                </div>
                <ProgressBar percentage={usagePct} danger={usagePct >= 85} />

                <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-xs">
                  <div>
                    <div className="text-slate-500">Fatura atual</div>
                    <div className="text-slate-200 font-semibold">{formatCurrency(currentInvoiceAmount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500">Vencimento</div>
                    <div className="text-slate-200 font-semibold">{dueDate.split("-").reverse().join("/")}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="text-slate-500 text-xs mb-1">Próximas faturas</div>
                  <div className="space-y-1">
                    {nextInvoices.map((inv) => (
                      <div key={inv.month} className="flex justify-between text-xs">
                        <span className="text-slate-400">{formatMonthLabel(inv.month)}</span>
                        <span className="text-slate-300">{formatCurrency(inv.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
