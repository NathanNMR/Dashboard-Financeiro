"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/finance";
import { EmptyState } from "./EmptyState";

const tooltipStyle = { backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" };

interface MonthlyDatum {
  month: string;
  income: number;
  expense: number;
}

export function CashFlowChart({ data }: { data: MonthlyDatum[] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Fluxo de Caixa Mensal</h3>
      <div className="h-72 w-full">
        {data.length === 0 ? (
          <EmptyState message="Adicione transações para ver o fluxo de caixa." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="income" name="Receitas" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

interface ProjectedDatum extends MonthlyDatum {
  projectedExpense: number | null;
}

export function ExpenseProjectionChart({ data }: { data: ProjectedDatum[] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-semibold text-slate-200">Projeção de Despesas (Regressão Linear)</h3>
        <p className="text-xs text-slate-400 mb-4">Tendência baseada estatisticamente no histórico.</p>
      </div>
      <div className="h-72 w-full">
        {data.length < 2 ? (
          <EmptyState message="Pelo menos 2 meses de histórico são necessários para projetar despesas." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="expense" name="Despesa Real" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
              <Area
                type="monotone"
                dataKey="projectedExpense"
                name="Despesa Projetada"
                stroke="#38bdf8"
                strokeDasharray="5 5"
                fill="#38bdf8"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function ExpenseByCategoryChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <h3 className="text-lg font-semibold text-slate-200 mb-2">Despesas por Categoria</h3>
      {data.length === 0 ? (
        <div className="h-72 w-full">
          <EmptyState message="Nenhuma despesa registrada ainda." />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-64 w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sorted} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {sorted.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#94a3b8"} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full sm:w-1/2 space-y-2 max-h-64 overflow-y-auto pr-1">
            {sorted.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[entry.name] || "#94a3b8" }}
                  />
                  {CATEGORY_ICONS[entry.name] ?? ""} {entry.name}
                </span>
                <span className="text-slate-400 shrink-0 ml-2">
                  {formatCurrency(entry.value)}
                  <span className="text-slate-600"> ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
