import { CATEGORIES, CATEGORY_ICONS } from "@/lib/constants";

export function CategoryOptions() {
  return (
    <>
      {CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {CATEGORY_ICONS[cat] ?? ""} {cat}
        </option>
      ))}
    </>
  );
}
