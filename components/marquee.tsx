export function Marquee({ text }: { text: string }) {
  const items = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="overflow-hidden border-y rule bg-summit py-2.5">
      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1 || undefined}>
            {items.map((i) => (
              <span key={i} className="px-6 text-[11px] whitespace-nowrap text-steel">
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
