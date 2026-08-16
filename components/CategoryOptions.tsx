import { CATEGORIES } from "@/lib/constants";

export function CategoryOptions() {
  return (
    <>
      {CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </>
  );
}
