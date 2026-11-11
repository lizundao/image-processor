import React from 'react';
import {
  VStack,
  Text,
  Box,
  FormControl,
  FormLabel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  HStack,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface BrightnessSettingsProps {
  settings?: {
    value?: number;
  };
  onChange: (settings: { value: number }) => void;
}

const PRESETS = [-50, -25, 0, 25, 50];

const BrightnessSettings: React.FC<BrightnessSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const current = settings?.value ?? 0;
  const boxBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text fontSize="sm" color="gray.600" mb={3}>
          {t('brightness.description')}
        </Text>
        <FormControl>
          <FormLabel>
            {t('brightness.value')}: {current > 0 ? `+${current}` : current}
          </FormLabel>
          <Slider
            min={-100}
            max={100}
            step={1}
            value={current}
            onChange={(value) => onChange({ value })}
            colorScheme="blue"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <HStack justify="space-between" mt={2}>
            <Text fontSize="xs" color="gray.500">{t('brightness.darker')}</Text>
            <Text fontSize="xs" color="gray.500">{t('brightness.brighter')}</Text>
          </HStack>
        </FormControl>
      </Box>

      <Box>
        <Text fontSize="sm" color="gray.600" mb={2}>
          {t('brightness.presets')}
        </Text>
        <HStack spacing={2} flexWrap="wrap">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={current === preset ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => onChange({ value: preset })}
            >
              {preset > 0 ? `+${preset}` : preset}
            </Button>
          ))}
        </HStack>
      </Box>

      <Box p={3} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
        <Text fontSize="sm" color="gray.600">
          {t('brightness.tip')}
        </Text>
      </Box>
    </VStack>
  );
};

export default BrightnessSettings;
