import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderTheme = 'dark' | 'light' | 'sepia';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

const SETTINGS_KEY = 'reader_settings';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: FontSize;
  lineHeight: number;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'dark',
  fontSize: 'md',
  lineHeight: 1.6,
};

const FONT_SIZE_MAP: Record<FontSize, number> = {
  sm: 15,
  md: 17,
  lg: 19,
  xl: 22,
};

const THEME_MAP: Record<ReaderTheme, { bg: string; text: string; sub: string; accent: string }> = {
  dark: { bg: '#0B0B0F', text: '#FFFFFF', sub: '#A1A1AA', accent: '#A855F7' },
  light: { bg: '#FAFAF7', text: '#1A1A1A', sub: '#555555', accent: '#7C3AED' },
  sepia: { bg: '#F5EDD8', text: '#3A2E1F', sub: '#7A6A52', accent: '#93651C' },
};

export function getFontSizePx(size: FontSize): number {
  return FONT_SIZE_MAP[size];
}

export function getThemeColors(theme: ReaderTheme) {
  return THEME_MAP[theme];
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      })
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, update };
}
