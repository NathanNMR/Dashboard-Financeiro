export type Recurrence = "none" | "monthly" | "yearly";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category: string;
  /** Subcategoria opcional (ex: categoria "Alimentação" → subcategoria "Mercado") */
  subcategory?: string;
  type: "income" | "expense";
  recurrence?: Recurrence;
  /** Agrupa todas as ocorrências geradas a partir da mesma transação recorrente */
  recurrenceGroupId?: string;
  /** Cartão de crédito usado nesta compra, se houver */
  cardId?: string;
  /** Agrupa todas as parcelas de uma mesma compra parcelada */
  installmentGroupId?: string;
  /** Número desta parcela dentro do grupo (1-indexado) */
  installmentNumber?: number;
  /** Total de parcelas do grupo */
  installmentTotal?: number;
}

export interface Budget {
  [category: string]: number;
}

export interface Bill {
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
  /** Quando true, ao quitar esta conta uma nova ocorrência é criada automaticamente para o mês seguinte */
  isRecurringMonthly?: boolean;
}

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  text: string;
}

/** Categoria customizável pelo usuário, com suporte a hierarquia (categoria → subcategorias) */
export interface CategoryDef {
  name: string;
  icon?: string;
  color?: string;
  /** Nome da categoria-pai; ausente = categoria de topo */
  parent?: string;
  /** true quando criada pelo usuário (não faz parte do conjunto padrão do app) */
  custom?: boolean;
  type?: "income" | "expense" | "both";
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  /** Dia do mês em que a fatura fecha (1-31) */
  closingDay: number;
  /** Dia do mês em que a fatura vence (1-31) */
  dueDay: number;
  color?: string;
}

/** Meta de poupança nomeada (ex: "Comprar notebook"), distinta do orçamento por categoria */
export interface Goal {
  id: string;
  title: string;
  icon?: string;
  targetAmount: number;
  currentAmount: number;
  /** Data alvo opcional, YYYY-MM-DD */
  deadline?: string;
  createdAt: string;
}
