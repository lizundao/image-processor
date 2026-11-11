import { useCallback, useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useAppMenu } from '../context/AppMenuContext';
import { AppTheme } from '../types';
import { applyThemePreference, subscribeSystemTheme } from '../utils/themePreference';

export function useAppTheme() {
  const { globalSettings, setGlobalSettings, isLoadingSettings } = useAppMenu();
  const { colorMode, setColorMode } = useColorMode();

  useEffect(() => {
    if (isLoadingSettings) {
      return;
    }
    applyThemePreference(globalSettings.theme, setColorMode);
  }, [globalSettings.theme, isLoadingSettings, setColorMode]);

  useEffect(() => {
    if (isLoadingSettings || globalSettings.theme !== 'system') {
      return;
    }

    return subscribeSystemTheme(setColorMode);
  }, [globalSettings.theme, isLoadingSettings, setColorMode]);

  const setTheme = useCallback((theme: AppTheme) => {
    setGlobalSettings((prev) => ({ ...prev, theme }));
    applyThemePreference(theme, setColorMode);
  }, [setGlobalSettings, setColorMode]);

  const toggleTheme = useCallback(() => {
    const next: AppTheme = colorMode === 'light' ? 'dark' : 'light';
    setTheme(next);
  }, [colorMode, setTheme]);

  return {
    colorMode,
    theme: globalSettings.theme,
    setTheme,
    toggleTheme,
  };
}
