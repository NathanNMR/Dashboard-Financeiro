import { CATEGORIES, CATEGORY_ICONS, INCOME_CATEGORIES } from "@/lib/constants";

interface CategoryOptionsProps {
  /** Quando informado, mostra só as categorias compatíveis com esse tipo (ex: "Salário" some das despesas) */
  type?: "income" | "expense";
}

export function CategoryOptions({ type }: CategoryOptionsProps) {
  const list = !type
    ? CATEGORIES
    : CATEGORIES.filter((cat) =>
        type === "income" ? (INCOME_CATEGORIES as readonly string[]).includes(cat) : !(INCOME_CATEGORIES as readonly string[]).includes(cat)
      );

  return (
    <>
      {list.map((cat) => (
        <option key={cat} value={cat}>
          {CATEGORY_ICONS[cat] ?? ""} {cat}
        </option>
      ))}
    </>
  );
}
