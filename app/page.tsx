import Link from "next/link";
import { CtaLink } from "@/components/cta";
import { Marquee } from "@/components/marquee";
import { ProductBand } from "@/components/product-band";
import { products } from "@/lib/products";
import { site } from "@/lib/site";

const principles = [
  {
    title: "Bench-tested",
    body: "Every unit runs a full function pass before listing. Drives read, sticks checked for drift, memory and storage validated.",
  },
  {
    title: "Serial-logged",
    body: "We photograph and record the serial of every unit that passes through. Documented chain of custody, no exceptions.",
  },
  {
    title: "Honestly graded",
    body: "A published A/B/C scale applied the same way every time. If a shell is scuffed we say so and price it accordingly.",
  },
  {
    title: "Warranted",
    body: "7-day DOA replacement on every unit. Inspection at meet-up is always welcome, before any money moves.",
  },
];

export default function Home() {
  const [ps5, coral, ...rest] = products;

  return (
    <>
      <Marquee text="ANBERNIC RG DS Plus — first units in the Philippines. Reserve now." />

      <ProductBand product={ps5} tone="dark" priority />
      <ProductBand product={coral} tone="light" />

      <div className="grid sm:grid-cols-2">
        {rest.map((product) => (
          <ProductBand key={product.slug} product={product} tone="dark" />
        ))}
      </div>

      <section className="bg-ash px-5 py-24 text-center sm:px-8 sm:py-32">
        <p className="text-[11px] tracking-[0.18em] text-summit/55 uppercase">
          Tested. Warranted. Delivered.
        </p>
        <h1 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-medium tracking-tight text-summit sm:text-4xl">
          Buying used tech online should not be a gamble.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-summit/70">
          Pre-owned and brand new consoles, handhelds and PC hardware — graded against a published
          scale and backed by a replacement window. Based in {site.base}.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <CtaLink href="/shop" variant="dark">
            Browse inventory
          </CtaLink>
          <CtaLink href="/sell" variant="ghostDark">
            Sell your tech
          </CtaLink>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-28" aria-labelledby="principles-heading">
        <h2
          id="principles-heading"
          className="text-[11px] tracking-[0.18em] text-steel uppercase"
        >
          How we protect you
        </h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((item) => (
            <div key={item.title} className="border-t rule pt-5">
              <h3 className="text-sm text-ash">{item.title}</h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-steel">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-panel px-5 py-28 text-center sm:px-8 sm:py-36">
        <p className="mx-auto max-w-3xl font-display text-2xl leading-snug font-medium text-ash sm:text-3xl">
          We test every unit, log every serial, and stand behind what we sell — so the person
          buying it never has to take our word for it.
        </p>
        <Link
          href="/shop"
          className="mt-10 inline-flex min-h-11 items-center border-b border-ash text-[13px] text-ash transition-colors duration-200 hover:border-gold hover:text-gold"
        >
          All inventory
        </Link>
      </section>

      <section className="px-5 py-24 text-center sm:px-8 sm:py-28" aria-labelledby="buyback-heading">
        <p className="text-[11px] tracking-[0.18em] text-steel uppercase">Working or not</p>
        <h2
          id="buyback-heading"
          className="mx-auto mt-5 max-w-2xl font-display text-3xl font-medium tracking-tight text-ash sm:text-4xl"
        >
          We buy your old tech.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-steel">
          Consoles, laptops, phones, PC parts and gadgets. Cash on the spot, free pickup, secure
          data wiping. Office pull-outs and bulk lots welcome.
        </p>
        <div className="mt-9">
          <CtaLink href="/sell">Get a quote</CtaLink>
        </div>
      </section>
    </>
  );
}
