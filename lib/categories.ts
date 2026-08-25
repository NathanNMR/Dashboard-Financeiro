import { CATEGORIES, CATEGORY_ICONS, DEFAULT_CATEGORY_TREE, INCOME_CATEGORIES } from "./constants";
import { CategoryDef } from "./types";

export interface CategoryNode {
  name: string;
  icon: string;
  custom: boolean;
  children: { name: string; custom: boolean }[];
}

/**
 * Combina a árvore de categorias padrão do app com as categorias/subcategorias
 * criadas pelo próprio usuário (guardadas em localStorage), formando uma única
 * estrutura hierárquica para exibição e seleção.
 */
export function buildCategoryTree(customCategories: CategoryDef[]): CategoryNode[] {
  const topLevelNames = new Set<string>(CATEGORIES);
  const tree: Record<string, Set<string>> = {};

  CATEGORIES.forEach((name) => {
    tree[name] = new Set(DEFAULT_CATEGORY_TREE[name] ?? []);
  });

  customCategories.forEach((cat) => {
    if (cat.parent) {
      if (!tree[cat.parent]) tree[cat.parent] = new Set();
      tree[cat.parent].add(cat.name);
    } else if (!topLevelNames.has(cat.name)) {
      topLevelNames.add(cat.name);
      tree[cat.name] = new Set();
    }
  });

  const customTopLevelNames = new Set(customCategories.filter((c) => !c.parent).map((c) => c.name));
  const customSubNames = new Set(customCategories.filter((c) => c.parent).map((c) => c.name));

  return Array.from(topLevelNames).map((name) => ({
    name,
    icon: CATEGORY_ICONS[name] ?? customCategories.find((c) => c.name === name)?.icon ?? "📦",
    custom: customTopLevelNames.has(name),
    children: Array.from(tree[name] ?? []).map((sub) => ({ name: sub, custom: customSubNames.has(sub) })),
  }));
}

/** Lista plana de todas as categorias de topo (padrão + criadas pelo usuário). */
export function getAllTopLevelCategories(customCategories: CategoryDef[]): string[] {
  const custom = customCategories.filter((c) => !c.parent).map((c) => c.name);
  return Array.from(new Set([...CATEGORIES, ...custom]));
}

export function getTopLevelCategoriesByType(customCategories: CategoryDef[], type: "income" | "expense"): string[] {
  const all = getAllTopLevelCategories(customCategories);
  const customIncome = customCategories.filter((c) => !c.parent && c.type === "income").map((c) => c.name);
  const incomeSet = new Set([...INCOME_CATEGORIES, ...customIncome]);
  return all.filter((c) => (type === "income" ? incomeSet.has(c) : !incomeSet.has(c)));
}

/** Subcategorias disponíveis para uma categoria de topo específica. */
export function getSubcategories(customCategories: CategoryDef[], parent: string): string[] {
  const defaults = DEFAULT_CATEGORY_TREE[parent] ?? [];
  const custom = customCategories.filter((c) => c.parent === parent).map((c) => c.name);
  return Array.from(new Set([...defaults, ...custom]));
}
