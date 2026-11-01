import type { CmsBlockOf } from '@pageaters/cms-types';

import { SectionHeading } from '@/components/section-heading.tsx';

// Questions and answers as an accordion: native <details>/<summary>, so it is keyboard and screen-reader friendly
// with no client JS. Answers are plain text; line breaks are kept.
export function FaqBlock({ block }: { block: CmsBlockOf<'faq'> }) {
  if (!block.items?.length) return null;
  return (
    <section className="page-container my-8 max-w-3xl" aria-label={block.heading ?? 'Frequently asked questions'}>
      <SectionHeading title={block.heading} />
      <div className="divide-y divide-border border-y border-border">
        {block.items.map((item, index) => (
          <details key={item.id ?? index} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
              {item.question}
              <span aria-hidden className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="whitespace-pre-line pb-4 leading-relaxed text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
