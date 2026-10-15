import type { ReactNode } from "react";

type Variant = "solid" | "ghost" | "dark";

const CLASS: Record<Variant, string> = {
  solid: "btn",
  ghost: "btn ghost",
  dark: "btn dark",
};

interface LinkButtonProps {
  href: string;
  variant?: Variant;
  children: ReactNode;
}

export function LinkButton({ href, variant = "solid", children }: LinkButtonProps) {
  return (
    <a className={CLASS[variant]} href={href}>
      {children}
    </a>
  );
}
