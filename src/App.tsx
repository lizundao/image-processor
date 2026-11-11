import { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { useAppTheme } from './hooks/useAppTheme';
import Navigation from './components/Navigation';
import FunctionPanel from './components/FunctionPanel';
import ImageList from './components/ImageList';
import TitleBar from './components/TitleBar/TitleBar';
import { ProcessingFunction, ProcessingSettings, ImageFile } from './types';
import { releaseImageFileUrl } from './utils/createImageFileFromPath';
import {
  getDefaultFunctionSettings,
  getInitialProcessingSettings,
} from './utils/defaultProcessingSettings';
import { SettingsService } from './services/settingsService';

function App() {
  const { colorMode, toggleTheme } = useAppTheme();

  const [currentFunction, setCurrentFunction] = useState<ProcessingFunction>('compress');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [settings, setSettings] = useState<ProcessingSettings>(getInitialProcessingSettings);
  const [settingsReady, setSettingsReady] = useState(false);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const loadFunctionSettings = async () => {
      try {
        const savedSettings = await SettingsService.loadFunctionSettings();
        setSettings(savedSettings);
      } catch {
        // 使用默认设置
      } finally {
        setSettingsReady(true);
      }
    };

    loadFunctionSettings();
  }, []);

  const handleFunctionChange = (newFunction: ProcessingFunction) => {
    setCurrentFunction(newFunction);

    setSettings(prev => {
      if (prev[newFunction]) {
        return prev;
      }
      return { ...prev, ...getDefaultFunctionSettings(newFunction) };
    });
  };

  const handleImageAdd = (newImages: ImageFile[]) => {
    setImages(prev => [...prev, ...newImages]);
  };

  const handleImageRemove = (imageId: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === imageId);
      if (target) {
        releaseImageFileUrl(target);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const handleImageUpdate = (imageId: string, updates: Partial<ImageFile>) => {
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, ...updates } : img
    ));
  };

  const handleClearImages = () => {
    setImages(prev => {
      prev.forEach(releaseImageFileUrl);
      return [];
    });
    setSelectedImage(null);
  };

  const handleImageSelect = (image: ImageFile) => {
    setSelectedImage(image);
  };

  const handleImagesReorder = (reorderedImages: ImageFile[]) => {
    setImages(reorderedImages);
  };

  const handleSettingsChange = (newSettings: Partial<ProcessingSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (settingsReady) {
        SettingsService.autoSaveFunctionSettings(updated);
      }
      return updated;
    });
  };

  return (
    <Box h="100vh" bg={bgColor} overflow="hidden" display="flex" flexDirection="column">
      <TitleBar />
      <Flex flex={1} minH={0} overflow="hidden">
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
            toggleColorMode={toggleTheme}
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
          />
        </Box>
      </Flex>
    </Box>
  );
}

export default App;
