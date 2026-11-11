import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface RoundedSettingsProps {
  settings?: {
    radius?: number;
  };
  onChange: (settings: { radius: number }) => void;
}

const RoundedSettings: React.FC<RoundedSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const current = settings || { radius: 0 };
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const boxBg = useColorModeValue('gray.50', 'gray.800');

  const handleRadiusChange = (radius: number) => {
    onChange({ radius });
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* 圆角半径设置 */}
      <Box>
        <Text fontSize="lg" fontWeight="medium" mb={4}>
          {t('rounded.radiusSettings')}
        </Text>
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <NumberInput
              min={0}
              max={100}
              value={current.radius || 0}
              onChange={(_, value) => handleRadiusChange(value)}
            >
              <NumberInputField placeholder="0" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <Text fontSize="sm" color="gray.600">{t('rounded.pixels')}</Text>
          </HStack>
          
          {/* 快速预设 */}
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>{t('rounded.quickPresets')}</Text>
            <HStack spacing={2} flexWrap="wrap">
              {[0, 5, 10, 15, 20, 25, 30, 40, 50].map((radius) => (
                <Box
                  key={radius}
                  px={3}
                  py={1}
                  borderRadius="md"
                  border="1px"
                  borderColor={current.radius === radius ? 'blue.500' : 'gray.300'}
                  bg={current.radius === radius ? 'blue.50' : 'transparent'}
                  cursor="pointer"
                  onClick={() => handleRadiusChange(radius)}
                  _hover={{ bg: 'gray.50' }}
                  transition="all 0.2s"
                >
                  <Text fontSize="sm" color={current.radius === radius ? 'blue.600' : 'gray.600'}>
                    {radius}px
                  </Text>
                </Box>
              ))}
            </HStack>
          </Box>
          
          {/* 当前值显示 */}
          <Text fontSize="xs" color="gray.500">
            {t('rounded.currentRadiusValue', { radius: current.radius || 0 })}
          </Text>
        </VStack>
      </Box>

      <Divider />

      {/* 效果说明 */}
      <Box p={4} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          {t('rounded.effectDescription')}
        </Text>
        <VStack spacing={2} align="stretch" fontSize="xs" color="gray.600">
          <Text>{t('rounded.zeroPx')}</Text>
          <Text>{t('rounded.fiveToTwentyPx')}</Text>
          <Text>{t('rounded.twentyFiveToFiftyPx')}</Text>
          <Text>{t('rounded.fiftyPxPlus')}</Text>
          <Text>{t('rounded.autoOptimization')}</Text>
        </VStack>
      </Box>

      {/* 预览效果 */}
      <Box p={4} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
        <Text fontSize="sm" fontWeight="medium" mb={3}>
          {t('rounded.previewEffect')}
        </Text>
        <Box
          w="100%"
          h="80px"
          bg="white"
          border="2px"
          borderColor="gray.300"
          borderRadius={`${current.radius || 0}px`}
          display="flex"
          alignItems="center"
          justifyContent="center"
          transition="all 0.3s"
        >
          <Text fontSize="sm" color="gray.600">
            {t('rounded.previewArea')}
          </Text>
        </Box>
      </Box>
    </VStack>
  );
};

export default RoundedSettings; 