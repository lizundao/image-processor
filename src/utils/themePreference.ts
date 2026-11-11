import { ColorMode } from '@chakra-ui/react';
import { AppTheme } from '../types';

export function resolveColorMode(theme: AppTheme): ColorMode {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return theme;
}

export function applyThemePreference(
  theme: AppTheme,
  setColorMode: (value: ColorMode) => void
): void {
  setColorMode(resolveColorMode(theme));
}

export function subscribeSystemTheme(
  onChange: (colorMode: ColorMode) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (event: MediaQueryListEvent) => {
    onChange(event.matches ? 'dark' : 'light');
  };

  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
