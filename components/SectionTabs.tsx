"use client";

export type Section = "dashboard" | "cards" | "categories" | "goals" | "reports" | "health" | "team";

interface SectionTabsProps {
  active: Section;
  onChange: (section: Section) => void;
  showTeam?: boolean;
}

const BASE_SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "health", label: "Saúde Financeira", icon: "🩺" },
  { id: "cards", label: "Cartões", icon: "💳" },
  { id: "goals", label: "Metas", icon: "🎯" },
  { id: "categories", label: "Categorias", icon: "🗂️" },
  { id: "reports", label: "Relatórios", icon: "📊" },
];

const TEAM_SECTION: { id: Section; label: string; icon: string } = { id: "team", label: "Equipe", icon: "👥" };

export function SectionTabs({ active, onChange, showTeam }: SectionTabsProps) {
  const sections = showTeam ? [...BASE_SECTIONS, TEAM_SECTION] : BASE_SECTIONS;
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition border ${
            active === s.id
              ? "bg-cyan-600 border-cyan-600 text-white"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <span>{s.icon}</span>
          {s.label}
        </button>
      ))}
    </nav>
  );
}
