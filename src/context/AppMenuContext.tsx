import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import i18n from '../i18n';
import { GlobalSettings } from '../types';
import { SettingsService } from '../services/settingsService';
import OutputSettingsModal from '../components/AppDialogs/settings/OutputSettingsModal';
import BehaviorSettingsModal from '../components/AppDialogs/settings/BehaviorSettingsModal';
import LanguageSettingsModal from '../components/AppDialogs/settings/LanguageSettingsModal';
import ThemeSettingsModal from '../components/AppDialogs/settings/ThemeSettingsModal';
import AboutDialog from '../components/AppDialogs/AboutDialog';
import LicenseDialog from '../components/AppDialogs/LicenseDialog';

export type AppDialog =
  | 'outputSettings'
  | 'behaviorSettings'
  | 'languageSettings'
  | 'themeSettings'
  | 'about'
  | 'license';

interface AppMenuContextValue {
  globalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  isLoadingSettings: boolean;
  activeDialog: AppDialog | null;
  openDialog: (dialog: AppDialog) => void;
  closeDialog: () => void;
}

const AppMenuContext = createContext<AppMenuContextValue | null>(null);

export function AppMenuProvider({ children }: { children: React.ReactNode }) {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    outputDirectory: '',
    outputFormat: 'original',
    quality: 80,
    overwriteExisting: false,
    createSubfolders: true,
    filenamePattern: '{name}_{timestamp}',
    autoOpenOutputFolder: true,
    language: 'zh-CN',
    theme: 'dark',
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [activeDialog, setActiveDialog] = useState<AppDialog | null>(null);

  const openDialog = useCallback((dialog: AppDialog) => {
    setActiveDialog(dialog);
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await SettingsService.loadSettings();
        setGlobalSettings(savedSettings);
      } catch {
        // 使用默认设置
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoadingSettings) {
      SettingsService.autoSaveSettings(globalSettings);
    }
  }, [globalSettings, isLoadingSettings]);

  useEffect(() => {
    if (isLoadingSettings) {
      return;
    }

    i18n.changeLanguage(globalSettings.language);
    localStorage.setItem('i18nextLng', globalSettings.language);
  }, [isLoadingSettings, globalSettings.language]);

  const modalProps = {
    globalSettings,
    onGlobalSettingsChange: setGlobalSettings,
    isLoadingSettings,
    onClose: closeDialog,
  };

  const value = useMemo(
    () => ({
      globalSettings,
      setGlobalSettings,
      isLoadingSettings,
      activeDialog,
      openDialog,
      closeDialog,
    }),
    [globalSettings, isLoadingSettings, activeDialog, openDialog, closeDialog]
  );

  return (
    <AppMenuContext.Provider value={value}>
      {children}
      <OutputSettingsModal isOpen={activeDialog === 'outputSettings'} {...modalProps} />
      <BehaviorSettingsModal isOpen={activeDialog === 'behaviorSettings'} {...modalProps} />
      <LanguageSettingsModal isOpen={activeDialog === 'languageSettings'} {...modalProps} />
      <ThemeSettingsModal isOpen={activeDialog === 'themeSettings'} {...modalProps} />
      <AboutDialog isOpen={activeDialog === 'about'} onClose={closeDialog} />
      <LicenseDialog isOpen={activeDialog === 'license'} onClose={closeDialog} />
    </AppMenuContext.Provider>
  );
}

export function useAppMenu() {
  const context = useContext(AppMenuContext);
  if (!context) {
    throw new Error('useAppMenu must be used within AppMenuProvider');
  }
  return context;
}
