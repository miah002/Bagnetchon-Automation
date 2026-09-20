import type { Metadata } from "next";
import { CtaLink } from "@/components/cta";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "We buy your old tech",
  description:
    "Cash on the spot for working and non-working consoles, laptops, phones, PC parts and gadgets. Free pickup and secure data wiping across Batangas, Laguna, Cavite and Metro Manila.",
};

function CashIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" strokeWidth="1.25" className="h-8 w-8 stroke-steel">
      <rect x="3" y="8" width="26" height="16" rx="2" />
      <circle cx="16" cy="16" r="4" />
      <path d="M7 12v8M25 12v8" strokeLinecap="round" />
    </svg>
  );
}

function PickupIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" strokeWidth="1.25" className="h-8 w-8 stroke-steel">
      <path d="M2 9h15v13H2zM17 13h6.5l4.5 4.5V22H17z" strokeLinejoin="round" />
      <circle cx="8" cy="24" r="2.5" />
      <circle cx="22" cy="24" r="2.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" strokeWidth="1.25" className="h-8 w-8 stroke-steel">
      <path d="M16 3 5 7v9c0 6.5 4.6 11.4 11 13 6.4-1.6 11-6.5 11-13V7z" strokeLinejoin="round" />
      <path d="M11 16.5 14.5 20l7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const offers = [
  {
    icon: <CashIcon />,
    title: "Cash on the spot",
    body: "Agreed price paid in full at handover. No consignment, no waiting for it to sell first.",
  },
  {
    icon: <PickupIcon />,
    title: "Free pickup",
    body: `We collect across ${site.coverage.slice(0, 3).join(", ")} and Metro Manila. Bulk lots included — we bring the vehicle.`,
  },
  {
    icon: <ShieldIcon />,
    title: "Data wiped securely",
    body: "Drives wiped or physically destroyed on request, with written confirmation for business sellers.",
  },
];

const steps = [
  {
    n: "01",
    title: "Send a photo and the model",
    body: "Message us on Facebook with what you have. Model number and a clear photo is enough to start.",
  },
  {
    n: "02",
    title: "Get a same-day quote",
    body: "We price against live local market data, not guesswork. If it is worth more than you expected, we say so.",
  },
  {
    n: "03",
    title: "We collect and pay",
    body: "Meet-up or free pickup. You are paid in full at handover, before the unit leaves with us.",
  },
];

const categories = [
  "PlayStation, Xbox, Nintendo consoles",
  "Retro and modern handhelds",
  "Laptops and desktops",
  "Phones and tablets",
  "GPUs, CPUs, RAM, SSDs and drives",
  "Monitors, peripherals and accessories",
];

export default function SellPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <p className="label text-gold">Working or not — we still want it</p>

        <h1 className="mt-8 max-w-3xl font-display text-[clamp(2.25rem,8vw,4.5rem)] font-bold leading-[0.98] tracking-tight text-ash">
          We buy your old tech.
        </h1>

        <p className="label mt-8 text-steel">
          Consoles · Laptops · Phones · PC Parts · Gadgets
        </p>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-steel sm:text-lg">
          Most people assume broken gear is worthless and never ask. It usually is not. Send us a
          photo and the model, and we will quote you the same day.
        </p>

        <div className="mt-10">
          <CtaLink href={site.messenger}>Get a free quote</CtaLink>
        </div>
      </section>

      <section className="border-t rule" aria-labelledby="offer-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <h2 id="offer-heading" className="sr-only">
            What we offer
          </h2>
          <div className="grid gap-12 sm:grid-cols-3 sm:gap-8">
            {offers.map((offer) => (
              <div key={offer.title}>
                <div aria-hidden="true">{offer.icon}</div>
                <h3 className="label mt-6 text-ash">{offer.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-steel">{offer.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t rule" aria-labelledby="steps-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <h2 id="steps-heading" className="label text-steel">
            How it works
          </h2>
          <div className="mt-12 grid gap-12 sm:grid-cols-3 sm:gap-8">
            {steps.map((step) => (
              <div key={step.n} className="border-t rule pt-6">
                <p className="font-display text-sm text-steel tabular-nums">{step.n}</p>
                <h3 className="mt-4 font-display text-lg font-medium text-ash">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-steel">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t rule" aria-labelledby="categories-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 id="categories-heading" className="label text-steel">
                What we take
              </h2>
              <ul className="mt-8">
                {categories.map((item) => (
                  <li key={item} className="border-b rule py-4 text-sm text-ash">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-panel p-8 sm:p-10">
                <h2 className="label text-steel">Office pull-outs and bulk lots</h2>
                <p className="mt-6 text-base leading-relaxed text-ash">
                  Refreshing your IT fleet? We buy retired desktops, laptops, monitors and
                  peripherals by the lot — and we handle the hauling.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-steel">
                  Most companies currently pay a hauler to take this away. We reverse that: free
                  pickup, certificate of data wiping, and cash for the lot.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-steel">
                  We issue and require proper paperwork on every business purchase — deed of sale,
                  delivery receipt or disposal certificate on company letterhead.
                </p>
                <div className="mt-8">
                  <CtaLink href={site.messenger} variant="outline">
                    Talk to us about a lot
                  </CtaLink>
                </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
