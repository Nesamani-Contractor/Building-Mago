import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type ColorScheme } from './tokens';
import { usePrefs } from '@/data/prefs';

interface Theme {
  c: ColorScheme;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({ c: light, isDark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const override = usePrefs((s) => s.appearance);
  const isDark = override === 'system' ? system === 'dark' : override === 'dark';
  const value = useMemo(() => ({ c: isDark ? dark : light, isDark }), [isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
