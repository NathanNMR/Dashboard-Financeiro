"use client";

import { FormEvent, useMemo, useState } from "react";
import { CategoryDef } from "@/lib/types";
import { buildCategoryTree, getAllTopLevelCategories } from "@/lib/categories";
import { FieldWrapper, SelectInput, TextInput } from "./FormField";

interface CategoryManagerProps {
  customCategories: CategoryDef[];
  onAddCategory: (category: CategoryDef) => void;
  onRemoveCategory: (name: string) => void;
}

/**
 * Exibe a árvore de categorias (padrão + criadas pelo usuário) em formato
 * hierárquico e permite adicionar novas categorias de topo ou subcategorias.
 */
export function CategoryManager({ customCategories, onAddCategory, onRemoveCategory }: CategoryManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [icon, setIcon] = useState("📦");
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => buildCategoryTree(customCategories), [customCategories]);
  const topLevelOptions = useMemo(() => getAllTopLevelCategories(customCategories), [customCategories]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe um nome para a categoria.");
      return;
    }
    const alreadyExists = tree.some((t) => t.name === name.trim() || t.children.some((c) => c.name === name.trim()));
    if (alreadyExists) {
      setError("Já existe uma categoria com esse nome.");
      return;
    }
    onAddCategory({
      name: name.trim(),
      icon: parent ? undefined : icon,
      parent: parent || undefined,
      custom: true,
    });
    setName("");
    setParent("");
    setIcon("📦");
    setError(null);
    setShowForm(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">Categorias</h3>
          <p className="text-xs text-slate-500">Organize despesas e receitas em categorias e subcategorias.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
        >
          {showForm ? "Cancelar" : "+ Nova categoria"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 mb-5 bg-slate-950/50 border border-slate-800 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldWrapper label="Nome" htmlFor="cat-name">
              <TextInput id="cat-name" placeholder="Ex: Streaming de música" value={name} onChange={(e) => setName(e.target.value)} />
            </FieldWrapper>
            <FieldWrapper label="Categoria-pai (opcional)" htmlFor="cat-parent">
              <SelectInput id="cat-parent" value={parent} onChange={(e) => setParent(e.target.value)}>
                <option value="">— Categoria de topo —</option>
                {topLevelOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectInput>
            </FieldWrapper>
          </div>
          {!parent && (
            <FieldWrapper label="Ícone (emoji)" htmlFor="cat-icon">
              <TextInput id="cat-icon" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} className="w-20" />
            </FieldWrapper>
          )}
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-lg transition">
            Salvar categoria
          </button>
        </form>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {tree.map((node) => (
          <div key={node.name} className="border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-200">
                {node.icon} {node.name}
                {node.custom && <span className="ml-2 text-[10px] uppercase tracking-wide text-cyan-500">Personalizada</span>}
              </span>
              {node.custom && (
                <button onClick={() => onRemoveCategory(node.name)} className="text-xs text-rose-400 hover:underline">
                  Remover
                </button>
              )}
            </div>
            {node.children.length > 0 && (
              <div className="mt-2 ml-4 pl-3 border-l border-slate-800 space-y-1">
                {node.children.map((child) => (
                  <div key={child.name} className="flex justify-between items-center text-xs text-slate-400">
                    <span>
                      └── {child.name}
                      {child.custom && <span className="ml-2 text-[10px] uppercase tracking-wide text-cyan-500">Personalizada</span>}
                    </span>
                    {child.custom && (
                      <button onClick={() => onRemoveCategory(child.name)} className="text-rose-400 hover:underline">
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
