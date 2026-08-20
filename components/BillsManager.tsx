"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bill } from "@/lib/types";
import { CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { calculateBillCurrentAmount, currentMonthKey, formatCurrency, formatMonthLabel } from "@/lib/finance";
import { TextInput, SelectInput } from "./FormField";
import { CategoryOptions } from "./CategoryOptions";
import { MonthSwitcher } from "./MonthSwitcher";

interface BillsManagerProps {
  bills: Bill[];
  onAddBill: (bill: Omit<Bill, "id" | "isPaid">) => void;
  onSettleBill: (bill: Bill) => void;
  onDeleteBill: (bill: Bill) => void;
}

const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => !(INCOME_CATEGORIES as readonly string[]).includes(c));

function billStatus(bill: Bill, isLate: boolean) {
  if (bill.isPaid)
    return (
      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] px-2 py-0.5 rounded-full font-medium">
        Concluído
      </span>
    );
  if (isLate)
    return (
      <span className="bg-rose-950 text-rose-400 border border-rose-800/60 text-[10px] px-2 py-0.5 rounded-full font-medium">
        Em atraso
      </span>
    );
  return (
    <span className="bg-amber-950 text-amber-400 border border-amber-800/60 text-[10px] px-2 py-0.5 rounded-full font-medium">
      Pendente
    </span>
  );
}

export function BillsManager({ bills, onAddBill, onSettleBill, onDeleteBill }: BillsManagerProps) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [interest, setInterest] = useState("0.33");
  const [penalty, setPenalty] = useState("2.0");
  const [category, setCategory] = useState("Moradia");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [isRecurringMonthly, setIsRecurringMonthly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BUG CORRIGIDO: categorias de receita (ex: "Salário") apareciam mesmo ao
  // cadastrar uma despesa. Agora a lista muda com o tipo, e a categoria
  // selecionada é corrigida automaticamente se deixar de ser válida.
  useEffect(() => {
    const validList = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!(validList as readonly string[]).includes(category)) {
      setCategory(validList[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

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
      isRecurringMonthly,
    });
    setDesc("");
    setAmount("");
    setIsRecurringMonthly(false);
  };

  // Meses com pelo menos uma conta cadastrada, em ordem cronológica
  const monthKeys = useMemo(() => Array.from(new Set(bills.map((b) => b.dueDate.substring(0, 7)))).sort(), [bills]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => monthKeys.includes(currentMonthKey()) ? currentMonthKey() : monthKeys[0] ?? currentMonthKey());

  const effectiveMonth = monthKeys.includes(selectedMonth) ? selectedMonth : monthKeys[0];

  const monthBills = useMemo(
    () => bills.filter((b) => b.dueDate.substring(0, 7) === effectiveMonth).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [bills, effectiveMonth]
  );

  const monthExpense = monthBills.filter((b) => b.type === "expense").reduce((s, b) => s + calculateBillCurrentAmount(b), 0);
  const monthIncome = monthBills.filter((b) => b.type === "income").reduce((s, b) => s + calculateBillCurrentAmount(b), 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20 space-y-6">
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-slate-100">Compromissos Financeiros</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Contas a pagar e rendas a receber, um mês por vez. Confirme a quitação para lançar no extrato.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800"
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
          className="text-xs sm:col-span-2 lg:col-span-2"
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
          <CategoryOptions type={type} />
        </SelectInput>
        <button
          type="submit"
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 sm:py-2 px-3 rounded-lg text-xs transition"
        >
          Adicionar
        </button>

        <label className="flex items-center gap-2 text-xs text-slate-400 sm:col-span-2 lg:col-span-8 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurringMonthly}
            onChange={(e) => setIsRecurringMonthly(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-cyan-500"
          />
          Repetir mensalmente — gera automaticamente a conta do mês seguinte ao quitar esta
        </label>

        {error && <p className="text-rose-400 text-xs sm:col-span-2 lg:col-span-8">{error}</p>}
      </form>

      {bills.length === 0 ? (
        <p className="py-6 text-center text-slate-500 text-sm">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <MonthSwitcher months={monthKeys} value={effectiveMonth} onChange={setSelectedMonth} allowAll={false} className="sm:w-72" />
            <span className="text-xs text-slate-500">
              {monthIncome > 0 && <span className="text-emerald-500">+{formatCurrency(monthIncome)}</span>}
              {monthIncome > 0 && monthExpense > 0 && <span className="mx-1.5">·</span>}
              {monthExpense > 0 && <span className="text-rose-500">-{formatCurrency(monthExpense)}</span>}
            </span>
          </div>

          {monthBills.length === 0 ? (
            <p className="py-6 text-center text-slate-500 text-sm">Nenhuma conta em {formatMonthLabel(effectiveMonth)}.</p>
          ) : (
            <>
              {/* Mobile: cards empilhados */}
              <ul className="md:hidden space-y-2">
                {monthBills.map((bill) => {
                  const currentVal = calculateBillCurrentAmount(bill);
                  const isLate = !bill.isPaid && bill.type === "expense" && currentVal > bill.originalAmount;
                  return (
                    <li key={bill.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[11px] font-semibold ${bill.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                              {bill.type === "income" ? "Renda" : "Despesa"}
                            </span>
                            {bill.isRecurringMonthly && (
                              <span className="text-[10px] font-medium bg-purple-950 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded-full">
                                Mensal
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-200 text-sm truncate">{bill.description}</p>
                          <p className="text-xs text-slate-500">Vence em {bill.dueDate}</p>
                        </div>
                        {billStatus(bill, isLate)}
                      </div>
                      <div
                        className={`text-lg font-semibold ${
                          bill.type === "income" ? "text-emerald-400" : isLate ? "text-rose-400" : "text-slate-100"
                        }`}
                      >
                        {formatCurrency(currentVal)}
                      </div>
                      <div className="flex gap-2 pt-1">
                        {!bill.isPaid && (
                          <button
                            onClick={() => onSettleBill(bill)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2 rounded-lg transition"
                          >
                            {bill.type === "income" ? "Confirmar Recebimento" : "Confirmar Pagamento"}
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteBill(bill)}
                          className="px-3 text-slate-500 hover:text-rose-400 text-xs border border-slate-800 rounded-lg transition"
                        >
                          Excluir
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Desktop / tablet: tabela tradicional */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs">
                      <th className="py-2.5 px-3 font-medium">Tipo</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                      <th className="py-2.5 px-3 font-medium">Descrição</th>
                      <th className="py-2.5 px-3 font-medium">Vencimento</th>
                      <th className="py-2.5 px-3 font-medium">Valor Previsto</th>
                      <th className="py-2.5 px-3 font-medium text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {monthBills.map((bill) => {
                      const currentVal = calculateBillCurrentAmount(bill);
                      const isLate = !bill.isPaid && bill.type === "expense" && currentVal > bill.originalAmount;

                      return (
                        <tr key={bill.id} className="hover:bg-slate-800/30 transition text-xs">
                          <td className="py-3 px-3">
                            <span className={`font-medium ${bill.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                              {bill.type === "income" ? "Renda" : "Despesa"}
                            </span>
                          </td>
                          <td className="py-3 px-3">{billStatus(bill, isLate)}</td>
                          <td className="py-3 px-3 font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>{bill.description}</span>
                              {bill.isRecurringMonthly && (
                                <span className="text-[10px] font-medium bg-purple-950 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  Mensal
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{bill.dueDate}</td>
                          <td
                            className={`py-3 px-3 font-semibold whitespace-nowrap ${
                              bill.type === "income" ? "text-emerald-400" : isLate ? "text-rose-400" : "text-slate-200"
                            }`}
                          >
                            {formatCurrency(currentVal)}
                          </td>
                          <td className="py-3 px-3 text-center space-x-2 whitespace-nowrap">
                            {!bill.isPaid && (
                              <button
                                onClick={() => onSettleBill(bill)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium px-3 py-1 rounded-lg transition"
                              >
                                {bill.type === "income" ? "Confirmar Recebimento" : "Confirmar Pagamento"}
                              </button>
                            )}
                            <button onClick={() => onDeleteBill(bill)} className="text-slate-500 hover:text-rose-400 text-xs transition">
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
