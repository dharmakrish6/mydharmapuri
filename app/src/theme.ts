import { useSyncExternalStore } from 'react';
import { Platform, useColorScheme } from 'react-native';

const light = {
  bg: '#f2f3ec',
  card: '#ffffff',
  cardAlt: '#f7f8f2',
  ink: '#122a20',
  muted: '#5f7268',
  line: '#e2e2d4',
  leaf: '#3e8e2f',
  orange: '#e4711f',
  teal: '#2c8781',
  gold: '#b8862c',
  violet: '#6b5fc7',
  sky: '#2f6fb0',
  crimson: '#bf3b3b',
  rose: '#c2416f',
  heroFrom: '#1f5a3a',
  heroTo: '#2c8781',
  overlay: 'rgba(18,42,32,0.55)',
  shadow: '#133a2b',
};

const dark: typeof light = {
  bg: '#0c1512',
  card: '#151f1a',
  cardAlt: '#1a251f',
  ink: '#eef3ec',
  muted: '#8fa599',
  line: '#243128',
  leaf: '#6dc860',
  orange: '#f0955a',
  teal: '#4fc2ba',
  gold: '#e0ac4c',
  violet: '#9d94e8',
  sky: '#6fb3e8',
  crimson: '#e07070',
  rose: '#ec7aa0',
  heroFrom: '#0f2a1f',
  heroTo: '#16463f',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
};

export type Palette = typeof light;
export type ColorKey = 'leaf' | 'orange' | 'teal' | 'gold' | 'violet' | 'sky' | 'crimson' | 'rose';

// Web pages are pre-rendered in light mode. While React hydrates that HTML it must render the
// same colours (it won't fix mismatched styles), so the server snapshot is "not in browser";
// dark mode switches on right after hydration. Native apps aren't hydrated and use it directly.
const noSubscribe = () => () => {};

/** False while pre-rendering or hydrating a web page, true once running in the browser (always true on native). */
export function useInBrowser() {
  return useSyncExternalStore(noSubscribe, () => true, () => Platform.OS !== 'web');
}

export function useTheme() {
  const system = useColorScheme();
  const inBrowser = useInBrowser();
  const isDark = inBrowser && system === 'dark';
  return { c: isDark ? dark : light, isDark };
}

export const radius = { sm: 10, md: 16, lg: 22, xl: 28 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export function shadow(c: Palette, level: 1 | 2 = 1) {
  return {
    shadowColor: c.shadow,
    shadowOpacity: level === 1 ? 0.08 : 0.16,
    shadowRadius: level === 1 ? 12 : 22,
    shadowOffset: { width: 0, height: level === 1 ? 4 : 10 },
    elevation: level === 1 ? 2 : 6,
  };
}
