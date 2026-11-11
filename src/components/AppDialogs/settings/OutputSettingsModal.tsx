import React from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  HStack,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { GlobalSettings } from '../../../types';
import SettingsSectionModal from './SettingsSectionModal';
import { useSettingsActions } from './useSettingsActions';

interface OutputSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalSettings: GlobalSettings;
  onGlobalSettingsChange: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  isLoadingSettings: boolean;
}

const OutputSettingsModal: React.FC<OutputSettingsModalProps> = ({
  isOpen,
  onClose,
  globalSettings,
  onGlobalSettingsChange,
  isLoadingSettings,
}) => {
  const { t } = useTranslation();
  const { saveSettings, selectOutputDirectory } = useSettingsActions(
    globalSettings,
    onGlobalSettingsChange
  );

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
      title={t('globalSettings.outputSettings')}
      isLoading={isLoadingSettings}
      onSave={() => void handleSave()}
    >
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel fontWeight="medium">{t('globalSettings.outputDirectory')}</FormLabel>
          <HStack>
            <Input
              value={globalSettings.outputDirectory}
              onChange={(e) =>
                onGlobalSettingsChange((prev) => ({
                  ...prev,
                  outputDirectory: e.target.value,
                }))
              }
              placeholder={t('globalSettings.directoryPlaceholder')}
              bg={useColorModeValue('white', 'gray.800')}
            />
            <Button type="button" size="sm" colorScheme="blue" onClick={() => void selectOutputDirectory()}>
              {t('globalSettings.selectDirectory')}
            </Button>
          </HStack>
          <Text fontSize="sm" color="gray.500" mt={1}>
            {t('globalSettings.directoryHelp')}
          </Text>
        </FormControl>

        <FormControl>
          <FormLabel fontWeight="medium">{t('globalSettings.outputFormat')}</FormLabel>
          <Select
            value={globalSettings.outputFormat}
            onChange={(e) =>
              onGlobalSettingsChange((prev) => ({
                ...prev,
                outputFormat: e.target.value as GlobalSettings['outputFormat'],
              }))
            }
          >
            <option value="original">{t('globalSettings.keepOriginalFormat')}</option>
            <option value="JPEG">JPEG</option>
            <option value="PNG">PNG</option>
            <option value="WEBP">WebP</option>
            <option value="GIF">GIF</option>
            <option value="BMP">BMP</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel fontWeight="medium">
            {t('globalSettings.quality')}: {globalSettings.quality}%
          </FormLabel>
          <Slider
            min={1}
            max={100}
            value={globalSettings.quality}
            onChange={(value) =>
              onGlobalSettingsChange((prev) => ({
                ...prev,
                quality: value,
              }))
            }
            colorScheme="blue"
          >
            <SliderTrack bg={useColorModeValue('gray.200', 'gray.600')}>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
        </FormControl>

        <FormControl>
          <FormLabel fontWeight="medium">{t('globalSettings.filenamePattern')}</FormLabel>
          <Input
            value={globalSettings.filenamePattern}
            onChange={(e) =>
              onGlobalSettingsChange((prev) => ({
                ...prev,
                filenamePattern: e.target.value,
              }))
            }
            placeholder={`${t('globalSettings.example')}: {name}_{timestamp}`}
          />
          <Text fontSize="sm" color="gray.500" mt={1}>
            {t('globalSettings.availableVariables')}: {'{name}'} ({t('globalSettings.originalFilename')}),{' '}
            {'{timestamp}'} ({t('globalSettings.timestamp')}), {'{index}'} ({t('globalSettings.sequenceNumber')})
          </Text>
        </FormControl>
      </VStack>
    </SettingsSectionModal>
  );
};

export default OutputSettingsModal;
