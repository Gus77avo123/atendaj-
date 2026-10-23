import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

const lightColors = {
  primary: '#075092',
  primaryDark: '#073F76',
  secondary: '#C65300',
  background: '#EFF4FA',
  surface: '#FFFFFF',
  text: '#17345A',
  muted: '#8394AE',
  border: '#DCE6F2',
  green: '#20A66A',
  red: '#E65353',
  yellow: '#F7B731',
  purple: '#7556C8',
  teal: '#168C8C',
  paleBlue: '#E4F0FF',
  paleOrange: '#FFF0E5',
  paleGreen: '#E8F6EF',
  paleYellow: '#FFF4D8',
  paleRed: '#FDECEC',
  palePurple: '#F1EBFF',
  paleTeal: '#E3F5F3',
};

const darkColors: typeof lightColors = {
  primary: '#78B5FF',
  primaryDark: '#A6CEFF',
  secondary: '#FFAB70',
  background: '#101923',
  surface: '#1B2735',
  text: '#E7EEF7',
  muted: '#A7B4C5',
  border: '#344457',
  green: '#54CC91',
  red: '#FF7777',
  yellow: '#FFD16D',
  purple: '#B49AFF',
  teal: '#69D0C9',
  paleBlue: '#20364B',
  paleOrange: '#3D2C22',
  paleGreen: '#1D352B',
  paleYellow: '#3B3422',
  paleRed: '#3A272B',
  palePurple: '#302844',
  paleTeal: '#1E3538',
};

export type ThemeColors = typeof lightColors;
export type AppearanceMode = 'system' | 'light' | 'dark';
export type AppTheme = {
  colors: ThemeColors;
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  isDark: boolean;
};

const appearanceStorageKey = 'atendeja.appearance';
const ThemeContext = createContext<{
  mode: AppearanceMode;
  isDark: boolean;
  colors: ThemeColors;
  storageError: string | null;
  setMode: (mode: AppearanceMode) => Promise<void>;
}>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  storageError: null,
  setMode: async () => undefined,
});

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>('system');
  const [storageError, setStorageError] = useState<string | null>(null);
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(appearanceStorageKey).then((stored) => {
      if (active && (stored === 'system' || stored === 'light' || stored === 'dark')) {
        setModeState(stored);
      }
    }).catch((error: unknown) => {
      console.error('Não foi possível carregar a preferência de aparência.', error);
      if (active) setStorageError('Não foi possível carregar sua preferência salva. O app está usando o tema do dispositivo.');
    });
    return () => { active = false; };
  }, []);

  const setMode = useCallback(async (nextMode: AppearanceMode) => {
    try {
      await AsyncStorage.setItem(appearanceStorageKey, nextMode);
      setModeState(nextMode);
      setStorageError(null);
    } catch {
      throw new Error('Não foi possível salvar a preferência de aparência.');
    }
  }, []);

  const value = useMemo(() => ({
    mode,
    isDark,
    colors: isDark ? darkColors : lightColors,
    storageError,
    setMode,
  }), [mode, isDark, storageError, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function useThemedStyles<T extends object>(factory: (theme: AppTheme) => T): T {
  const { colors, isDark } = useAppTheme();
  return useMemo(() => factory({
    colors,
    isDark,
    shadow: {
      shadowColor: isDark ? '#000000' : '#142E4B',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: isDark ? 0.28 : 0.12,
      shadowRadius: 10,
      elevation: 4,
    },
  }), [colors, isDark, factory]);
}

export function themedColor(color: string, theme: AppTheme): string {
  const key = (Object.keys(lightColors) as Array<keyof ThemeColors>)
    .find((name) => lightColors[name].toLowerCase() === color.toLowerCase());
  if (key) return theme.colors[key];
  if (!theme.isDark) return color;

  const match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return color;
  const hex = match[1].length === 3 ? match[1].split('').map((part) => part + part).join('') : match[1];
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const saturation = Math.max(...channels) - Math.min(...channels);
  if (luminance > 0.78 && saturation < 0.16) return theme.colors.surface;
  if (luminance < 0.12 && saturation < 0.2) return theme.colors.text;
  if (luminance > 0.72 && saturation >= 0.16) {
    const rgb = channels.map((channel) => Math.round((channel * 255) * 0.3));
    return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }
  return color;
}

export const colors = lightColors;

export const shadow = {
  shadowColor: '#142E4B',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 4,
} as const;
