import React, { useMemo, useState } from 'react';
import {
  HStack,
  IconButton,
  Button,
  Box,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { SettingsIcon } from '@chakra-ui/icons';
import { ImageFile, ProcessingFunction, ProcessingSettings } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppMenu } from '../../context/AppMenuContext';
import { ImageProcessingService } from '../../services/imageProcessing';
import { TauriImageProcessingService } from '../../services/tauriImageProcessing';
import { FileService } from '../../services/fileService';
import { resolveOutputDirectoryForFunction } from '../../utils/outputDirectory';

interface ImageToolbarProps {
  images: ImageFile[];
  currentFunction: ProcessingFunction;
  settings: ProcessingSettings;
  onImageUpdate?: (imageId: string, updates: Partial<ImageFile>) => void;
}

const ImageToolbar: React.FC<ImageToolbarProps> = ({
  images,
  currentFunction,
  settings,
  onImageUpdate,
}) => {
  const { t } = useLanguage();
  const { globalSettings, isLoadingSettings, openDialog } = useAppMenu();
  const [isProcessing, setIsProcessing] = useState(false);

  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const toast = useToast();

  const buttonState = useMemo(() => {
    const hasImages = images.length > 0;
    const buttonText = hasImages ? t('imageList.startProcessing') : t('imageList.pleaseAddImages');
    return { hasImages, buttonText };
  }, [images.length, t]);

  const handleProcess = async () => {
    if (images.length === 0) {
      toast({
        title: t('processing.noImages'),
        description: t('processing.pleaseAddImagesFirst'),
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!globalSettings.outputDirectory) {
      toast({
        title: t('processing.outputDirectoryNotSet'),
        description: t('processing.pleaseSelectOutputDirectory'),
        status: 'warning',
        duration: 3000,
      });
      openDialog('outputSettings');
      return;
    }

    setIsProcessing(true);

    try {
      if (currentFunction === 'enhance') {
        try {
          await TauriImageProcessingService.cleanupPreviewFiles();
        } catch {
          // 忽略清理失败
        }
      }

      toast({
        title: t('processing.startProcessing'),
        description: t('processing.processingImages', { count: images.length }),
        status: 'info',
        duration: 2000,
      });

      let processingResult;

      if (TauriImageProcessingService.isTauriEnvironment()) {
        processingResult = await TauriImageProcessingService.processImages(
          images,
          currentFunction,
          settings,
          globalSettings,
          (imageId: string, progress: { status: string; progress?: number; message?: string }) => {
            if (onImageUpdate) {
              onImageUpdate(imageId, {
                processing: {
                  status: progress.status as 'idle' | 'processing' | 'completed' | 'error',
                  progress: progress.progress,
                  message: progress.message,
                },
              });
            }
          }
        );
      } else {
        processingResult = await ImageProcessingService.processImages(
          images,
          currentFunction,
          settings
        );
      }

      if (!processingResult.success) {
        throw new Error(processingResult.error || '图片处理失败');
      }

      if (TauriImageProcessingService.isTauriEnvironment()) {
        toast({
          title: t('processing.processingComplete'),
          description: t('processing.successfullyProcessed', {
            count: processingResult.processedImages.length,
            directory: globalSettings.outputDirectory,
          }),
          status: 'success',
          duration: 5000,
        });

        if (globalSettings.autoOpenOutputFolder) {
          try {
            const { open } = await import('@tauri-apps/plugin-shell');
            const openDir = await resolveOutputDirectoryForFunction(globalSettings, currentFunction);
            await open(openDir || globalSettings.outputDirectory);
          } catch {
            // 忽略打开文件夹失败
          }
        }
      } else {
        FileService.downloadInBrowser(processingResult.processedImages);

        toast({
          title: t('processing.processingComplete'),
          description: t('processing.downloadStarted', { count: processingResult.processedImages.length }),
          status: 'success',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: t('processing.processingFailed'),
        description: error instanceof Error ? error.message : t('processing.unknownError'),
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <HStack
      p={4}
      borderTop="1px"
      borderColor={borderColor}
      justify="space-between"
    >
      <HStack spacing={2}>
        <IconButton
          aria-label={t('common.settings')}
          icon={<SettingsIcon />}
          size="sm"
          variant="ghost"
          onClick={() => openDialog('outputSettings')}
          isDisabled={isLoadingSettings}
          isLoading={isLoadingSettings}
        />
      </HStack>

      <Button
        colorScheme="blue"
        size="sm"
        onClick={handleProcess}
        isDisabled={!buttonState.hasImages || isProcessing}
        isLoading={isProcessing}
        loadingText={t('imageList.processing')}
      >
        {buttonState.buttonText}
      </Button>
    </HStack>
  );
};

export default ImageToolbar;
