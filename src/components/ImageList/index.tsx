import React, { useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { ImageFile, ProcessingFunction, ProcessingSettings } from '../../types';
import ImageDropzone from './ImageDropzone';
import ImageGrid from './ImageGrid';
import ImageToolbar from './ImageToolbar';
import { useTranslation } from 'react-i18next';
import { createImageFileFromBrowserFile, createImageFilesFromPaths } from '../../utils/createImageFileFromPath';
import { isTauriEnv } from '../../utils/tauriEnv';

interface ImageListProps {
  images: ImageFile[];
  onImageAdd: (images: ImageFile[]) => void;
  onImageRemove: (imageId: string) => void;
  onImageUpdate: (imageId: string, updates: Partial<ImageFile>) => void;
  onClearImages: () => void;
  onImageSelect: (image: ImageFile) => void;
  onImagesReorder?: (reorderedImages: ImageFile[]) => void;
  selectedImage: ImageFile | null;
  currentFunction: ProcessingFunction;
  settings: ProcessingSettings;
}

const ImageList: React.FC<ImageListProps> = ({
  images,
  onImageAdd,
  onImageRemove,
  onImageUpdate,
  onClearImages,
  onImageSelect,
  onImagesReorder,
  selectedImage,
  currentFunction,
  settings,
}) => {
  const { t } = useTranslation();
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Tauri 窗口级拖放：直接使用文件路径，避免 blob 临时文件
  useEffect(() => {
    if (!isTauriEnv()) {
      return;
    }

    let unlistenDrop: (() => void) | undefined;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlistenDrop = await listen<string[]>('tauri://file-drop', async (event) => {
        const newImages = await createImageFilesFromPaths(event.payload);
        if (newImages.length > 0) {
          onImageAdd(newImages);
        }
      });
    };

    setup();

    return () => {
      unlistenDrop?.();
    };
  }, [onImageAdd]);

  return (
    <VStack spacing={0} align="stretch" h="full">
      {/* Header - 固定高度 */}
      <Box p={4} borderBottom="1px" borderColor={borderColor} flexShrink={0}>
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="bold">{t('imageList.imageList')}</Text>
          <HStack spacing={2}>
            <Button
              type="button"
              leftIcon={<AddIcon />}
              colorScheme="blue"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // 触发文件选择
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  onImageAdd(files.map(createImageFileFromBrowserFile));
                };
                input.click();
              }}
            >
              {t('imageList.addImages')}
            </Button>

            <Button
              colorScheme="red"
              size="sm"
              onClick={onClearImages}
              isDisabled={images.length === 0}
            >
              {t('imageList.clearList')}
            </Button>
          </HStack>
        </HStack>
      </Box>

      {/* Content */}
      <Box flex={1} overflowY="auto" p={4}>
        {images.length === 0 ? (
          <ImageDropzone onImageAdd={onImageAdd} />
        ) : (
          <ImageGrid
            images={images}
            onImageRemove={onImageRemove}
            onImageSelect={onImageSelect}
            onImagesReorder={onImagesReorder}
            selectedImage={selectedImage}
          />
        )}
      </Box>

      {/* Toolbar */}
      <ImageToolbar
        images={images}
        currentFunction={currentFunction}
        settings={settings}
        onImageUpdate={onImageUpdate}
      />
    </VStack>
  );
};

export default ImageList; 