import type { Metadata, Viewport } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import { jetbrainsMono, oswald, robotoCondensed } from "./fonts";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: `${site.teamName} · FRC #${site.teamNumber}`,
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: "#12100C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${oswald.variable} ${robotoCondensed.variable} ${jetbrainsMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
