import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaLink } from "@/components/cta";
import { ProductMedia } from "@/components/product-media";
import { TrustBadge } from "@/components/trust-badge";
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

  return {
    title: `${product.name} — ${product.variant}`,
    description: product.summary,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const sellable = product.status === "available" || product.status === "incoming";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
      <Link
        href="/shop"
        className="label inline-flex min-h-11 items-center text-steel transition-colors duration-200 hover:text-ash"
      >
        ← Back to inventory
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductMedia
            product={product}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
          {!product.image && (
            <p className="mt-3 text-xs text-steel">
              Photos of this exact unit are added before it goes on sale.
            </p>
          )}
        </div>

        <div>
          <p className="label text-steel">
            {product.category} · {product.location}
          </p>

          <h1 className="mt-5 font-display text-[clamp(1.75rem,5vw,2.75rem)] font-bold leading-tight tracking-tight text-ash">
            {product.name}
          </h1>
          <p className="mt-2 text-base text-steel">{product.variant}</p>

          <p className="mt-8 font-display text-3xl font-bold text-gold tabular-nums sm:text-4xl">
            {peso(product.price)}
          </p>

          <p className="label mt-3 text-ash">
            {statusLabel[product.status]}
            <span className="text-steel"> · {product.condition}</span>
          </p>

          <p className="mt-8 max-w-lg text-base leading-relaxed text-steel">{product.summary}</p>

          {product.note && (
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-steel">{product.note}</p>
          )}

          {sellable && (
            <div className="mt-10">
              <CtaLink href={site.messenger}>
                {product.status === "incoming" ? "Reserve via Messenger" : "Buy via Messenger"}
              </CtaLink>
              <p className="mt-3 text-xs text-steel">
                No online checkout yet. We confirm the unit, agree on meet-up or courier, then you pay.
              </p>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-2">
            <TrustBadge>Tested</TrustBadge>
            <TrustBadge>Grade {product.grade}</TrustBadge>
            <TrustBadge>{product.warranty}</TrustBadge>
          </div>

          <section className="mt-14 border-t rule pt-8">
            <h2 className="label text-steel">Specification</h2>
            <dl className="mt-5">
              {product.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex justify-between gap-6 border-b rule py-3 text-sm"
                >
                  <dt className="text-steel">{spec.label}</dt>
                  <dd className="text-right text-ash">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12">
            <h2 className="label text-steel">What we tested</h2>
            <ul className="mt-5 space-y-3">
              {product.tested.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-ash">
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

          <section className="mt-12">
            <h2 className="label text-steel">In the box</h2>
            <ul className="mt-5 space-y-2 text-sm text-steel">
              {product.included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mt-12 bg-panel p-6">
            <h2 className="label text-steel">Grade {product.grade}</h2>
            <p className="mt-4 text-sm leading-relaxed text-ash">{gradeCopy[product.grade]}</p>
            <p className="mt-4 text-sm leading-relaxed text-steel">
              Covered by {product.warranty}. Inspection before payment is welcome at meet-up.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
