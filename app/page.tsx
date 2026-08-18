"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bill, Budget, Recurrence, Transaction } from "@/lib/types";
import { initialBills, initialBudgets, initialTransactions, STORAGE_KEYS } from "@/lib/constants";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  calculateBillCurrentAmount,
  calculateLinearRegression,
  categorizeTransaction,
  generateId,
  generateRecurringOccurrences,
  parseCsvLine,
} from "@/lib/finance";
import { downloadDataUrl, renderDashboardImage } from "@/lib/imageExport";
import { ToastProvider, useToast } from "@/components/Toast";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SummaryCards } from "@/components/SummaryCards";
import { BillsManager } from "@/components/BillsManager";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionsTable } from "@/components/TransactionsTable";
import { CashFlowChart, ExpenseByCategoryChart, ExpenseProjectionChart } from "@/components/Charts";
import { BudgetGoals } from "@/components/BudgetGoals";
import { UpcomingDueAlert } from "@/components/UpcomingDueAlert";

function Dashboard() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const [transactions, setTransactions, txHydrated] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.transactions,
    initialTransactions
  );
  const [bills, setBills, billsHydrated] = useLocalStorage<Bill[]>(STORAGE_KEYS.bills, initialBills);
  const [budgets] = useLocalStorage<Budget>(STORAGE_KEYS.budgets, initialBudgets);

  const [filterCategory, setFilterCategory] = useState("All");
  const [filterSearch, setFilterSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const editingTransaction = useMemo(
    () => transactions.find((t) => t.id === editingId) ?? null,
    [transactions, editingId]
  );

  // BUG CORRIGIDO: o formulário de edição fica acima do extrato na página.
  // Antes, clicar em "Editar" preenchia o formulário mas ele ficava fora da
  // área visível, dando a impressão de que o botão não fazia nada.
  useEffect(() => {
    if (editingId) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editingId]);

  // --- Transações ---
  const handleSaveTransaction = (data: Omit<Transaction, "id">, recurrence: Recurrence) => {
    if (editingId) {
      setTransactions((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...data } : t)));
      setEditingId(null);
      notify("Transação atualizada com sucesso.", "success");
      return;
    }

    if (recurrence !== "none") {
      const occurrences = generateRecurringOccurrences(data, recurrence);
      const newTransactions = occurrences.map((occ) => ({ id: generateId("recur"), ...occ }));
      setTransactions((prev) => [...newTransactions, ...prev]);
      notify(`${newTransactions.length} ocorrências ${recurrence === "monthly" ? "mensais" : "anuais"} adicionadas.`, "success");
    } else {
      setTransactions((prev) => [{ id: generateId("manual"), ...data }, ...prev]);
      notify("Transação adicionada.", "success");
    }
  };

  const handleDeleteTransaction = async (t: Transaction, scope: "single" | "series") => {
    const isSeries = scope === "series" && !!t.recurrenceGroupId;
    const ok = await confirm({
      title: isSeries ? "Excluir série recorrente?" : "Excluir transação?",
      description: isSeries
        ? `Todas as ocorrências de "${t.description}" (passadas e futuras) serão removidas permanentemente.`
        : `"${t.description}" será removida permanentemente do extrato.`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;

    if (isSeries) {
      setTransactions((prev) => prev.filter((tx) => tx.recurrenceGroupId !== t.recurrenceGroupId));
      notify("Série recorrente excluída.", "info");
    } else {
      setTransactions((prev) => prev.filter((tx) => tx.id !== t.id));
      notify("Transação excluída.", "info");
    }
    if (editingId === t.id) setEditingId(null);
  };

  // --- Contas / Compromissos ---
  const handleAddBill = (data: Omit<Bill, "id" | "isPaid">) => {
    setBills((prev) => [{ id: generateId("bill"), isPaid: false, ...data }, ...prev]);
    notify("Compromisso adicionado.", "success");
  };

  const handleSettleBill = (bill: Bill) => {
    const finalAmount = calculateBillCurrentAmount(bill);
    const todayStr = new Date().toISOString().substring(0, 10);

    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? { ...b, isPaid: true, paidDate: todayStr, paidAmount: finalAmount } : b))
    );

    const prefix = bill.type === "income" ? "[RECEBIDO]" : "[PAGO]";
    setTransactions((prev) => [
      {
        id: generateId("bill-settle"),
        date: todayStr,
        description: `${prefix} ${bill.description}`,
        amount: finalAmount,
        category: bill.category,
        type: bill.type,
      },
      ...prev,
    ]);
    notify(
      bill.type === "income" ? "Recebimento confirmado e lançado no extrato." : "Pagamento confirmado e lançado no extrato.",
      "success"
    );
  };

  const handleDeleteBill = async (bill: Bill) => {
    const ok = await confirm({
      title: "Excluir compromisso?",
      description: `"${bill.description}" será removido da lista de contas.`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    setBills((prev) => prev.filter((b) => b.id !== bill.id));
    notify("Compromisso excluído.", "info");
  };

  // --- Importação / Exportação CSV (agora com parsing e escaping corretos, RFC 4180) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const imported: Transaction[] = [];

      lines.forEach((line, idx) => {
        const parts = parseCsvLine(line);
        if (parts.length < 3) return;

        const date = parts[0];
        const description = parts[1];
        const amount = parseFloat(parts[2]);
        const type = (parts[3]?.toLowerCase() === "income" ? "income" : "expense") as "income" | "expense";

        if (!isNaN(amount) && /^\d{4}-\d{2}-\d{2}$/.test(date) && description) {
          imported.push({
            id: generateId(`csv-${idx}`),
            date,
            description,
            amount,
            category: categorizeTransaction(description),
            type,
          });
        }
      });

      if (imported.length > 0) {
        setTransactions((prev) => [...imported, ...prev]);
        notify(`${imported.length} transações importadas com sucesso via CSV.`, "success");
      } else {
        notify("Não foi possível ler as linhas. Formato esperado: AAAA-MM-DD, Descrição, Valor, [expense/income]", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // permite reimportar o mesmo arquivo depois
  };

  const handleExportImage = () => {
    const now = new Date();
    const periodLabel = `Relatório gerado em ${now.toLocaleDateString("pt-BR")} · ${transactions.length} transações`;
    const dataUrl = renderDashboardImage({
      totalIncome,
      totalExpense,
      balance,
      categoryBreakdown: categoryPieData,
      periodLabel,
    });
    downloadDataUrl(dataUrl, `relatorio_financeiro_${now.toISOString().substring(0, 10)}.png`);
    notify("Imagem do relatório exportada.", "success");
  };

  // --- Derivações ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesCategory = filterCategory === "All" || t.category === filterCategory;
      const matchesSearch = t.description.toLowerCase().includes(filterSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [transactions, filterCategory, filterSearch]);

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => (t.type === "income" ? (income += t.amount) : (expense += t.amount)));
    return { totalIncome: income, totalExpense: expense, balance: income - expense };
  }, [transactions]);

  // Uma única fonte de verdade para "gasto por categoria" (antes era calculado 2x separadamente)
  const expensesByCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      });
    return acc;
  }, [transactions]);

  const categoryPieData = useMemo(
    () => Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })),
    [expensesByCategory]
  );

  const topCategory = useMemo(() => {
    if (categoryPieData.length === 0) return null;
    return categoryPieData.reduce((max, curr) => (curr.value > max.value ? curr : max));
  }, [categoryPieData]);

  const monthlyData = useMemo(() => {
    const acc: Record<string, { month: string; income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const monthKey = t.date.substring(0, 7);
      if (!acc[monthKey]) acc[monthKey] = { month: monthKey, income: 0, expense: 0 };
      if (t.type === "income") acc[monthKey].income += t.amount;
      else acc[monthKey].expense += t.amount;
    });
    return Object.values(acc).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const projectedData = useMemo(() => {
    if (monthlyData.length < 2) return monthlyData.map((d) => ({ ...d, projectedExpense: null }));
    const expensePoints = monthlyData.map((item, index) => ({ x: index + 1, y: item.expense }));
    const regression = calculateLinearRegression(expensePoints);
    const result = monthlyData.map((d) => ({ ...d, projectedExpense: null as number | null }));

    for (let i = 1; i <= 2; i++) {
      const nextX = monthlyData.length + i;
      const predictedVal = Math.max(0, regression.predict(nextX));
      const lastMonthDate = new Date(monthlyData[monthlyData.length - 1].month + "-01");
      lastMonthDate.setMonth(lastMonthDate.getMonth() + i);
      const futureMonthKey = lastMonthDate.toISOString().substring(0, 7);

      result.push({
        month: futureMonthKey,
        income: 0,
        expense: 0,
        projectedExpense: Number(predictedVal.toFixed(2)),
      });
    }
    return result;
  }, [monthlyData]);

  if (!txHydrated || !billsHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader onImportCSV={handleFileUpload} onExportImage={handleExportImage} />

        <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} topCategory={topCategory} />

        <UpcomingDueAlert bills={bills} />

        <BillsManager bills={bills} onAddBill={handleAddBill} onSettleBill={handleSettleBill} onDeleteBill={handleDeleteBill} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CashFlowChart data={monthlyData} />
          <ExpenseProjectionChart data={projectedData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ExpenseByCategoryChart data={categoryPieData} />
          <BudgetGoals budgets={budgets} spentByCategory={expensesByCategory} />
        </div>

        <div ref={formRef} className="scroll-mt-6">
          <TransactionForm
            editingTransaction={editingTransaction}
            onSave={handleSaveTransaction}
            onCancelEdit={() => setEditingId(null)}
          />
        </div>

        <TransactionsTable
          transactions={filteredTransactions}
          filterCategory={filterCategory}
          filterSearch={filterSearch}
          onFilterCategoryChange={setFilterCategory}
          onFilterSearchChange={setFilterSearch}
          onEdit={(t) => setEditingId(t.id)}
          onDelete={handleDeleteTransaction}
        />
      </div>
      {dialog}
    </div>
  );
}

export default function FinancialDashboard() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}
