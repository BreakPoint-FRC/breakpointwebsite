interface BpMarkProps {
  className?: string;
}

/** Logo gelene kadar: çentikli köşeli "BP" karesi. Boyut ve font className ile verilir. */
export function BpMark({ className = "" }: BpMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-bp-yellow font-display font-semibold text-bp-black clip-bp ${className}`}
    >
      BP
    </span>
  );
}
