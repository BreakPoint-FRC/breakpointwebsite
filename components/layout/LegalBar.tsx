import { contact } from "@/content/contact";
import { site } from "@/content/site";

/** Final sahnesinden sonra yalnız ince yasal şerit (© + KVKK). */
export function LegalBar() {
  return (
    <footer className="flex flex-col justify-center gap-6 border-t border-bp-line px-16 pt-24 pb-96 text-bp-muted fs-13 lg:h-120 lg:flex-row lg:items-center lg:justify-between lg:px-64 lg:py-0 lg:pl-112 lg:fs-14">
      <span>
        © {site.copyrightYear} {site.teamName} · FRC {site.teamNumber}
      </span>
      <a href={contact.legal.href} className="hover:text-bp-white">
        {contact.legal.label}
      </a>
    </footer>
  );
}
