import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Everyone, AI answer engines included, may read the public pages; the API is off limits.
export default function robots(): MetadataRoute.Robots {
  const rule = { allow: '/', disallow: '/api/' };
  return {
    rules: [
      { userAgent: '*', ...rule },
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'Bingbot'], ...rule },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
