import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import './globals.css';

// Chunky grotesk for headlines, DM Sans (with italics for accent words) for everything else.
const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'], weight: ['500', '700', '800'] });
const body = DM_Sans({ variable: '--font-main', subsets: ['latin'], weight: ['300', '400', '500', '700'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'Buzzline',
  description: 'Live multiplayer quiz game',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#fbf6ec' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
