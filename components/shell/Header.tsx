"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { BpMark } from "@/components/ui/BpMark";
import { nav } from "@/content/nav";
import { site } from "@/content/site";
import { jumpTo } from "@/lib/nav/jump";

export function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = (): void => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = nav
      .map((n) => document.getElementById(n.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        // 3B uçuşta bölümler uzayda durur; geçerli bölümü motor "bp:station" ile bildirir.
        if (document.documentElement.classList.contains("gl")) return;
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
          else setCurrent((c) => (c === entry.target.id ? null : c));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onStation = (e: Event): void => {
      const d = (e as CustomEvent<{ id: string }>).detail;
      if (d && typeof d.id === "string") setCurrent(d.id === "top" || d.id === "final" ? null : d.id);
    };
    document.addEventListener("bp:station", onStation);
    return () => document.removeEventListener("bp:station", onStation);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Menü ve marka bağlantıları animasyonsuz, anında gider (Ctrl/Cmd/orta tık yeni sekme davranışını korur).
  const go = (e: MouseEvent<HTMLAnchorElement>, href: string): void => {
    setOpen(false);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    jumpTo(href.slice(1));
  };

  return (
    <header className={solid ? "top solid" : "top"} id="top-bar">
      <div className="wrap top-in">
        <a
          className="brand"
          href="#top"
          aria-label={`${site.teamName} ${site.teamNumber}, başa dön`}
          onClick={(e) => go(e, "#top")}
        >
          <BpMark />
          <span className="brand-name" lang="en">
            {site.teamName}
          </span>
          <span className="brand-no mono">#{site.teamNumber}</span>
        </a>
        <button
          ref={menuBtn}
          className="menu-btn"
          type="button"
          aria-expanded={open}
          aria-controls="nav"
          onClick={() => setOpen((v) => !v)}
        >
          Menü
        </button>
        <nav className={open ? "nav open" : "nav"} id="nav" aria-label="Ana menü">
          {nav.map((n) => {
            const isCur = current === n.href.slice(1);
            return (
              <a
                key={n.href}
                href={n.href}
                className={isCur ? "cur" : undefined}
                aria-current={isCur ? "true" : undefined}
                onClick={(e) => go(e, n.href)}
              >
                {n.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
