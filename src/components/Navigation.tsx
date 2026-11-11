import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  useColorModeValue,
  IconButton,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { ProcessingFunction } from '../types';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
  currentFunction: ProcessingFunction;
  onFunctionChange: (functionName: ProcessingFunction) => void;
  colorMode: string;
  toggleColorMode: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentFunction, onFunctionChange, colorMode, toggleColorMode }) => {
  const { t } = useTranslation();

  const functionList = [
    { id: 'compress', name: t('navigation.compress') },
    { id: 'watermark', name: t('navigation.watermark') },
    { id: 'convert', name: t('navigation.convert') },
    { id: 'resize', name: t('navigation.resize') },
    { id: 'crop', name: t('navigation.crop') },
    { id: 'rotate', name: t('navigation.rotate') },
    { id: 'flip', name: t('navigation.flip') },
    { id: 'brightness', name: t('navigation.brightness') },
    { id: 'border', name: t('navigation.border') },
    { id: 'rounded', name: t('navigation.rounded') },
    { id: 'merge', name: t('navigation.merge') },
    { id: 'gif', name: t('navigation.gif') },
    { id: 'enhance', name: t('navigation.enhance') },
    { id: 'gridSlice', name: t('navigation.gridSlice') },
  ] as const;

  const activeBgColor = useColorModeValue('blue.500', 'blue.600');
  const activeTextColor = useColorModeValue('white', 'white');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const hoverBgColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <VStack spacing={0} align="stretch" h="full">
      <Box p={4} borderBottom="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
        <HStack justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="bold">{t('navigation.title')}</Text>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            size="sm"
          />
        </HStack>
      </Box>
      
      <VStack spacing={0} flex={1} overflowY="auto">
        {functionList.map((func) => (
          <Box
            key={func.id}
            w="full"
            p={3}
            cursor="pointer"
            bg={currentFunction === func.id ? activeBgColor : 'transparent'}
            color={currentFunction === func.id ? activeTextColor : textColor}
            _hover={{
              bg: currentFunction === func.id ? activeBgColor : hoverBgColor,
            }}
            onClick={() => onFunctionChange(func.id as ProcessingFunction)}
            transition="all 0.2s"
          >
            <Text fontSize="sm">{func.name}</Text>
          </Box>
        ))}
      </VStack>

      <Box p={3} borderTop="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
        <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
          {t('navigation.currentFunction')}: {functionList.find(f => f.id === currentFunction)?.name}
        </Text>
      </Box>
    </VStack>
  );
};

export default Navigation; 