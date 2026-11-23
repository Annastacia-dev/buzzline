import type { Metadata } from 'next';

// The player's in-game screen: only useful mid-game, so keep it out of search results.
export const metadata: Metadata = {
  title: 'Playing',
  robots: { index: false, follow: false },
};

export default function PlayLayout({ children }: LayoutProps<'/play'>) {
  return children;
}
