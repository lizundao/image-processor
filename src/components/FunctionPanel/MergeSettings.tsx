import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  RadioGroup,
  Radio,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface MergeSettingsProps {
  settings?: {
    direction?: 'horizontal' | 'vertical';
    spacing?: number;
  };
  onChange: (settings: { direction: 'horizontal' | 'vertical'; spacing: number }) => void;
}

const MergeSettings: React.FC<MergeSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const current = settings || { direction: 'horizontal', spacing: 0 };
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const boxBg = useColorModeValue('gray.50', 'gray.800');

  const handleDirectionChange = (direction: 'horizontal' | 'vertical') => {
    onChange({
      direction,
      spacing: current.spacing || 0,
    });
  };

  const handleSpacingChange = (spacing: number) => {
    onChange({
      direction: current.direction || 'horizontal',
      spacing,
    });
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* 合并方向选择 */}
      <Box>
        <Text fontSize="lg" fontWeight="medium" mb={4}>
          {t('merge.mergeDirectionSettings')}
        </Text>
        <VStack spacing={4} align="stretch">
          <RadioGroup
            value={current.direction || 'horizontal'}
            onChange={handleDirectionChange}
          >
            <VStack spacing={3} align="start">
              <Radio value="horizontal" colorScheme="blue">
                <HStack spacing={3}>
                  <Text>{t('merge.horizontalMerge')}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {t('merge.horizontalMergeDescription')}
                  </Text>
                </HStack>
              </Radio>
              <Radio value="vertical" colorScheme="blue">
                <HStack spacing={3}>
                  <Text>{t('merge.verticalMerge')}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {t('merge.verticalMergeDescription')}
                  </Text>
                </HStack>
              </Radio>
            </VStack>
          </RadioGroup>
        </VStack>
      </Box>

      <Divider />

      {/* 图片间距设置 */}
      <Box>
        <Text fontSize="lg" fontWeight="medium" mb={4}>
          {t('merge.imageSpacingSettings')}
        </Text>
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <NumberInput
              min={0}
              max={100}
              value={current.spacing || 0}
              onChange={(_, value) => handleSpacingChange(value)}
            >
              <NumberInputField placeholder="0" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <Text fontSize="sm" color="gray.600">{t('merge.pixels')}</Text>
          </HStack>
          
          {/* 快速预设 */}
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>{t('merge.quickPresets')}</Text>
            <HStack spacing={2} flexWrap="wrap">
              {[0, 5, 10, 15, 20, 30, 50].map((spacing) => (
                <Box
                  key={spacing}
                  px={3}
                  py={1}
                  borderRadius="md"
                  border="1px"
                  borderColor={current.spacing === spacing ? 'blue.500' : 'gray.300'}
                  bg={current.spacing === spacing ? 'blue.50' : 'transparent'}
                  cursor="pointer"
                  onClick={() => handleSpacingChange(spacing)}
                  _hover={{ bg: 'gray.50' }}
                  transition="all 0.2s"
                >
                  <Text fontSize="sm" color={current.spacing === spacing ? 'blue.600' : 'gray.600'}>
                    {spacing}px
                  </Text>
                </Box>
              ))}
            </HStack>
          </Box>
          
          {/* 当前值显示 */}
          <Text fontSize="xs" color="gray.500">
            {t('merge.currentSpacing', { spacing: current.spacing || 0 })}
          </Text>
        </VStack>
      </Box>

      <Divider />

      {/* 效果说明 */}
      <Box p={4} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          {t('merge.mergeEffectDescription')}
        </Text>
        <VStack spacing={2} align="stretch" fontSize="xs" color="gray.600">
          <Text>{t('merge.horizontalMergeEffect')}</Text>
          <Text>{t('merge.verticalMergeEffect')}</Text>
          <Text>{t('merge.spacingSettingEffect')}</Text>
          <Text>{t('merge.smartSizeEffect')}</Text>
          <Text>{t('merge.formatKeepEffect')}</Text>
        </VStack>
      </Box>

      {/* 预览效果 */}
      <Box p={4} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
        <Text fontSize="sm" fontWeight="medium" mb={3}>
          {t('merge.previewEffect')}
        </Text>
        <Box
          w="100%"
          h="80px"
          bg="white"
          border="2px"
          borderColor="gray.300"
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="relative"
        >
          {current.direction === 'horizontal' ? (
            <HStack spacing={`${current.spacing || 0}px`} justify="center">
              <Box w="20px" h="40px" bg="blue.200" borderRadius="sm" />
              <Box w="20px" h="40px" bg="green.200" borderRadius="sm" />
              <Box w="20px" h="40px" bg="red.200" borderRadius="sm" />
            </HStack>
          ) : (
            <VStack spacing={`${current.spacing || 0}px`} justify="center">
              <Box w="40px" h="15px" bg="blue.200" borderRadius="sm" />
              <Box w="40px" h="15px" bg="green.200" borderRadius="sm" />
              <Box w="40px" h="15px" bg="red.200" borderRadius="sm" />
            </VStack>
          )}
          <Text fontSize="xs" color="gray.500" position="absolute" bottom="2px">
            {current.direction === 'horizontal' ? t('merge.horizontalArrangement') : t('merge.verticalArrangement')}
          </Text>
        </Box>
      </Box>
    </VStack>
  );
};

export default MergeSettings; 