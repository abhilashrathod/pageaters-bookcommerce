import { Breadcrumbs } from './breadcrumbs.tsx';

// The legacy page top: breadcrumbs (Home / … / title) and the `display-1` heading (PageHeadings).
export function PageHeading({ title, trail = [] }: { title: string; trail?: { title: string; href: string }[] }) {
  return (
    <>
      <Breadcrumbs items={[{ title: 'Home', href: '/' }, ...trail, { title }]} />
      <div className="page-container mb-3.5">
        <h1 className="display-1">{title}</h1>
      </div>
    </>
  );
}
