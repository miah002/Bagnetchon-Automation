import Link from "next/link";
import { products } from "@/lib/products";
import { site } from "@/lib/site";

const columns = [
  [
    { href: "/shop", label: "Shop" },
    { href: "/shop#handhelds", label: "Handhelds" },
  ],
  [
    { href: "/sell", label: "We Buy" },
    { href: "/sell#bulk", label: "Bulk Lots" },
  ],
  [
    { href: "/shop#consoles", label: "Consoles" },
    { href: site.messenger, label: "Contact" },
  ],
];

export function SiteHeader() {
  const count = products.filter((p) => p.status !== "sold").length;

  return (
    <header className="sticky top-0 z-40 bg-summit/95 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-6 px-5 py-5 sm:px-8">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0 leading-none">
          <span className="font-display text-xs font-bold tracking-[0.18em] text-ash">
            HIGHGROUNDS
          </span>
          <span className="font-display text-xs font-bold text-gold" aria-hidden="true">
            *
          </span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 justify-center gap-12 sm:flex lg:gap-24">
          {columns.map((col, i) => (
            <ul key={i} className="space-y-1">
              {col.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="block text-[11px] leading-tight text-steel transition-colors duration-200 hover:text-ash"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/shop"
            className="text-[11px] text-steel transition-colors duration-200 hover:text-ash sm:hidden"
          >
            Shop
          </Link>
          <Link
            href="/sell"
            className="text-[11px] text-steel transition-colors duration-200 hover:text-ash sm:hidden"
          >
            We Buy
          </Link>
          <Link
            href="/shop"
            aria-label={`${count} units available`}
            className="flex h-6 w-6 shrink-0 items-center justify-center border border-ash text-[11px] leading-none text-ash transition-colors duration-200 hover:bg-ash hover:text-summit"
          >
            {count}
          </Link>
        </div>
      </div>
    </header>
  );
}
