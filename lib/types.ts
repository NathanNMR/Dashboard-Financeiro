export type Recurrence = "none" | "monthly" | "yearly";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  recurrence?: Recurrence;
  /** Agrupa todas as ocorrências geradas a partir da mesma transação recorrente */
  recurrenceGroupId?: string;
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
}

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  text: string;
}
