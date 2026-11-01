'use client';

import { useState } from 'react';

// The legacy description Spoiler: about 110px of text (four whole lines here, so none is cut in half), then
// "Read More" / "Read Less".
export function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 400;
  return (
    <div className="mb-[1.25rem]">
      <p className={`whitespace-pre-wrap ${long && !open ? 'line-clamp-4' : ''}`}>{text}</p>
      {long ? (
        <button type="button" className="cursor-pointer text-muted-foreground hover:text-accent" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Read Less' : 'Read More'}
        </button>
      ) : null}
    </div>
  );
}
