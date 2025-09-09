import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Select,
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  AlertDescription,
  Badge,
  
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';


interface ConvertSettingsProps {
  settings?: {
    format: 'JPEG' | 'PNG' | 'WEBP' | 'GIF' | 'BMP' | 'TIFF' | 'ICO';
    quality?: number; // 1-100, 仅适用于有损格式
    compressionLevel?: number; // 0-9, PNG压缩级别
    preserveTransparency?: boolean; // 是否保持透明度
    preserveMetadata?: boolean; // 是否保留元数据
    colorSpace?: 'sRGB' | 'AdobeRGB' | 'ProPhotoRGB'; // 色彩空间
    dpi?: number; // DPI设置
  };
  onChange: (settings: {
    format: 'JPEG' | 'PNG' | 'WEBP' | 'GIF' | 'BMP' | 'TIFF' | 'ICO';
    quality?: number;
    compressionLevel?: number;
    preserveTransparency?: boolean;
    preserveMetadata?: boolean;
    colorSpace?: 'sRGB' | 'AdobeRGB' | 'ProPhotoRGB';
    dpi?: number;
  }) => void;
  selectedImages?: Array<{ name: string; type: string; size: number }>; // 选中的图片信息
}

const ConvertSettings: React.FC<ConvertSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const defaultSettings = {
    format: 'JPEG' as const,
    quality: 85,
    compressionLevel: 9, // PNG压缩级别 0-9
    preserveTransparency: true,
    preserveMetadata: false,
    colorSpace: 'sRGB' as const,
    dpi: 72,
  };
  const currentSettings = { ...defaultSettings, ...settings };



  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');


  // 格式信息
  const formatInfo = {
    JPEG: {
      hasLoss: true,
      supportsTransparency: false,
      supportsAnimation: false,
      description: t('convert.formatInfo.JPEG.description'),
      bestFor: t('convert.formatInfo.JPEG.bestFor'),
      compression: t('convert.formatInfo.JPEG.compression'),
      maxColors: t('convert.formatInfo.JPEG.maxColors')
    },
    PNG: {
      hasLoss: false,
      supportsTransparency: true,
      supportsAnimation: false,
      description: t('convert.formatInfo.PNG.description'),
      bestFor: t('convert.formatInfo.PNG.bestFor'),
      compression: t('convert.formatInfo.PNG.compression'),
      maxColors: t('convert.formatInfo.PNG.maxColors')
    },
    WEBP: {
      hasLoss: true,
      supportsTransparency: true,
      supportsAnimation: true,
      description: t('convert.formatInfo.WEBP.description'),
      bestFor: t('convert.formatInfo.WEBP.bestFor'),
      compression: t('convert.formatInfo.WEBP.compression'),
      maxColors: t('convert.formatInfo.WEBP.maxColors')
    },
    GIF: {
      hasLoss: true,
      supportsTransparency: true,
      supportsAnimation: true,
      description: t('convert.formatInfo.GIF.description'),
      bestFor: t('convert.formatInfo.GIF.bestFor'),
      compression: t('convert.formatInfo.GIF.compression'),
      maxColors: t('convert.formatInfo.GIF.maxColors')
    },
    BMP: {
      hasLoss: false,
      supportsTransparency: false,
      supportsAnimation: false,
      description: t('convert.formatInfo.BMP.description'),
      bestFor: t('convert.formatInfo.BMP.bestFor'),
      compression: t('convert.formatInfo.BMP.compression'),
      maxColors: t('convert.formatInfo.BMP.maxColors')
    },
    TIFF: {
      hasLoss: false,
      supportsTransparency: true,
      supportsAnimation: false,
      description: t('convert.formatInfo.TIFF.description'),
      bestFor: t('convert.formatInfo.TIFF.bestFor'),
      compression: t('convert.formatInfo.TIFF.compression'),
      maxColors: t('convert.formatInfo.TIFF.maxColors')
    },
    ICO: {
      hasLoss: false,
      supportsTransparency: true,
      supportsAnimation: false,
      description: t('convert.formatInfo.ICO.description'),
      bestFor: t('convert.formatInfo.ICO.bestFor'),
      compression: t('convert.formatInfo.ICO.compression'),
      maxColors: t('convert.formatInfo.ICO.maxColors')
    },
  };

  const currentFormatInfo = formatInfo[currentSettings.format];
  const showQualityControl = currentFormatInfo.hasLoss;

  const handleChange = (field: string, value: any) => {
    onChange({
      ...currentSettings,
      [field]: value,
    });
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* 格式选择 */}
      <FormControl>
        <FormLabel>{t('convert.targetFormat')}</FormLabel>
        <Select
          value={currentSettings.format}
          onChange={(e) => handleChange('format', e.target.value)}
        >
          <option value="JPEG">JPEG (.jpg)</option>
          <option value="PNG">PNG (.png)</option>
          <option value="WEBP">WebP (.webp)</option>
          <option value="GIF">GIF (.gif)</option>
          <option value="BMP">BMP (.bmp)</option>
          <option value="TIFF">TIFF (.tiff)</option>
          <option value="ICO">ICO (.ico)</option>
        </Select>
      </FormControl>

      {/* 格式信息 */}
      <Box p={4} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="medium">
            {t('convert.formatFeatures', { format: currentSettings.format })}
          </Text>
          <HStack spacing={2}>
            {currentFormatInfo.hasLoss ? (
              <Badge colorScheme="orange">{t('convert.lossy')}</Badge>
            ) : (
              <Badge colorScheme="green">{t('convert.lossless')}</Badge>
            )}
            {currentFormatInfo.supportsTransparency && (
              <Badge colorScheme="blue">{t('convert.transparency')}</Badge>
            )}
          </HStack>
        </HStack>
        <Text fontSize="xs" color="gray.500">
          {currentFormatInfo.description}
        </Text>
      </Box>

      {/* 质量控制 - 仅对有损格式显示 */}
      {showQualityControl && (
        <FormControl>
          <FormLabel>
            {t('convert.qualitySettings')}
            <Text as="span" fontSize="sm" color="gray.500" ml={2}>
              ({currentSettings.quality}%)
            </Text>
          </FormLabel>
          <HStack spacing={4}>
            <Slider
              value={currentSettings.quality}
              onChange={(value) => handleChange('quality', value)}
              min={1}
              max={100}
              step={1}
              flex={1}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <NumberInput
              value={currentSettings.quality}
              onChange={(_, value) => handleChange('quality', value)}
              min={1}
              max={100}
              w="80px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </HStack>
          <Text fontSize="xs" color="gray.500" mt={1}>
            {t('convert.qualityDescription')}
          </Text>
        </FormControl>
      )}

      {/* PNG压缩级别设置 */}
      {currentSettings.format === 'PNG' && (
        <FormControl>
          <FormLabel>
            PNG压缩级别
            <Text as="span" fontSize="sm" color="gray.500" ml={2}>
              ({currentSettings.compressionLevel}/9)
            </Text>
          </FormLabel>
          <HStack spacing={4}>
            <Slider
              value={currentSettings.compressionLevel}
              onChange={(value) => handleChange('compressionLevel', value)}
              min={0}
              max={9}
              step={1}
              flex={1}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <NumberInput
              value={currentSettings.compressionLevel}
              onChange={(_, value) => handleChange('compressionLevel', value)}
              min={0}
              max={9}
              w="80px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </HStack>
          <Text fontSize="xs" color="gray.500" mt={1}>
            0=快速压缩(文件较大), 9=最高压缩(文件最小,处理较慢)
          </Text>
        </FormControl>
      )}

      {/* 透明度警告 */}
      {!currentFormatInfo.supportsTransparency && (
        <Alert status="warning" size="sm">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {t('convert.transparencyWarning', { format: currentSettings.format })}
          </AlertDescription>
        </Alert>
      )}

      {/* 转换提示 */}
      <Alert status="info" size="sm">
        <AlertIcon />
        <AlertDescription fontSize="sm">
          {t('convert.conversionTip')}
        </AlertDescription>
      </Alert>
    </VStack>
  );
};

export default ConvertSettings; 