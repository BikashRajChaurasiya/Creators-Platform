import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UGCNP — Nepal Creator Economy OS',
  description: 'A creator-marketplace operating system for Nepal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}