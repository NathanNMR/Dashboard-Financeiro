import { formatCurrency } from "@/lib/finance";
import { CATEGORY_ICONS } from "@/lib/constants";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  topCategory: { name: string; value: number } | null;
}

export function SummaryCards({ totalIncome, totalExpense, balance, topCategory }: SummaryCardsProps) {
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  const topCategoryShare = topCategory && totalExpense > 0 ? Math.round((topCategory.value / totalExpense) * 100) : 0;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
      <div className="bg-slate-900 border border-slate-800 border-l-2 border-l-emerald-600 rounded-xl p-4 sm:p-6">
        <span className="text-xs sm:text-sm font-medium text-slate-500">Receitas Totais</span>
        <div className="text-lg sm:text-2xl font-semibold break-words text-slate-100 mt-1.5">{formatCurrency(totalIncome)}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 border-l-2 border-l-rose-600 rounded-xl p-4 sm:p-6">
        <span className="text-xs sm:text-sm font-medium text-slate-500">Despesas Totais</span>
        <div className="text-lg sm:text-2xl font-semibold break-words text-slate-100 mt-1.5">{formatCurrency(totalExpense)}</div>
      </div>
      <div className={`bg-slate-900 border border-slate-800 border-l-2 rounded-xl p-4 sm:p-6 ${balance >= 0 ? "border-l-cyan-600" : "border-l-amber-600"}`}>
        <span className="text-xs sm:text-sm font-medium text-slate-500">Saldo Atual</span>
        <div className={`text-lg sm:text-2xl font-semibold break-words mt-1.5 ${balance >= 0 ? "text-slate-100" : "text-amber-400"}`}>
          {formatCurrency(balance)}
        </div>
        {totalIncome > 0 && (
          <div className="text-xs text-slate-500 mt-1">
            {savingsRate >= 0 ? `${savingsRate}% das receitas preservado` : `${Math.abs(savingsRate)}% acima das receitas`}
          </div>
        )}
      </div>
      <div className="bg-slate-900 border border-slate-800 border-l-2 border-l-purple-600 rounded-xl p-4 sm:p-6">
        <span className="text-xs sm:text-sm font-medium text-slate-500">Maior Gasto</span>
        {topCategory ? (
          <>
            <div className="text-base sm:text-xl font-semibold text-slate-100 mt-1.5">
              {CATEGORY_ICONS[topCategory.name] ?? ""} {topCategory.name}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {formatCurrency(topCategory.value)} · {topCategoryShare}% das despesas
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-500 mt-1.5">Sem despesas ainda</div>
        )}
      </div>
    </div>
  );
}
