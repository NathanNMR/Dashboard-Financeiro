import { Bill, Budget, CreditCard, Goal, Recurrence, Transaction } from "./types";
import { roundMoney } from "./money";

/** Quantas ocorrências futuras gerar automaticamente ao marcar como recorrente */
const RECURRENCE_HORIZON: Record<Exclude<Recurrence, "none">, number> = {
  monthly: 12, // cobre os próximos 12 meses
  yearly: 5, // cobre os próximos 5 anos
};

/**
 * Gera as ocorrências de uma transação recorrente (a original + as futuras),
 * todas compartilhando o mesmo recurrenceGroupId para poderem ser
 * identificadas e removidas em conjunto depois.
 */
export function generateRecurringOccurrences(
  base: Omit<Transaction, "id" | "recurrenceGroupId">,
  recurrence: Exclude<Recurrence, "none">
): Omit<Transaction, "id">[] {
  const groupId = generateId("series");
  const count = RECURRENCE_HORIZON[recurrence];
  const occurrences: Omit<Transaction, "id">[] = [];
  const baseDate = new Date(base.date + "T00:00:00");

  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    if (recurrence === "monthly") d.setMonth(d.getMonth() + i);
    else d.setFullYear(d.getFullYear() + i);

    occurrences.push({
      ...base,
      date: d.toISOString().substring(0, 10),
      recurrence,
      recurrenceGroupId: groupId,
    });
  }
  return occurrences;
}

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

  if (desc.includes("salario") || desc.includes("salário") || desc.includes("pix recebido") || desc.includes("ted"))
    return "Salário";
  if (desc.includes("freelance") || desc.includes("bico") || desc.includes("comissão") || desc.includes("comissao"))
    return "Freelance/Extra";
  if (desc.includes("fatura") || desc.includes("cartao") || desc.includes("cartão") || desc.includes("nubank") || desc.includes("visa") || desc.includes("mastercard"))
    return "Cartão de Crédito";
  if (desc.includes("supermercado") || desc.includes("mercado") || desc.includes("padaria") || desc.includes("ifood") || desc.includes("restaurante") || desc.includes("lanchonete"))
    return "Alimentação";
  if (desc.includes("uber") || desc.includes("99") || desc.includes("posto") || desc.includes("gasolina") || desc.includes("combustivel") || desc.includes("combustível") || desc.includes("metro") || desc.includes("metrô") || desc.includes("estacionamento"))
    return "Transporte";
  if (desc.includes("aluguel") || desc.includes("condominio") || desc.includes("condomínio") || desc.includes("luz") || desc.includes("energia") || desc.includes("agua") || desc.includes("água") || desc.includes("internet") || desc.includes("iptu"))
    return "Moradia";
  if (desc.includes("farmacia") || desc.includes("farmácia") || desc.includes("hospital") || desc.includes("plano de saude") || desc.includes("plano de saúde") || desc.includes("medico") || desc.includes("médico") || desc.includes("dentista") || desc.includes("academia"))
    return "Saúde";
  if (desc.includes("escola") || desc.includes("faculdade") || desc.includes("curso") || desc.includes("mensalidade escolar") || desc.includes("livro") || desc.includes("udemy"))
    return "Educação";
  if (desc.includes("cinema") || desc.includes("show") || desc.includes("bar ") || desc.includes("balada") || desc.includes("passeio") || desc.includes("jogo"))
    return "Lazer";
  if (desc.includes("netflix") || desc.includes("spotify") || desc.includes("prime video") || desc.includes("disney") || desc.includes("hbo") || desc.includes("assinatura") || desc.includes("mensalidade"))
    return "Assinaturas";
  if (desc.includes("roupa") || desc.includes("loja") || desc.includes("calçado") || desc.includes("calcado") || desc.includes("tenis") || desc.includes("tênis") || desc.includes("zara") || desc.includes("renner"))
    return "Vestuário";
  if (desc.includes("pet") || desc.includes("veterinario") || desc.includes("veterinário") || desc.includes("racao") || desc.includes("ração") || desc.includes("petshop"))
    return "Pets";
  if (desc.includes("viagem") || desc.includes("passagem") || desc.includes("hotel") || desc.includes("hospedagem") || desc.includes("airbnb") || desc.includes("aereo") || desc.includes("aéreo"))
    return "Viagem";
  if (desc.includes("presente") || desc.includes("doacao") || desc.includes("doação") || desc.includes("caridade"))
    return "Presentes/Doações";
  if (desc.includes("imposto") || desc.includes("taxa") || desc.includes("irpf") || desc.includes("ipva") || desc.includes("darf"))
    return "Impostos/Taxas";
  if (desc.includes("reforma") || desc.includes("manutencao") || desc.includes("manutenção") || desc.includes("encanador") || desc.includes("eletricista") || desc.includes("marido de aluguel"))
    return "Casa/Manutenção";

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

  return roundMoney(bill.originalAmount + penalty + interest);
}

/** Retorna a mesma data um mês à frente, no formato YYYY-MM-DD */
export function toLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addOneMonth(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return toLocalISODate(d);
}

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

/** Formata uma chave "YYYY-MM" como "Agosto de 2026", usada nos seletores de mês */
export function formatMonthLabel(monthKey: string): string {
  const label = monthLabelFormatter.format(new Date(monthKey + "-02T00:00:00"));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function currentMonthKey(): string {
  return toLocalISODate(new Date()).substring(0, 7);
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

/* ------------------------------------------------------------------ */
/* Indicadores inteligentes do dashboard                              */
/* ------------------------------------------------------------------ */

export interface MonthlyTotals {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
}

/** Agrupa transações por mês (YYYY-MM), somando receitas/despesas e o saldo do mês. */
export function getMonthlyTotals(transactions: Transaction[]): MonthlyTotals[] {
  const acc: Record<string, MonthlyTotals> = {};
  transactions.forEach((t) => {
    const month = t.date.substring(0, 7);
    if (!acc[month]) acc[month] = { month, income: 0, expense: 0, balance: 0 };
    if (t.type === "income") acc[month].income += t.amount;
    else acc[month].expense += t.amount;
  });
  return Object.values(acc)
    .map((m) => ({ ...m, income: roundMoney(m.income), expense: roundMoney(m.expense), balance: roundMoney(m.income - m.expense) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Retorna a chave do mês anterior a partir de "YYYY-MM". */
export function previousMonthKey(monthKey: string): string {
  const d = new Date(monthKey + "-01T00:00:00");
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().substring(0, 7);
}

export interface MonthComparison {
  currentExpense: number;
  previousExpense: number;
  expenseDeltaPct: number | null; // null quando não há base de comparação
  currentIncome: number;
  previousIncome: number;
  incomeDeltaPct: number | null;
}

/** Compara receitas/despesas do mês informado contra o mês imediatamente anterior. */
export function compareToPreviousMonth(transactions: Transaction[], monthKey: string): MonthComparison {
  const prevKey = previousMonthKey(monthKey);
  let currentExpense = 0, previousExpense = 0, currentIncome = 0, previousIncome = 0;

  transactions.forEach((t) => {
    const m = t.date.substring(0, 7);
    if (m === monthKey) {
      if (t.type === "expense") currentExpense += t.amount;
      else currentIncome += t.amount;
    } else if (m === prevKey) {
      if (t.type === "expense") previousExpense += t.amount;
      else previousIncome += t.amount;
    }
  });

  const pct = (curr: number, prev: number) => (prev > 0 ? roundMoney(((curr - prev) / prev) * 100) : null);

  return {
    currentExpense: roundMoney(currentExpense),
    previousExpense: roundMoney(previousExpense),
    expenseDeltaPct: pct(currentExpense, previousExpense),
    currentIncome: roundMoney(currentIncome),
    previousIncome: roundMoney(previousIncome),
    incomeDeltaPct: pct(currentIncome, previousIncome),
  };
}

/** Percentual da renda do mês já comprometido com despesas (quanto menor, melhor). */
export function percentIncomeCommitted(monthIncome: number, monthExpense: number): number | null {
  if (monthIncome <= 0) return null;
  return roundMoney((monthExpense / monthIncome) * 100);
}

/**
 * Projeta o saldo do fim do mês assumindo que o "ritmo diário" de gasto observado
 * até hoje se mantém constante nos dias restantes do mês.
 */
export function forecastEndOfMonthBalance(
  transactions: Transaction[],
  monthKey: string,
  referenceDate: Date = new Date()
): { projectedBalance: number; projectedExpense: number; daysElapsed: number; daysRemaining: number } {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const isCurrentMonth = toLocalISODate(referenceDate).substring(0, 7) === monthKey;
  const dayOfMonth = isCurrentMonth ? referenceDate.getDate() : daysInMonth;
  const daysElapsed = Math.max(1, dayOfMonth);
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  let income = 0, expense = 0;
  transactions
    .filter((t) => t.date.substring(0, 7) === monthKey)
    .forEach((t) => (t.type === "income" ? (income += t.amount) : (expense += t.amount)));

  const dailyExpenseRate = expense / daysElapsed;
  const projectedExpense = roundMoney(expense + dailyExpenseRate * daysRemaining);
  const projectedBalance = roundMoney(income - projectedExpense);

  return { projectedBalance, projectedExpense, daysElapsed, daysRemaining };
}

/* ------------------------------------------------------------------ */
/* Cartões de crédito e parcelamento                                  */
/* ------------------------------------------------------------------ */

/** Gera as N parcelas de uma compra parcelada, uma por mês a partir da data base. */
export function generateInstallments(
  base: Omit<Transaction, "id" | "installmentGroupId" | "installmentNumber" | "installmentTotal" | "amount">,
  totalAmount: number,
  installments: number
): Omit<Transaction, "id">[] {
  const groupId = generateId("inst");
  const baseDate = new Date(base.date + "T00:00:00");
  const installmentAmount = roundMoney(totalAmount / installments);
  // Ajusta a última parcela para não perder centavos por arredondamento
  const roundingDrift = roundMoney(totalAmount - installmentAmount * installments);

  const result: Omit<Transaction, "id">[] = [];
  for (let i = 0; i < installments; i++) {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + i);
    const isLast = i === installments - 1;
    result.push({
      ...base,
      date: toLocalISODate(d),
      amount: isLast ? roundMoney(installmentAmount + roundingDrift) : installmentAmount,
      installmentGroupId: groupId,
      installmentNumber: i + 1,
      installmentTotal: installments,
    });
  }
  return result;
}

/** Dado o dia de fechamento de um cartão, retorna a chave do mês (YYYY-MM) da fatura em que uma compra cai. */
export function invoiceMonthForPurchase(purchaseDate: string, closingDay: number): string {
  const d = new Date(purchaseDate + "T00:00:00");
  // Se a compra é feita no dia do fechamento ou depois, ela cai na fatura do mês seguinte
  if (d.getDate() >= closingDay) {
    d.setMonth(d.getMonth() + 1);
  }
  return toLocalISODate(d).substring(0, 7);
}

export interface CardUsage {
  card: CreditCard;
  used: number; // total de compras já lançadas nas faturas em aberto (não pagas ainda) + futuras
  available: number;
  currentInvoiceAmount: number; // fatura do mês corrente
  nextInvoices: { month: string; amount: number }[]; // próximos 3 meses
  dueDate: string; // próxima data de vencimento, YYYY-MM-DD
}

/** Calcula uso, limite disponível, fatura atual e próximas faturas de um cartão. */
export function calculateCardUsage(
  card: CreditCard,
  transactions: Transaction[],
  referenceDate: Date = new Date()
): CardUsage {
  const cardTransactions = transactions.filter((t) => t.cardId === card.id && t.type === "expense");
  const refMonthKey = toLocalISODate(referenceDate).substring(0, 7);

  const invoiceTotals: Record<string, number> = {};
  cardTransactions.forEach((t) => {
    const invoiceMonth = invoiceMonthForPurchase(t.date, card.closingDay);
    invoiceTotals[invoiceMonth] = roundMoney((invoiceTotals[invoiceMonth] || 0) + t.amount);
  });

  const currentInvoiceAmount = invoiceTotals[refMonthKey] || 0;

  const nextInvoices: { month: string; amount: number }[] = [];
  const cursor = new Date(referenceDate);
  for (let i = 1; i <= 3; i++) {
    cursor.setMonth(cursor.getMonth() + (i === 1 ? 1 : 1));
    const key = toLocalISODate(cursor).substring(0, 7);
    nextInvoices.push({ month: key, amount: invoiceTotals[key] || 0 });
  }

  // "Usado" = soma de tudo que ainda não venceu (fatura atual + futuras conhecidas), representando o comprometimento do limite
  const used = roundMoney(
    Object.entries(invoiceTotals)
      .filter(([month]) => month >= refMonthKey)
      .reduce((sum, [, amount]) => sum + amount, 0)
  );
  const available = roundMoney(Math.max(0, card.limit - used));

  const dueDate = `${refMonthKey}-${String(card.dueDay).padStart(2, "0")}`;

  return { card, used, available, currentInvoiceAmount, nextInvoices, dueDate };
}

/* ------------------------------------------------------------------ */
/* Metas (savings goals)                                              */
/* ------------------------------------------------------------------ */

export interface GoalProgress {
  goal: Goal;
  progressPct: number;
  remaining: number;
  /** Previsão de quando a meta será atingida, com base no ritmo médio de aportes mensais (null se não houver dados) */
  forecastLabel: string | null;
}

/**
 * Estima quando uma meta será concluída, assumindo que o ritmo médio de
 * "quanto já foi guardado / meses desde a criação" se mantém constante.
 */
export function estimateGoalForecast(goal: Goal, referenceDate: Date = new Date()): string | null {
  if (goal.currentAmount >= goal.targetAmount) return "Concluída";

  const created = new Date(goal.createdAt + "T00:00:00");
  const monthsElapsed = Math.max(
    1,
    (referenceDate.getFullYear() - created.getFullYear()) * 12 + (referenceDate.getMonth() - created.getMonth()) + 1
  );
  const monthlyRate = goal.currentAmount / monthsElapsed;
  if (monthlyRate <= 0) return null;

  const remaining = goal.targetAmount - goal.currentAmount;
  const monthsToGo = Math.ceil(remaining / monthlyRate);

  const target = new Date(referenceDate);
  target.setMonth(target.getMonth() + monthsToGo);
  return formatMonthLabel(toLocalISODate(target).substring(0, 7));
}

export function getGoalProgress(goal: Goal, referenceDate: Date = new Date()): GoalProgress {
  const progressPct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  return {
    goal,
    progressPct,
    remaining: roundMoney(Math.max(0, goal.targetAmount - goal.currentAmount)),
    forecastLabel: estimateGoalForecast(goal, referenceDate),
  };
}

/* ------------------------------------------------------------------ */
/* Saúde financeira (score 0-100)                                     */
/* ------------------------------------------------------------------ */

export interface FinancialHealthBreakdown {
  reserve: number; // reserva financeira (saldo acumulado / gasto médio mensal)
  control: number; // controle de gastos (mês atual vs mês anterior)
  budget: number; // aderência ao orçamento por categoria
  debt: number; // endividamento (uso do limite dos cartões)
  goals: number; // progresso médio das metas
}

export interface FinancialHealthResult {
  score: number;
  breakdown: FinancialHealthBreakdown;
  message: string;
  level: "critical" | "attention" | "good" | "excellent";
}

/**
 * Calcula uma pontuação de saúde financeira de 0 a 100, combinando 5 dimensões
 * (cada uma também de 0-100). O objetivo não é ser um cálculo atuarial exato,
 * e sim dar um retrato acionável e explicável da situação do usuário.
 */
export function calculateFinancialHealth(params: {
  transactions: Transaction[];
  budgets: Budget;
  cards: CreditCard[];
  goals: Goal[];
  monthKey: string;
}): FinancialHealthResult {
  const { transactions, budgets, cards, goals, monthKey } = params;

  const monthlyTotals = getMonthlyTotals(transactions);
  const last3 = monthlyTotals.slice(-3);
  const avgMonthlyExpense = last3.length > 0 ? last3.reduce((s, m) => s + m.expense, 0) / last3.length : 0;

  const { balance: totalBalance } = (() => {
    let income = 0, expense = 0;
    transactions.forEach((t) => (t.type === "income" ? (income += t.amount) : (expense += t.amount)));
    return { balance: income - expense };
  })();

  // 1) Reserva financeira: quantos meses de despesa o saldo acumulado cobre (meta: 6 meses = 100)
  const monthsOfReserve = avgMonthlyExpense > 0 ? totalBalance / avgMonthlyExpense : totalBalance > 0 ? 6 : 0;
  const reserve = clampScore((monthsOfReserve / 6) * 100);

  // 2) Controle de gastos: variação do mês atual vs anterior (queda = bom, alta = ruim)
  const comparison = compareToPreviousMonth(transactions, monthKey);
  const control =
    comparison.expenseDeltaPct === null ? 70 : clampScore(70 - comparison.expenseDeltaPct * 1.5);

  // 3) Orçamento: % das categorias orçadas que ficaram dentro do limite no mês
  const monthExpensesByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "expense" && t.date.substring(0, 7) === monthKey)
    .forEach((t) => (monthExpensesByCategory[t.category] = (monthExpensesByCategory[t.category] || 0) + t.amount));
  const budgetCategories = Object.keys(budgets);
  const budget =
    budgetCategories.length === 0
      ? 70
      : clampScore(
          (budgetCategories.filter((c) => (monthExpensesByCategory[c] || 0) <= budgets[c]).length / budgetCategories.length) * 100
        );

  // 4) Endividamento: quanto do limite total dos cartões está comprometido (menos uso = melhor)
  const cardUsages = cards.map((c) => calculateCardUsage(c, transactions));
  const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
  const totalUsed = cardUsages.reduce((s, u) => s + u.used, 0);
  const debt = totalLimit === 0 ? 100 : clampScore(100 - (totalUsed / totalLimit) * 100);

  // 5) Metas: progresso médio de todas as metas ativas
  const goalsScore = goals.length === 0 ? 70 : clampScore(goals.reduce((s, g) => s + getGoalProgress(g).progressPct, 0) / goals.length);

  const breakdown: FinancialHealthBreakdown = {
    reserve: Math.round(reserve),
    control: Math.round(control),
    budget: Math.round(budget),
    debt: Math.round(debt),
    goals: Math.round(goalsScore),
  };

  const score = Math.round((breakdown.reserve + breakdown.control + breakdown.budget + breakdown.debt + breakdown.goals) / 5);

  const level: FinancialHealthResult["level"] = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "attention" : "critical";

  const messageParts: string[] = [];
  if (level === "excellent") messageParts.push("Excelente situação financeira.");
  else if (level === "good") messageParts.push("Boa situação financeira.");
  else if (level === "attention") messageParts.push("Sua situação financeira pede atenção.");
  else messageParts.push("Situação financeira crítica — é hora de agir.");

  if (comparison.expenseDeltaPct !== null) {
    messageParts.push(
      comparison.expenseDeltaPct <= 0
        ? `Você gastou ${Math.abs(comparison.expenseDeltaPct)}% a menos que no mês passado.`
        : `Seus gastos subiram ${comparison.expenseDeltaPct}% em relação ao mês passado.`
    );
  }
  if (breakdown.reserve < 40) messageParts.push("Sua reserva financeira está baixa para imprevistos.");
  if (breakdown.debt < 40) messageParts.push("O uso do limite dos seus cartões está alto.");
  if (breakdown.goals >= 70 && goals.length > 0) messageParts.push("Suas metas estão em bom ritmo.");

  return { score, breakdown, message: messageParts.join(" "), level };
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
