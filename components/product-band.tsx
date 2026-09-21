import Link from "next/link";
import { ProductBandMedia } from "@/components/product-media";
import { actionLabel, type Product } from "@/lib/products";

export function ProductBand({
  product,
  tone = "dark",
  priority = false,
}: {
  product: Product;
  tone?: "dark" | "light";
  priority?: boolean;
}) {
  const dark = tone === "dark";

  return (
    <section className={dark ? "bg-summit" : "bg-ash"}>
      <Link
        href={`/shop/${product.slug}`}
        className="group block px-5 pt-14 pb-6 sm:px-8 sm:pb-8"
      >
        <ProductBandMedia product={product} tone={tone} priority={priority} />

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className={`text-sm ${dark ? "text-ash" : "text-summit"}`}>{product.name}</p>
            <p className={`mt-1 text-[11px] ${dark ? "text-steel" : "text-summit/60"}`}>
              {product.variant}
            </p>
          </div>

          <span
            className={`pill shrink-0 ${
              dark
                ? "border-steel/45 text-ash group-hover:border-ash"
                : "border-summit/30 text-summit group-hover:border-summit"
            }`}
          >
            {actionLabel[product.status]}
          </span>
        </div>
      </Link>
    </section>
  );
}
