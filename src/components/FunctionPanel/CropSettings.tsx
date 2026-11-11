
import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  useDisclosure,
  Box,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { CropSettings as CropSettingsType } from '../../types';
import ManualCropModal from './ManualCropModal';

interface CropSettingsProps {
  settings: CropSettingsType;
  onChange: (settings: CropSettingsType) => void;
  images: any[]; // 图片列表
}

const CropSettings: React.FC<CropSettingsProps> = ({ settings, onChange, images }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentMode, setCurrentMode] = useState<'ratio' | 'pixel' | 'manual'>(settings.mode as 'ratio' | 'pixel' | 'manual' || 'ratio');

  // 当模式改变时更新设置
  useEffect(() => {
    if (currentMode !== settings.mode) {
      onChange({
        ...settings,
        mode: currentMode,
      });
    }
  }, [currentMode, settings, onChange]);

  const handleModeChange = (mode: 'ratio' | 'pixel' | 'manual') => {
    setCurrentMode(mode);
  };

  const handleManualCropStart = () => {
    // 初始化手动裁剪数据
    const manualCrops = images.map((img) => ({
      imageId: img.id,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      aspectRatio: 1.0,
    }));

    onChange({
      ...settings,
      mode: 'manual',
      manualCrops,
      currentImageIndex: 0,
    });

    onOpen();
  };

  const renderRatioMode = () => (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="sm" color="gray.600">
        {t('crop.ratioModeDescription')}
      </Text>
      <FormControl>
        <FormLabel>{t('crop.aspectRatio')}</FormLabel>
        <Select
          value={settings.aspectRatio || 1.0}
          onChange={(e) => {
            const ratio = parseFloat(e.target.value);
            onChange({
              ...settings,
              aspectRatio: ratio,
            });
          }}
        >
          <option value={1.0}>{t('crop.square')}</option>
          <option value={4.0 / 3.0}>{t('crop.landscape43')}</option>
          <option value={3.0 / 4.0}>{t('crop.portrait34')}</option>
          <option value={16.0 / 9.0}>{t('crop.widescreen')}</option>
          <option value={9.0 / 16.0}>{t('crop.mobile')}</option>
          <option value={2.0 / 1.0}>{t('crop.ultraWide')}</option>
          <option value={1.0 / 2.0}>{t('crop.ultraTall')}</option>
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel>{t('crop.customRatio')}</FormLabel>
        <HStack>
          <NumberInput
            min={1}
            value={settings.customRatioWidth || ''}
            onChange={(_, value) => {
              if (value > 0 && settings.customRatioHeight) {
                onChange({
                  ...settings,
                  customRatioWidth: value,
                  aspectRatio: value / settings.customRatioHeight,
                });
              }
            }}
          >
            <NumberInputField placeholder={t('crop.width')} />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Text>:</Text>
          <NumberInput
            min={1}
            value={settings.customRatioHeight || ''}
            onChange={(_, value) => {
              if (value > 0 && settings.customRatioWidth) {
                onChange({
                  ...settings,
                  customRatioHeight: value,
                  aspectRatio: settings.customRatioWidth / value,
                });
              }
            }}
          >
            <NumberInputField placeholder={t('crop.height')} />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </HStack>
      </FormControl>
    </VStack>
  );

  const renderPixelMode = () => (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="sm" color="gray.600">
        {t('crop.pixelModeDescription')}
      </Text>
      <HStack>
        <FormControl>
          <FormLabel>{t('crop.xCoordinate')}</FormLabel>
          <NumberInput min={0} value={settings.x || 0}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel>{t('crop.yCoordinate')}</FormLabel>
          <NumberInput min={0} value={settings.y || 0}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
      </HStack>
      <HStack>
        <FormControl>
          <FormLabel>{t('crop.width')}</FormLabel>
          <NumberInput min={1} value={settings.width || 100}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel>{t('crop.height')}</FormLabel>
          <NumberInput min={1} value={settings.height || 100}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
      </HStack>
    </VStack>
  );

  const renderManualMode = () => (
    <VStack align="stretch" spacing={4}>
      {/* 手动裁剪模式状态提示 */}
      <Box p={3} bg="purple.50" borderRadius="md" border="1px solid" borderColor="purple.200">
        <HStack>
          <Text fontSize="sm" fontWeight="bold" color="purple.700">
            {t('crop.currentMode')}
          </Text>
        </HStack>
        <Text fontSize="xs" color="purple.600" mt={1}>
          {t('crop.interactiveDescription')}
        </Text>
      </Box>
      
      <Text fontSize="sm" color="gray.600">
        {t('crop.manualModeDescription')}
      </Text>
      
      {/* 操作流程说明 */}
      <Box p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
        <VStack align="stretch" spacing={2}>
          <HStack>
            <Text fontSize="sm" fontWeight="bold" color="blue.700">
              {t('crop.operationInstructionsTitle')}
            </Text>
          </HStack>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="xs" color="blue.600">
              {t('crop.operationStep1')}
            </Text>
            <Text fontSize="xs" color="blue.600">
              {t('crop.operationStep2')}
            </Text>
            <Text fontSize="xs" color="blue.600">
              {t('crop.operationStep3')}
            </Text>
            <Text fontSize="xs" color="blue.600">
              {t('crop.operationStep4')}
            </Text>
          </VStack>
        </VStack>
      </Box>
      
      {settings.manualCrops && settings.manualCrops.length > 0 ? (
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="medium">
              {t('crop.cropParametersSet', { count: settings.manualCrops.length })}
            </Text>
            <Button size="sm" colorScheme="blue" onClick={onOpen}>
              {t('crop.continueEditing')}
            </Button>
          </HStack>
          
          {/* 处理提示 */}
          <Box p={3} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
            <HStack>
              <Text fontSize="sm" fontWeight="bold" color="green.700">
                {t('crop.cropParametersSetComplete')}
              </Text>
            </HStack>
            <Text fontSize="xs" color="green.600" mt={1}>
              {t('crop.allImagesCropParametersSet')}
            </Text>
          </Box>
          
          <Box p={3} bg="gray.50" borderRadius="md">
            <Text fontSize="sm" color="gray.600">
              {t('crop.currentImage', { current: settings.currentImageIndex !== undefined ? settings.currentImageIndex + 1 : 1, total: images.length })}
            </Text>
            {settings.manualCrops.map((crop, index) => (
              <Box key={crop.imageId} mt={2} p={2} bg="white" borderRadius="sm">
                <HStack justify="space-between">
                  <Text fontSize="xs">{t('crop.image', { index: index + 1 })}</Text>
                  <Badge size="sm" colorScheme={crop.width > 0 && crop.height > 0 ? "green" : "red"}>
                    {crop.width > 0 && crop.height > 0 ? t('crop.set') : t('crop.notSet')}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  {crop.x}, {crop.y} - {crop.width} × {crop.height}
                </Text>
              </Box>
            ))}
          </Box>
        </VStack>
      ) : (
        <Button colorScheme="blue" onClick={handleManualCropStart} isDisabled={images.length === 0}>
          {t('crop.startManualCrop')}
        </Button>
      )}
    </VStack>
  );

  return (
    <VStack align="stretch" spacing={6}>
      {/* 功能说明 */}
      <Box p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
        <VStack align="stretch" spacing={2}>
          <HStack>
            <Text fontSize="sm" fontWeight="bold" color="blue.700">
              {t('crop.cropFunctionDescription')}
            </Text>
          </HStack>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="xs" color="blue.600">
              • <strong>{t('crop.ratioCrop')}</strong>：{t('crop.ratioModeDesc')}
            </Text>
            <Text fontSize="xs" color="blue.600">
              • <strong>{t('crop.pixelCrop')}</strong>：{t('crop.pixelModeDesc')}
            </Text>
            <Text fontSize="xs" color="blue.600">
              • <strong>{t('crop.manualCrop')}</strong>：{t('crop.manualModeDesc')}
            </Text>
          </VStack>
        </VStack>
      </Box>

      <FormControl>
        <FormLabel>{t('crop.cropMode')}</FormLabel>
        <Select value={currentMode} onChange={(e) => handleModeChange(e.target.value as 'ratio' | 'pixel' | 'manual')}>
          <option value="ratio">{t('crop.ratioCrop')}</option>
          <option value="pixel">{t('crop.pixelCrop')}</option>
          <option value="manual">{t('crop.manualCrop')}</option>
        </Select>
      </FormControl>

      {currentMode === 'ratio' && renderRatioMode()}
      {currentMode === 'pixel' && renderPixelMode()}
      {currentMode === 'manual' && renderManualMode()}

      <Divider />

      <FormControl>
        <FormLabel>{t('crop.outputQuality')}</FormLabel>
        <NumberInput min={1} max={100} value={settings.quality || 85}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <FormLabel>{t('crop.outputFormat')}</FormLabel>
        <Select value={settings.outputFormat || 'JPEG'}>
          <option value="JPEG">{t('crop.jpeg')}</option>
          <option value="PNG">{t('crop.png')}</option>
          <option value="WEBP">{t('crop.webp')}</option>
        </Select>
      </FormControl>

      {/* 手动裁剪弹窗 */}
      <ManualCropModal
        isOpen={isOpen}
        onClose={onClose}
        settings={settings}
        onChange={onChange}
        images={images}
      />
    </VStack>
  );
};

export default CropSettings; 