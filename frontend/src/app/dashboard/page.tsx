import { pageMetadata } from "@/lib/metadata";
import DashboardClient from "./DashboardClient";

// The client body lives in DashboardClient so this page can be a server
// component: only server components can export metadata, and a shared
// /dashboard link should unfurl with its own title rather than the home page's.
export const metadata = pageMetadata({
  title: "Dashboard | UCIP",
  description:
    "Interactive map and ranked list of Mumbai's 24 wards by heat vulnerability, with per-ward breakdowns, cooling recommendations and a ward comparison view.",
  path: "/dashboard",
});

export default function DashboardPage() {
  return <DashboardClient />;
}
