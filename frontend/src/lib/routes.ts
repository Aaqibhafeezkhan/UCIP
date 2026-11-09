/**
 * The site's pages, in one list. The header nav, the footer's Quick links and
 * the sitemap are all built from it, so adding a page is one entry here.
 *
 * Order is display order for the header and footer. Dynamic pages (/ward/[id],
 * /embed/ward/[id]) are not listed: the sitemap enumerates wards itself.
 */
export type Route = {
  path: string;
  label: string;
  /** Shown in the header nav. */
  nav: boolean;
  /** Shown under the footer's Quick links. */
  footer: boolean;
  /** Audited by Lighthouse CI. lighthouserc.json lists the URLs; routes.test.ts keeps the two in step. */
  lighthouse: boolean;
  /** Sitemap priority, 0 to 1. */
  priority: number;
  /** Shows pipeline data, so the sitemap stamps it with the last data refresh. */
  dataPage?: boolean;
};

export const ROUTES: readonly Route[] = [
  { path: "/", label: "Home", nav: false, footer: false, lighthouse: true, priority: 1 },
  { path: "/dashboard", label: "Dashboard", nav: true, footer: true, lighthouse: true, priority: 0.9, dataPage: true },
  { path: "/cities", label: "Cities", nav: true, footer: false, lighthouse: false, priority: 0.6 },
  { path: "/methodology", label: "Methodology", nav: true, footer: true, lighthouse: true, priority: 0.8, dataPage: true },
  { path: "/simulate", label: "Simulator", nav: true, footer: true, lighthouse: true, priority: 0.6 },
  { path: "/mission", label: "Mission", nav: true, footer: true, lighthouse: false, priority: 0.6 },
  { path: "/contribute", label: "Contribute", nav: true, footer: true, lighthouse: false, priority: 0.5 },
  { path: "/contact", label: "Contact", nav: true, footer: false, lighthouse: false, priority: 0.4 },
  { path: "/legal", label: "Legal", nav: false, footer: false, lighthouse: false, priority: 0.2 },
];

export const NAV_ROUTES = ROUTES.filter((r) => r.nav);
export const FOOTER_ROUTES = ROUTES.filter((r) => r.footer);

/** Whether `pathname` is on `path` or beneath it. The home page matches only itself. */
export function isActiveRoute(pathname: string, path: string): boolean {
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}
