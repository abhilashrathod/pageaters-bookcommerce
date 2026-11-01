import Link from 'next/link';

// The legacy Breadcrumbs: links separated by "/", the current page last (cut to 15 characters, as before).
export function Breadcrumbs({ items }: { items: { title: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="page-container my-3.5">
      <ol className="flex flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="[&+li]:pl-2 [&+li]:before:pr-2 [&+li]:before:content-['/']">
            {item.href ? (
              <Link href={item.href} className="transition-colors duration-500 hover:text-accent">
                {item.title}
              </Link>
            ) : (
              <span aria-current="page" className="text-muted-foreground" title={item.title}>
                {item.title.length > 15 ? `${item.title.slice(0, 15)}...` : item.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
