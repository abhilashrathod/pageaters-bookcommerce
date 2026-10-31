import { CmsPage, cmsPageMetadata } from '@/components/cms-page.tsx';

// Prerendered at build, when the CMS may be down: re-render hourly so an empty shell heals (a publish revalidates sooner).
export const revalidate = 3600;

export const generateMetadata = () => cmsPageMetadata('home');

export default function HomePage() {
  return <CmsPage slug="home" />;
}
