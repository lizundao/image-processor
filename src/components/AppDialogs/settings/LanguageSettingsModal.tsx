import React from 'react';
import { VStack, FormControl, FormLabel, Select, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { GlobalSettings } from '../../../types';
import { useLanguage } from '../../../hooks/useLanguage';
import SettingsSectionModal from './SettingsSectionModal';
import { useSettingsActions } from './useSettingsActions';

interface LanguageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalSettings: GlobalSettings;
  onGlobalSettingsChange: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  isLoadingSettings: boolean;
}

const LanguageSettingsModal: React.FC<LanguageSettingsModalProps> = ({
  isOpen,
  onClose,
  globalSettings,
  onGlobalSettingsChange,
  isLoadingSettings,
}) => {
  const { t } = useTranslation();
  const { changeLanguage } = useLanguage();
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
      title={t('globalSettings.language')}
      isLoading={isLoadingSettings}
      onSave={() => void handleSave()}
    >
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel fontWeight="medium">{t('globalSettings.language')}</FormLabel>
          <Select
            value={globalSettings.language}
            onChange={(e) => {
              const newLanguage = e.target.value as GlobalSettings['language'];
              onGlobalSettingsChange((prev) => ({
                ...prev,
                language: newLanguage,
              }));
              changeLanguage(newLanguage);
            }}
          >
            <option value="zh-CN">{t('languages.zh-CN')}</option>
            <option value="en-US">{t('languages.en-US')}</option>
          </Select>
          <Text fontSize="sm" color="gray.500" mt={1}>
            {t('globalSettings.languageDescription')}
          </Text>
        </FormControl>
      </VStack>
    </SettingsSectionModal>
  );
};

export default LanguageSettingsModal;
