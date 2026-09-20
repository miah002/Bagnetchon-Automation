import Link from "next/link";
import { ProductMedia } from "@/components/product-media";
import { statusLabel, type Product } from "@/lib/products";
import { peso } from "@/lib/site";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const unavailable = product.status === "sold" || product.status === "reserved";

  return (
    <article>
      <Link href={`/shop/${product.slug}`} className="group block">
        <div className="overflow-hidden">
          <div className="transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <ProductMedia product={product} priority={priority} />
          </div>
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-base font-medium text-ash">{product.name}</h3>
          <p className="font-display text-base font-medium text-ash tabular-nums">{peso(product.price)}</p>
        </div>

        <p className="mt-1 text-sm text-steel">{product.variant}</p>

        <p className={`label mt-4 ${unavailable ? "text-steel" : "text-ash"}`}>
          {statusLabel[product.status]}
          <span className="text-steel"> · Grade {product.grade}</span>
        </p>
      </Link>
    </article>
  );
}
