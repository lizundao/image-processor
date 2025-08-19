import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  RadioGroup,
  Radio,
  Button,
  Grid,
  GridItem,
  Spinner,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

import { ProcessingSettings } from '../../types';

interface WatermarkSettingsProps {
  settings: ProcessingSettings;
  onSettingsChange: (settings: ProcessingSettings) => void;
}

const WatermarkSettings: React.FC<WatermarkSettingsProps> = ({
  settings,
  onSettingsChange,
}) => {
  const { t } = useTranslation();
  const watermarkSettings = settings?.watermark || {
    type: 'text',
    text: 'Watermark',
    position: 'bottom-right',
    opacity: 0.5,
    fontSize: 24,
    fontColor: '#000000',
    fontWeight: 'normal',
    imageScale: 1.0,
    marginX: 20,
    marginY: 20,
  };

  const [selectedImagePath, setSelectedImagePath] = useState<string>('');
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [loadingFonts, setLoadingFonts] = useState(false);

  // 加载系统字体列表
  useEffect(() => {
    const loadSystemFonts = async () => {
      setLoadingFonts(true);
      try {
        // 检查是否在Tauri环境中
        if (typeof window !== 'undefined' && '__TAURI__' in window) {
          const { invoke } = await import('@tauri-apps/api/tauri');
          const fonts = await invoke('get_system_fonts') as string[];
          setSystemFonts(fonts);
        } else {
          // 浏览器环境，使用一些常见字体
          setSystemFonts([
            'Arial',
            'Times New Roman',
            'Helvetica',
            'Verdana',
            'Georgia',
            'Comic Sans MS',
            'Impact',
            'Trebuchet MS',
            'Microsoft YaHei',
            'SimSun',
            'SimHei',
            'KaiTi',
            'FangSong',
          ]);
        }
      } catch (error) {
        console.error('加载系统字体失败:', error);
        // 使用默认字体列表
        setSystemFonts(['Arial', 'Times New Roman', 'Microsoft YaHei', 'SimSun']);
      } finally {
        setLoadingFonts(false);
      }
    };

    loadSystemFonts();
  }, []);

  const handleChange = (field: string, value: any) => {
    onSettingsChange({
      ...settings,
      watermark: {
        ...watermarkSettings,
        [field]: value,
      },
    });
  };

  const handleSelectImage = async () => {
    try {
      // 在Tauri环境中使用文件选择器
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        const { open } = await import('@tauri-apps/api/dialog');
        const selected = await open({
          multiple: false,
          filters: [{
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
          }]
        });
        
        if (selected && typeof selected === 'string') {
          setSelectedImagePath(selected);
          handleChange('imagePath', selected);
        }
      } else {
        // 浏览器环境的文件选择
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setSelectedImagePath(url);
            handleChange('imagePath', url);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('选择图片失败:', error);
    }
  };

  // 位置选择网格
  const positionOptions = [
    { value: 'top-left', label: '↖', row: 1, col: 1 },
    { value: 'top-center', label: '↑', row: 1, col: 2 },
    { value: 'top-right', label: '↗', row: 1, col: 3 },
    { value: 'middle-left', label: '←', row: 2, col: 1 },
    { value: 'center', label: '●', row: 2, col: 2 },
    { value: 'middle-right', label: '→', row: 2, col: 3 },
    { value: 'bottom-left', label: '↙', row: 3, col: 1 },
    { value: 'bottom-center', label: '↓', row: 3, col: 2 },
    { value: 'bottom-right', label: '↘', row: 3, col: 3 },
  ];

  return (
    <VStack spacing={4} align="stretch">
      {/* 水印类型选择 */}
      <FormControl>
        <FormLabel>{t('watermark.watermarkType')}</FormLabel>
        <RadioGroup
          value={watermarkSettings.type}
          onChange={(value) => handleChange('type', value)}
        >
          <HStack spacing={4}>
            <Radio value="text">{t('watermark.textWatermark')}</Radio>
            <Radio value="image">{t('watermark.imageWatermark')}</Radio>
          </HStack>
        </RadioGroup>
      </FormControl>

      {/* 文字水印设置 */}
      {watermarkSettings.type === 'text' && (
        <>
          <FormControl>
            <FormLabel>{t('watermark.watermarkText')}</FormLabel>
            <Input
              value={watermarkSettings.text || ''}
              onChange={(e) => handleChange('text', e.target.value)}
              placeholder={t('watermark.enterWatermarkText')}
            />
          </FormControl>

          {/* 字体选择和字体粗细 */}
          <HStack spacing={4}>
            <FormControl flex={2}>
              <FormLabel>{t('watermark.font')}</FormLabel>
              {loadingFonts ? (
                <HStack>
                  <Spinner size="sm" />
                  <Text fontSize="sm">{t('watermark.loadingFonts')}</Text>
                </HStack>
              ) : (
                <Select
                  value={watermarkSettings.fontFamily || 'Arial'}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  placeholder={t('watermark.selectFont')}
                >
                  {systemFonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </Select>
              )}
            </FormControl>

            <FormControl flex={1}>
              <FormLabel>{t('watermark.fontWeight')}</FormLabel>
              <Select
                value={watermarkSettings.fontWeight || 'normal'}
                onChange={(e) => handleChange('fontWeight', e.target.value)}
              >
                <option value="normal">{t('watermark.normal')}</option>
                <option value="bold">{t('watermark.bold')}</option>
              </Select>
            </FormControl>
          </HStack>

          {/* 字体大小和颜色 */}
          <HStack spacing={4}>
            <FormControl flex={1}>
              <FormLabel>{t('watermark.fontSize')}</FormLabel>
              <NumberInput
                value={watermarkSettings.fontSize || 24}
                onChange={(_, value) => handleChange('fontSize', value)}
                min={8}
                max={200}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl flex={1}>
              <FormLabel>{t('watermark.fontColor')}</FormLabel>
              <Input
                type="color"
                value={watermarkSettings.fontColor || '#000000'}
                onChange={(e) => handleChange('fontColor', e.target.value)}
                h="40px"
              />
            </FormControl>
          </HStack>
        </>
      )}

      {/* 图片水印设置 */}
      {watermarkSettings.type === 'image' && (
        <>
          <FormControl>
            <FormLabel>{t('watermark.watermarkImage')}</FormLabel>
            <VStack spacing={2} align="stretch">
              <Button onClick={handleSelectImage} colorScheme="blue" variant="outline">
                {t('watermark.selectImage')}
              </Button>
              {selectedImagePath && (
                <Text fontSize="sm" color="gray.500" noOfLines={1}>
                  {selectedImagePath.split(/[/\\]/).pop()}
                </Text>
              )}
            </VStack>
          </FormControl>

          <FormControl>
            <FormLabel>{t('watermark.imageScale')}: {Math.round((watermarkSettings.imageScale || 1.0) * 100)}%</FormLabel>
            <Slider
              value={watermarkSettings.imageScale || 1.0}
              onChange={(value) => handleChange('imageScale', value)}
              min={0.1}
              max={2.0}
              step={0.1}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </FormControl>
        </>
      )}

      {/* 位置选择 */}
      <FormControl>
        <FormLabel>{t('watermark.watermarkPosition')}</FormLabel>
        <Grid templateColumns="repeat(3, 1fr)" gap={2} maxW="150px">
          {positionOptions.map((option) => (
            <GridItem key={option.value}>
              <Button
                size="sm"
                variant={watermarkSettings.position === option.value ? 'solid' : 'outline'}
                colorScheme={watermarkSettings.position === option.value ? 'blue' : 'gray'}
                onClick={() => handleChange('position', option.value)}
                w="100%"
                h="40px"
                fontSize="lg"
              >
                {option.label}
              </Button>
            </GridItem>
          ))}
        </Grid>
      </FormControl>

      {/* 边距设置 */}
      <HStack spacing={4}>
        <FormControl flex={1}>
          <FormLabel>{t('watermark.horizontalMargin')}</FormLabel>
          <NumberInput
            value={watermarkSettings.marginX || 20}
            onChange={(_, value) => handleChange('marginX', value)}
            min={0}
            max={200}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl flex={1}>
          <FormLabel>{t('watermark.verticalMargin')}</FormLabel>
          <NumberInput
            value={watermarkSettings.marginY || 20}
            onChange={(_, value) => handleChange('marginY', value)}
            min={0}
            max={200}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
      </HStack>

      {/* 透明度设置 */}
      <FormControl>
        <FormLabel>{t('watermark.opacity')}: {Math.round(watermarkSettings.opacity * 100)}%</FormLabel>
        <Slider
          value={watermarkSettings.opacity}
          onChange={(value) => handleChange('opacity', value)}
          min={0}
          max={1}
          step={0.05}
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </FormControl>
    </VStack>
  );
};

export default WatermarkSettings;
