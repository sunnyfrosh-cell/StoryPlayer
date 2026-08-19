import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppTheme } from '@/theme';

export interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appTheme, setAppTheme] = useState<AppTheme>('dark');

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: appTheme,
      isDark: appTheme === 'dark',
      toggleTheme: () =>
        setAppTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
      setTheme: setAppTheme,
    }),
    [appTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return ctx;
}
