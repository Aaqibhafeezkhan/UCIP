import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import { MobileNavProvider } from "./components/MobileNav";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import RegisterServiceWorker from "./components/RegisterServiceWorker";
import { SITE_DESCRIPTION, SITE_TITLE, shareCard } from "@/lib/metadata";
import { SITE_URL } from "@/lib/wardShare";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
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
  // The default for routes that set no cards of their own (the embeds). Pages
  // use pageMetadata, because a page's openGraph replaces this one entirely.
  ...shareCard({ title: SITE_TITLE, description: SITE_DESCRIPTION, url: SITE_URL }),
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
