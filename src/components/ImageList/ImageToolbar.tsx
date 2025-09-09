import React, { useState, useEffect, useMemo } from 'react';
import {
  HStack,
  IconButton,
  Button,
  Box,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Switch,
  Text,
  useToast,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@chakra-ui/react';
import {
  SettingsIcon,
} from '@chakra-ui/icons';
import { ImageFile, ProcessingFunction, ProcessingSettings, GlobalSettings } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';

// 导入 Tauri API
import { open } from '@tauri-apps/api/dialog';
// import { message } from '@tauri-apps/api/dialog';

// 导入服务
import { ImageProcessingService } from '../../services/imageProcessing';
import { TauriImageProcessingService } from '../../services/tauriImageProcessing';
import { FileService } from '../../services/fileService';
import { SettingsService } from '../../services/settingsService';

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
  const { t, changeLanguage } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 调试：监控images prop的变化
  useEffect(() => {
    console.log('🔥 [ImageToolbar] images prop 更新:', images.length, '张图片');
  }, [images]);

  // 调试：监控settings prop的变化
  useEffect(() => {
    console.log('🔥 [ImageToolbar] settings prop 更新:', settings);
    console.log('🔥 [ImageToolbar] crop设置:', settings.crop);
  }, [settings]);

  // 使用 useMemo 确保按钮状态计算的稳定性
  const buttonState = useMemo(() => {
    const hasImages = images.length > 0;
    const buttonText = hasImages ? t('imageList.startProcessing') : t('imageList.pleaseAddImages');
    console.log('🔥 [ImageToolbar] 计算按钮状态:', { hasImages, buttonText, imagesCount: images.length });
    return { hasImages, buttonText };
  }, [images.length, t]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    outputDirectory: '',
    outputFormat: 'original',
    quality: 80,
    overwriteExisting: false,
    createSubfolders: true,
    filenamePattern: '{name}_{timestamp}',
    autoOpenOutputFolder: true,
    language: 'zh-CN',
  });
  // const [debugInfo, setDebugInfo] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const toast = useToast();

  // 组件加载时自动加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log('🔄 正在加载设置...');
        const savedSettings = await SettingsService.loadSettings();
        setGlobalSettings(savedSettings);
        console.log('✅ 设置加载完成:', savedSettings);
      } catch (error) {
        console.error('❌ 加载设置失败:', error);
        toast({
        title: t('toast.settingsLoadFailed'),
        description: t('toast.useDefaultSettings'),
          status: 'warning',
          duration: 3000,
        });
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, [toast]);

  // 自动保存设置
  useEffect(() => {
    if (!isLoadingSettings && globalSettings) {
      console.log('🔄 自动保存设置...');
      SettingsService.autoSaveSettings(globalSettings);
    }
  }, [globalSettings, isLoadingSettings]);

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
      setIsSettingsOpen(true);
      return;
    }

    setIsProcessing(true);

    try {
      // 清理临时预览文件
      if (currentFunction === 'enhance') {
        try {
          const cleanedCount = await TauriImageProcessingService.cleanupPreviewFiles();
          if (cleanedCount > 0) {
            console.log(`🧹 已清理 ${cleanedCount} 个临时预览文件`);
          }
        } catch (error) {
          console.warn('清理临时文件失败:', error);
        }
      }

      console.log('🚀 开始处理图片:', {
        images: images.length,
        function: currentFunction,
        settings,
        globalSettings
      });
      
      // 特别调试压缩设置
      if (currentFunction === 'compress') {
        console.log('🔍 [压缩调试] 压缩设置详情:', {
          compressSettings: settings.compress,
          globalQuality: globalSettings.quality,
          finalQuality: settings.compress?.quality || globalSettings.quality || 80
        });
      }
      
      // 特别调试水印设置
      if (currentFunction === 'watermark') {
        console.log('🔍 [水印调试] 水印设置详情:', {
          watermarkSettings: settings.watermark,
          watermarkType: settings.watermark?.type,
          watermarkText: settings.watermark?.text,
          watermarkPosition: settings.watermark?.position,
          watermarkOpacity: settings.watermark?.opacity,
          watermarkColor: settings.watermark?.fontColor,
          watermarkFontSize: settings.watermark?.fontSize,
          watermarkFontFamily: settings.watermark?.fontFamily
        });
      }
      
      // 特别调试转换设置
      if (currentFunction === 'convert') {
        console.log('🔍 [转换调试] 转换设置详情:', {
          convertSettings: settings.convert,
          targetFormat: settings.convert?.format,
          quality: settings.convert?.quality || globalSettings.quality || 85,
          compressionLevel: settings.convert?.compressionLevel || 9,
          preserveTransparency: settings.convert?.preserveTransparency,
          backgroundColor: settings.convert?.backgroundColor
        });
      }
      
      // 添加详细的settings调试信息
      console.log('🔍 [ImageToolbar] 详细settings信息:', {
        hasCrop: !!settings.crop,
        cropMode: settings.crop?.mode,
        cropAspectRatio: settings.crop?.aspectRatio,
        fullCropSettings: settings.crop
      });

      // 显示开始处理的提示
      toast({
        title: t('processing.startProcessing'),
        description: t('processing.processingImages', { count: images.length }),
        status: 'info',
        duration: 2000,
      });

      // 调用图片处理服务
      let processingResult;

      if (TauriImageProcessingService.isTauriEnvironment()) {
        // Tauri环境：使用Rust后端处理
        console.log('🦀 使用Rust后端处理图片');
        processingResult = await TauriImageProcessingService.processImages(
          images,
          currentFunction,
          settings,
          globalSettings,
          // 进度回调
          (imageId: string, progress: { status: string; progress?: number; message?: string }) => {
            if (onImageUpdate) {
              onImageUpdate(imageId, {
                processing: {
                  status: progress.status as any,
                  progress: progress.progress,
                  message: progress.message,
                }
              });
            }
          }
        );
      } else {
        // 浏览器环境：使用前端处理（备用）
        console.log('🌐 使用前端处理图片');
        processingResult = await ImageProcessingService.processImages(
          images,
          currentFunction,
          settings
        );
      }

      if (!processingResult.success) {
        throw new Error(processingResult.error || '图片处理失败');
      }

      console.log('✅ 图片处理完成:', processingResult.processedImages.length);

      // 处理结果
      if (TauriImageProcessingService.isTauriEnvironment()) {
        // Tauri环境：后端已经处理了文件保存
        toast({
          title: t('processing.processingComplete'),
          description: t('processing.successfullyProcessed', { 
            count: processingResult.processedImages.length, 
            directory: globalSettings.outputDirectory 
          }),
          status: 'success',
          duration: 5000,
        });

        console.log('✅ 文件已保存到:', globalSettings.outputDirectory);

        // 如果设置了自动打开文件夹
        if (globalSettings.autoOpenOutputFolder) {
          try {
            const { open } = await import('@tauri-apps/api/shell');
            await open(globalSettings.outputDirectory);
          } catch (error) {
            console.warn('无法打开输出文件夹:', error);
          }
        }
      } else {
        // 浏览器环境：下载文件
        FileService.downloadInBrowser(processingResult.processedImages);

        toast({
          title: t('processing.processingComplete'),
          description: t('processing.downloadStarted', { count: processingResult.processedImages.length }),
          status: 'success',
          duration: 5000,
        });
      }

    } catch (error) {
      console.error('❌ 处理失败:', error);

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

  const handleSettingsSave = async (newSettings: GlobalSettings) => {
    try {
      console.log('💾 正在保存设置:', newSettings);

      // 保存到持久化存储
      const success = await SettingsService.saveSettings(newSettings);

      if (success) {
        setGlobalSettings(newSettings);
        toast({
          title: t('toast.settingsSaved'),
          description: t('globalSettings.settingsSaved'),
          status: 'success',
          duration: 3000,
        });
        console.log('✅ 设置保存成功');
      } else {
        throw new Error('保存设置失败');
      }
    } catch (error) {
      console.error('❌ 保存设置失败:', error);
      toast({
          title: t('toast.settingsSaveFailed'),
          description: t('toast.settingsSaveFailed'),
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDirectorySelect = async () => {
    console.log('🚀 [handleDirectorySelect] 函数被调用');

    try {
      console.log('🔧 [目录选择] 开始目录选择...');

      // 使用 Tauri API 打开目录选择对话框
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('globalSettings.selectDirectory')
      });

      console.log('🔧 [目录选择] 选择结果:', selected);

      if (selected && typeof selected === 'string') {
        console.log('🔧 [目录选择] 成功选择目录:', selected);

        // 更新设置并自动保存
        const newSettings = {
          ...globalSettings,
          outputDirectory: selected
        };

        setGlobalSettings(newSettings);

        // 自动保存设置
        try {
          await SettingsService.saveSettings(newSettings);
          console.log('✅ 输出目录已自动保存');
        } catch (error) {
          console.error('❌ 自动保存目录设置失败:', error);
        }

        toast({
          title: t('toast.directorySelected'),
          description: t('processing.directorySelectedAndSaved', { path: selected }),
          status: 'success',
          duration: 3000,
        });

        return;
      } else if (selected === null) {
        console.log('🔧 [目录选择] 用户取消了选择');
        return;
      } else {
        console.log('🔧 [目录选择] 意外的选择结果类型:', typeof selected);
      }

    } catch (error) {
      console.error('🔧 [目录选择] 出错:', error);

      // 显示错误提示
      toast({
          title: t('toast.directorySelectionFailed'),
          description: t('processing.cannotOpenDirectorySelector'),
        status: 'error',
        duration: 5000,
      });

      // 出错时回退到手动输入
      const manualPath = prompt(t('processing.enterPathManually') + ':\n\n例如:\nC:\\Users\\用户名\\Pictures\nD:\\Images\n./output');
      if (manualPath && manualPath.trim()) {
        console.log('🔧 [目录选择] 用户手动输入的路径:', manualPath);
        setGlobalSettings(prev => ({
          ...prev,
          outputDirectory: manualPath.trim()
        }));
      }
    }
  };

  return (
    <>
      <HStack
        p={4}
        borderTop="1px"
        borderColor={borderColor}
        justify="space-between"
      >
        <HStack spacing={2}>
          <IconButton
            aria-label="设置"
            icon={<SettingsIcon />}
            size="sm"
            variant="ghost"
            onClick={() => setIsSettingsOpen(true)}
            isDisabled={isLoadingSettings}
            isLoading={isLoadingSettings}
          />
        </HStack>
        
        <Button
          colorScheme="blue"
          size="sm"
          onClick={() => {
            console.log('🔥 [ImageToolbar] 开始处理按钮被点击，当前图片数量:', images.length);
            handleProcess();
          }}
          isDisabled={!buttonState.hasImages || isProcessing}
          isLoading={isProcessing}
          loadingText={t('imageList.processing')}
        >
          {buttonState.buttonText}
        </Button>
      </HStack>

      {/* 设置对话框 */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent maxW="600px">
          <ModalHeader borderBottom="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
            <HStack justify="space-between" align="center">
              <Text>{t('globalSettings.title')}</Text>
              {isLoadingSettings && (
                <HStack spacing={2} fontSize="sm" color="gray.500">
                  <Text>{t('common.loading')}</Text>
                </HStack>
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={6} align="stretch">
              {/* 输出设置组 */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={4} color={useColorModeValue('gray.700', 'gray.200')}>
                  📁 {t('globalSettings.outputSettings')}
                </Text>
                <VStack spacing={4} align="stretch">
                  {/* 输出目录 */}
                  <FormControl>
                    <FormLabel fontWeight="medium">{t('globalSettings.outputDirectory')}</FormLabel>
                    <HStack>
                      <Input
                        value={globalSettings.outputDirectory}
                        onChange={(e) => setGlobalSettings(prev => ({
                          ...prev,
                          outputDirectory: e.target.value
                        }))}
                        placeholder={t('globalSettings.directoryPlaceholder')}
                        bg={useColorModeValue('white', 'gray.800')}
                      />
                      <Button
                        type="button"
                        size="sm"
                        colorScheme="blue"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔧 [选择目录按钮] 被点击');
                          handleDirectorySelect();
                        }}
                      >
                        {t('globalSettings.selectDirectory')}
                      </Button>
                    </HStack>
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      {t('globalSettings.directoryHelp')}
                    </Text>
                  </FormControl>

                  {/* 输出格式 */}
                  <FormControl>
                    <FormLabel fontWeight="medium">{t('globalSettings.outputFormat')}</FormLabel>
                    <Select
                      value={globalSettings.outputFormat}
                      onChange={(e) => setGlobalSettings(prev => ({
                        ...prev,
                        outputFormat: e.target.value as GlobalSettings['outputFormat']
                      }))}
                    >
                      <option value="original">{t('globalSettings.keepOriginalFormat')}</option>
                      <option value="JPEG">JPEG</option>
                      <option value="PNG">PNG</option>
                      <option value="WEBP">WebP</option>
                      <option value="GIF">GIF</option>
                      <option value="BMP">BMP</option>
                    </Select>
                  </FormControl>

                  {/* 质量设置 */}
                  <FormControl>
                    <FormLabel fontWeight="medium">{t('globalSettings.quality')}: {globalSettings.quality}%</FormLabel>
                    <Slider
                      min={1}
                      max={100}
                      value={globalSettings.quality}
                      onChange={(value) => setGlobalSettings(prev => ({
                        ...prev,
                        quality: value
                      }))}
                      colorScheme="blue"
                    >
                      <SliderTrack bg={useColorModeValue('gray.200', 'gray.600')}>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb boxSize={4} />
                    </Slider>
                  </FormControl>

                  {/* 文件名模式 */}
                  <FormControl>
                    <FormLabel fontWeight="medium">{t('globalSettings.filenamePattern')}</FormLabel>
                    <Input
                      value={globalSettings.filenamePattern}
                      onChange={(e) => setGlobalSettings(prev => ({
                        ...prev,
                        filenamePattern: e.target.value
                      }))}
                      placeholder="例如: {name}_{timestamp}"
                    />
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      {t('globalSettings.availableVariables')}: {'{name}'} ({t('globalSettings.originalFilename')}), {'{timestamp}'} ({t('globalSettings.timestamp')}), {'{index}'} ({t('globalSettings.sequenceNumber')})
                    </Text>
                  </FormControl>
                </VStack>
              </Box>

              {/* 行为设置组 */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={4} color={useColorModeValue('gray.700', 'gray.200')}>
                  ⚙️ {t('globalSettings.behaviorSettings')}
                </Text>
                <VStack spacing={4} align="stretch">
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontWeight="medium">{t('globalSettings.overwriteExisting')}</FormLabel>
                    <Switch
                      isChecked={globalSettings.overwriteExisting}
                      onChange={(e) => setGlobalSettings(prev => ({
                        ...prev,
                        overwriteExisting: e.target.checked
                      }))}
                    />
                  </FormControl>

                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontWeight="medium">{t('globalSettings.createSubfolders')}</FormLabel>
                    <Switch
                      isChecked={globalSettings.createSubfolders}
                      onChange={(e) => setGlobalSettings(prev => ({
                        ...prev,
                        createSubfolders: e.target.checked
                      }))}
                    />
                  </FormControl>

                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb="0" fontWeight="medium">{t('globalSettings.autoOpenOutputFolder')}</FormLabel>
                    <Switch
                      isChecked={globalSettings.autoOpenOutputFolder}
                      onChange={(e) => setGlobalSettings(prev => ({
                        ...prev,
                        autoOpenOutputFolder: e.target.checked
                      }))}
                    />
                  </FormControl>
                </VStack>
              </Box>

              {/* 语言设置组 */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={4} color={useColorModeValue('gray.700', 'gray.200')}>
                  🌐 {t('globalSettings.language')}
                </Text>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel fontWeight="medium">{t('globalSettings.language')}</FormLabel>
                    <Select
                      value={globalSettings.language}
                      onChange={(e) => {
                        const newLanguage = e.target.value as 'zh-CN' | 'en-US';
                        setGlobalSettings(prev => ({
                          ...prev,
                          language: newLanguage
                        }));
                        // 切换语言
                        changeLanguage(newLanguage);
                      }}
                    >
                      <option value="zh-CN">{t('languages.zh-CN')}</option>
                      <option value="en-US">{t('languages.en-US')}</option>
                    </Select>
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      {t('globalSettings.languageDescription')}
                    </Text>
                  </FormControl>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter borderTop="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
            <HStack spacing={2} flex={1}>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const defaultSettings = await SettingsService.resetSettings();
                    setGlobalSettings(defaultSettings);
                    toast({
                          title: t('toast.settingsReset'),
                          description: t('toast.settingsReset'),
                      status: 'info',
                      duration: 3000,
                    });
                  } catch (error) {
                    toast({
                          title: t('toast.settingsResetFailed'),
                          description: t('toast.settingsResetFailed'),
                      status: 'error',
                      duration: 3000,
                    });
                  }
                }}
              >
                {t('common.reset')}
              </Button>
            </HStack>

            <HStack spacing={2}>
              <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => {
                  handleSettingsSave(globalSettings);
                  setIsSettingsOpen(false);
                }}
              >
                {t('globalSettings.saveSettings')}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ImageToolbar; 