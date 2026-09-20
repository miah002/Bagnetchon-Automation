import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t rule">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-sm font-bold tracking-[0.2em] text-ash">
              HIGHGROUNDS
              <span className="text-gold" aria-hidden="true">
                *
              </span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-steel">{site.tagline}</p>
          </div>

          <div>
            <h2 className="label text-steel">Browse</h2>
            <ul className="mt-4 space-y-1">
              <li>
                <Link
                  href="/shop"
                  className="inline-flex min-h-11 items-center text-sm text-ash transition-colors duration-200 hover:text-gold"
                >
                  Available units
                </Link>
              </li>
              <li>
                <Link
                  href="/sell"
                  className="inline-flex min-h-11 items-center text-sm text-ash transition-colors duration-200 hover:text-gold"
                >
                  Sell your tech
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="label text-steel">Coverage</h2>
            <ul className="mt-4 space-y-2 text-sm text-steel">
              {site.coverage.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="label text-steel">Contact</h2>
            <p className="mt-4 text-sm leading-relaxed text-steel">
              Based in {site.base}. Meet-ups, courier and free pickup on bulk lots.
            </p>
            <a
              href={site.messenger}
              className="mt-3 inline-flex min-h-11 items-center text-sm text-ash transition-colors duration-200 hover:text-gold"
            >
              Message us
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t rule pt-6 text-xs text-steel sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <p>Every unit bench-tested and serial-logged before sale.</p>
        </div>
      </div>
    </footer>
  );
}
