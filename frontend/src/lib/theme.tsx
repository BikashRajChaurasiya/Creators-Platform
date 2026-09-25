'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

export interface Theme {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  brandName: string;
  signupsOpen: boolean;
  maintenanceMode: boolean;
}

export const DEFAULT_THEME: Theme = {
  primaryColor: '#1B5E3B',
  accentColor: '#A3E635',
  logoUrl: '',
  brandName: 'UGCNP',
  signupsOpen: true,
  maintenanceMode: false,
};

const ThemeContext = createContext<Theme>(DEFAULT_THEME);
const RefreshContext = createContext<() => void>(() => {});

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeRefresh() {
  return useContext(RefreshContext);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function soften(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + percent))));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primaryColor);
  root.style.setProperty('--primary-dark', darken(theme.primaryColor, -0.2));
  root.style.setProperty('--primary-soft', soften(theme.primaryColor, 0.14));
  root.style.setProperty('--accent', theme.accentColor);
  root.style.setProperty('--accent-dark', darken(theme.accentColor, -0.35));
  root.style.setProperty('--brand-name', JSON.stringify(theme.brandName));
  if (theme.brandName) document.title = `${theme.brandName} — Nepal Creator Economy OS`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{
      theme: { primaryColor: string; accentColor: string; logoUrl: string; brandName: string };
      signupsOpen: boolean;
      maintenanceMode: boolean;
    }>('/settings/public')
      .then((s) => {
        if (cancelled) return;
        const next: Theme = {
          primaryColor: s.theme?.primaryColor || DEFAULT_THEME.primaryColor,
          accentColor: s.theme?.accentColor || DEFAULT_THEME.accentColor,
          logoUrl: s.theme?.logoUrl || '',
          brandName: s.theme?.brandName || DEFAULT_THEME.brandName,
          signupsOpen: s.signupsOpen,
          maintenanceMode: s.maintenanceMode,
        };
        setTheme(next);
        apply(next);
      })
      .catch(() => {
        if (!cancelled) {
          setTheme(DEFAULT_THEME);
          apply(DEFAULT_THEME);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      apply(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <RefreshContext.Provider value={refresh}>{children}</RefreshContext.Provider>
    </ThemeContext.Provider>
  );
}