import type { Footer as FooterData } from '@pageaters/cms-types';

import { cmsFetch } from '@/lib/cms.ts';

import { safeGroups } from './links.ts';
import { NavLink } from './nav-link.tsx';

// The legacy footer (partials/Footer.tsx) from the CMS `footer` global: the wordmark, the contact copy, link columns
// in grey, and the legal line. CMS down → the name and the Open Library credit only. The bottom padding clears the
// mobile bottom bar.
export async function Footer() {
  const footer = await cmsFetch<FooterData>('/globals/footer', ['cms:global:footer']);
  const columns = safeGroups((footer?.columns ?? []).map(({ heading, links }) => ({ title: heading, links })));

  return (
    <div className="page-container">
      <footer className="flex flex-wrap border-t border-[#e5e5e5] pt-7 pb-24 text-primary">
        <div className="mb-7 sm:mr-3.5 sm:flex-1">
          <p className="whitespace-nowrap text-[2.25rem] font-bold leading-none">Pageaters</p>
        </div>
        {footer?.contact ? (
          <div className="mb-7 sm:mr-3.5 sm:flex-1">
            <h2 className="mb-2 text-base">Contact</h2>
            {/* Plain text on purpose: contact copy is never turned into links. */}
            <address className="whitespace-pre-line not-italic">{footer.contact}</address>
          </div>
        ) : null}
        {columns.length ? (
          <ul className="flex flex-wrap sm:flex-1">
            {columns.map((column) => (
              <li key={column.title} className="mb-7 basis-full leading-8 sm:basis-1/2">
                <h2 className="text-base">{column.title}</h2>
                <ul className="columns-2 gap-5 sm:columns-1">
                  {column.links.map((link) => (
                    <li key={link.href + link.label} className="leading-8">
                      <NavLink link={link} className="text-[#999] transition-colors duration-500 hover:text-accent" />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex basis-full flex-wrap justify-center gap-x-6 gap-y-1 text-center text-[#999]">
          {footer?.legal ? <p className="whitespace-pre-line">{footer.legal}</p> : null}
          {/* The linked Open Library credit is always shown; skip a CMS credit that only repeats it. */}
          {footer?.credit && !/open library/i.test(footer.credit) ? <p>{footer.credit}</p> : null}
          <p>
            Cover images via{' '}
            <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
              Open Library
            </a>
          </p>
          <p className="sm:ml-auto">Made in India with 🧡</p>
        </div>
      </footer>
    </div>
  );
}
