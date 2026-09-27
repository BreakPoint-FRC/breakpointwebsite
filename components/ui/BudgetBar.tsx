import type { BudgetItem } from "@/content/types";

const FILL: Record<BudgetItem["tone"], string> = {
  yellow: "fill-bp-yellow",
  white: "fill-bp-white",
  muted: "fill-bp-muted",
  line: "fill-bp-line",
};

export const SWATCH: Record<BudgetItem["tone"], string> = {
  yellow: "text-bp-yellow",
  white: "text-bp-white",
  muted: "text-bp-muted",
  line: "text-bp-line",
};

interface BudgetBarProps {
  items: BudgetItem[];
  isExample: boolean;
  className?: string;
}

/** Yığılmış bütçe çubuğu. Genişlikler SVG özniteliği (inline style yok). */
export function BudgetBar({ items, isExample, className = "" }: BudgetBarProps) {
  const label = `Bütçe dağılımı${isExample ? " (örnek)" : ""}: ${items.map((i) => `${i.label} %${i.share}`).join(", ")}`;
  const offsets = items.map((_, i) => items.slice(0, i).reduce((sum, it) => sum + it.share, 0));
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label={label} className={`block w-full ${className}`}>
      {items.map((item, i) => (
        <rect key={item.label} x={offsets[i]} y={0} width={item.share} height={10} className={FILL[item.tone]} />
      ))}
    </svg>
  );
}
