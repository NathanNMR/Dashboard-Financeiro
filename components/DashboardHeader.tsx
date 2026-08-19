import { ChangeEvent } from "react";

interface DashboardHeaderProps {
  onImportCSV: (e: ChangeEvent<HTMLInputElement>) => void;
  onExportImage: () => void;
}

export function DashboardHeader({ onImportCSV, onExportImage }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center text-slate-950 font-bold text-sm shrink-0">
          SF
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">SmartFinance</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Contas, rendas, orçamento e projeção financeira</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <label className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition cursor-pointer text-center">
          Importar CSV
          <input type="file" accept=".csv" onChange={onImportCSV} className="hidden" />
        </label>
        <button
          onClick={onExportImage}
          className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition"
        >
          Exportar Imagem
        </button>
      </div>
    </header>
  );
}
