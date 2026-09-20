import Link from "next/link";
import { site } from "@/lib/site";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/sell", label: "We Buy" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b rule bg-summit/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex h-11 items-center font-display text-sm font-bold tracking-[0.2em] text-ash"
          aria-label={`${site.name} home`}
        >
          HIGHGROUNDS
          <span className="text-gold" aria-hidden="true">
            *
          </span>
        </Link>

        <nav aria-label="Main">
          <ul className="flex items-center gap-1 sm:gap-2">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="label flex h-11 items-center px-3 text-steel transition-colors duration-200 hover:text-ash"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
