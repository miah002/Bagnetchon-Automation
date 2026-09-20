import Image from "next/image";
import type { Product } from "@/lib/products";

function ConsoleGlyph() {
  return (
    <svg viewBox="0 0 120 120" fill="none" strokeWidth="1.25" className="h-28 w-28 stroke-steel/45 sm:h-36 sm:w-36">
      <rect x="40" y="16" width="40" height="88" rx="4" />
      <path d="M52 16v88" />
      <path d="M66 62h8" strokeLinecap="round" />
      <path d="M66 40h4" strokeLinecap="round" />
    </svg>
  );
}

function HandheldGlyph() {
  return (
    <svg viewBox="0 0 120 120" fill="none" strokeWidth="1.25" className="h-28 w-28 stroke-steel/45 sm:h-36 sm:w-36">
      <rect x="26" y="18" width="68" height="40" rx="5" />
      <rect x="26" y="62" width="68" height="40" rx="5" />
      <path d="M26 60h68" />
      <circle cx="40" cy="82" r="5" />
      <circle cx="80" cy="82" r="5" />
    </svg>
  );
}

export function ProductMedia({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className="relative aspect-4/5 overflow-hidden bg-panel">
      {product.image ? (
        <Image
          src={product.image}
          alt={`${product.name} — ${product.variant}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
          {product.category === "Console" ? <ConsoleGlyph /> : <HandheldGlyph />}
        </div>
      )}
    </div>
  );
}
