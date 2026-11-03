import Image from 'next/image';
import { notFound } from 'next/navigation';

import { BookCard } from '@/components/cards/book-card.tsx';
import { ReadMore } from '@/components/read-more.tsx';
import { catalogApi } from '@/lib/api.ts';
import { imageSrc } from '@/lib/images.ts';
import { pageMetadata } from '@/lib/seo.ts';

type Props = { params: Promise<{ id: string }> };

// ISR: rendered on the first visit, then served from the CDN; catalog data refreshes hourly, a CMS publish at once.
export const revalidate = 3600;
export const generateStaticParams = () => [];

const getAuthor = (id: string) => catalogApi.authors.detail({ id }).catch(() => notFound());

export async function generateMetadata({ params }: Props) {
  const author = await getAuthor((await params).id);
  return pageMetadata({ title: author.name, description: author.intro, image: author.avatar, path: `/authors/${author.authorId}` });
}

// The legacy author profile: a 33vh band with the round avatar over its edge, the name, the intro and all their books.
export default async function AuthorPage({ params }: Props) {
  const author = await getAuthor((await params).id);
  const avatar = imageSrc(author.avatar);
  const books = author.books.filter((book) => typeof book === 'object');
  return (
    <main>
      <section className="relative h-[33vh] bg-gradient-to-t from-black/30 to-transparent">
        {avatar ? (
          <Image
            src={avatar}
            alt={author.name}
            width={250}
            height={250}
            priority
            className="absolute inset-x-0 -bottom-[125px] z-10 mx-auto size-[250px] rounded-full border-[3px] border-primary bg-background object-cover"
          />
        ) : null}
      </section>
      <section className="page-container mt-[150px] flex flex-col items-center text-center">
        <h1 className="text-[2rem] leading-[2.5rem] tracking-[-1px] sm:text-[3rem] sm:leading-[4rem] md:text-[3.714rem] md:tracking-[-3px]">{author.name}</h1>
        <div className="mt-[1.25rem] mb-[2.25rem] max-w-4xl">{author.intro ? <ReadMore text={author.intro} /> : null}</div>
      </section>
      <section className="page-container mb-9">
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {books.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      </section>
    </main>
  );
}
