import { Budget } from "@/lib/types";
import { formatCurrency } from "@/lib/finance";
import { EmptyState } from "./EmptyState";

interface BudgetGoalsProps {
  budgets: Budget;
  spentByCategory: Record<string, number>;
}

export function BudgetGoals({ budgets, spentByCategory }: BudgetGoalsProps) {
  const categories = Object.keys(budgets);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1">Metas de Gastos Mensais</h3>
        <p className="text-xs text-slate-400 mb-4">Acompanhe o teto de gastos por categoria.</p>
      </div>
      {categories.length === 0 ? (
        <EmptyState message="Nenhuma meta de orçamento configurada." />
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-60 pr-2">
          {categories.map((cat) => {
            const spent = spentByCategory[cat] || 0;
            const limit = budgets[cat];
            const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            const isOver = spent > limit;

            return (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{cat}</span>
                  <span className={isOver ? "text-rose-400 font-bold" : "text-slate-400"}>
                    {formatCurrency(spent)} / {formatCurrency(limit)} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all ${isOver ? "bg-rose-500" : "bg-cyan-500"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
