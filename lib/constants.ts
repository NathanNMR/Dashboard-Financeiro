import { Bill, Budget, Transaction } from "./types";

export const CATEGORIES = ["Salário", "Alimentação", "Transporte", "Moradia", "Outros"] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: "#f43f5e",
  Transporte: "#38bdf8",
  Moradia: "#34d399",
  Salário: "#fbbf24",
  Outros: "#a855f7",
};

export const STORAGE_KEYS = {
  transactions: "smartfinance_transactions",
  bills: "smartfinance_bills",
  budgets: "smartfinance_budgets",
};

export const initialTransactions: Transaction[] = [
  { id: "1", date: "2026-01-15", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "2", date: "2026-01-18", description: "Supermercado Extra", amount: 650.0, category: "Alimentação", type: "expense" },
  { id: "3", date: "2026-02-10", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "4", date: "2026-02-12", description: "Aluguel Apartamento", amount: 1800.0, category: "Moradia", type: "expense" },
  { id: "5", date: "2026-02-20", description: "Uber Viagem", amount: 45.0, category: "Transporte", type: "expense" },
  { id: "6", date: "2026-03-05", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "7", date: "2026-03-08", description: "Supermercado Pão de Açúcar", amount: 820.0, category: "Alimentação", type: "expense" },
  { id: "8", date: "2026-03-10", description: "Posto Shell Combustível", amount: 250.0, category: "Transporte", type: "expense" },
];

export const initialBills: Bill[] = [
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

export const initialBudgets: Budget = {
  Alimentação: 1000,
  Transporte: 400,
  Moradia: 2000,
  Outros: 500,
};
