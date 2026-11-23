import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import { shareImage } from '@/lib/og-cards';

const JOIN_IMAGE = shareImage('join');

const description = 'Join a live Buzzline quiz from your phone: enter the 6-digit game PIN and a nickname. No app or account needed.';

export const metadata: Metadata = {
  title: 'Join a game',
  description,
  alternates: { canonical: '/join' },
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US', url: '/join', title: 'Join a Buzzline game', description, images: [JOIN_IMAGE] },
  twitter: { card: 'summary_large_image', title: 'Join a Buzzline game', description, images: [JOIN_IMAGE] },
};

export default function JoinLayout({ children }: LayoutProps<'/join'>) {
  return children;
}
