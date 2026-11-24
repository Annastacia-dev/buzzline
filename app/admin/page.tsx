import type { Metadata } from 'next';
import Admin from './Admin';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <Admin clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID} />;
}
