import React from 'react';
import { VStack, FormControl, FormLabel, Switch } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { GlobalSettings } from '../../../types';
import SettingsSectionModal from './SettingsSectionModal';
import { useSettingsActions } from './useSettingsActions';

interface BehaviorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalSettings: GlobalSettings;
  onGlobalSettingsChange: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  isLoadingSettings: boolean;
}

const BehaviorSettingsModal: React.FC<BehaviorSettingsModalProps> = ({
  isOpen,
  onClose,
  globalSettings,
  onGlobalSettingsChange,
  isLoadingSettings,
}) => {
  const { t } = useTranslation();
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
      title={t('globalSettings.behaviorSettings')}
      isLoading={isLoadingSettings}
      onSave={() => void handleSave()}
    >
      <VStack spacing={4} align="stretch">
        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <FormLabel mb="0" fontWeight="medium">
            {t('globalSettings.overwriteExisting')}
          </FormLabel>
          <Switch
            isChecked={globalSettings.overwriteExisting}
            onChange={(e) =>
              onGlobalSettingsChange((prev) => ({
                ...prev,
                overwriteExisting: e.target.checked,
              }))
            }
          />
        </FormControl>

        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <FormLabel mb="0" fontWeight="medium">
            {t('globalSettings.createSubfolders')}
          </FormLabel>
          <Switch
            isChecked={globalSettings.createSubfolders}
            onChange={(e) =>
              onGlobalSettingsChange((prev) => ({
                ...prev,
                createSubfolders: e.target.checked,
              }))
            }
          />
        </FormControl>

        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <FormLabel mb="0" fontWeight="medium">
            {t('globalSettings.autoOpenOutputFolder')}
          </FormLabel>
          <Switch
            isChecked={globalSettings.autoOpenOutputFolder}
            onChange={(e) =>
              onGlobalSettingsChange((prev) => ({
                ...prev,
                autoOpenOutputFolder: e.target.checked,
              }))
            }
          />
        </FormControl>
      </VStack>
    </SettingsSectionModal>
  );
};

export default BehaviorSettingsModal;
