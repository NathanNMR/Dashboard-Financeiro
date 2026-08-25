"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CategoryDef, CreditCard, Recurrence, Transaction } from "@/lib/types";
import { getSubcategories, getTopLevelCategoriesByType } from "@/lib/categories";
import { FieldWrapper, TextInput, SelectInput } from "./FormField";
import { parseMoneyInput } from "@/lib/money";
import { toLocalISODate } from "@/lib/finance";

interface TransactionFormProps {
  editingTransaction: Transaction | null;
  onSave: (data: Omit<Transaction, "id">, recurrence: Recurrence, installments?: number) => void;
  onCancelEdit: () => void;
  customCategories: CategoryDef[];
  cards: CreditCard[];
}

const todayISO = () => toLocalISODate();

export function TransactionForm({ editingTransaction, onSave, onCancelEdit, customCategories, cards }: TransactionFormProps) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("Alimentação");
  const [subcategory, setSubcategory] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [cardId, setCardId] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState("2");
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = useMemo(() => getTopLevelCategoriesByType(customCategories, "expense"), [customCategories]);
  const incomeCategories = useMemo(() => getTopLevelCategoriesByType(customCategories, "income"), [customCategories]);
  const subcategoryOptions = useMemo(() => getSubcategories(customCategories, category), [customCategories, category]);

  // BUG CORRIGIDO: o seletor "Repetir" ficava sempre travado durante a edição,
  // mesmo quando a transação editada era avulsa (sem série). Agora só fica
  // travado quando a transação já pertence a uma série existente, caso em que
  // alterar a recorrência aqui seria ambíguo (edita 1 ocorrência ou a série toda?).
  const belongsToExistingSeries = !!editingTransaction?.recurrenceGroupId;
  const belongsToInstallmentGroup = !!editingTransaction?.installmentGroupId;

  const resetForm = () => {
    setDesc("");
    setAmount("");
    setDate(todayISO());
    setType("expense");
    setCategory("Alimentação");
    setSubcategory("");
    setRecurrence("none");
    setCardId("");
    setIsInstallment(false);
    setInstallments("2");
    setError(null);
  };

  useEffect(() => {
    if (editingTransaction) {
      setDesc(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setSubcategory(editingTransaction.subcategory ?? "");
      setRecurrence(editingTransaction.recurrenceGroupId ? editingTransaction.recurrence ?? "none" : "none");
      setCardId(editingTransaction.cardId ?? "");
      setIsInstallment(false);
      setError(null);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTransaction]);

  // BUG CORRIGIDO: categorias de receita (ex: "Salário") continuavam
  // selecionáveis/visíveis mesmo depois de trocar o tipo para "Despesa", e
  // vice-versa. Agora a lista de categorias é filtrada pelo tipo, e se a
  // categoria atual deixar de ser válida, ela é trocada automaticamente.
  useEffect(() => {
    const validList = type === "income" ? incomeCategories : expenseCategories;
    if (!validList.includes(category)) {
      setCategory(validList[0] ?? "Outros");
    }
    if (type === "income") {
      setCardId("");
      setIsInstallment(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    setSubcategory("");
  }, [category]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    if (!desc.trim() || !amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Informe uma descrição e um valor maior que zero.");
      return;
    }
    const installmentCount = Number(installments);
    if (isInstallment && (!Number.isInteger(installmentCount) || installmentCount < 2)) {
      setError("Informe um número de parcelas válido (mínimo 2).");
      return;
    }
    setError(null);
    onSave(
      {
        description: desc.trim(),
        amount: parsedAmount,
        date,
        type,
        category,
        subcategory: subcategory || undefined,
        cardId: cardId || undefined,
      },
      recurrence,
      isInstallment ? installmentCount : undefined
    );
    resetForm();
  };

  return (
    <div
      className={`bg-slate-900 border rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20 transition ${
        editingTransaction ? "border-amber-500/50" : "border-slate-800"
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-200">
          {editingTransaction ? "Editar Transação" : "Adicionar Nova Transação Manual"}
        </h3>
        {editingTransaction && (
          <button
            onClick={() => {
              resetForm();
              onCancelEdit();
            }}
            className="text-xs text-amber-400 hover:underline"
          >
            Cancelar Edição
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWrapper label="Descrição" htmlFor="tx-desc">
            <TextInput
              id="tx-desc"
              type="text"
              placeholder="Ex: Supermercado"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </FieldWrapper>
          <FieldWrapper label="Valor (R$)" htmlFor="tx-amount">
            <TextInput
              id="tx-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </FieldWrapper>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FieldWrapper label="Data" htmlFor="tx-date">
            <TextInput id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldWrapper>
          <FieldWrapper label="Tipo" htmlFor="tx-type">
            <SelectInput id="tx-type" value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </SelectInput>
          </FieldWrapper>
          <FieldWrapper label="Categoria" htmlFor="tx-category">
            <SelectInput id="tx-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {(type === "income" ? incomeCategories : expenseCategories).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </FieldWrapper>
          <FieldWrapper label="Repetir" htmlFor="tx-recurrence">
            <SelectInput
              id="tx-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
              disabled={belongsToExistingSeries || isInstallment}
              title={belongsToExistingSeries ? "Esta transação já pertence a uma série recorrente" : undefined}
            >
              <option value="none">Não repetir</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </SelectInput>
          </FieldWrapper>
        </div>

        {subcategoryOptions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FieldWrapper label="Subcategoria (opcional)" htmlFor="tx-subcategory" className="md:col-span-2">
              <SelectInput id="tx-subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                <option value="">— Nenhuma —</option>
                {subcategoryOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </FieldWrapper>
          </div>
        )}

        {type === "expense" && cards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <FieldWrapper label="Cartão (opcional)" htmlFor="tx-card">
              <SelectInput id="tx-card" value={cardId} onChange={(e) => setCardId(e.target.value)}>
                <option value="">— Nenhum / dinheiro —</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    💳 {c.name}
                  </option>
                ))}
              </SelectInput>
            </FieldWrapper>
            {cardId && !belongsToInstallmentGroup && (
              <>
                <label className="flex items-center gap-2 text-xs text-slate-400 pb-2.5">
                  <input
                    type="checkbox"
                    checked={isInstallment}
                    onChange={(e) => setIsInstallment(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  Compra parcelada
                </label>
                {isInstallment && (
                  <FieldWrapper label="Número de parcelas" htmlFor="tx-installments">
                    <TextInput
                      id="tx-installments"
                      type="number"
                      min="2"
                      max="48"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                    />
                  </FieldWrapper>
                )}
              </>
            )}
          </div>
        )}

        {isInstallment && Number(installments) >= 2 && amount && !isNaN(parseMoneyInput(amount)) && (
          <p className="text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 rounded-lg px-3 py-2">
            Serão criadas {installments}x de aproximadamente{" "}
            {(parseMoneyInput(amount) / Number(installments)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} a
            partir de {new Date(date + "T00:00:00").toLocaleDateString("pt-BR")}.
          </p>
        )}

        {belongsToExistingSeries && (
          <p className="text-xs text-slate-500">
            Esta transação já faz parte de uma série recorrente. Para mudar a recorrência, exclua a série no extrato e
            cadastre novamente.
          </p>
        )}
        {recurrence !== "none" && !belongsToExistingSeries && !isInstallment && (
          <p className="text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-900/40 rounded-lg px-3 py-2">
            {editingTransaction
              ? "Ao salvar, esta transação avulsa vira o início de uma nova série recorrente."
              : recurrence === "monthly"
              ? "Serão criadas automaticamente 12 ocorrências mensais a partir desta data."
              : "Serão criadas automaticamente 5 ocorrências anuais a partir desta data."}
          </p>
        )}
        {error && <p className="text-rose-400 text-xs">{error}</p>}
        <button
          type="submit"
          className={`w-full text-white font-medium py-2.5 rounded-lg transition text-sm ${
            editingTransaction ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {editingTransaction ? "Atualizar Transação" : "Salvar Transação"}
        </button>
      </form>
    </div>
  );
}
