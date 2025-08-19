import React from 'react';
import {
  VStack,
  Text,
  Switch,
  FormControl,
  FormLabel,
  HStack,
  Box,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface FlipSettingsProps {
  settings?: {
    horizontal?: boolean;
    vertical?: boolean;
  };
  onChange: (settings: { horizontal: boolean; vertical: boolean }) => void;
}

const FlipSettings: React.FC<FlipSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const current = settings || {};
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const boxBg = useColorModeValue('gray.50', 'gray.700');

  const handleHorizontalChange = (checked: boolean) => {
    onChange({
      horizontal: checked,
      vertical: current.vertical || false,
    });
  };

  const handleVerticalChange = (checked: boolean) => {
    onChange({
      horizontal: current.horizontal || false,
      vertical: checked,
    });
  };

  const hasAnyFlip = current.horizontal || current.vertical;

  return (
    <VStack spacing={6} align="stretch">
      {/* 水平翻转 */}
      <FormControl>
        <HStack justify="space-between" align="center">
          <Box>
            <FormLabel mb={1}>{t('flip.horizontalFlip')}</FormLabel>
            <Text fontSize="sm" color="gray.600">
              {t('flip.horizontalFlipDescription')}
            </Text>
          </Box>
          <Switch
            isChecked={current.horizontal || false}
            onChange={(e) => handleHorizontalChange(e.target.checked)}
            colorScheme="blue"
            size="lg"
          />
        </HStack>
      </FormControl>

      <Divider />

      {/* 垂直翻转 */}
      <FormControl>
        <HStack justify="space-between" align="center">
          <Box>
            <FormLabel mb={1}>{t('flip.verticalFlip')}</FormLabel>
            <Text fontSize="sm" color="gray.600">
              {t('flip.verticalFlipDescription')}
            </Text>
          </Box>
          <Switch
            isChecked={current.vertical || false}
            onChange={(e) => handleVerticalChange(e.target.checked)}
            colorScheme="blue"
            size="lg"
          />
        </HStack>
      </FormControl>

      {/* 当前状态显示 */}
      {hasAnyFlip && (
        <Box p={3} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            {t('flip.currentFlipStatus')}
          </Text>
          <VStack align="start" spacing={1}>
            {current.horizontal && (
              <Text fontSize="sm" color="blue.600">{t('flip.horizontalFlipStatus')}</Text>
            )}
            {current.vertical && (
              <Text fontSize="sm" color="blue.600">{t('flip.verticalFlipStatus')}</Text>
            )}
          </VStack>
        </Box>
      )}

      {/* 提示信息 */}
      <Box p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
        <Text fontSize="sm" color="blue.700">
          {t('flip.flipTip')}
        </Text>
      </Box>
    </VStack>
  );
};

export default FlipSettings; 