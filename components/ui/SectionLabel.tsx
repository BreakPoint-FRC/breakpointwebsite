interface SectionLabelProps {
  text: string;
  className?: string;
}

/** Editör gutter'ı gibi bölüm etiketi: `●  02  FRC NEDİR?` */
export function SectionLabel({ text, className = "" }: SectionLabelProps) {
  return (
    <span
      className={`whitespace-pre font-label uppercase text-bp-muted fs-12 ls-3 lg:fs-14 lg:ls-4 ${className}`}
    >
      <span className="text-bp-yellow">●</span>
      {"  "}
      {text}
    </span>
  );
}
