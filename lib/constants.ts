import { Bill, Budget, CategoryDef, CreditCard, Goal, Transaction } from "./types";

export const CATEGORIES = [
  "Salário",
  "Freelance/Extra",
  "Alimentação",
  "Transporte",
  "Moradia",
  "Cartão de Crédito",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas",
  "Vestuário",
  "Pets",
  "Viagem",
  "Presentes/Doações",
  "Impostos/Taxas",
  "Casa/Manutenção",
  "Outros",
] as const;

/** Categorias que representam entrada de dinheiro; o restante é tratado como despesa */
export const INCOME_CATEGORIES = ["Salário", "Freelance/Extra"];

export const CATEGORY_COLORS: Record<string, string> = {
  Salário: "#fbbf24",
  "Freelance/Extra": "#facc15",
  Alimentação: "#f43f5e",
  Transporte: "#38bdf8",
  Moradia: "#34d399",
  "Cartão de Crédito": "#ec4899",
  Saúde: "#22d3ee",
  Educação: "#818cf8",
  Lazer: "#fb923c",
  Assinaturas: "#c084fc",
  Vestuário: "#f472b6",
  Pets: "#a3e635",
  Viagem: "#2dd4bf",
  "Presentes/Doações": "#fda4af",
  "Impostos/Taxas": "#f87171",
  "Casa/Manutenção": "#60a5fa",
  Outros: "#94a3b8",
};

export const CATEGORY_ICONS: Record<string, string> = {
  Salário: "💰",
  "Freelance/Extra": "💼",
  Alimentação: "🍽️",
  Transporte: "🚗",
  Moradia: "🏠",
  "Cartão de Crédito": "💳",
  Saúde: "💊",
  Educação: "🎓",
  Lazer: "🎬",
  Assinaturas: "🔁",
  Vestuário: "👕",
  Pets: "🐾",
  Viagem: "✈️",
  "Presentes/Doações": "🎁",
  "Impostos/Taxas": "🧾",
  "Casa/Manutenção": "🛠️",
  Outros: "📦",
};

export const RECURRENCE_LABELS: Record<string, string> = {
  monthly: "Mensal",
  yearly: "Anual",
};

export const STORAGE_KEYS = {
  transactions: "smartfinance_transactions",
  bills: "smartfinance_bills",
  budgets: "smartfinance_budgets",
  categories: "smartfinance_categories",
  creditCards: "smartfinance_credit_cards",
  goals: "smartfinance_goals",
};

/**
 * Estrutura hierárquica padrão: cada categoria de topo pode ter subcategorias.
 * O usuário pode adicionar as suas próprias por cima disso (ver DEFAULT_CATEGORY_TREE + customCategories).
 */
export const DEFAULT_CATEGORY_TREE: Record<string, string[]> = {
  Alimentação: ["Mercado", "Restaurante", "Delivery", "Padaria"],
  Transporte: ["Combustível", "Uber/99", "Transporte público", "Estacionamento", "Manutenção do veículo"],
  Moradia: ["Aluguel", "Condomínio", "Energia", "Água", "Internet", "IPTU"],
  "Cartão de Crédito": [],
  Saúde: ["Farmácia", "Plano de saúde", "Consultas", "Academia"],
  Educação: ["Mensalidade", "Cursos", "Livros/Material"],
  Lazer: ["Cinema/Shows", "Bares", "Passeios", "Jogos"],
  Assinaturas: ["Streaming", "Música", "Serviços digitais"],
  Vestuário: [],
  Pets: ["Ração", "Veterinário", "Petshop"],
  Viagem: ["Passagens", "Hospedagem", "Passeios"],
  "Presentes/Doações": [],
  "Impostos/Taxas": [],
  "Casa/Manutenção": [],
  Outros: [],
  Salário: [],
  "Freelance/Extra": [],
};

export const initialCategories: CategoryDef[] = [];

export const initialCreditCards: CreditCard[] = [
  {
    id: "card-1",
    name: "Nubank",
    limit: 3000,
    closingDay: 25,
    dueDay: 10,
    color: "#a855f7",
  },
  {
    id: "card-2",
    name: "Inter",
    limit: 2000,
    closingDay: 20,
    dueDay: 5,
    color: "#f97316",
  },
];

export const initialGoals: Goal[] = [
  {
    id: "goal-1",
    title: "Comprar notebook",
    icon: "💻",
    targetAmount: 5000,
    currentAmount: 3250,
    deadline: "2026-12-31",
    createdAt: "2026-01-01",
  },
  {
    id: "goal-2",
    title: "Reserva de emergência",
    icon: "🛟",
    targetAmount: 15000,
    currentAmount: 6200,
    createdAt: "2026-01-01",
  },
];

export const initialTransactions: Transaction[] = [
  { id: "1", date: "2026-01-15", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "2", date: "2026-01-18", description: "Supermercado Extra", amount: 650.0, category: "Alimentação", type: "expense" },
  { id: "3", date: "2026-01-22", description: "Fatura Cartão Nubank", amount: 890.0, category: "Cartão de Crédito", type: "expense" },
  { id: "4", date: "2026-02-10", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "5", date: "2026-02-12", description: "Aluguel Apartamento", amount: 1800.0, category: "Moradia", type: "expense" },
  { id: "6", date: "2026-02-20", description: "Uber Viagem", amount: 45.0, category: "Transporte", type: "expense" },
  { id: "7", date: "2026-02-24", description: "Farmácia Droga Raia", amount: 120.0, category: "Saúde", type: "expense" },
  { id: "8", date: "2026-03-05", description: "Salário Empresa X", amount: 5500.0, category: "Salário", type: "income" },
  { id: "9", date: "2026-03-06", description: "Freelance Design Logo", amount: 800.0, category: "Freelance/Extra", type: "income" },
  { id: "10", date: "2026-03-08", description: "Supermercado Pão de Açúcar", amount: 820.0, category: "Alimentação", type: "expense" },
  { id: "11", date: "2026-03-10", description: "Posto Shell Combustível", amount: 250.0, category: "Transporte", type: "expense" },
  { id: "12", date: "2026-03-12", description: "Assinatura Netflix", amount: 44.9, category: "Assinaturas", type: "expense" },
  { id: "13", date: "2026-03-12", description: "Assinatura Spotify", amount: 21.9, category: "Assinaturas", type: "expense" },
  { id: "14", date: "2026-03-15", description: "Cinema com amigos", amount: 90.0, category: "Lazer", type: "expense" },
  { id: "15", date: "2026-03-18", description: "Fatura Cartão Nubank", amount: 1050.0, category: "Cartão de Crédito", type: "expense" },
];

export const initialBills: Bill[] = [
  {
    id: "bill-1",
    description: "Fatura Cartão de Crédito",
    dueDate: "2026-08-10",
    originalAmount: 1200.0,
    dailyInterestRate: 0.33,
    penaltyRate: 2.0,
    category: "Cartão de Crédito",
    type: "expense",
    isPaid: false,
    isRecurringMonthly: true,
  },
  {
    id: "bill-2",
    description: "Freelance Projeto Web",
    dueDate: "2026-08-25",
    originalAmount: 1500.0,
    dailyInterestRate: 0,
    penaltyRate: 0,
    category: "Freelance/Extra",
    type: "income",
    isPaid: false,
    isRecurringMonthly: false,
  },
];

export const initialBudgets: Budget = {
  Alimentação: 1000,
  Transporte: 400,
  Moradia: 2000,
  "Cartão de Crédito": 1200,
  Saúde: 300,
  Educação: 300,
  Lazer: 300,
  Assinaturas: 150,
  Vestuário: 250,
  Pets: 150,
  Viagem: 300,
  "Presentes/Doações": 100,
  "Impostos/Taxas": 200,
  "Casa/Manutenção": 250,
  Outros: 300,
};
