import { formatCurrency } from "@/lib/finance";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function SummaryCards({ totalIncome, totalExpense, balance }: SummaryCardsProps) {
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-emerald-500/10" />
        <span className="text-sm font-medium text-slate-400">Receitas Totais</span>
        <div className="text-3xl font-bold text-emerald-400 mt-2">{formatCurrency(totalIncome)}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-rose-500/10" />
        <span className="text-sm font-medium text-slate-400">Despesas Totais</span>
        <div className="text-3xl font-bold text-rose-400 mt-2">{formatCurrency(totalExpense)}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${balance >= 0 ? "bg-cyan-500/10" : "bg-amber-500/10"}`} />
        <span className="text-sm font-medium text-slate-400">Saldo Atual</span>
        <div className={`text-3xl font-bold mt-2 ${balance >= 0 ? "text-cyan-400" : "text-amber-400"}`}>
          {formatCurrency(balance)}
        </div>
        {totalIncome > 0 && (
          <div className="text-xs text-slate-500 mt-1">
            {savingsRate >= 0 ? `${savingsRate}% das receitas preservado` : `${Math.abs(savingsRate)}% acima das receitas`}
          </div>
        )}
      </div>
    </div>
  );
}
