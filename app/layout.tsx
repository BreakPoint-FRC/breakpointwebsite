import type { Metadata, Viewport } from "next";
import "./globals.css";
import { jetbrainsMono, oswald, robotoCondensed } from "./fonts";
import { site } from "@/content/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: `${site.teamName} · FRC #${site.teamNumber}`,
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: site.teamName,
    title: `${site.teamName} · FRC #${site.teamNumber}`,
    description: site.description,
  },
  twitter: { card: "summary", title: `${site.teamName} · FRC #${site.teamNumber}`, description: site.description },
};

export const viewport: Viewport = {
  themeColor: "#12100C",
};

// İlk boyamadan önce çalışır: hareket azaltma kapalıysa cam açılışın örttüğü sayfa içeriği hiç parlamaz.
// JS gelmez ya da hidrasyon başarısız olursa 8 sn sonra kilit kalkar (glassReady gelmediyse).
const EARLY_SCRIPT = `(function(){var r=document.documentElement;try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){r.classList.add('glass-on');window.setTimeout(function(){if(!r.dataset.glassReady)r.classList.remove('glass-on')},8000)}history.scrollRestoration='manual'}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      data-tier="T0"
      suppressHydrationWarning
      className={`${oswald.variable} ${robotoCondensed.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY_SCRIPT }} />
        <noscript>
          <style>
            {
              "html.glass-on{overflow:auto}html.glass-on .s-hero{filter:none}.glass{display:none!important}@media (max-width: 859px) { .menu-btn { display: none; } .nav { display: flex; flex-wrap: wrap; gap: 4px 20px; } } .top-in { flex-wrap: wrap; } .top { position: absolute; }"
            }
          </style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
