// The legacy Badge (elements/Badge.tsx): small light-weight labels for a book's flags. New Release was the legacy
// secondary red; the theme's nearest token is `destructive`.
const FLAGS = [
  ['newRelease', 'New Release', 'bg-destructive'],
  ['editorsPick', "Editor's Pick", 'bg-accent'],
  ['bestSeller', 'Best Seller', 'bg-primary'],
  ['preOrder', 'Pre-order', 'bg-success'],
] as const;

type Flags = Partial<Record<(typeof FLAGS)[number][0], boolean>>;

export function Badges({ flags, className = '' }: { flags: Flags; className?: string }) {
  const shown = FLAGS.filter(([flag]) => flags[flag]);
  if (!shown.length) return null;
  return (
    <span className={`flex flex-wrap gap-y-1 ${className}`}>
      {shown.map(([flag, label, colour]) => (
        <span key={flag} className={`mr-2 inline-flex whitespace-nowrap rounded-[3px] px-[0.65em] pt-[0.55em] pb-[0.35em] text-xs leading-3 font-light text-white ${colour}`}>
          {label}
        </span>
      ))}
    </span>
  );
}

// The legacy tag pill (book page, book box card).
export function TagPills({ tags, className = '' }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <ul className={`flex flex-wrap justify-center gap-x-2 ${className}`}>
      {tags.map((tag) => (
        <li key={tag} className="mb-2 inline-flex rounded-[1.5rem] border border-[#eee] bg-background px-[1.25rem] py-3 text-[0.825rem] leading-none font-semibold text-primary shadow-tag">
          {tag}
        </li>
      ))}
    </ul>
  );
}
