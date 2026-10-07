import type { Metadata } from "next";
// Same typeface as before (Inter) — just self-hosted via @fontsource
// instead of fetched from Google Fonts at build time. next/font/google
// needs a live connection to fonts.googleapis.com when it builds, which
// isn't always available; @fontsource ships the actual font files inside
// the npm package, so Inter renders identically without that dependency.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediStock IMS",
  description: "Secure Inventory Management for Health Professionals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/*
        Icons are Lucide React components now (see components/Icon.tsx), not
        a font ligature, so there's no Material Symbols <link> to load here
        any more.
      */}
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
