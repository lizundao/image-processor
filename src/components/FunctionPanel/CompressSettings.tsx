import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface CompressSettingsProps {
  settings?: {
    quality: number;
  };
  onChange: (settings: { 
    quality: number; 
  }) => void;
}

const CompressSettings: React.FC<CompressSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const defaultSettings = { 
    quality: 80
  };
  const currentSettings = settings || defaultSettings;

  const handleQualityChange = (value: number) => {
    onChange({ ...currentSettings, quality: value });
  };

  return (
    <VStack spacing={6} align="stretch">
                   {/* 质量设置 */}
             <Box>
               <Text mb={2} fontSize="sm" fontWeight="medium">{t('compress.qualitySettings')}:</Text>
        <HStack spacing={4}>
          <Slider
            value={currentSettings.quality}
            onChange={handleQualityChange}
            min={1}
            max={100}
            step={1}
            flex={1}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <NumberInput
            value={currentSettings.quality}
            onChange={(_, value) => handleQualityChange(value)}
            min={1}
            max={100}
            w="80px"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </HStack>
                       <Text mt={2} fontSize="xs" color="gray.500">
                 {t('compress.qualityDescription')}
               </Text>
      </Box>
    </VStack>
  );
};

export default CompressSettings; 