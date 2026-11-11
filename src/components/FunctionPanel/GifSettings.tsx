import React from 'react';
import {
  VStack, HStack, Text, Box, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Divider, useColorModeValue, Badge,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface GifSettingsProps {
  settings?: { fps?: number; loop_count?: number; quality?: number; };
  onChange: (settings: { fps: number; loop_count: number; quality: number }) => void;
}

const GifSettings: React.FC<GifSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const current = settings || { fps: 10, loop_count: 0, quality: 80 };
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const boxBg = useColorModeValue('gray.50', 'gray.800');

  const handleFpsChange = (fps: number) => {
    onChange({ fps, loop_count: current.loop_count || 0, quality: current.quality || 80 });
  };

  const handleLoopCountChange = (loop_count: number) => {
    onChange({ fps: current.fps || 10, loop_count, quality: current.quality || 80 });
  };

  const handleQualityChange = (quality: number) => {
    onChange({ fps: current.fps || 10, loop_count: current.loop_count || 0, quality });
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* 帧率设置 */}
      <Box>
        <Text fontSize="md" fontWeight="bold" mb={3}>
          {t('gif.frameRateSettings')}
        </Text>
        <HStack spacing={4} align="center">
          <NumberInput
            value={current.fps || 10}
            min={1}
            max={30}
            onChange={(_, value) => handleFpsChange(value)}
            size="md"
            w="120px"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Text fontSize="sm" color="gray.600">
            {t('gif.fpsRange')}
          </Text>
        </HStack>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {t('gif.frameRateDescription')}
        </Text>
      </Box>

      <Divider />

      {/* 循环次数设置 */}
      <Box>
        <Text fontSize="md" fontWeight="bold" mb={3}>
          {t('gif.loopCount')}
        </Text>
        <HStack spacing={4} align="center">
          <NumberInput
            value={current.loop_count || 0}
            min={0}
            max={100}
            onChange={(_, value) => handleLoopCountChange(value)}
            size="md"
            w="120px"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Text fontSize="sm" color="gray.600">
            {t('gif.loopCountRange')}
          </Text>
        </HStack>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {t('gif.loopCountDescription')}
        </Text>
      </Box>

      <Divider />

      {/* 输出质量设置 */}
      <Box>
        <Text fontSize="md" fontWeight="bold" mb={3}>
          {t('gif.outputQuality')}
        </Text>
        <HStack spacing={4} align="center">
          <NumberInput
            value={current.quality || 80}
            min={1}
            max={100}
            onChange={(_, value) => handleQualityChange(value)}
            size="md"
            w="120px"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Text fontSize="sm" color="gray.600">
            {t('gif.qualityRange')}
          </Text>
        </HStack>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {t('gif.qualityDescription')}
        </Text>
      </Box>

      <Divider />

      {/* 效果说明 */}
      <Box p={4} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
        <Text fontSize="sm" fontWeight="bold" mb={2}>
          {t('gif.gifDescription')}
        </Text>
        <VStack spacing={2} align="stretch">
          <Text fontSize="xs" color="gray.600">
            {t('gif.sequenceOrder')}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {t('gif.framePlayback')}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {t('gif.dragToReorder')}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {t('gif.formatSupport')}
          </Text>
        </VStack>
      </Box>

      <Divider />

      {/* 预览效果 */}
      <Box p={4} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
        <Text fontSize="sm" fontWeight="bold" mb={2}>
          {t('gif.currentSettings')}
        </Text>
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.600">{t('gif.frameRate')}</Text>
            <Badge colorScheme="blue" size="sm">
              {current.fps || 10} FPS
            </Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.600">{t('gif.loop')}</Text>
            <Badge colorScheme="green" size="sm">
              {current.loop_count === 0 ? t('gif.infiniteLoop') : t('gif.timesLoop', { count: current.loop_count })}
            </Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.600">{t('gif.quality')}</Text>
            <Badge colorScheme="purple" size="sm">
              {current.quality || 80}%
            </Badge>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );
};

export default GifSettings; 