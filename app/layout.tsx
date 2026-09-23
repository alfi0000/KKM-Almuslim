import type { Metadata } from "next";
import "./globals.css";
import site from "@/lib/site.json";

export const metadata: Metadata = site.metadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="font-sans antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col selection:bg-emerald-700 selection:text-white">
        {children}
      </body>
    </html>
  );
}
