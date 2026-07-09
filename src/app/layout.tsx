import type { Metadata, Viewport } from "next";
import { Roboto_Flex } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import SiteNav from "@/components/SiteNav";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://trivselslekene.vercel.app"),
  title: {
    default: "Trivselslekene 2026",
    template: "%s · Trivselslekene 2026",
  },
  description: "Organiser, registrer og følg med på Trivselslekene",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trivselslekene",
  },
  other: {
    "format-detection": "telephone=no",
  },
  openGraph: {
    type: "website",
    siteName: "Trivselslekene",
    title: "Trivselslekene 2026",
    description: "Organiser, registrer og følg med på Trivselslekene",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
        {/* Squircle clipPath for iPhone-style continuous corners — referenced by .surface */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="0"
          height="0"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="squircle" clipPathUnits="objectBoundingBox">
              <path d="M0.15,0 L0.85,0 C0.9175,0 1,0.0675 1,0.15 L1,0.85 C1,0.9175 0.9325,1 0.85,1 L0.15,1 C0.0675,1 0,0.9325 0,0.85 L0,0.15 C0,0.0675 0.0675,0 0.15,0 Z" />
            </clipPath>
          </defs>
        </svg>
        <SiteNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
