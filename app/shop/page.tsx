import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Current HIGHGROUNDS* inventory — every unit bench-tested, serial-logged and graded before listing.",
};

export default function ShopPage() {
  const available = products.filter((p) => p.status !== "sold");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <header className="border-b rule pb-12">
        <p className="label text-steel">Inventory</p>
        <h1 className="mt-6 font-display text-[clamp(2rem,6vw,3.5rem)] font-bold leading-tight tracking-tight text-ash">
          Every unit, tested and graded
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-steel">
          One-of-one stock. What you see is the actual unit you receive — not a stock photo of a
          different one. {available.length} units listed.
        </p>
      </header>

      <div className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((product, i) => (
          <ProductCard key={product.slug} product={product} priority={i < 2} />
        ))}
      </div>

      <p className="mt-20 max-w-xl border-t rule pt-6 text-sm leading-relaxed text-steel">
        Looking for something not listed? We source to order from office pull-outs, auctions and
        the local market. Tell us the model and budget.
      </p>
    </div>
  );
}
