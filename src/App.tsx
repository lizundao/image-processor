import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';
import Navigation from './components/Navigation';
import FunctionPanel from './components/FunctionPanel';
import ImageList from './components/ImageList';
import { ProcessingFunction, ProcessingSettings, ImageFile } from './types';



function App() {

  
  const { colorMode, toggleColorMode } = useColorMode();

  
  const [currentFunction, setCurrentFunction] = useState<ProcessingFunction>('compress');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  // 懒加载设置 - 只初始化当前需要的功能设置
  const [settings, setSettings] = useState<ProcessingSettings>(() => {

    // 只初始化默认功能的设置
    return {
      compress: { quality: 80 }
    };
  });



  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');



  // 按需初始化功能设置的默认值
  const getDefaultSettings = (functionName: ProcessingFunction): Partial<ProcessingSettings> => {
    const defaults: Partial<Record<ProcessingFunction, any>> = {
      compress: { quality: 80 },
      crop: { mode: 'ratio', aspectRatio: 1.0, quality: 85, outputFormat: 'JPEG', manualCrops: [], currentImageIndex: 0 },
      rotate: { angle: 0 },
      flip: { horizontal: false, vertical: false },
      border: { width: 10, color: '#000000', style: 'solid', opacity: 1.0, overlay_mode: false, enable_transparency: false, border_radius: 0 },
      rounded: { radius: 0 },
      merge: { direction: 'horizontal', spacing: 0 },
      gif: { fps: 10, loop_count: 0, quality: 80 },
      enhance: { strength: 50, autoExposure: true, autoWhiteBalance: false, localContrast: false, sharpen: true },
      watermark: { text: '', fontSize: 24, color: '#000000', opacity: 0.5, position: 'bottom-right' },
      convert: { format: 'JPEG', quality: 85 },
      resize: { width: undefined, height: undefined },
      gridSlice: { rows: 3, columns: 3, outputFormat: 'JPEG', quality: 85, includeOriginal: false, namingPattern: 'grid_{row}_{col}' }
    };

    return { [functionName]: defaults[functionName] };
  };

  // 当切换功能时，按需初始化设置
  const handleFunctionChange = (newFunction: ProcessingFunction) => {

    setCurrentFunction(newFunction);

    // 如果当前功能的设置不存在，则初始化默认设置
    if (!settings[newFunction]) {
      const defaultSettings = getDefaultSettings(newFunction);
      setSettings(prev => ({ ...prev, ...defaultSettings }));
    }
  };

  // 初始化时加载保存的设置
  useEffect(() => {

    const loadSavedSettings = async () => {
      try {

      } catch (error) {

        // 加载设置失败，使用默认设置
      }
    };

    loadSavedSettings();
  }, []);



  const handleImageAdd = (newImages: ImageFile[]) => {
    setImages(prev => [...prev, ...newImages]);
  };

  const handleImageRemove = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleImageUpdate = (imageId: string, updates: Partial<ImageFile>) => {
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, ...updates } : img
    ));
  };

  const handleClearImages = () => {
    setImages([]);
    setSelectedImage(null);
  };

  const handleImageSelect = (image: ImageFile) => {
    setSelectedImage(image);
  };

  const handleImagesReorder = (reorderedImages: ImageFile[]) => {
    setImages(reorderedImages);
  };

  const handleSettingsChange = async (newSettings: Partial<ProcessingSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // 自动保存设置到后端
    try {

    } catch (error) {
      // 自动保存设置失败
    }
  };


  return (
    <Box h="100vh" bg={bgColor} overflow="hidden">
  

      {/* 注释掉的复杂组件 */}
    
      <Flex h="100vh">
        <Box
          w="16.67%"
          borderRight="1px"
          borderColor={borderColor}
          bg={useColorModeValue('gray.100', 'gray.800')}
          overflow="hidden"
        >
          <Navigation
            currentFunction={currentFunction}
            onFunctionChange={handleFunctionChange}
            colorMode={colorMode}
            toggleColorMode={toggleColorMode}
          />
        </Box>

        <Box
          w="33.33%"
          borderRight="1px"
          borderColor={borderColor}
          bg={useColorModeValue('gray.50', 'gray.900')}
          overflow="hidden"
        >
          <FunctionPanel
            currentFunction={currentFunction}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            images={images}
          />
        </Box>

        <Box
          w="50%"
          bg={useColorModeValue('gray.50', 'gray.900')}
          overflow="hidden"
        >
          <ImageList
            images={images}
            onImageAdd={handleImageAdd}
            onImageRemove={handleImageRemove}
            onImageUpdate={handleImageUpdate}
            onClearImages={handleClearImages}
            onImageSelect={handleImageSelect}
            onImagesReorder={handleImagesReorder}
            selectedImage={selectedImage}
            currentFunction={currentFunction}
            settings={settings}
            colorMode={colorMode}
            toggleColorMode={toggleColorMode}
          />
        </Box>
      </Flex>
    
    </Box>
  );
}



export default App; 