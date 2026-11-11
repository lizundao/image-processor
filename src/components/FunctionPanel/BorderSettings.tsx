import React from 'react';
import {
  VStack,
  Text,
  Box,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface BorderSettingsProps {
  settings?: {
    width?: number;
    color?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    opacity?: number;
    overlay_mode?: boolean;
    enable_transparency?: boolean;
    border_radius?: number;
  };
  onChange: (settings: { 
    width: number; 
    color: string; 
    style: 'solid' | 'dashed' | 'dotted'; 
    opacity: number;
    overlay_mode: boolean;
    enable_transparency: boolean;
    border_radius: number;
  }) => void;
}

const BorderSettings: React.FC<BorderSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const current = settings || {};
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const boxBg = useColorModeValue('gray.50', 'gray.700');

  const handleWidthChange = (value: number) => {
    onChange({
      width: value,
      color: current.color || '#000000',
      style: current.style || 'solid',
      opacity: current.opacity || 1.0,
      overlay_mode: current.overlay_mode || false,
      enable_transparency: current.enable_transparency || false,
      border_radius: current.border_radius || 0,
    });
  };

  const handleColorChange = (color: string) => {
    onChange({
      width: current.width || 10,
      color,
      style: current.style || 'solid',
      opacity: current.opacity || 1.0,
      overlay_mode: current.overlay_mode || false,
      enable_transparency: current.enable_transparency || false,
      border_radius: current.border_radius || 0,
    });
  };

  const handleStyleChange = (style: 'solid' | 'dashed' | 'dotted') => {
    onChange({
      width: current.width || 10,
      color: current.color || '#000000',
      style,
      opacity: current.opacity || 1.0,
      overlay_mode: current.overlay_mode || false,
      enable_transparency: current.enable_transparency || false,
      border_radius: current.border_radius || 0,
    });
  };

  const handleOpacityChange = (opacity: number) => {
    onChange({
      width: current.width || 10,
      color: current.color || '#000000',
      style: current.style || 'solid',
      opacity: opacity,
      overlay_mode: current.overlay_mode || false,
      enable_transparency: current.enable_transparency || false,
      border_radius: current.border_radius || 0,
    });
  };

  const handleOverlayModeChange = (checked: boolean) => {
    const newSettings = {
      width: current.width || 10,
      color: current.color || '#000000',
      style: current.style || 'solid',
      opacity: current.opacity || 1.0,
      overlay_mode: checked,
      enable_transparency: current.enable_transparency || false,
      border_radius: current.border_radius || 0,
    };
    onChange(newSettings);
  };

  const handleTransparencyChange = (checked: boolean) => {
    const newSettings = {
      width: current.width || 10,
      color: current.color || '#000000',
      style: current.style || 'solid',
      opacity: current.opacity || 1.0,
      overlay_mode: current.overlay_mode || false,
      enable_transparency: checked,
      border_radius: current.border_radius || 0,
    };
    onChange(newSettings);
  };

  const handleBorderRadiusChange = (radius: number) => {
    const newSettings = {
      width: current.width || 10,
      color: current.color || '#000000',
      style: current.style || 'solid',
      opacity: current.opacity || 1.0,
      overlay_mode: current.overlay_mode || false,
      enable_transparency: current.enable_transparency || false,
      border_radius: radius,
    };
    onChange(newSettings);
  };

  const previewStyle = {
    width: `${current.width || 10}px`,
    borderStyle: current.style || 'solid',
    borderColor: current.color || '#000000',
    borderWidth: '1px',
    height: '60px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* 边框宽度 */}
      <FormControl>
        <FormLabel>{t('border.borderWidth')}</FormLabel>
        <NumberInput
          min={1}
          max={100}
          value={current.width || 10}
          onChange={(_, value) => handleWidthChange(value)}
        >
          <NumberInputField placeholder="10" />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color="gray.500" mt={1}>
          {t('border.borderWidthDescription')}
        </Text>
      </FormControl>

      <Divider />

      {/* 边框颜色 */}
      <FormControl>
        <FormLabel>{t('border.borderColor')}</FormLabel>
        <VStack spacing={4} align="stretch">
          {/* 常用颜色快速选择 */}
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>{t('border.commonColors')}</Text>
            <HStack spacing={2} flexWrap="wrap">
              {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#FFA500', '#800080', '#A52A2A'].map((color) => (
                <Box
                  key={color}
                  w="24px"
                  h="24px"
                  borderRadius="md"
                  border="2px"
                  borderColor={current.color === color ? 'blue.500' : 'gray.300'}
                  bg={color}
                  cursor="pointer"
                  onClick={() => handleColorChange(color)}
                  _hover={{ transform: 'scale(1.1)' }}
                  transition="all 0.2s"
                />
              ))}
            </HStack>
          </Box>
          
          {/* 自定义颜色选择器 */}
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>{t('border.customColor')}</Text>
            <HStack spacing={3}>
              <Box
                w="40px"
                h="40px"
                borderRadius="md"
                border="2px"
                borderColor="gray.300"
                bg={current.color || '#000000'}
                cursor="pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = current.color || '#000000';
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    handleColorChange(target.value);
                  };
                  input.click();
                }}
                _hover={{ transform: 'scale(1.05)' }}
                transition="all 0.2s"
              />
              <VStack align="start" spacing={1}>
                <Text fontSize="xs" color="gray.500">
                  {t('border.currentColor', { color: current.color || '#000000' })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {t('border.clickColorBlock')}
                </Text>
              </VStack>
            </HStack>
          </Box>
        </VStack>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {t('border.colorPickerDescription')}
        </Text>
      </FormControl>

      <Divider />

      {/* 边框样式 */}
      <FormControl>
        <FormLabel>{t('border.borderStyle')}</FormLabel>
        <Select
          value={current.style || 'solid'}
          onChange={(e) => handleStyleChange(e.target.value as 'solid' | 'dashed' | 'dotted')}
        >
          <option value="solid">{t('border.solid')}</option>
          <option value="dashed">{t('border.dashed')}</option>
          <option value="dotted">{t('border.dotted')}</option>
        </Select>
        <Text fontSize="xs" color="gray.500" mt={1}>
          {t('border.styleDescription')}
        </Text>
      </FormControl>

      <Divider />

      {/* 边框透明度 */}
      <FormControl>
        <FormLabel>{t('border.borderOpacity')}</FormLabel>
        <VStack spacing={2} align="stretch">
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={current.opacity || 1.0}
            onChange={handleOpacityChange}
            colorScheme="blue"
            isDisabled={!current.enable_transparency}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600">{t('border.completelyTransparent')}</Text>
            <Text fontSize="sm" fontWeight="medium">
              {Math.round((current.opacity || 1.0) * 100)}%
            </Text>
            <Text fontSize="sm" color="gray.600">{t('border.completelyOpaque')}</Text>
          </HStack>
        </VStack>
        <Text fontSize="xs" color="gray.500" mt={1}>
          {t('border.opacityDescription')}
        </Text>
      </FormControl>

      <Divider />

      {/* 边框圆角 */}
      <FormControl>
        <FormLabel>{t('border.borderRadius')}</FormLabel>
        <VStack spacing={2} align="stretch">
          <HStack spacing={4}>
            <NumberInput
              min={0}
              max={100}
              value={current.border_radius || 0}
              onChange={(_, value) => handleBorderRadiusChange(value)}
            >
              <NumberInputField placeholder="0" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <Text fontSize="sm" color="gray.600">{t('common.pixels')}</Text>
          </HStack>
          {/* 调试信息 */}
          <Text fontSize="xs" color="gray.500">
            {t('border.currentRadiusValue', { radius: current.border_radius || 0 })}
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {[0, 5, 10, 15, 20, 25, 30].map((radius) => (
              <Box
                key={radius}
                px={3}
                py={1}
                borderRadius="md"
                border="1px"
                borderColor={current.border_radius === radius ? 'blue.500' : 'gray.300'}
                bg={current.border_radius === radius ? 'blue.50' : 'transparent'}
                cursor="pointer"
                onClick={() => handleBorderRadiusChange(radius)}
                _hover={{ bg: 'gray.50' }}
                transition="all 0.2s"
              >
                <Text fontSize="sm" color={current.border_radius === radius ? 'blue.600' : 'gray.600'}>
                  {radius}px
                </Text>
              </Box>
            ))}
          </HStack>
        </VStack>
        <Text fontSize="xs" color="gray.500" mt={1}>
          {t('border.radiusDescription')}
        </Text>
      </FormControl>

      <Divider />

      {/* 边框模式选择 */}
      <FormControl>
        <HStack justify="space-between" align="center">
          <Box>
            <FormLabel mb={1}>{t('border.borderMode')}</FormLabel>
            <Text fontSize="sm" color="gray.600">
              {t('border.borderModeDescription')}
            </Text>
          </Box>
          <Switch
            isChecked={current.overlay_mode || false}
            onChange={(e) => handleOverlayModeChange(e.target.checked)}
            colorScheme="blue"
            size="lg"
          />
        </HStack>
      </FormControl>

      <Divider />

      {/* 透明度开关 */}
      <FormControl>
        <HStack justify="space-between" align="center">
          <Box>
            <FormLabel mb={1}>{t('border.enableTransparency')}</FormLabel>
            <Text fontSize="sm" color="gray.600">
              {t('border.transparencyDescription')}
            </Text>
          </Box>
          <Switch
            isChecked={current.enable_transparency || false}
            onChange={(e) => handleTransparencyChange(e.target.checked)}
            colorScheme="blue"
            size="lg"
          />
        </HStack>
      </FormControl>

      {/* 预览效果 */}
      <Box p={3} bg={boxBg} borderRadius="md" border="1px" borderColor={borderColor}>
        <Text fontSize="sm" fontWeight="medium" mb={3}>
          {t('border.previewEffect')}
        </Text>
        <Box
          style={previewStyle}
          borderWidth={`${current.width || 10}px`}
          borderStyle={current.style || 'solid'}
          borderColor={current.color || '#000000'}
          opacity={current.opacity || 1.0}
        >
          <Text fontSize="sm" color="gray.600">
            {t('border.imagePreviewArea')}
          </Text>
        </Box>
      </Box>

      {/* 当前设置显示 */}
      {(current.width || current.color || current.style) && (
        <Box p={3} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            {t('border.currentBorderSettings')}
          </Text>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="blue.600">
              • {t('border.width')}：{current.width || 10} {t('common.pixels')}
            </Text>
            <Text fontSize="sm" color="blue.600">
              • {t('border.color')}：{current.color || '#000000'}
            </Text>
            <Text fontSize="sm" color="blue.600">
              • {t('border.style')}：{current.style === 'solid' ? t('border.solid') : current.style === 'dashed' ? t('border.dashed') : t('border.dotted')}
            </Text>
            <Text fontSize="sm" color="blue.600">
              • {t('border.opacity')}：{Math.round((current.opacity || 1.0) * 100)}%
            </Text>
            <Text fontSize="sm" color="blue.600">
              • {t('border.mode')}：{current.overlay_mode ? t('border.overlayMode') : t('border.extendMode')}
            </Text>
            <Text fontSize="sm" color="blue.600">
              • {t('border.transparencySwitch')}：{current.enable_transparency ? t('border.enabled') : t('border.disabled')}
            </Text>
          </VStack>
        </Box>
      )}
    </VStack>
  );
};

export default BorderSettings; 