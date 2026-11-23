import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

const description = 'Free quiz maker: write questions, generate a quiz with AI or import a Kahoot spreadsheet, then host it live while players answer on their phones.';

export const metadata: Metadata = {
  title: 'Host a quiz: free quiz maker with AI',
  description,
  alternates: { canonical: '/host' },
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US', url: '/host', title: 'Host a quiz on Buzzline', description },
  twitter: { card: 'summary_large_image', title: 'Host a quiz on Buzzline', description },
};

export default function HostLayout({ children }: LayoutProps<'/host'>) {
  return children;
}
