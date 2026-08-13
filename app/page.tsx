"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// --- TIPOS ---
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: "income" | "expense";
}

interface Budget {
  [category: string]: number;
}

interface Bill {
  id: string;
  description: string;
  dueDate: string;
  originalAmount: number;
  dailyInterestRate: number;
  penaltyRate: number;
  category: string;
  type: "expense" | "income";
  isPaid: boolean;
  paidDate?: string;
  paidAmount?: number;
}

// --- DADOS INICIAIS DE EXEMPLO ---
const initialTransactions: Transaction[] = [
  { id: "1", date: "2026-01-15", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "2", date: "2026-01-18", description: "Supermercado Extra", amount: 650.0, category: "Alimentação", type: "expense" },
  { id: "3", date: "2026-02-10", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "4", date: "2026-02-12", description: "Aluguel Apartamento", amount: 1800.0, category: "Moradia", type: "expense" },
  { id: "5", date: "2026-02-20", description: "Uber Viagem", amount: 45.0, category: "Transporte", type: "expense" },
  { id: "6", date: "2026-03-05", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "7", date: "2026-03-08", description: "Supermercado Pão de Açúcar", amount: 820.0, category: "Alimentação", type: "expense" },
  { id: "8", date: "2026-03-10", description: "Posto Shell Combustível", amount: 250.0, category: "Transporte", type: "expense" },
];

const initialBills: Bill[] = [
  {
    id: "bill-1",
    description: "Fatura Cartão de Crédito",
    dueDate: "2026-08-10",
    originalAmount: 1200.0,
    dailyInterestRate: 0.33,
    penaltyRate: 2.0,
    category: "Outros",
    type: "expense",
    isPaid: false,
  },
  {
    id: "bill-2",
    description: "Freelance Projeto Web",
    dueDate: "2026-08-25",
    originalAmount: 1500.0,
    dailyInterestRate: 0,
    penaltyRate: 0,
    category: "Salário",
    type: "income",
    isPaid: false,
  },
];

const initialBudgets: Budget = {
  Alimentação: 1000,
  Transporte: 400,
  Moradia: 2000,
  Outros: 500,
};

const CATEGORY_COLORS: { [key: string]: string } = {
  Alimentação: "#f43f5e",
  Transporte: "#38bdf8",
  Moradia: "#34d399",
  Salário: "#fbbf24",
  Outros: "#a855f7",
};

const categorizeTransaction = (description: string): string => {
  const desc = description.toLowerCase();
  if (desc.includes("salario") || desc.includes("pix recebido") || desc.includes("ted") || desc.includes("freelance")) return "Salário";
  if (desc.includes("supermercado") || desc.includes("mercado") || desc.includes("padaria") || desc.includes("ifood")) return "Alimentação";
  if (desc.includes("uber") || desc.includes("posto") || desc.includes("gasolina") || desc.includes("metro")) return "Transporte";
  if (desc.includes("aluguel") || desc.includes("condominio") || desc.includes("luz") || desc.includes("internet")) return "Moradia";
  return "Outros";
};

const calculateBillCurrentAmount = (bill: Bill) => {
  if (bill.isPaid) return bill.paidAmount || bill.originalAmount;
  if (bill.type === "income") return bill.originalAmount;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(bill.dueDate + "T00:00:00");

  if (today <= due) {
    return bill.originalAmount;
  }

  const diffTime = Math.abs(today.getTime() - due.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const penalty = bill.originalAmount * (bill.penaltyRate / 100);
  const interest = bill.originalAmount * (bill.dailyInterestRate / 100) * diffDays;

  return bill.originalAmount + penalty + interest;
};

const calculateLinearRegression = (data: { x: number; y: number }[]) => {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, predict: (x: number) => 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  data.forEach((point) => {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept,
  };
};

export default function FinancialDashboard() {
  // Controle de montagem para evitar erro de Hidratação do Next.js
  const [isMounted, setIsMounted] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [budgets, setBudgets] = useState<Budget>(initialBudgets);

  // Carregar dados salvos do localStorage apenas no lado do cliente após a montagem
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const savedT = localStorage.getItem("smartfinance_transactions");
      if (savedT) {
        try { setTransactions(JSON.parse(savedT)); } catch (e) { console.error(e); }
      }
      const savedB = localStorage.getItem("smartfinance_bills");
      if (savedB) {
        try { setBills(JSON.parse(savedB)); } catch (e) { console.error(e); }
      }
      const savedBudgets = localStorage.getItem("smartfinance_budgets");
      if (savedBudgets) {
        try { setBudgets(JSON.parse(savedBudgets)); } catch (e) { console.error(e); }
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("smartfinance_transactions", JSON.stringify(transactions));
    }
  }, [transactions, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("smartfinance_bills", JSON.stringify(bills));
    }
  }, [bills, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("smartfinance_budgets", JSON.stringify(budgets));
    }
  }, [budgets, isMounted]);

  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState("Alimentação");

  const [billDesc, setBillDesc] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [billInterest, setBillInterest] = useState("0.33");
  const [billPenalty, setBillPenalty] = useState("2.0");
  const [billCategory, setBillCategory] = useState("Moradia");
  const [billType, setBillType] = useState<"expense" | "income">("expense");

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billDesc || !billAmount) return;

    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      description: billDesc,
      dueDate: billDueDate,
      originalAmount: parseFloat(billAmount),
      dailyInterestRate: parseFloat(billInterest) || 0,
      penaltyRate: parseFloat(billPenalty) || 0,
      category: billCategory,
      type: billType,
      isPaid: false,
    };

    setBills((prev) => [newBill, ...prev]);
    setBillDesc("");
    setBillAmount("");
  };

  const handleSettleBill = (bill: Bill) => {
    const finalAmount = calculateBillCurrentAmount(bill);
    const todayStr = new Date().toISOString().substring(0, 10);

    setBills((prev) =>
      prev.map((b) =>
        b.id === bill.id
          ? { ...b, isPaid: true, paidDate: todayStr, paidAmount: finalAmount }
          : b
      )
    );

    const prefix = bill.type === "income" ? "[RECEBIDO]" : "[PAGO]";
    const newT: Transaction = {
      id: `bill-settle-${Date.now()}`,
      date: todayStr,
      description: `${prefix} ${bill.description}`,
      amount: finalAmount,
      category: bill.category,
      type: bill.type,
    };

    setTransactions((prev) => [newT, ...prev]);
  };

  const handleDeleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formAmount) return;

    if (editingId) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, description: formDesc, amount: parseFloat(formAmount), date: formDate, type: formType, category: formCategory }
            : t
        )
      );
      setEditingId(null);
    } else {
      const newT: Transaction = {
        id: `manual-${Date.now()}`,
        date: formDate,
        description: formDesc,
        amount: parseFloat(formAmount),
        category: formCategory,
        type: formType,
      };
      setTransactions((prev) => [newT, ...prev]);
    }

    setFormDesc("");
    setFormAmount("");
    setFormCategory("Alimentação");
  };

  const handleEditClick = (t: Transaction) => {
    setEditingId(t.id);
    setFormDesc(t.description);
    setFormAmount(t.amount.toString());
    setFormDate(t.date);
    setFormType(t.type);
    setFormCategory(t.category);
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const imported: Transaction[] = [];

      lines.forEach((line, idx) => {
        const parts = line.split(",");
        if (parts.length >= 3) {
          const date = parts[0].trim();
          const description = parts[1].trim();
          const amount = parseFloat(parts[2].trim());
          const type = (parts[3] ? parts[3].trim().toLowerCase() : "expense") as "income" | "expense";
          const category = categorizeTransaction(description);

          if (!isNaN(amount) && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            imported.push({
              id: `csv-${Date.now()}-${idx}`,
              date,
              description,
              amount,
              category,
              type: type === "income" ? "income" : "expense",
            });
          }
        }
      });

      if (imported.length > 0) {
        setTransactions((prev) => [...imported, ...prev]);
        alert(`${imported.length} transações importadas com sucesso via arquivo CSV!`);
      } else {
        alert("Não foi possível ler as linhas. Verifique o formato: AAAA-MM-DD, Descrição, Valor, [expense/income]");
      }
    };
    reader.readAsText(file);
  };

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
    transactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });
    return { totalIncome: income, totalExpense: expense, balance: income - expense };
  }, [transactions]);

  const categoryPieData = useMemo(() => {
    const acc: { [key: string]: number } = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      });

    return Object.keys(acc).map((cat) => ({
      name: cat,
      value: acc[cat],
    }));
  }, [transactions]);

  const currentExpensesByCategory = useMemo(() => {
    const acc: { [key: string]: number } = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      });
    return acc;
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const acc: { [key: string]: { month: string; income: number; expense: number } } = {};
    transactions.forEach((t) => {
      const monthKey = t.date.substring(0, 7);
      if (!acc[monthKey]) acc[monthKey] = { month: monthKey, income: 0, expense: 0 };
      if (t.type === "income") acc[monthKey].income += t.amount;
      else acc[monthKey].expense += t.amount;
    });
    return Object.values(acc).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const projectedData = useMemo(() => {
    if (monthlyData.length < 2) return monthlyData;
    const expensePoints = monthlyData.map((item, index) => ({ x: index + 1, y: item.expense }));
    const regression = calculateLinearRegression(expensePoints);
    const result = [...monthlyData.map((d) => ({ ...d, projectedExpense: null as number | null }))];

    const lastIndex = monthlyData.length;
    for (let i = 1; i <= 2; i++) {
      const nextX = lastIndex + i;
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

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Data,Descricao,Categoria,Tipo,Valor\n";
    transactions.forEach((t) => {
      csvContent += `${t.date},"${t.description}",${t.category},${t.type},${t.amount}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "relatorio_financeiro.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Se ainda não montou no cliente, exibe um esqueleto vazio para evitar divergência de HTML
  if (!isMounted) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 p-10">Carregando dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              SmartFinance Dashboard Pro
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Controle completo de contas, planejamento de rendas, juros, orçamento e projeção.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer shadow-lg shadow-cyan-900/30">
              Importar CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              onClick={handleExportCSV}
              className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition shadow"
            >
              Exportar CSV
            </button>
          </div>
        </header>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <span className="text-sm font-medium text-slate-400">Receitas Totais</span>
            <div className="text-3xl font-bold text-emerald-400 mt-2">
              R$ {totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <span className="text-sm font-medium text-slate-400">Despesas Totais</span>
            <div className="text-3xl font-bold text-rose-400 mt-2">
              R$ {totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <span className="text-sm font-medium text-slate-400">Saldo Atual</span>
            <div className={`text-3xl font-bold mt-2 ${balance >= 0 ? "text-cyan-400" : "text-amber-400"}`}>
              R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* --- MÓDULO: CONTAS E RENDAS DO MÊS --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-100">Compromissos Financeiros (Contas & Rendas)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Adicione despesas a pagar ou rendas a receber. Confirme a quitação para lançar automaticamente no extrato.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddBill} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <select
              value={billType}
              onChange={(e) => setBillType(e.target.value as "expense" | "income")}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="expense">Despesa (Pagar)</option>
              <option value="income">Renda (Receber)</option>
            </select>
            <input
              type="text"
              placeholder="Descrição (ex: Salário Extra)"
              value={billDesc}
              onChange={(e) => setBillDesc(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 lg:col-span-2"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor (R$)"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              required
            />
            <input
              type="date"
              value={billDueDate}
              onChange={(e) => setBillDueDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Juros/dia %"
              value={billInterest}
              onChange={(e) => setBillInterest(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <select
              value={billCategory}
              onChange={(e) => setBillCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Salário">Salário</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Transporte">Transporte</option>
              <option value="Moradia">Moradia</option>
              <option value="Outros">Outros</option>
            </select>
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 px-3 rounded-lg text-xs transition shadow"
            >
              + Adicionar
            </button>
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
                {bills.map((bill) => {
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
                      <td className={`py-3 px-3 font-semibold ${bill.type === "income" ? "text-emerald-400" : isLate ? "text-rose-400" : "text-slate-200"}`}>
                        R$ {currentVal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center space-x-2">
                        {!bill.isPaid && (
                          <button
                            onClick={() => handleSettleBill(bill)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium px-3 py-1 rounded-lg transition shadow"
                          >
                            {bill.type === "income" ? "Confirmar Recebimento" : "Confirmar Pagamento"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBill(bill.id)}
                          className="text-slate-500 hover:text-rose-400 text-xs transition"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Fluxo de Caixa Mensal</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }} />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Projeção de Despesas (Regressão Linear)</h3>
              <p className="text-xs text-slate-400 mb-4">Tendência baseada estatisticamente no histórico.</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }} />
                  <Legend />
                  <Area type="monotone" dataKey="expense" name="Despesa Real" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="projectedExpense" name="Despesa Projetada" stroke="#38bdf8" strokeDasharray="5 5" fill="#38bdf8" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráfico de Rosca + Metas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Despesas por Categoria</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-1">Metas de Gastos Mensais</h3>
              <p className="text-xs text-slate-400 mb-4">Acompanhe o teto de gastos por categoria.</p>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-60 pr-2">
              {Object.keys(budgets).map((cat) => {
                const spent = currentExpensesByCategory[cat] || 0;
                const limit = budgets[cat];
                const percentage = Math.min(100, Math.round((spent / limit) * 100));
                const isOver = spent > limit;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{cat}</span>
                      <span className={isOver ? "text-rose-400 font-bold" : "text-slate-400"}>
                        R$ {spent.toFixed(2)} / R$ {limit.toFixed(2)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all ${isOver ? "bg-rose-500" : "bg-cyan-500"}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Formulário de Transação Manual */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-200">
              {editingId ? "Editar Transação" : "Adicionar Nova Transação Manual"}
            </h3>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormDesc("");
                  setFormAmount("");
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                Cancelar Edição
              </button>
            )}
          </div>
          <form onSubmit={handleSaveTransaction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Descrição"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Valor (R$)"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as "income" | "expense")}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Salário">Salário</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Moradia">Moradia</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <button
              type="submit"
              className={`w-full text-white font-medium py-2.5 rounded-xl transition shadow-lg text-sm ${
                editingId ? "bg-amber-600 hover:bg-amber-500 shadow-amber-950/30" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/30"
              }`}
            >
              {editingId ? "Atualizar Transação" : "Salvar Transação"}
            </button>
          </form>
        </div>

        {/* Extrato Consolidado */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-semibold text-slate-200">Extrato Consolidado</h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Buscar descrição..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="All">Todas as Categorias</option>
                <option value="Salário">Salário</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Moradia">Moradia</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400">{t.date}</td>
                      <td className="py-3 px-4 font-medium text-slate-200">{t.description}</td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-800 text-cyan-300 text-xs px-2.5 py-1 rounded-full border border-slate-700">
                          {t.category}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.type === "income" ? "+ " : "- "}
                        R$ {t.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center space-x-2">
                        <button
                          onClick={() => handleEditClick(t)}
                          className="text-cyan-400 hover:text-cyan-300 text-xs bg-cyan-950/40 border border-cyan-900/50 px-2.5 py-1 rounded-lg transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
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
        </div>

      </div>
    </div>
  );
}