import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = {
  title: 'UGCNP — Nepal Creator Economy OS',
  description: 'A creator-marketplace operating system for Nepal.',
  icons: { icon: '/logo.svg' },
  applicationName: 'UGCNP',
  openGraph: {
    title: 'UGCNP — Nepal Creator Economy OS',
    description: 'A creator-marketplace operating system for Nepal.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1011' },
  ],
};

/**
 * Applies the persisted (or OS-preferred) color scheme before first paint so
 * the page never flashes light before hydrating into dark.
 */
const COLOR_SCHEME_SCRIPT = `(function(){try{var s=localStorage.getItem('ugcnp.color-scheme');if(s!=='light'&&s!=='dark'){s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var d=s==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=s;}catch(e){}})();`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
