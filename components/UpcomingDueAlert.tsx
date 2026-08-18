import { Bill } from "@/lib/types";
import { formatCurrency } from "@/lib/finance";
import { CATEGORY_ICONS } from "@/lib/constants";

interface UpcomingDueAlertProps {
  bills: Bill[];
}

const DAYS_AHEAD = 7;

/**
 * Novo: painel de alerta com as contas que vencem nos próximos 7 dias
 * (ou já venceram e seguem em aberto), para o usuário não ser pego de surpresa.
 * Só aparece quando há algo relevante a mostrar.
 */
export function UpcomingDueAlert({ bills }: UpcomingDueAlertProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const relevant = bills
    .filter((b) => !b.isPaid && b.type === "expense")
    .map((b) => {
      const due = new Date(b.dueDate + "T00:00:00");
      const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { bill: b, diffDays };
    })
    .filter((item) => item.diffDays <= DAYS_AHEAD)
    .sort((a, b) => a.diffDays - b.diffDays);

  if (relevant.length === 0) return null;

  return (
    <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⏰</span>
        <h3 className="text-sm font-semibold text-amber-300">
          {relevant.some((r) => r.diffDays < 0) ? "Contas atrasadas ou vencendo em breve" : "Contas vencendo nos próximos 7 dias"}
        </h3>
      </div>
      <ul className="space-y-2">
        {relevant.map(({ bill, diffDays }) => (
          <li key={bill.id} className="flex items-center justify-between text-xs bg-slate-950/50 rounded-lg px-3 py-2">
            <span className="text-slate-300 flex items-center gap-1.5 truncate">
              {CATEGORY_ICONS[bill.category] ?? ""} {bill.description}
            </span>
            <span className="flex items-center gap-3 shrink-0 ml-2">
              <span className="text-slate-400">{formatCurrency(bill.originalAmount)}</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                  diffDays < 0
                    ? "bg-rose-950 text-rose-400"
                    : diffDays === 0
                    ? "bg-amber-900 text-amber-300"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {diffDays < 0 ? `${Math.abs(diffDays)}d atrasada` : diffDays === 0 ? "Vence hoje" : `em ${diffDays}d`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
