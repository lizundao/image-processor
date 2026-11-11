import React from 'react';
import { VStack, FormControl, FormLabel, Select, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { GlobalSettings } from '../../../types';
import { useAppTheme } from '../../../hooks/useAppTheme';
import SettingsSectionModal from './SettingsSectionModal';
import { useSettingsActions } from './useSettingsActions';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalSettings: GlobalSettings;
  onGlobalSettingsChange: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  isLoadingSettings: boolean;
}

const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  globalSettings,
  onGlobalSettingsChange,
  isLoadingSettings,
}) => {
  const { t } = useTranslation();
  const { setTheme } = useAppTheme();
  const { saveSettings } = useSettingsActions(globalSettings, onGlobalSettingsChange);

  const handleSave = async () => {
    const ok = await saveSettings(globalSettings);
    if (ok) {
      onClose();
    }
  };

  return (
    <SettingsSectionModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('globalSettings.themeSettings')}
      isLoading={isLoadingSettings}
      onSave={() => void handleSave()}
    >
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel fontWeight="medium">{t('globalSettings.theme')}</FormLabel>
          <Select
            value={globalSettings.theme}
            onChange={(e) => {
              const theme = e.target.value as GlobalSettings['theme'];
              onGlobalSettingsChange((prev) => ({ ...prev, theme }));
              setTheme(theme);
            }}
          >
            <option value="light">{t('globalSettings.themeLight')}</option>
            <option value="dark">{t('globalSettings.themeDark')}</option>
            <option value="system">{t('globalSettings.themeSystem')}</option>
          </Select>
          <Text fontSize="sm" color="gray.500" mt={1}>
            {t('globalSettings.themeDescription')}
          </Text>
        </FormControl>
      </VStack>
    </SettingsSectionModal>
  );
};

export default ThemeSettingsModal;
