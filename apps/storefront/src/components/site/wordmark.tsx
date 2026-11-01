// The legacy text logo (MainHeaderLogo: 1.75rem, 700) and the header's plain icon buttons (AppSmallIconButton).
export function Wordmark({ name = 'Pageaters' }: { name?: string }) {
  return <span className="inline-block whitespace-nowrap text-[1.75rem] font-bold leading-none text-primary">{name}</span>;
}

export const ICON_BUTTON =
  'relative inline-flex cursor-pointer items-center justify-center rounded-md px-2 py-1 text-primary outline-none transition-colors hover:text-accent focus-visible:ring-[3px] focus-visible:ring-ring/50';
