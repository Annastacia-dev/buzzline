'use client';

import { useEffect } from 'react';

// Puts today's date in the --today CSS variable, for the Typewriter theme's dated letterhead.
export default function Today() {
  useEffect(() => {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    document.documentElement.style.setProperty('--today', JSON.stringify(date));
  }, []);
  return null;
}
