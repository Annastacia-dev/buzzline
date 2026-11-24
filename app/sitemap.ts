import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { PACKS } from '@/lib/packs';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/host`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/join`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/quiz`, changeFrequency: 'weekly', priority: 0.9 },
    ...PACKS.map(p => ({ url: `${SITE_URL}/quiz/${p.slug}`, changeFrequency: 'monthly' as const, priority: p.category === 'christmas' ? 0.8 : 0.7 })),
  ];
}
