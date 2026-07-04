import type { Metadata, Viewport } from "next";
import { Roboto_Flex } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";

const robotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
});

const amstelvar = localFont({
  src: "../fonts/Amstelvar-latin.woff2",
  variable: "--font-amstelvar",
  weight: "100 900",
  display: "swap",
  fallback: ["Iowan Old Style", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "Trivselslekene 2026",
  description: "Organiser, registrer og følg med på Trivselslekene",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060608",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nb"
      className={`${robotoFlex.variable} ${amstelvar.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line px-4 py-6 text-center text-[11px] tracking-widest text-fg-faint uppercase">
          Trivselslekene — laget for vennegjengen
        </footer>
      </body>
    </html>
  );
}
