import Link from "next/link";
import { CtaLink } from "@/components/cta";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";
import { site } from "@/lib/site";

const principles = [
  {
    n: "01",
    title: "Bench-tested",
    body: "Every unit runs a full function pass before it is listed. Drives read, sticks are checked for drift, memory and storage are validated.",
  },
  {
    n: "02",
    title: "Serial-logged",
    body: "We photograph and record the serial number of every unit that passes through. Documented chain of custody, no exceptions.",
  },
  {
    n: "03",
    title: "Honestly graded",
    body: "A published A/B/C scale applied the same way every time. If a shell is scuffed we say so and price it accordingly.",
  },
  {
    n: "04",
    title: "Warranted",
    body: "7-day DOA replacement on every unit, 3 to 6 months on refurbished systems. Inspection at meet-up is always welcome.",
  },
];

export default function Home() {
  const featured = products.slice(0, 3);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8 lg:pt-36">
        <p className="label text-gold">Now stocking — RG DS Plus, first in PH</p>

        <h1 className="mt-8 max-w-4xl font-display text-[clamp(2.5rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-tight text-ash">
          Tested.
          <br />
          Warranted.
          <br />
          Delivered.
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-steel sm:text-lg">
          Pre-owned and brand new consoles, handhelds and PC hardware — bench-tested, graded
          against a published scale, and backed by a replacement window. Based in {site.base}.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <CtaLink href="/shop">Browse inventory</CtaLink>
          <CtaLink href="/sell" variant="outline">
            Sell your tech
          </CtaLink>
        </div>
      </section>

      <section className="border-t rule" aria-labelledby="inventory-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="inventory-heading" className="label text-steel">
              Current inventory
            </h2>
            <Link
              href="/shop"
              className="label inline-flex min-h-11 items-center text-ash transition-colors duration-200 hover:text-gold"
            >
              View all
            </Link>
          </div>

          <div className="mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product, i) => (
              <ProductCard key={product.slug} product={product} priority={i === 0} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t rule" aria-labelledby="principles-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <h2 id="principles-heading" className="label text-steel">
            How we protect you
          </h2>

          <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {principles.map((item) => (
              <div key={item.n} className="border-t rule pt-6">
                <p className="font-display text-sm text-steel tabular-nums">{item.n}</p>
                <h3 className="mt-4 font-display text-xl font-medium text-ash">{item.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-steel">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t rule" aria-labelledby="buyback-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="bg-panel px-6 py-14 sm:px-12 sm:py-20">
              <h2
                id="buyback-heading"
                className="max-w-2xl font-display text-[clamp(1.75rem,5vw,3rem)] font-bold leading-tight tracking-tight text-ash"
              >
                We buy your old tech.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-steel">
                Working or not. Consoles, laptops, phones, PC parts and gadgets. Cash on the spot,
                free pickup, and secure data wiping. Office pull-outs and bulk lots welcome.
              </p>
              <div className="mt-9">
                <CtaLink href="/sell">Get a quote</CtaLink>
              </div>
            </div>
        </div>
      </section>
    </>
  );
}
