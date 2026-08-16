import { Bill } from "./types";

/** Gera um id único e estável, com fallback para navegadores sem crypto.randomUUID */
export function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Formata um valor monetário em Real (BRL), centralizando toda formatação do app */
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes("salario") || desc.includes("salário") || desc.includes("pix recebido") || desc.includes("ted") || desc.includes("freelance"))
    return "Salário";
  if (desc.includes("supermercado") || desc.includes("mercado") || desc.includes("padaria") || desc.includes("ifood"))
    return "Alimentação";
  if (desc.includes("uber") || desc.includes("posto") || desc.includes("gasolina") || desc.includes("metro") || desc.includes("metrô"))
    return "Transporte";
  if (desc.includes("aluguel") || desc.includes("condominio") || desc.includes("condomínio") || desc.includes("luz") || desc.includes("internet"))
    return "Moradia";
  return "Outros";
}

/** Calcula o valor atual de uma conta, aplicando multa + juros diários quando vencida */
export function calculateBillCurrentAmount(bill: Bill, referenceDate: Date = new Date()): number {
  if (bill.isPaid) return bill.paidAmount ?? bill.originalAmount;
  if (bill.type === "income") return bill.originalAmount;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const due = new Date(bill.dueDate + "T00:00:00");

  if (today <= due) return bill.originalAmount;

  const diffDays = Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  const penalty = bill.originalAmount * (bill.penaltyRate / 100);
  const interest = bill.originalAmount * (bill.dailyInterestRate / 100) * diffDays;

  return bill.originalAmount + penalty + interest;
}

export interface LinearRegression {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
}

export function calculateLinearRegression(data: { x: number; y: number }[]): LinearRegression {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, predict: () => 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept, predict: (x: number) => slope * x + intercept };
}

/** Escapa um campo para uso seguro em CSV (RFC 4180) */
export function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Faz o parse de UMA linha de CSV respeitando aspas, sem depender de split(",") ingênuo */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}
