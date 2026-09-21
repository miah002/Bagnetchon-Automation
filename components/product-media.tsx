import Image from "next/image";
import type { Product } from "@/lib/products";

function Glyph({ product, stroke }: { product: Product; stroke: string }) {
  const common = { fill: "none", strokeWidth: "1.25", className: `h-full w-full ${stroke}` };

  return product.category === "Console" ? (
    <svg viewBox="0 0 120 120" {...common}>
      <rect x="40" y="16" width="40" height="88" rx="4" />
      <path d="M52 16v88" />
      <path d="M66 62h8" strokeLinecap="round" />
      <path d="M66 40h4" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 120 120" {...common}>
      <rect x="26" y="18" width="68" height="40" rx="5" />
      <rect x="26" y="62" width="68" height="40" rx="5" />
      <path d="M26 60h68" />
      <circle cx="40" cy="82" r="5" />
      <circle cx="80" cy="82" r="5" />
    </svg>
  );
}

/** Dense catalog tile — product sits inside a panel, as on the store grid. */
export function ProductTileMedia({
  product,
  tone = "dark",
  priority = false,
}: {
  product: Product;
  tone?: "dark" | "light";
  priority?: boolean;
}) {
  return (
    <div
      className={`relative flex aspect-4/3 items-center justify-center overflow-hidden ${
        tone === "dark" ? "bg-panel" : "bg-mist"
      }`}
    >
      {product.image ? (
        <Image
          src={product.image}
          alt={`${product.name} — ${product.variant}`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className="object-contain p-8"
        />
      ) : (
        <div className="h-20 w-20" aria-hidden="true">
          <Glyph product={product} stroke={tone === "dark" ? "stroke-steel/40" : "stroke-summit/25"} />
        </div>
      )}
    </div>
  );
}

/** Full-bleed band — product floats directly on the band background. */
export function ProductBandMedia({
  product,
  tone = "dark",
  priority = false,
}: {
  product: Product;
  tone?: "dark" | "light";
  priority?: boolean;
}) {
  return (
    <div className="relative flex h-[42vh] min-h-64 items-center justify-center sm:h-[56vh]">
      {product.image ? (
        <Image
          src={product.image}
          alt={`${product.name} — ${product.variant}`}
          fill
          sizes="100vw"
          priority={priority}
          className="object-contain"
        />
      ) : (
        <div className="h-40 w-40 sm:h-56 sm:w-56" aria-hidden="true">
          <Glyph product={product} stroke={tone === "dark" ? "stroke-steel/35" : "stroke-summit/20"} />
        </div>
      )}
    </div>
  );
}
