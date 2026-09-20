export function TrustBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="label inline-flex items-center gap-1.5 bg-ash px-2.5 py-1.5 text-summit">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        strokeWidth="2"
        className="h-3 w-3 stroke-summit"
        aria-hidden="true"
      >
        <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </span>
  );
}
