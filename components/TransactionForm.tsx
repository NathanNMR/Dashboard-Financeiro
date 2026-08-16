"use client";

import { FormEvent, useEffect, useState } from "react";
import { Transaction } from "@/lib/types";
import { FieldWrapper, TextInput, SelectInput } from "./FormField";
import { CategoryOptions } from "./CategoryOptions";

interface TransactionFormProps {
  editingTransaction: Transaction | null;
  onSave: (data: Omit<Transaction, "id">) => void;
  onCancelEdit: () => void;
}

const todayISO = () => new Date().toISOString().substring(0, 10);

export function TransactionForm({ editingTransaction, onSave, onCancelEdit }: TransactionFormProps) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("Alimentação");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTransaction) {
      setDesc(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setError(null);
    }
  }, [editingTransaction]);

  const resetForm = () => {
    setDesc("");
    setAmount("");
    setCategory("Alimentação");
    setError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!desc.trim() || !amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Informe uma descrição e um valor maior que zero.");
      return;
    }
    setError(null);
    onSave({ description: desc.trim(), amount: parsedAmount, date, type, category });
    resetForm();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <CategoryOptions />
            </SelectInput>
          </FieldWrapper>
        </div>
        {error && <p className="text-rose-400 text-xs">{error}</p>}
        <button
          type="submit"
          className={`w-full text-white font-medium py-2.5 rounded-xl transition shadow-lg text-sm ${
            editingTransaction
              ? "bg-amber-600 hover:bg-amber-500 shadow-amber-950/30"
              : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/30"
          }`}
        >
          {editingTransaction ? "Atualizar Transação" : "Salvar Transação"}
        </button>
      </form>
    </div>
  );
}
