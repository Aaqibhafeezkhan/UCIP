import Link from "next/link";
import { Mail } from "lucide-react";
import Logo from "./Logo";
import { GithubMark } from "./icons";
import { FOOTER_ROUTES } from "@/lib/routes";

const DATA_SOURCES_HREF = "/legal#data-sources";

const LEGAL_LINKS = [
  { href: "/legal#license", label: "License" },
  { href: DATA_SOURCES_HREF, label: "Data sources" },
  { href: "/legal#disclaimers", label: "Disclaimers" },
  { href: "/legal#privacy", label: "Privacy" },
];

/** Below `sm` the three link columns collapse into one wrapped row, so each link also gets a
 *  little width to keep its 44 px hit area clear of its neighbours. */
const LINK =
  "text-sm text-muted-foreground transition-colors hover:text-foreground max-md:flex max-md:min-h-11 max-md:items-center max-sm:px-2.5";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* One structure for both layouts. From sm up it is the four-column grid;
            below sm the column wrappers dissolve (`contents`) so every link
            becomes an item of one wrapped row under the brand block. */}
        <div className="flex flex-wrap items-center max-sm:-mx-2.5 sm:grid sm:grid-cols-4 sm:items-stretch sm:gap-8">
          <div className="max-sm:w-full max-sm:px-2.5">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-sm:mt-2 max-sm:text-xs">
              <span className="sm:hidden">Heat vulnerability for Mumbai&apos;s wards, from open data.</span>
              <span className="max-sm:hidden">
                A heat vulnerability index for Mumbai&apos;s wards, built from open data, with its
                sources and limits in public.
              </span>
            </p>
          </div>

          <div className="max-sm:contents">
            <p className="kicker max-sm:hidden">Quick links</p>
            <ul className="mt-3 space-y-2 max-md:space-y-0 max-sm:contents">
              {FOOTER_ROUTES.map((l) => (
                <li key={l.path}>
                  <Link href={l.path} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="max-sm:contents">
            <p className="kicker max-sm:hidden">Legal</p>
            <ul className="mt-3 space-y-2 max-md:space-y-0 max-sm:contents">
              {LEGAL_LINKS.map((l) => (
                // The credits link under the disclaimer takes this one's place on phones.
                <li key={l.href} className={l.href === DATA_SOURCES_HREF ? "max-sm:hidden" : undefined}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="max-sm:contents">
            <p className="kicker max-sm:hidden">Connect</p>
            <ul className="mt-3 space-y-2 max-md:space-y-0 max-sm:contents">
              <li>
                <Link href="/contact" className={LINK}>
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="mailto:dhawansanay@gmail.com"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground max-md:min-h-11 max-sm:px-2.5"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Email
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/AnayDhawan/ucip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground max-md:min-h-11 max-sm:px-2.5"
                >
                  <GithubMark className="h-3.5 w-3.5" />
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground max-sm:mt-3 max-sm:pt-4">
          <p>
            <span className="sm:hidden">
              UCIP is an independent research prototype, not an official BMC or government tool.
            </span>
            <span className="max-sm:hidden">
              UCIP is a research prototype, built independently. It is not an official tool of the
              BMC or any government body.
            </span>
          </p>
          <p className="mt-2 sm:hidden">
            <Link href={DATA_SOURCES_HREF} className="inline-flex min-h-11 items-center text-brand-teal hover:underline">
              Data sources and credits
            </Link>
          </p>
          <p className="mt-2 max-sm:hidden">
            Data: Landsat (USGS), WorldPop, ESA WorldCover via Google Earth Engine; OpenStreetMap
            contributors; Datameet ward boundaries. Basemap: Esri, HERE, Garmin, FAO, NOAA, USGS.
            Live air temperature and ward weather (current conditions, 7-day forecast): Open-Meteo.
          </p>
          <p className="mt-4 max-sm:mt-1">
            © {new Date().getFullYear()} UCIP. Code released under the Apache License 2.0.
          </p>
        </div>
      </div>
    </footer>
  );
}
