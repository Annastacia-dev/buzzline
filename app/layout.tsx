import type { Metadata, Viewport } from 'next';
import { Bangers, Bricolage_Grotesque, Cabin_Sketch, Caveat_Brush, Cinzel, Comic_Neue, Alfa_Slab_One, Kalam, Cormorant, DM_Sans, Fredoka, Inter, Patrick_Hand, Schoolbell, Silkscreen, Space_Grotesk, Space_Mono, VT323 } from 'next/font/google';
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
// Retro: a terminal font for reading, and blocky pixel capitals for logos, numbers and big headings.
const pixel = VT323({ variable: '--font-pixel', subsets: ['latin'], weight: '400', preload: false });
const pixelCaps = Silkscreen({ variable: '--font-pixel-caps', subsets: ['latin'], weight: ['400', '700'], preload: false });
// Messages: the clean sans of a phone chat.
const chat = Inter({ variable: '--font-chat', subsets: ['latin'], preload: false });
// Comic: lettering for headlines and balloons.
const comicDisplay = Bangers({ variable: '--font-comic-display', subsets: ['latin'], weight: '400', preload: false });
const comic = Comic_Neue({ variable: '--font-comic', subsets: ['latin'], weight: ['400', '700'], preload: false });
// Tarot: engraved capitals over an old-style serif.
const tarotDisplay = Cinzel({ variable: '--font-tarot-display', subsets: ['latin'], weight: ['700'], preload: false });
const tarot = Cormorant({ variable: '--font-tarot', subsets: ['latin'], weight: ['600', '700'], preload: false });
// Postcard: a chunky slab for headings, handwriting for messages.
const postDisplay = Alfa_Slab_One({ variable: '--font-post-display', subsets: ['latin'], weight: '400', preload: false });
const post = Kalam({ variable: '--font-post', subsets: ['latin'], weight: ['400', '700'], preload: false });
// Chalkboard: sketchy chalk capitals over a teacher's handwriting.
const chalkDisplay = Cabin_Sketch({ variable: '--font-chalk-display', subsets: ['latin'], weight: '700', preload: false });
const chalk = Schoolbell({ variable: '--font-chalk', subsets: ['latin'], weight: '400', preload: false });

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
    <html lang="en" className={`${display.variable} ${body.variable} ${handDisplay.variable} ${hand.variable} ${inkSans.variable} ${inkMono.variable} ${toy.variable} ${pixel.variable} ${pixelCaps.variable} ${chat.variable} ${comicDisplay.variable} ${comic.variable} ${tarotDisplay.variable} ${tarot.variable} ${postDisplay.variable} ${post.variable} ${chalkDisplay.variable} ${chalk.variable}`}>
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
