"use client";

import { FormEvent, useState } from "react";
import { Goal } from "@/lib/types";
import { formatCurrency, generateId, getGoalProgress, toLocalISODate } from "@/lib/finance";
import { parseMoneyInput } from "@/lib/money";
import { FieldWrapper, TextInput } from "./FormField";
import { EmptyState } from "./EmptyState";

interface GoalsManagerProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onUpdateGoal: (id: string, currentAmount: number) => void;
  onRemoveGoal: (id: string) => void;
}

const EMOJIS = ["🎯", "💻", "🏠", "🚗", "✈️", "🛟", "📱", "🎓"];

export function GoalsManager({ goals, onAddGoal, onUpdateGoal, onRemoveGoal }: GoalsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState(EMOJIS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseMoneyInput(target);
    const parsedCurrent = current ? parseMoneyInput(current) : 0;

    if (!title.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError("Informe um título e um valor-alvo maior que zero.");
      return;
    }

    onAddGoal({
      id: generateId("goal"),
      title: title.trim(),
      icon,
      targetAmount: parsedTarget,
      currentAmount: Number.isFinite(parsedCurrent) ? parsedCurrent : 0,
      deadline: deadline || undefined,
      createdAt: toLocalISODate(),
    });

    setTitle("");
    setTarget("");
    setCurrent("");
    setDeadline("");
    setIcon(EMOJIS[0]);
    setError(null);
    setShowForm(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">🎯 Metas</h3>
          <p className="text-xs text-slate-500">Acompanhe o progresso de cada objetivo financeiro.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
        >
          {showForm ? "Cancelar" : "+ Nova meta"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 mb-5 bg-slate-950/50 border border-slate-800 rounded-lg p-4">
          <div className="flex gap-2 flex-wrap">
            {EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setIcon(e)}
                className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition ${
                  icon === e ? "border-cyan-500 bg-cyan-950/40" : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <FieldWrapper label="Título da meta" htmlFor="goal-title">
            <TextInput id="goal-title" placeholder="Ex: Comprar notebook" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FieldWrapper>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FieldWrapper label="Valor-alvo (R$)" htmlFor="goal-target">
              <TextInput id="goal-target" type="number" step="0.01" min="0.01" value={target} onChange={(e) => setTarget(e.target.value)} />
            </FieldWrapper>
            <FieldWrapper label="Já guardado (R$)" htmlFor="goal-current">
              <TextInput id="goal-current" type="number" step="0.01" min="0" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </FieldWrapper>
            <FieldWrapper label="Prazo (opcional)" htmlFor="goal-deadline">
              <TextInput id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </FieldWrapper>
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-lg transition">
            Salvar meta
          </button>
        </form>
      )}

      {goals.length === 0 ? (
        <EmptyState message="Nenhuma meta cadastrada ainda." />
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal);
            return (
              <div key={goal.id} className="border border-slate-800 rounded-xl p-4 bg-slate-950/40">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-slate-200">
                    {goal.icon ?? "🎯"} {goal.title}
                  </span>
                  <button onClick={() => onRemoveGoal(goal.id)} className="text-xs text-rose-400 hover:underline">
                    Remover
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <div className="text-slate-500">Meta</div>
                    <div className="text-slate-200 font-medium">{formatCurrency(goal.targetAmount)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Atual</div>
                    <div className="text-cyan-400 font-medium">{formatCurrency(goal.currentAmount)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Faltam</div>
                    <div className="text-amber-400 font-medium">{formatCurrency(progress.remaining)}</div>
                  </div>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 mb-2">
                  <div
                    className={`h-full transition-all ${progress.progressPct >= 100 ? "bg-emerald-500" : "bg-cyan-500"}`}
                    style={{ width: `${progress.progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{progress.progressPct}% concluído</span>
                  {progress.forecastLabel && <span>Previsão: {progress.forecastLabel}</span>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <TextInput
                    type="number"
                    step="0.01"
                    placeholder="Adicionar aporte (R$)"
                    className="text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.target as HTMLInputElement;
                        const value = parseMoneyInput(input.value);
                        if (Number.isFinite(value) && value > 0) {
                          onUpdateGoal(goal.id, goal.currentAmount + value);
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <span className="text-xs text-slate-600 whitespace-nowrap">Enter p/ salvar</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
