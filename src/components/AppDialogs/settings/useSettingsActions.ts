import { useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { GlobalSettings } from '../../../types';
import { SettingsService } from '../../../services/settingsService';

export function useSettingsActions(
  globalSettings: GlobalSettings,
  onGlobalSettingsChange: React.Dispatch<React.SetStateAction<GlobalSettings>>
) {
  const { t } = useTranslation();
  const toast = useToast();

  const saveSettings = async (settings: GlobalSettings) => {
    try {
      const success = await SettingsService.saveSettings(settings);
      if (success) {
        onGlobalSettingsChange(settings);
        toast({
          title: t('toast.settingsSaved'),
          description: t('globalSettings.settingsSaved'),
          status: 'success',
          duration: 3000,
        });
        return true;
      }
      throw new Error('保存设置失败');
    } catch {
      toast({
        title: t('toast.settingsSaveFailed'),
        description: t('toast.settingsSaveFailed'),
        status: 'error',
        duration: 3000,
      });
      return false;
    }
  };

  const resetAllSettings = async () => {
    try {
      const defaultSettings = await SettingsService.resetSettings();
      onGlobalSettingsChange(defaultSettings);
      toast({
        title: t('toast.settingsReset'),
        description: t('toast.settingsReset'),
        status: 'info',
        duration: 3000,
      });
      return defaultSettings;
    } catch {
      toast({
        title: t('toast.settingsResetFailed'),
        description: t('toast.settingsResetFailed'),
        status: 'error',
        duration: 3000,
      });
      return null;
    }
  };

  const selectOutputDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('globalSettings.selectDirectory'),
      });

      if (selected && typeof selected === 'string') {
        const newSettings = {
          ...globalSettings,
          outputDirectory: selected,
        };
        onGlobalSettingsChange(newSettings);
        try {
          await SettingsService.saveSettings(newSettings);
        } catch {
          // 忽略自动保存失败
        }
        toast({
          title: t('toast.directorySelected'),
          description: t('processing.directorySelectedAndSaved', { path: selected }),
          status: 'success',
          duration: 3000,
        });
      }
    } catch {
      toast({
        title: t('toast.directorySelectionFailed'),
        description: t('processing.cannotOpenDirectorySelector'),
        status: 'error',
        duration: 5000,
      });

      const manualPath = prompt(
        `${t('processing.enterPathManually')}:\n\n例如:\nC:\\Users\\用户名\\Pictures\nD:\\Images\n./output`
      );
      if (manualPath?.trim()) {
        onGlobalSettingsChange((prev) => ({
          ...prev,
          outputDirectory: manualPath.trim(),
        }));
      }
    }
  };

  return { saveSettings, resetAllSettings, selectOutputDirectory };
}
