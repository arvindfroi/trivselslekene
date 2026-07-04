import type { Metadata, Viewport } from "next";
import { Bungee, Archivo } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trivselslekene",
  description: "Organiser, registrer og følg med på Trivselslekene",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf6ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nb"
      className={`${bungee.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <div id="app-root" className="flex min-h-full w-full flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t-2 border-ink bg-ink px-4 py-6 text-center font-display text-[11px] tracking-widest text-paper/70 uppercase">
            Trivselslekene — laget for vennegjengen
          </footer>
        </div>
      </body>
    </html>
  );
}
