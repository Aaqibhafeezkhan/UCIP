import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

/** Shows the actual product on the landing page: the choropleth, as a link to /dashboard. */
export default function MapPreview() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-0 pt-10 sm:px-6 md:py-14">
      <Link
        href="/dashboard"
        className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-brand-teal"
      >
        {/* The wide crop is unreadable at phone width (about 140 px tall), so
            phones get a squarer one centred on the city. */}
        <div className="relative aspect-[4/3] overflow-hidden border-b border-border sm:aspect-[16/7]">
          <Image
            src="/map-preview.png"
            alt="Heat vulnerability choropleth of Mumbai's 24 wards"
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover object-[40%_50%] transition-transform sm:object-left-top duration-500 group-hover:scale-[1.02]"
          />
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="kicker">The dashboard</p>
            <p className="mt-1 font-semibold text-foreground">
              See all 24 wards, ranked, on the live map
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-teal">
            Open
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}
