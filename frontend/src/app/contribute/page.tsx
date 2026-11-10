import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { Star, Mail, MapPin, Microscope } from "lucide-react";
import PageShell, { PageContainer } from "../components/PageShell";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import { GithubMark } from "../components/icons";

export const metadata = pageMetadata({
  title: "Contribute | UCIP",
  description: "Ways to help improve UCIP: the code, the data, the method, and porting it to new cities.",
  path: "/contribute",
});

const WAYS = [
  {
    Icon: Star,
    title: "Star and share the code",
    body: "UCIP is free and Apache 2.0 licensed. Stars help other people find open civic tooling. Send the dashboard to anyone working on urban heat, climate adaptation, or civic data.",
  },
  {
    Icon: MapPin,
    title: "Improve the data",
    body: "Spotted a ward that looks wrong, or have access to better ward-level data than our public proxies? That is the single most valuable contribution. Corrections beat compliments.",
  },
  {
    Icon: Microscope,
    title: "Question the method",
    body: "The methodology page states every weight, coefficient, and limitation openly. If a choice looks wrong, say so. Pointed methodology critique makes the tool more trustworthy.",
  },
  {
    Icon: MapPin,
    title: "Port it to another city",
    body: "Every scored input is free, open, global data, so another city needs a ward boundary file and an Earth Engine project. No second city has been run end to end yet. If you want to try one, open an issue and say which.",
  },
];

export default function ContributePage() {
  return (
    <PageShell>
      <PageContainer>
        <p className="kicker">Contribute</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Built by one student, open to everyone.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          UCIP is a solo, open project. If it is useful to you, here is how to make it better.
        </p>

        <Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {WAYS.map((w) => (
              <Card key={w.title}>
                <w.Icon className="h-5 w-5 text-brand-teal" aria-hidden />
                <h3 className="mt-3 font-semibold text-foreground">{w.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
              </Card>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="https://github.com/AnayDhawan/ucip"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold md:py-2.5 text-background transition-opacity hover:opacity-90"
            >
              <GithubMark className="h-4 w-4" />
              github.com/AnayDhawan/ucip
            </a>
            <a
              href="mailto:dhawansanay@gmail.com"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold md:py-2.5 text-foreground transition-colors hover:bg-surface-hover"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Email the maintainer
            </a>
          </div>
        </Reveal>

        <p className="mt-8 text-sm text-muted-foreground">
          Have a specific data error or methodology question?{" "}
          <Link href="/contact" className="text-brand-teal hover:underline">
            Contact
          </Link>{" "}
          has the details on what to include.
        </p>
      </PageContainer>
    </PageShell>
  );
}
