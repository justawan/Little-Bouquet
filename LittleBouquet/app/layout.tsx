import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './style.css';

export const metadata: Metadata = {
  title: 'A Little Bouquet', description: 'A little bouquet, made just for you.',
  robots: { index: false, follow: false },
};

export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}<Analytics /></body></html>;
}
