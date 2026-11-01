import { Heart, Library, Store } from 'lucide-react';

import { pageMetadata } from '@/lib/seo.ts';

// The legacy About page (pages/about.tsx), retold in past tense now that the store has closed. Static: a fixed story
// with a custom layout no CMS block provides. The legacy hero photo is gone, so brand colour blocks stand in.
export const generateMetadata = () =>
  pageMetadata({
    title: 'About Us',
    description: 'Pageaters was an online bookstore for readers in India, from 2022 to 2026.',
    path: '/about',
  });

const STATS = [
  ['2022–2026', 'in business'],
  ['5,000+', 'customers'],
  ['50,000+', 'orders'],
];

const POINTS = [
  { Icon: Library, title: 'Educate about books', text: 'We educated our readers and guided them about books rather than cold selling.' },
  { Icon: Store, title: 'A lot more than purchases', text: 'Pageaters was more than a site: books, book boxes, mystery boxes, bundles, collections and rewards.' },
  { Icon: Heart, title: 'It’s a personal experience', text: 'We treated you as our bookish friend rather than just a buyer, committed to the best reading experience.' },
];

export default function AboutPage() {
  return (
    <main>
      <section className="page-container py-12 md:py-24">
        <h1 className="jumbo-1 max-w-4xl">
          Our mission was to give readers <span className="text-accent">the best reading experience</span> of their lives.
        </h1>
      </section>
      <section className="grid lg:grid-cols-2">
        <div className="space-y-4 bg-primary px-4 py-12 text-primary-foreground sm:px-10 md:py-20 lg:px-20">
          <h2 className="display-1 font-bold">Our Story</h2>
          <p>
            We were a group of quirky bookworms who wanted to give other bookworms the best reading experience. So we started
            Pageaters, an online bookstore for affordable reading, so readers could enjoy the books they loved and grow as people
            without having to compromise their wallets.
          </p>
          <p>
            Pageaters ran from 2022 to 2026. In that time it served over 5,000 customers and more than 50,000 orders across books,
            book boxes, mystery boxes, bundles and collections. Business overhead eventually led the store to shut down in 2026.
          </p>
          <p>We believed in the power of words and a passion for leisure reading. We hope it helped you find your next favourite book.</p>
        </div>
        <div className="grid content-center gap-8 bg-accent px-4 py-12 text-accent-foreground sm:px-10 lg:px-20">
          {STATS.map(([value, label]) => (
            <p key={label}>
              <span className="jumbo-1 block">{value}</span>
              <span className="display-1">{label}</span>
            </p>
          ))}
        </div>
      </section>
      <section className="page-container grid gap-10 py-16 md:grid-cols-4 md:py-24">
        <h2 className="display-1 font-bold">Us vs Them</h2>
        {POINTS.map(({ Icon, title, text }) => (
          <div key={title}>
            <Icon className="mb-3 size-12 text-accent" aria-hidden />
            <p>
              <strong>{title}</strong>
              <br />
              {text}
            </p>
          </div>
        ))}
      </section>
      <section className="page-container mb-16">
        <div className="rounded-[1.5rem] bg-gradient-to-r from-[#F09819] to-[#FF512F] p-10 md:p-20">
          <p className="jumbo-1 text-white">Eat new story everyday</p>
        </div>
        <p className="mt-6 text-muted-foreground">This site is now a portfolio demo of the Pageaters architecture.</p>
      </section>
    </main>
  );
}
