import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Buzzline: live multiplayer quiz game',
    short_name: 'Buzzline',
    description: 'Host a live quiz on the big screen while everyone answers from their phones.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf6ec',
    theme_color: '#fbf6ec',
    categories: ['games', 'education', 'entertainment'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
