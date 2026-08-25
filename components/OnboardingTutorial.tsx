"use client";

import { useState } from "react";

interface TutorialStep {
  icon: string;
  title: string;
  description: string;
}

const STEPS: TutorialStep[] = [
  {
    icon: "👋",
    title: "Bem-vindo ao SmartFinance",
    description:
      "Esse tour rápido mostra onde encontrar cada funcionalidade do dashboard. Leva menos de um minuto — você pode reabrir a qualquer momento pelo botão \"Ajuda\" no topo da página.",
  },
  {
    icon: "🏠",
    title: "Dashboard",
    description:
      "Sua visão geral: saldo, receitas, despesas, indicadores inteligentes (como \"você gastou 18% menos que no mês passado\"), gráficos de fluxo de caixa e o extrato completo de transações.",
  },
  {
    icon: "🩺",
    title: "Saúde Financeira",
    description:
      "Uma pontuação de 0 a 100 que resume sua situação financeira, combinando reserva de emergência, controle de gastos, orçamento, endividamento nos cartões e progresso das metas — com uma explicação em texto do porquê da nota.",
  },
  {
    icon: "💳",
    title: "Cartões de Crédito",
    description:
      "Cadastre seus cartões com limite, dia de fechamento e vencimento. O sistema calcula automaticamente o valor utilizado, o limite disponível, a fatura atual e as próximas 3 faturas.",
  },
  {
    icon: "🧾",
    title: "Compras parceladas",
    description:
      "Ao lançar uma despesa em um cartão, marque \"Compra parcelada\" e informe o número de parcelas (ex: 12x). O sistema cria automaticamente cada parcela mensal já relacionada entre si.",
  },
  {
    icon: "🎯",
    title: "Metas",
    description:
      "Crie metas nomeadas (ex: \"Comprar notebook\"), acompanhe o progresso com barra visual, registre aportes e veja uma previsão automática de quando a meta será concluída, com base no seu ritmo de poupança.",
  },
  {
    icon: "🗂️",
    title: "Categorias",
    description:
      "Categorias organizadas em hierarquia (ex: Alimentação → Mercado, Restaurante, Delivery). Você pode criar suas próprias categorias e subcategorias personalizadas a qualquer momento.",
  },
  {
    icon: "📊",
    title: "Relatórios",
    description:
      "Explore seus dados por período: Mensal, Anual, Categorias, Receitas, Despesas ou Cartões. Exporte tudo em CSV, Excel ou PDF para guardar ou compartilhar.",
  },
  {
    icon: "⚠️",
    title: "Notificações inteligentes",
    description:
      "O painel de notificações no Dashboard avisa automaticamente sobre faturas próximas do vencimento, categorias com gasto em alta, orçamentos estourados e metas quase concluídas — sem precisar configurar nada.",
  },
  {
    icon: "📱",
    title: "Instale como aplicativo",
    description:
      "No celular, use a opção \"Adicionar à tela inicial\" do seu navegador para instalar o SmartFinance como um app — ele funciona mesmo offline, usando os dados já salvos no seu dispositivo.",
  },
];

interface OnboardingTutorialProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingTutorial({ open, onClose }: OnboardingTutorialProps) {
  const [stepIndex, setStepIndex] = useState(0);

  if (!open) return null;

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const handleClose = () => {
    setStepIndex(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg shadow-black/40 max-w-md w-full p-6 space-y-5">
        <div className="flex justify-between items-start">
          <span className="text-4xl">{step.icon}</span>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-300 text-sm transition">
            Pular tour ✕
          </button>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-1.5">{step.title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? "w-6 bg-cyan-500" : "w-1.5 bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between items-center gap-3 pt-1">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition disabled:opacity-0 disabled:pointer-events-none"
          >
            Voltar
          </button>
          <span className="text-xs text-slate-600">
            {stepIndex + 1} / {STEPS.length}
          </span>
          {isLast ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              Concluir
            </button>
          ) : (
            <button
              onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition"
            >
              Próximo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
