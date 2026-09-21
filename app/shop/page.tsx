import type { Metadata } from "next";
import { ProductTile } from "@/components/product-tile";
import { products, type Product } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Current HIGHGROUNDS* inventory — every unit bench-tested, serial-logged and graded before listing.",
};

function Section({
  id,
  heading,
  items,
  priority = false,
}: {
  id: string;
  heading: string;
  items: Product[];
  priority?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-[13px] text-ash">{heading}</h2>
      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3">
        {items.map((product, i) => (
          <ProductTile key={product.slug} product={product} priority={priority && i === 0} />
        ))}
      </div>
    </section>
  );
}

export default function ShopPage() {
  const live = products.filter((p) => p.status !== "sold");
  const consoles = live.filter((p) => p.category === "Console");
  const handhelds = live.filter((p) => p.category === "Handheld");

  return (
    <div className="px-5 pt-10 pb-24 sm:px-8">
      <p className="text-[11px] tracking-[0.18em] text-steel uppercase">
        Inventory · {live.length} units
      </p>
      <p className="mt-4 max-w-md text-[13px] leading-relaxed text-steel">
        One-of-one stock. What you see is the actual unit you receive — not a stock photo of a
        different one.
      </p>

      <div className="mt-14 space-y-16">
        <Section id="consoles" heading="Consoles — Tested and graded" items={consoles} priority />
        <Section id="handhelds" heading="Handhelds — Arriving this month" items={handhelds} />
      </div>

      <p className="mt-20 max-w-md border-t rule pt-5 text-[13px] leading-relaxed text-steel">
        Looking for something not listed? We source to order from office pull-outs, auctions and
        the local market. Tell us the model and budget.
      </p>
    </div>
  );
}
