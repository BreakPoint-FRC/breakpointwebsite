import type { ReactNode } from "react";

type Variant = "solid" | "outline" | "outline-yellow";

const VARIANTS: Record<Variant, string> = {
  solid: "bg-bp-yellow text-bp-black font-semibold hover:bg-bp-white",
  outline: "border border-bp-white text-bp-white font-medium hover:border-bp-yellow hover:text-bp-yellow",
  "outline-yellow": "border border-bp-yellow text-bp-yellow font-semibold hover:bg-bp-yellow hover:text-bp-black",
};

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  download?: boolean;
}

/** Sarı üstüne yalnız siyah metin. Boyut/padding className ile verilir. */
export function LinkButton({
  href,
  variant = "solid",
  className = "",
  children,
  ariaLabel,
  download,
}: LinkButtonProps) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      download={download}
      className={`inline-flex items-center justify-center font-label uppercase transition-colors ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
