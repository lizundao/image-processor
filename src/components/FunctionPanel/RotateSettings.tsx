import React from 'react';
import {
  VStack,
  Text,
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  Input,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface RotateSettingsProps {
  settings?: {
    angle?: number;
  };
  onChange: (settings: { angle: number }) => void;
}

const RotateSettings: React.FC<RotateSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const current = settings || {};
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const buttonBg = useColorModeValue('gray.50', 'gray.700');

  const presetAngles = [
    { label: '90°', value: 90 },
    { label: '180°', value: 180 },
    { label: '270°', value: 270 },
  ];

  const handlePresetClick = (angle: number) => {
    onChange({ angle });
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const angle = value ? Number(value) : 0;
    onChange({ angle });
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* 预设角度 */}
      <Box>
        <Text mb={3} fontSize="sm" color="gray.600">{t('rotate.presetAngles')}</Text>
        <ButtonGroup spacing={2} size="sm">
          {presetAngles.map((preset) => (
            <Button
              key={preset.value}
              variant={current.angle === preset.value ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => handlePresetClick(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* 自定义角度 */}
      <FormControl>
        <FormLabel>{t('rotate.customAngle')}</FormLabel>
        <Input
          type="number"
          min={-360}
          max={360}
          step={1}
          value={current.angle || ''}
          onChange={handleCustomChange}
          placeholder={t('rotate.enterRotationAngle')}
        />
        <Text fontSize="xs" color="gray.500" mt={1}>
          {t('rotate.angleRangeDescription')}
        </Text>
      </FormControl>

      {/* 当前角度显示 */}
      {current.angle !== undefined && current.angle !== 0 && (
        <Box p={3} bg={buttonBg} borderRadius="md" border="1px" borderColor={borderColor}>
          <Text fontSize="sm" fontWeight="medium">
            {t('rotate.currentRotationAngle', { angle: current.angle })}
          </Text>
        </Box>
      )}
    </VStack>
  );
};

export default RotateSettings; 