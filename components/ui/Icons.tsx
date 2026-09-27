interface IconProps {
  className?: string;
}

export function WhatsAppIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={className}>
      <path d="M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6z" />
    </svg>
  );
}

export function DownloadIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={className}>
      <path d="M12 4v12M6 11l6 6 6-6M5 20h14" />
    </svg>
  );
}

export function ArrowDownIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={className}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function MenuIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function CloseIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
