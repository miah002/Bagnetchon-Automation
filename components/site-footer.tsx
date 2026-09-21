import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t rule px-5 py-14 sm:px-8">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/" aria-label={`${site.name} home`} className="leading-none">
          <span className="font-display text-xs font-bold tracking-[0.18em] text-ash">
            HIGHGROUNDS
          </span>
          <span className="font-display text-xs font-bold text-gold" aria-hidden="true">
            *
          </span>
        </Link>

        <ul className="space-y-1.5 text-[11px]">
          {[
            { href: "/shop", label: "Shop" },
            { href: "/shop#consoles", label: "Consoles" },
            { href: "/shop#handhelds", label: "Handhelds" },
            { href: "/sell", label: "We Buy" },
          ].map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="text-steel transition-colors duration-200 hover:text-ash"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="space-y-1.5 text-[11px] text-steel">
          <li>7-day DOA replacement</li>
          <li>Every unit bench-tested</li>
          <li>Serial numbers logged</li>
          <li>{site.coverage.join(" · ")}</li>
        </ul>

        <div>
          <p className="text-[11px] leading-relaxed text-steel">
            New arrivals go out on Messenger first.
          </p>
          <a
            href={site.messenger}
            className="mt-3 inline-flex min-h-11 items-center border-b rule text-[11px] text-ash transition-colors duration-200 hover:text-gold"
          >
            Message us
          </a>
        </div>
      </div>

      <div className="mt-14 grid gap-2 text-[11px] text-steel sm:grid-cols-4">
        <p>{site.name}</p>
        <p>All rights reserved.</p>
        <p>©{new Date().getFullYear()}</p>
        <p>
          <a
            href={site.facebook}
            className="text-ash transition-colors duration-200 hover:text-gold"
          >
            Facebook
          </a>
        </p>
      </div>
    </footer>
  );
}
