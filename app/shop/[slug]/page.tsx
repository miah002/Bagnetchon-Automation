import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaLink, StatusPill } from "@/components/cta";
import { ProductBandMedia } from "@/components/product-media";
import { getProduct, gradeCopy, products, statusLabel } from "@/lib/products";
import { peso, site } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return { title: `${product.name} — ${product.variant}`, description: product.summary };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const sellable = product.status === "available" || product.status === "incoming";

  return (
    <>
      <div className="px-5 pt-6 sm:px-8">
        <Link
          href="/shop"
          className="inline-flex min-h-11 items-center text-[11px] text-steel transition-colors duration-200 hover:text-ash"
        >
          ← Inventory
        </Link>
      </div>

      <section className="px-5 pb-16 text-center sm:px-8">
        <ProductBandMedia product={product} tone="dark" priority />

        <p className="mt-10 text-[11px] tracking-[0.18em] text-steel uppercase">
          {product.category} · {product.location}
        </p>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ash sm:text-3xl">
          {product.name}
        </h1>
        <p className="mt-2 text-[13px] text-steel">{product.variant}</p>

        <p className="mt-8 font-display text-2xl text-gold tabular-nums">{peso(product.price)}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {sellable ? (
            <CtaLink href={site.messenger}>
              {product.status === "incoming" ? "Reserve via Messenger" : "Buy via Messenger"}
            </CtaLink>
          ) : (
            <StatusPill>{statusLabel[product.status]}</StatusPill>
          )}
          <StatusPill>{product.condition}</StatusPill>
        </div>

        {sellable && (
          <p className="mx-auto mt-5 max-w-sm text-[11px] leading-relaxed text-steel">
            No online checkout. We confirm the unit, agree on meet-up or courier, then you pay.
          </p>
        )}
      </section>

      <section className="bg-ash px-5 py-24 text-center sm:px-8 sm:py-28">
        <p className="mx-auto max-w-xl font-display text-lg leading-relaxed text-summit sm:text-xl">
          {product.summary}
        </p>
        {product.note && (
          <p className="mx-auto mt-5 max-w-md text-[13px] text-summit/65">{product.note}</p>
        )}
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-28">
        <h2 className="text-center text-[11px] tracking-[0.18em] text-steel uppercase">
          What we tested
        </h2>
        <ul className="mx-auto mt-10 max-w-md space-y-3">
          {product.tested.map((item) => (
            <li key={item} className="flex gap-3 text-[13px] text-ash">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                strokeWidth="1.5"
                className="mt-0.5 h-4 w-4 shrink-0 stroke-verdant"
                aria-hidden="true"
              >
                <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-panel px-5 py-24 sm:px-8 sm:py-28">
        <h2 className="text-center text-[11px] tracking-[0.18em] text-steel uppercase">
          Specification
        </h2>
        <dl className="mx-auto mt-10 max-w-md">
          {product.specs.map((spec) => (
            <div key={spec.label} className="flex justify-between gap-6 border-b rule py-3">
              <dt className="text-[13px] text-steel">{spec.label}</dt>
              <dd className="text-right text-[13px] text-ash">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-3xl gap-14 sm:grid-cols-2">
          <div>
            <h2 className="text-[11px] tracking-[0.18em] text-steel uppercase">In the box</h2>
            <ul className="mt-6 space-y-2 text-[13px] text-ash">
              {product.included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] tracking-[0.18em] text-steel uppercase">
              Grade {product.grade}
            </h2>
            <p className="mt-6 text-[13px] leading-relaxed text-ash">
              {gradeCopy[product.grade]}
            </p>
            <p className="mt-4 text-[13px] leading-relaxed text-steel">
              Covered by {product.warranty}. Inspection before payment is welcome at meet-up.
            </p>
          </div>
        </div>
      </section>

      {sellable && (
        <section className="bg-ash px-5 py-24 text-center sm:px-8 sm:py-28">
          <h2 className="font-display text-2xl font-medium tracking-tight text-summit sm:text-3xl">
            {product.name}
          </h2>
          <p className="mt-3 text-[13px] text-summit/65">
            {product.variant} · {peso(product.price)}
          </p>
          <div className="mt-8">
            <CtaLink href={site.messenger} variant="dark">
              {product.status === "incoming" ? "Reserve via Messenger" : "Buy via Messenger"}
            </CtaLink>
          </div>
        </section>
      )}
    </>
  );
}
