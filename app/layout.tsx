import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Caveat_Brush, DM_Sans, Fredoka, Patrick_Hand, Space_Grotesk, Space_Mono } from 'next/font/google';
import { SITE, SITE_URL } from '@/lib/site';
import { shareImage } from '@/lib/og-cards';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Suspense } from 'react';
import VisitTracker from './VisitTracker';

// Chunky grotesk for headlines, DM Sans (with italics for accent words) for everything else.
const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'], weight: ['500', '700', '800'] });
const body = DM_Sans({ variable: '--font-main', subsets: ['latin'], weight: ['300', '400', '500', '700'], style: ['normal', 'italic'] });
// Handwriting for the Doodlebug quiz theme. Not preloaded: only quizzes with that theme download them.
const handDisplay = Caveat_Brush({ variable: '--font-hand-display', subsets: ['latin'], weight: '400', preload: false });
const hand = Patrick_Hand({ variable: '--font-hand', subsets: ['latin'], weight: '400', preload: false });
// Inkblot: a chunky grotesk with mono labels.
const inkSans = Space_Grotesk({ variable: '--font-ink', subsets: ['latin'], weight: ['400', '500', '700'], preload: false });
const inkMono = Space_Mono({ variable: '--font-ink-mono', subsets: ['latin'], weight: ['400', '700'], preload: false });
// Toybox: a round, bouncy sans for the 3D blocks.
const toy = Fredoka({ variable: '--font-toy', subsets: ['latin'], weight: ['500', '600', '700'], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.title, template: '%s · Buzzline' },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  category: 'games',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US', url: '/', title: SITE.title, description: SITE.description, images: [shareImage('home')] },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description, images: [shareImage('home')] },
  // Game PINs are six digits: stop iOS turning them into phone-number links.
  formatDetection: { telephone: false },
  appleWebApp: { title: SITE.name, statusBarStyle: 'default' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#fbf6ec' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${handDisplay.variable} ${hand.variable} ${inkSans.variable} ${inkMono.variable} ${toy.variable}`}>
      <body>
        {children}
        <Analytics />
        {/* The path is only known at request time on dynamic routes, so it streams in after the page. */}
        <Suspense fallback={null}><VisitTracker /></Suspense>
        <SpeedInsights />
      </body>
    </html>
  );
}
