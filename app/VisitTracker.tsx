'use client';
// Counts page views for the admin dashboard: one beacon per page, sent when the path changes.
// No cookies or ids leave the browser; the server works out an anonymous daily visitor (lib/track.ts).
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { beacon } from '@/lib/client';

export default function VisitTracker() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (!path || path.startsWith('/admin')) return;
    // Where they came from matters only on the first page; later ones are clicks within Buzzline.
    beacon({ kind: 'visit', path, ref: first.current ? document.referrer : undefined });
    first.current = false;
  }, [path]);
  return null;
}
