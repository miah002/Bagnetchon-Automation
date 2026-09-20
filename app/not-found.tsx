import { CtaLink } from "@/components/cta";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
      <p className="label text-steel">404</p>
      <h1 className="mt-6 font-display text-[clamp(2rem,6vw,3.5rem)] font-bold leading-tight tracking-tight text-ash">
        That unit is gone.
      </h1>
      <p className="mt-6 max-w-md text-base leading-relaxed text-steel">
        Stock here is one-of-one, so listings disappear once they sell. Check what is currently
        available.
      </p>
      <div className="mt-10">
        <CtaLink href="/shop">Browse inventory</CtaLink>
      </div>
    </div>
  );
}
