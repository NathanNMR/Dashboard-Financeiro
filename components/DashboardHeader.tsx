import { ChangeEvent } from "react";

interface DashboardHeaderProps {
  onImportCSV: (e: ChangeEvent<HTMLInputElement>) => void;
  onExportImage: () => void;
}

export function DashboardHeader({ onImportCSV, onExportImage }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          SmartFinance Dashboard Pro
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Controle completo de contas, planejamento de rendas, juros, orçamento e projeção.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <label className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition cursor-pointer shadow-lg shadow-cyan-900/30 text-center">
          Importar CSV
          <input type="file" accept=".csv" onChange={onImportCSV} className="hidden" />
        </label>
        <button
          onClick={onExportImage}
          className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium transition shadow flex items-center justify-center gap-1.5"
        >
          🖼️ Exportar Imagem
        </button>
      </div>
    </header>
  );
}
