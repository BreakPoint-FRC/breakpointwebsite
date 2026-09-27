import { headerCta, languageToggle, mainNav } from "@/content/nav";
import { site } from "@/content/site";
import { BpMark } from "@/components/ui/BpMark";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="relative z-30 flex h-68 items-center justify-between border-b border-bp-line bg-bp-black px-16 lg:fixed lg:inset-x-0 lg:top-0 lg:h-72 lg:pl-72 lg:pr-40">
      <a href="#giris" className="flex items-center gap-10 text-bp-white lg:gap-14" aria-label={`${site.teamName} — başa dön`}>
        <BpMark className="size-40 fs-20 lg:size-44 lg:fs-22" />
        <span className="flex flex-col gap-2">
          <span className="font-display font-semibold fs-17 ls-2 lg:fs-19">BREAKPOINT</span>
          <span className="hidden font-label text-bp-muted fs-11 ls-3 lg:block">
            FRC · {site.teamNumber} · {site.city}
          </span>
        </span>
      </a>

      <nav aria-label="Ana menü" className="hidden items-center gap-32 font-label uppercase fs-14 ls-2 lg:flex">
        {mainNav.map((item) => (
          <a key={item.href} href={item.href} className="text-bp-white transition-colors hover:text-bp-yellow">
            {item.label}
          </a>
        ))}
        <span className="flex gap-8 fs-13">
          <span className="text-bp-white" aria-current="true">
            {languageToggle.current}
          </span>
          <span className="text-bp-line" aria-hidden="true">
            /
          </span>
          <a href={languageToggle.other.href} lang="en" className="text-bp-muted hover:text-bp-white">
            {languageToggle.other.label}
          </a>
        </span>
        <a
          href={headerCta.href}
          className="bg-bp-yellow px-20 py-13 font-semibold text-bp-black transition-colors hover:bg-bp-white"
        >
          {headerCta.label}
        </a>
      </nav>

      <div className="flex items-center gap-8 lg:hidden">
        <a
          href={languageToggle.other.href}
          lang="en"
          className="flex h-44 items-center px-10 font-label text-bp-muted fs-13"
        >
          {languageToggle.other.label}
        </a>
        <MobileMenu />
      </div>
    </header>
  );
}
