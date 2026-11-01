'use client';

import type { ShopperBookSearchResult } from '@pageaters/shared';
import { Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { useEffect, useId, useState } from 'react';

import { imageSrc } from '@/lib/images.ts';
import { shopperApi } from '@/lib/shopper-api.ts';

import { ICON_BUTTON, Wordmark } from './wordmark.tsx';

// The legacy header search (Mantine Autocomplete): a pill input that searches book titles (GET /store-books/search,
// at most 10) and lists them with a cover avatar; picking one opens /books/<bookId>.
function SearchBox({ onPick, autoFocus }: { onPick?: () => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ShopperBookSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const term = query.trim();

  useEffect(() => {
    if (!term) return;
    let live = true;
    const timer = setTimeout(() => {
      shopperApi.books
        .search({ q: term })
        .then((books) => live && setResults(books))
        .catch(() => live && setResults([]));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term]);

  const shown = term && open ? results : [];
  const pick = () => {
    setQuery('');
    setOpen(false);
    onPick?.();
  };

  return (
    <div
      className="relative w-[90%]"
      onFocus={() => setOpen(true)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}
      onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
    >
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by Book Title..."
        aria-label="Search books by title"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={shown.length > 0}
        autoFocus={autoFocus}
        className="h-9 w-full rounded-full border border-[#ced4da] bg-background px-3.5 text-sm outline-none focus:border-ring"
      />
      <ul
        id={listId}
        aria-label="Search results"
        // Keeps focus in the input during a click: Safari doesn't focus a clicked link, so the blur would close the list first.
        onMouseDown={(event) => event.preventDefault()}
        className={`absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-[4px] border bg-background p-1 shadow-md ${shown.length ? '' : 'hidden'}`}
      >
        {shown.map((book) => {
          const cover = imageSrc(book.poster);
          const author = typeof book.author === 'object' ? book.author?.name : undefined;
          return (
            <li key={book._id}>
              <Link href={`/books/${book.bookId}`} onClick={pick} className="flex items-center gap-4 rounded-[4px] px-3 py-2 outline-none hover:bg-muted focus-visible:bg-muted">
                {cover ? (
                  <Image src={cover} alt="" width={38} height={38} className="size-[38px] shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="size-[38px] shrink-0 rounded-full bg-muted" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm">{book.title}</span>
                  {author ? <span className="block truncate text-xs text-muted-foreground">{author}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Wide screens: the search box in the header. Small screens: a search icon opening a full-width drawer from the top.
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <li className="hidden w-3/4 items-center justify-center px-2 sm:inline-flex md:w-1/2">
        <SearchBox />
      </li>
      <li className="inline-flex items-center sm:hidden">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className={ICON_BUTTON} aria-label="Search books">
            <Search className="size-[30px] rotate-90" strokeWidth={1.5} aria-hidden />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px]" />
            <Dialog.Content className="fixed inset-0 z-50 bg-background p-3" aria-describedby={undefined}>
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title asChild>
                  <span>
                    <Wordmark />
                  </span>
                </Dialog.Title>
                <Dialog.Close className={ICON_BUTTON} aria-label="Close search">
                  <X className="size-5" aria-hidden />
                </Dialog.Close>
              </div>
              <SearchBox autoFocus onPick={() => setOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </li>
    </>
  );
}
