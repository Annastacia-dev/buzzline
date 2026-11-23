import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { SITE, SITE_URL } from '@/lib/site';
import './globals.css';

// Chunky grotesk for headlines, DM Sans (with italics for accent words) for everything else.
const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'], weight: ['500', '700', '800'] });
const body = DM_Sans({ variable: '--font-main', subsets: ['latin'], weight: ['300', '400', '500', '700'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.title, template: '%s · Buzzline' },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  category: 'games',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US', url: '/', title: SITE.title, description: SITE.description },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description },
  // Game PINs are six digits: stop iOS turning them into phone-number links.
  formatDetection: { telephone: false },
  appleWebApp: { title: SITE.name, statusBarStyle: 'default' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#fbf6ec' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
