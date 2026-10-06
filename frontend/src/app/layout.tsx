import type { Metadata } from "next";
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
      <body className="antialiased" style={{ fontFamily: 'Inter, "Segoe UI", sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
