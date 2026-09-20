import Link from "next/link";

const base =
  "label inline-flex min-h-12 items-center justify-center px-6 transition-colors duration-200 cursor-pointer";

const variants = {
  solid: "bg-ash text-summit hover:bg-white",
  outline: "border border-steel/40 text-ash hover:border-ash",
} as const;

type Variant = keyof typeof variants;

export function CtaLink({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const classes = `${base} ${variants[variant]} ${className}`;
  const external = href.startsWith("http");

  if (external) {
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
