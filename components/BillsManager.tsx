"use client";

import { FormEvent, useState } from "react";
import { Bill } from "@/lib/types";
import { calculateBillCurrentAmount, formatCurrency } from "@/lib/finance";
import { TextInput, SelectInput } from "./FormField";
import { CategoryOptions } from "./CategoryOptions";

interface BillsManagerProps {
  bills: Bill[];
  onAddBill: (bill: Omit<Bill, "id" | "isPaid">) => void;
  onSettleBill: (bill: Bill) => void;
  onDeleteBill: (bill: Bill) => void;
}

export function BillsManager({ bills, onAddBill, onSettleBill, onDeleteBill }: BillsManagerProps) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [interest, setInterest] = useState("0.33");
  const [penalty, setPenalty] = useState("2.0");
  const [category, setCategory] = useState("Moradia");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!desc.trim() || !amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Informe uma descrição e um valor maior que zero.");
      return;
    }
    setError(null);
    onAddBill({
      description: desc.trim(),
      dueDate,
      originalAmount: parsedAmount,
      dailyInterestRate: parseFloat(interest) || 0,
      penaltyRate: parseFloat(penalty) || 0,
      category,
      type,
    });
    setDesc("");
    setAmount("");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Compromissos Financeiros (Contas & Rendas)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Adicione despesas a pagar ou rendas a receber. Confirme a quitação para lançar automaticamente no extrato.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800"
      >
        <SelectInput
          aria-label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value as "expense" | "income")}
          className="text-xs"
        >
          <option value="expense">Despesa (Pagar)</option>
          <option value="income">Renda (Receber)</option>
        </SelectInput>
        <TextInput
          aria-label="Descrição"
          type="text"
          placeholder="Descrição (ex: Salário Extra)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="text-xs lg:col-span-2"
          required
        />
        <TextInput
          aria-label="Valor"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Valor (R$)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-xs"
          required
        />
        <TextInput
          aria-label="Vencimento"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-xs"
          required
        />
        <TextInput
          aria-label="Juros ao dia"
          type="number"
          step="0.01"
          min="0"
          placeholder="Juros/dia %"
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          className="text-xs"
        />
        <SelectInput aria-label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs">
          <CategoryOptions />
        </SelectInput>
        <button
          type="submit"
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 px-3 rounded-lg text-xs transition shadow"
        >
          + Adicionar
        </button>
        {error && <p className="text-rose-400 text-xs md:col-span-3 lg:col-span-8">{error}</p>}
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs">
              <th className="py-2.5 px-3">Tipo</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Descrição</th>
              <th className="py-2.5 px-3">Vencimento</th>
              <th className="py-2.5 px-3">Valor Previsto</th>
              <th className="py-2.5 px-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {bills.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  Nenhuma conta cadastrada.
                </td>
              </tr>
            ) : (
              bills.map((bill) => {
                const currentVal = calculateBillCurrentAmount(bill);
                const isLate = !bill.isPaid && bill.type === "expense" && currentVal > bill.originalAmount;

                return (
                  <tr key={bill.id} className="hover:bg-slate-800/30 transition text-xs">
                    <td className="py-3 px-3">
                      {bill.type === "income" ? (
                        <span className="text-emerald-400 font-bold">RENDA</span>
                      ) : (
                        <span className="text-rose-400 font-bold">DESPESA</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {bill.isPaid ? (
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          CONCLUÍDO
                        </span>
                      ) : isLate ? (
                        <span className="bg-rose-950 text-rose-400 border border-rose-800/60 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                          EM ATRASO
                        </span>
                      ) : (
                        <span className="bg-amber-950 text-amber-400 border border-amber-800/60 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          PENDENTE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-200">{bill.description}</td>
                    <td className="py-3 px-3 text-slate-400">{bill.dueDate}</td>
                    <td
                      className={`py-3 px-3 font-semibold ${
                        bill.type === "income" ? "text-emerald-400" : isLate ? "text-rose-400" : "text-slate-200"
                      }`}
                    >
                      {formatCurrency(currentVal)}
                    </td>
                    <td className="py-3 px-3 text-center space-x-2 whitespace-nowrap">
                      {!bill.isPaid && (
                        <button
                          onClick={() => onSettleBill(bill)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium px-3 py-1 rounded-lg transition shadow"
                        >
                          {bill.type === "income" ? "Confirmar Recebimento" : "Confirmar Pagamento"}
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteBill(bill)}
                        className="text-slate-500 hover:text-rose-400 text-xs transition"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
