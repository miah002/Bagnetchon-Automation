import Link from "next/link";
import { ProductTileMedia } from "@/components/product-media";
import { statusLabel, type Product } from "@/lib/products";
import { peso } from "@/lib/site";

export function ProductTile({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <article>
      <Link href={`/shop/${product.slug}`} className="group block">
        <ProductTileMedia product={product} priority={priority} />

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] text-ash transition-colors duration-200 group-hover:text-gold">
              {product.name}
            </p>
            <p className="mt-0.5 text-[11px] text-steel">{product.variant}</p>
            <p className="mt-1.5 text-[13px] text-ash tabular-nums">{peso(product.price)}</p>
          </div>

          <p className="shrink-0 text-right text-[11px] text-steel">
            {statusLabel[product.status]}
          </p>
        </div>
      </Link>
    </article>
  );
}
