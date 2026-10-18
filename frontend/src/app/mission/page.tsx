import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Reveal from "../components/Reveal";
import Card from "../components/Card";

export const metadata: Metadata = {
  title: "Mission | UCIP",
  description: "Why UCIP exists: a cited, ward-level heat vulnerability index for Mumbai, built only from free open data.",
};

const DIFFERENTIATORS = [
  {
    title: "A ranked, cited vulnerability score",
    body: "Every ward gets a 0 to 100 score from five indicators any city can measure with free, open, global data. The weights come from the data itself: a PCA on Mumbai's own cells, following the method of Reid et al. 2009.",
  },
  {
    title: "Factor-by-factor explainability",
    body: "The score is a transparent linear index, so each ward shows exactly what pushes it up or down. No black box, no SHAP needed.",
  },
  {
    title: "A recommendation engine, not just a map",
    body: "Each ward gets an intervention with a rationale attached: rain gardens, cool roofs with shaded cooling centres, or pocket parks. A tree-planting rule exists but fires nowhere today, because every hot, bare cell in Mumbai is already built up.",
  },
  {
    title: "An ecological guardrail",
    body: "The engine refuses tree planting where it would backfire: native grassland, wetland, mangrove, water and heavily sealed cells. Those get reflective or water-sensitive options instead.",
  },
];

export default function MissionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <p className="kicker">Mission</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Turn heat data into action, ward by ward.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Mumbai gets dangerously hot, and the burden is not shared evenly. Dense, paved, low-green
          wards feel it most. UCIP exists to say, in public and with sources, which wards are most
          exposed, why, and what could cool them, along with how sure each answer is.
        </p>

        <Reveal>
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">Not another heat map</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Prior tools tend to do one or two things: map where a city is hot, set city-wide
              targets, or suggest generic fixes. Diagnostic studies stop at the map. Strategy
              documents set goals without per-ward targeting. Global toolboxes inspire without a
              specific city&apos;s data underneath. UCIP tries to do all four for one city, on the
              24-ward BMC boundary map it was built with. BMC has since created new wards, which
              the{" "}
              <Link href="/methodology" className="text-brand-teal hover:underline">
                methodology
              </Link>{" "}
              explains.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {DIFFERENTIATORS.map((d) => (
                <Card key={d.title}>
                  <h3 className="font-semibold text-foreground">{d.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
                </Card>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">Honesty is a feature</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              UCIP tries to say how certain each number is. The heat map shows land-surface
              temperature, which is a real but imperfect stand-in for how hot it feels outside, and
              only in the daytime. Every ward rank comes with a plausible range, and most ranges
              span several places. The slum share and the Census 2011 under-7 share used to be
              scored; they are now shown as context only, because neither can be found for most
              cities or kept up to date. The
              cooling coefficients come from studies in other cities and haven&apos;t been calibrated
              for Mumbai specifically, so that caveat sits right next to every estimate instead of
              buried in a footnote. This is a research prototype, and treating it as more authoritative
              than that would be dishonest. Residents, planners, and researchers all see the same
              picture, warts included.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-hover"
            >
              Open the dashboard
            </Link>
            <Link
              href="/methodology"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
            >
              Read the method
            </Link>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
