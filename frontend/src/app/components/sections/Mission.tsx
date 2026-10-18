import Link from "next/link";

/** Saturated full-width teal band, breaks the monotone scroll and carries the "why". */
export default function Mission() {
  return (
    <section className="border-y border-brand-teal/40 bg-brand-teal text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-white/75">
          Not another heat map
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-snug sm:text-3xl">
          Most tools stop at a map. UCIP adds the reason behind each ward&apos;s score and an
          ecologically checked option for cooling it.
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-white/90">
          Rank the wards, explain each score factor by factor, then recommend the right
          intervention, including rejecting tree-planting where it would backfire. Each step cites
          its source, and the ones that rest on our own judgement are labelled.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/mission"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-white/90"
          >
            Our mission
          </Link>
          <Link
            href="/methodology"
            className="rounded-lg border border-white/50 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            How the method works
          </Link>
        </div>
      </div>
    </section>
  );
}
