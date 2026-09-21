import Link from "next/link";

const variants = {
  /** Primary action on a dark band */
  light: "bg-ash text-summit hover:bg-white",
  /** Primary action on a light band */
  dark: "bg-summit text-ash hover:bg-black",
  /** Secondary, on dark */
  ghost: "border-steel/45 text-ash hover:border-ash",
  /** Secondary, on light */
  ghostDark: "border-summit/30 text-summit hover:border-summit",
} as const;

type Variant = keyof typeof variants;

export function CtaLink({
  href,
  children,
  variant = "light",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const classes = `pill cursor-pointer ${variants[variant]} ${className}`;

  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/** Non-interactive state chip, e.g. Sold Out / Arriving this month */
export function StatusPill({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  const style =
    tone === "dark" ? "border-steel/45 text-steel" : "border-summit/25 text-summit/70";
  return <span className={`pill ${style}`}>{children}</span>;
}
