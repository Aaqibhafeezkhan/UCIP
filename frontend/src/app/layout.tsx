import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import { MobileNavProvider } from "./components/MobileNav";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import RegisterServiceWorker from "./components/RegisterServiceWorker";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Production domain, confirmed live 2026-09-03. Defaulting to it rather than
// localhost so canonical URLs, OG images and the sitemap are correct on a
// deploy with no env vars set; NEXT_PUBLIC_SITE_URL still overrides for
// previews and local work.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uciplatform.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "UCIP: Urban Climate Intelligence Platform",
  description: "Ward-level heat vulnerability for Mumbai, built from free open data.",
  keywords: [
    "urban heat vulnerability",
    "Mumbai",
    "urban planning",
    "climate resilience",
    "heat island",
    "ward-level data",
    "climate intelligence",
  ],
  applicationName: "UCIP",
  manifest: "/site.webmanifest",
  // iOS home-screen install: standalone, titled UCIP, status bar left at the
  // default so it follows the page colour instead of floating over the header.
  appleWebApp: { capable: true, title: "UCIP", statusBarStyle: "default" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "UCIP: Urban Climate Intelligence Platform",
    description: "Ward-level heat vulnerability for Mumbai, built from free open data.",
    url: siteUrl,
    siteName: "UCIP",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UCIP: Urban Climate Intelligence Platform",
    description: "Ward-level heat vulnerability for Mumbai, built from free open data.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  // The keyboard resizes the layout viewport instead of covering it, so ward
  // search stays visible. viewport-fit=cover runs the page under the notch and
  // home indicator; the safe-area utilities in globals.css keep chrome clear.
  interactiveWidget: "resizes-content",
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f0e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", inter.variable, jetbrainsMono.variable, "font-sans")}
    >
      <head>
        {/* Reveal hides its content until a script shows it; without scripts it must not stay hidden. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <MobileNavProvider>{children}</MobileNavProvider>
        </ThemeProvider>
        <Analytics />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
