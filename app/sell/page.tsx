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
    <svg viewBox="0 0 32 32" fill="none" strokeWidth="1.25" className="h-7 w-7 stroke-steel">
      <rect x="3" y="8" width="26" height="16" rx="2" />
      <circle cx="16" cy="16" r="4" />
      <path d="M7 12v8M25 12v8" strokeLinecap="round" />
    </svg>
  );
}

function PickupIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" strokeWidth="1.25" className="h-7 w-7 stroke-steel">
      <path d="M2 9h15v13H2zM17 13h6.5l4.5 4.5V22H17z" strokeLinejoin="round" />
      <circle cx="8" cy="24" r="2.5" />
      <circle cx="22" cy="24" r="2.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" strokeWidth="1.25" className="h-7 w-7 stroke-steel">
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
    body: "Message us with what you have. Model number and a clear photo is enough to start.",
  },
  {
    n: "02",
    title: "Get a same-day quote",
    body: "We price against live local market data. If it is worth more than you expected, we say so.",
  },
  {
    n: "03",
    title: "We collect and pay",
    body: "Meet-up or free pickup. Paid in full at handover, before the unit leaves with us.",
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
      <section className="px-5 py-24 text-center sm:px-8 sm:py-32">
        <p className="text-[11px] tracking-[0.18em] text-steel uppercase">
          Working or not — we still want it
        </p>
        <h1 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-medium tracking-tight text-ash sm:text-5xl">
          We buy your old tech.
        </h1>
        <p className="mt-6 text-[11px] tracking-[0.18em] text-steel uppercase">
          Consoles · Laptops · Phones · PC Parts · Gadgets
        </p>
        <p className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-steel">
          Most people assume broken gear is worthless and never ask. It usually is not. Send a
          photo and the model, and we will quote you the same day.
        </p>
        <div className="mt-9">
          <CtaLink href={site.messenger}>Get a free quote</CtaLink>
        </div>
      </section>

      <section className="bg-ash px-5 py-24 sm:px-8 sm:py-28" aria-labelledby="offer-heading">
        <h2 id="offer-heading" className="sr-only">
          What we offer
        </h2>
        <div className="mx-auto grid max-w-4xl gap-12 text-center sm:grid-cols-3">
          {offers.map((offer) => (
            <div key={offer.title}>
              <div className="flex justify-center [&_svg]:stroke-summit/60" aria-hidden="true">
                {offer.icon}
              </div>
              <h3 className="mt-5 text-[13px] text-summit">{offer.title}</h3>
              <p className="mx-auto mt-2.5 max-w-xs text-[13px] leading-relaxed text-summit/65">
                {offer.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-28" aria-labelledby="steps-heading">
        <h2
          id="steps-heading"
          className="text-center text-[11px] tracking-[0.18em] text-steel uppercase"
        >
          How it works
        </h2>
        <div className="mx-auto mt-12 grid max-w-4xl gap-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="border-t rule pt-5">
              <p className="text-[11px] text-steel tabular-nums">{step.n}</p>
              <h3 className="mt-3 text-sm text-ash">{step.title}</h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-steel">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-panel px-5 py-24 sm:px-8 sm:py-28" aria-labelledby="take-heading">
        <h2
          id="take-heading"
          className="text-center text-[11px] tracking-[0.18em] text-steel uppercase"
        >
          What we take
        </h2>
        <ul className="mx-auto mt-10 max-w-md">
          {categories.map((item) => (
            <li key={item} className="border-b rule py-3.5 text-[13px] text-ash">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section
        id="bulk"
        className="scroll-mt-24 bg-ash px-5 py-24 text-center sm:px-8 sm:py-32"
        aria-labelledby="bulk-heading"
      >
        <p className="text-[11px] tracking-[0.18em] text-summit/55 uppercase">For business</p>
        <h2
          id="bulk-heading"
          className="mx-auto mt-5 max-w-2xl font-display text-2xl font-medium tracking-tight text-summit sm:text-3xl"
        >
          Office pull-outs and bulk lots.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-summit/70">
          Refreshing your IT fleet? We buy retired desktops, laptops, monitors and peripherals by
          the lot — and we handle the hauling. Most companies currently pay a hauler to take this
          away. We reverse that.
        </p>
        <p className="mx-auto mt-4 max-w-lg text-[13px] leading-relaxed text-summit/60">
          Proper paperwork on every business purchase — deed of sale, delivery receipt or disposal
          certificate on company letterhead.
        </p>
        <div className="mt-9">
          <CtaLink href={site.messenger} variant="dark">
            Talk to us about a lot
          </CtaLink>
        </div>
      </section>
    </>
  );
}
