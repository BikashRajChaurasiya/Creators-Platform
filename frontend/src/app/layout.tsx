import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = {
  title: 'UGCNP — Nepal Creator Economy OS',
  description: 'A creator-marketplace operating system for Nepal.',
  icons: { icon: '/logo.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}