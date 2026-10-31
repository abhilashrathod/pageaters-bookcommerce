import type { Footer as FooterData } from '@pageaters/cms-types';

import { cmsFetch } from '@/lib/cms.ts';

import { safeGroups } from './links.ts';
import { NavLink } from './nav-link.tsx';

// Site footer from the CMS `footer` global. CMS down → the name and the Open Library credit only.
export async function Footer() {
  const footer = await cmsFetch<FooterData>('/globals/footer', ['cms:global:footer']);
  const columns = safeGroups((footer?.columns ?? []).map(({ heading, links }) => ({ title: heading, links })));

  return (
    <footer className="mt-12 border-t pb-8 pt-8 text-sm">
      <div className="page-container flex flex-col gap-8 sm:flex-row">
        <div className="sm:flex-1">
          <p className="text-3xl font-bold leading-none">Pageaters</p>
          {/* Plain text on purpose: contact copy is never turned into links. */}
          {footer?.contact ? <p className="mt-4 whitespace-pre-line text-muted-foreground">{footer.contact}</p> : null}
        </div>
        {columns.length ? (
          <div className="grid grid-cols-2 gap-6 sm:flex-[2] sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="mb-2 font-medium">{column.title}</h2>
                <ul className="space-y-1.5">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <NavLink link={link} className="text-muted-foreground hover:text-foreground" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="page-container mt-8 flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
        {/* The linked Open Library credit below is always shown; skip a CMS credit that only repeats it. */}
        {footer?.credit && !/open library/i.test(footer.credit) ? <p>{footer.credit}</p> : null}
        {footer?.legal ? <p className="whitespace-pre-line">{footer.legal}</p> : null}
        <p>
          Cover images via{' '}
          <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer" className="underline">
            Open Library
          </a>
        </p>
      </div>
    </footer>
  );
}
