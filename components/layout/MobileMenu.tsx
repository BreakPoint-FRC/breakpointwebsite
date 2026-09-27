"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { headerCta, mainNav } from "@/content/nav";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";
import { docTop, getLenis, scrollToY } from "@/lib/scroll";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pendingHref = useRef<string | null>(null);

  // Menü açıkken Lenis durur; hedefe kaydırma menü kapandıktan sonra yapılır.
  const navigate = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    pendingHref.current = href;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const lenis = getLenis();
    lenis?.stop();
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
      const href = pendingHref.current;
      pendingHref.current = null;
      const target = href ? document.querySelector(href) : null;
      if (target) scrollToY(docTop(target));
      else toggle?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-label="Menüyü aç"
        aria-expanded={open}
        aria-controls="mobil-menu"
        onClick={() => setOpen(true)}
        className="flex size-44 items-center justify-center border border-bp-line text-bp-white"
      >
        <MenuIcon className="size-20" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="mobil-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
          className="fixed inset-0 z-50 flex flex-col bg-bp-black px-16"
        >
          <div className="flex h-68 items-center justify-end border-b border-bp-line">
            <button
              type="button"
              aria-label="Menüyü kapat"
              onClick={() => setOpen(false)}
              className="flex size-44 items-center justify-center border border-bp-line text-bp-white"
            >
              <CloseIcon className="size-20" />
            </button>
          </div>
          <nav aria-label="Mobil menü" className="flex flex-col py-24 font-display font-semibold uppercase fs-44">
            {mainNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => navigate(e, item.href)}
                className="border-b border-bp-line py-16 text-bp-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href={headerCta.href}
            onClick={(e) => navigate(e, headerCta.href)}
            className="mt-auto mb-24 flex h-52 items-center justify-center bg-bp-yellow font-label font-semibold uppercase text-bp-black fs-15 ls-2"
          >
            {headerCta.label}
          </a>
        </div>
      ) : null}
    </>
  );
}
