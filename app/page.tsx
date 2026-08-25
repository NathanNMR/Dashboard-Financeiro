"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bill, Budget, CategoryDef, CreditCard, Goal, Recurrence, Transaction } from "@/lib/types";
import {
  initialBills,
  initialBudgets,
  initialCategories,
  initialCreditCards,
  initialGoals,
  initialTransactions,
  STORAGE_KEYS,
} from "@/lib/constants";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  addOneMonth,
  calculateBillCurrentAmount,
  calculateLinearRegression,
  categorizeTransaction,
  currentMonthKey,
  generateId,
  generateInstallments,
  generateRecurringOccurrences,
  toLocalISODate,
} from "@/lib/finance";
import { downloadDataUrl, renderDashboardImage } from "@/lib/imageExport";
import { importTransactionsCsv } from "@/lib/csv";
import { csvEscape } from "@/lib/finance";
import { roundMoney } from "@/lib/money";
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
import { SmartInsights } from "@/components/SmartInsights";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { CreditCardsManager } from "@/components/CreditCardsManager";
import { GoalsManager } from "@/components/GoalsManager";
import { CategoryManager } from "@/components/CategoryManager";
import { ReportsPage } from "@/components/ReportsPage";
import { FinancialHealth } from "@/components/FinancialHealth";
import { Section, SectionTabs } from "@/components/SectionTabs";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";

function Dashboard() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const [transactions, setTransactions, txHydrated] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.transactions,
    initialTransactions
  );
  const [bills, setBills, billsHydrated] = useLocalStorage<Bill[]>(STORAGE_KEYS.bills, initialBills);
  const [budgets] = useLocalStorage<Budget>(STORAGE_KEYS.budgets, initialBudgets);
  const [cards, setCards, cardsHydrated] = useLocalStorage<CreditCard[]>(STORAGE_KEYS.creditCards, initialCreditCards);
  const [goals, setGoals, goalsHydrated] = useLocalStorage<Goal[]>(STORAGE_KEYS.goals, initialGoals);
  const [customCategories, setCustomCategories, categoriesHydrated] = useLocalStorage<CategoryDef[]>(
    STORAGE_KEYS.categories,
    initialCategories
  );

  const [section, setSection] = useState<Section>("dashboard");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterSearch, setFilterSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [tutorialSeen, setTutorialSeen, tutorialHydrated] = useLocalStorage<boolean>(
    STORAGE_KEYS.tutorialSeen,
    false
  );
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Abre o tour guiado automaticamente na primeira visita (só depois de
  // confirmar via localStorage que o usuário ainda não viu o tutorial).
  useEffect(() => {
    if (tutorialHydrated && !tutorialSeen) {
      setTutorialOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialHydrated]);

  const handleCloseTutorial = () => {
    setTutorialOpen(false);
    setTutorialSeen(true);
  };

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
  const handleSaveTransaction = (data: Omit<Transaction, "id">, recurrence: Recurrence, installments?: number) => {
    // Compra parcelada: gera N transações futuras (uma por mês) já relacionadas
    // pelo mesmo installmentGroupId, cada uma com seu número de parcela.
    if (!editingId && installments && installments >= 2) {
      const occurrences = generateInstallments(data, data.amount, installments);
      const newTransactions = occurrences.map((occ) => ({ id: generateId("inst-tx"), ...occ }));
      setTransactions((prev) => [...newTransactions, ...prev]);
      notify(`Compra parcelada em ${installments}x adicionada.`, "success");
      return;
    }

    if (editingId) {
      // Transação avulsa (sem série) recebeu uma recorrência ao ser editada:
      // ela vira o início de uma nova série, em vez de só editar 1 campo.
      if (recurrence !== "none" && editingTransaction && !editingTransaction.recurrenceGroupId) {
        const occurrences = generateRecurringOccurrences(data, recurrence);
        const newTransactions = occurrences.map((occ) => ({ id: generateId("recur"), ...occ }));
        setTransactions((prev) => [...newTransactions, ...prev.filter((t) => t.id !== editingId)]);
        notify(`Transação convertida em série recorrente (${newTransactions.length} ocorrências).`, "success");
      } else {
        setTransactions((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...data } : t)));
        notify("Transação atualizada com sucesso.", "success");
      }
      setEditingId(null);
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
    const todayStr = toLocalISODate();

    setBills((prev) => {
      const updated = prev.map((b) =>
        b.id === bill.id ? { ...b, isPaid: true, paidDate: todayStr, paidAmount: finalAmount } : b
      );

      // Novo: se a conta é recorrente mensal, gera automaticamente a próxima ocorrência já em aberto
      if (bill.isRecurringMonthly) {
        const nextBill: Bill = {
          ...bill,
          id: generateId("bill"),
          dueDate: addOneMonth(bill.dueDate),
          isPaid: false,
          paidDate: undefined,
          paidAmount: undefined,
        };
        return [nextBill, ...updated];
      }
      return updated;
    });

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
      bill.isRecurringMonthly
        ? `${bill.type === "income" ? "Recebimento" : "Pagamento"} confirmado. Próxima conta de ${addOneMonth(bill.dueDate)} já foi criada.`
        : bill.type === "income"
        ? "Recebimento confirmado e lançado no extrato."
        : "Pagamento confirmado e lançado no extrato.",
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

  // --- Cartões de crédito ---
  const handleAddCard = (card: CreditCard) => {
    setCards((prev) => [card, ...prev]);
    notify("Cartão adicionado.", "success");
  };

  const handleRemoveCard = async (id: string) => {
    const card = cards.find((c) => c.id === id);
    const ok = await confirm({
      title: "Remover cartão?",
      description: `"${card?.name}" será removido. As transações já lançadas nele não serão apagadas.`,
      confirmLabel: "Remover",
    });
    if (!ok) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    notify("Cartão removido.", "info");
  };

  // --- Metas ---
  const handleAddGoal = (goal: Goal) => {
    setGoals((prev) => [goal, ...prev]);
    notify("Meta adicionada.", "success");
  };

  const handleUpdateGoal = (id: string, currentAmount: number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, currentAmount: roundMoney(currentAmount) } : g)));
    notify("Aporte registrado na meta.", "success");
  };

  const handleRemoveGoal = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    const ok = await confirm({
      title: "Remover meta?",
      description: `"${goal?.title}" será removida permanentemente.`,
      confirmLabel: "Remover",
    });
    if (!ok) return;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    notify("Meta removida.", "info");
  };

  // --- Categorias ---
  const handleAddCategory = (category: CategoryDef) => {
    setCustomCategories((prev) => [...prev, category]);
    notify("Categoria adicionada.", "success");
  };

  const handleRemoveCategory = async (name: string) => {
    const ok = await confirm({
      title: "Remover categoria?",
      description: `"${name}" será removida da lista. Transações existentes que já usam essa categoria não são alteradas.`,
      confirmLabel: "Remover",
    });
    if (!ok) return;
    setCustomCategories((prev) => prev.filter((c) => c.name !== name));
    notify("Categoria removida.", "info");
  };

  // --- Importação / Exportação CSV ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = typeof event.target?.result === "string" ? event.target.result : "";
      if (!text) {
        notify("O arquivo CSV está vazio.", "error");
        return;
      }

      const result = importTransactionsCsv(text);

      if (result.transactions.length > 0) {
        setTransactions((prev) => [...result.transactions, ...prev]);

        const invalidMessage =
          result.invalidRows.length > 0
            ? ` ${result.invalidRows.length} linha(s) inválida(s) foram ignoradas.`
            : "";

        notify(`${result.transactions.length} transações importadas via CSV.${invalidMessage}`, "success");
      } else {
        notify(
          "Nenhuma transação válida encontrada. Use AAAA-MM-DD;Descrição;1.250,50;despesa (ou o formato com vírgulas).",
          "error"
        );
      }
    };

    reader.onerror = () => notify("Não foi possível ler o arquivo CSV.", "error");
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleExportCsv = () => {
    const header = ["data", "descricao", "valor", "tipo", "categoria"];
    const rows = transactions.map((t) => [
      t.date,
      t.description,
      t.amount.toFixed(2).replace(".", ","),
      t.type === "income" ? "receita" : "despesa",
      t.category,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => csvEscape(value)).join(";"))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transacoes_financeiras_${toLocalISODate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("CSV exportado com sucesso.", "success");
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
    return { totalIncome: roundMoney(income), totalExpense: roundMoney(expense), balance: roundMoney(income - expense) };
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

  // BUG CORRIGIDO: as metas de orçamento (que são mensais) estavam sendo
  // comparadas contra o gasto acumulado de TODO o histórico, não contra o
  // gasto do mês atual — o que fazia qualquer meta parecer estourada depois
  // de poucos meses de uso. Agora usamos só o mês corrente.
  const currentMonthExpensesByCategory = useMemo(() => {
    const thisMonth = currentMonthKey();
    const acc: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense" && t.date.substring(0, 7) === thisMonth)
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

  // Soma das despesas recorrentes mensais já comprometidas (Contas & Rendas).
  // É um "piso" de gasto conhecido: mesmo que a regressão estatística preveja
  // menos, sabemos que esse valor vai se repetir todo mês.
  const recurringMonthlyExpenses = useMemo(
    () => bills.filter((b) => b.isRecurringMonthly && b.type === "expense").reduce((sum, b) => sum + b.originalAmount, 0),
    [bills]
  );

  const projectedData = useMemo(() => {
    if (monthlyData.length < 2) {
      if (recurringMonthlyExpenses === 0) return monthlyData.map((d) => ({ ...d, projectedExpense: null }));
      // Sem histórico suficiente para regressão, mas já há despesas recorrentes conhecidas:
      // usa isso como projeção mínima para os 2 próximos meses.
    }

    const expensePoints = monthlyData.map((item, index) => ({ x: index + 1, y: item.expense }));
    const regression = calculateLinearRegression(expensePoints);
    const result = monthlyData.map((d) => ({ ...d, projectedExpense: null as number | null }));

    const lastMonthRef = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].month : currentMonthKey();

    for (let i = 1; i <= 2; i++) {
      const nextX = monthlyData.length + i;
      const statisticalPrediction = monthlyData.length >= 2 ? regression.predict(nextX) : 0;
      // Novo: a projeção nunca fica abaixo das despesas recorrentes mensais já comprometidas
      const predictedVal = Math.max(0, statisticalPrediction, recurringMonthlyExpenses);

      const lastMonthDate = new Date(lastMonthRef + "-01");
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
  }, [monthlyData, recurringMonthlyExpenses]);

  if (!txHydrated || !billsHydrated || !cardsHydrated || !goalsHydrated || !categoriesHydrated || !tutorialHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <DashboardHeader
          onImportCSV={handleFileUpload}
          onExportImage={handleExportImage}
          onExportCSV={handleExportCsv}
          onOpenTutorial={() => setTutorialOpen(true)}
        />

        <SectionTabs active={section} onChange={setSection} />

        {section === "dashboard" && (
          <>
            <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} topCategory={topCategory} />

            <SmartInsights transactions={transactions} cards={cards} goals={goals} monthKey={currentMonthKey()} />

            <UpcomingDueAlert bills={bills} />

            <BillsManager bills={bills} onAddBill={handleAddBill} onSettleBill={handleSettleBill} onDeleteBill={handleDeleteBill} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <CashFlowChart data={monthlyData} />
              <ExpenseProjectionChart data={projectedData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <ExpenseByCategoryChart transactions={transactions} />
              <BudgetGoals budgets={budgets} spentByCategory={currentMonthExpensesByCategory} />
            </div>

            <NotificationsPanel transactions={transactions} cards={cards} goals={goals} budgets={budgets} monthKey={currentMonthKey()} />

            <div ref={formRef} className="scroll-mt-6">
              <TransactionForm
                editingTransaction={editingTransaction}
                onSave={handleSaveTransaction}
                onCancelEdit={() => setEditingId(null)}
                customCategories={customCategories}
                cards={cards}
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
          </>
        )}

        {section === "health" && (
          <FinancialHealth transactions={transactions} budgets={budgets} cards={cards} goals={goals} monthKey={currentMonthKey()} />
        )}

        {section === "cards" && (
          <CreditCardsManager cards={cards} transactions={transactions} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} />
        )}

        {section === "goals" && (
          <GoalsManager goals={goals} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onRemoveGoal={handleRemoveGoal} />
        )}

        {section === "categories" && (
          <CategoryManager customCategories={customCategories} onAddCategory={handleAddCategory} onRemoveCategory={handleRemoveCategory} />
        )}

        {section === "reports" && <ReportsPage transactions={transactions} cards={cards} />}
      </div>
      {dialog}
      <OnboardingTutorial open={tutorialOpen} onClose={handleCloseTutorial} />
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
