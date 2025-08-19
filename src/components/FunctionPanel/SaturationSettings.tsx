import React from 'react';
import { VStack, Text, Box } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface SaturationSettingsProps {
  settings?: any;
  onChange: (settings: any) => void;
}

const SaturationSettings: React.FC<SaturationSettingsProps> = () => {
  const { t } = useTranslation();
  
  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text>{t('saturation.saturationAdjustment')}</Text>
      </Box>
    </VStack>
  );
};

export default SaturationSettings; 