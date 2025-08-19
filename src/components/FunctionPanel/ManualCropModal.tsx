import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  HStack,
  VStack,
  Text,
  Box,
  IconButton,
  useToast,
  Progress,
  useColorModeValue,
  Switch,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useTranslation } from 'react-i18next';
import { CropSettings } from '../../types';

interface ManualCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CropSettings;
  onChange: (settings: CropSettings) => void;
  images: any[];
}

const ManualCropModal: React.FC<ManualCropModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  images,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(settings.currentImageIndex || 0);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 60,
    height: 60,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  const [customRatioW, setCustomRatioW] = useState<number>(1);
  const [customRatioH, setCustomRatioH] = useState<number>(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const toast = useToast();

  const currentImage = images[currentIndex];
  const currentCrop = settings.manualCrops?.[currentIndex];

  // 当图片改变时，设置默认裁剪区域（把已保存的原图像素坐标换算为百分比）
  useEffect(() => {
    const imgW = imageSize.width;
    const imgH = imageSize.height;
    if (imgW > 0 && imgH > 0) {
      if (currentCrop && currentCrop.width > 0 && currentCrop.height > 0) {
        setCrop({
          unit: '%',
          x: (currentCrop.x / imgW) * 100,
          y: (currentCrop.y / imgH) * 100,
          width: (currentCrop.width / imgW) * 100,
          height: (currentCrop.height / imgH) * 100,
        });
      } else {
        // 默认给一个居中的百分比裁剪框
        setCrop({ unit: '%', x: 10, y: 10, width: 60, height: 60 });
      }
    }
  }, [currentCrop, imageSize.width, imageSize.height]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };

  const saveCurrentCrop = () => {
    if (!settings.manualCrops) return;

    // 使用百分比 crop 按原图尺寸换算为像素
    const percent = crop; // Crop（单位：%）
    const imgW = Math.max(1, imageSize.width);
    const imgH = Math.max(1, imageSize.height);

    let pxW = Math.round(((percent.width || 0) / 100) * imgW);
    let pxH = Math.round(((percent.height || 0) / 100) * imgH);
    pxW = Math.max(1, Math.min(pxW, imgW));
    pxH = Math.max(1, Math.min(pxH, imgH));

    let pxX = Math.round(((percent.x || 0) / 100) * imgW);
    let pxY = Math.round(((percent.y || 0) / 100) * imgH);
    // 边界钳制，确保不会超出原图
    pxX = Math.max(0, Math.min(pxX, imgW - pxW));
    pxY = Math.max(0, Math.min(pxY, imgH - pxH));

    const updatedCrops = [...(settings.manualCrops || [])];
    updatedCrops[currentIndex] = {
      imageId: currentImage.id,
      x: pxX,
      y: pxY,
      width: pxW,
      height: pxH,
      aspectRatio: pxW > 0 && pxH > 0 ? pxW / pxH : undefined,
    };

    onChange({
      ...settings,
      manualCrops: updatedCrops,
    });

    toast({
      title: t('crop.cropAreaSaved'),
      description: t('crop.cropAreaSavedDesc', { number: currentIndex + 1 }),
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleConfirm = () => {
    // 保存当前裁剪
    saveCurrentCrop();
    
    // 检查是否所有图片都已设置裁剪参数
    const allCropsSet = settings.manualCrops?.every(crop => 
      crop.width > 0 && crop.height > 0
    );
    
    if (allCropsSet) {
      toast({
        title: t('crop.allCropParamsSet'),
        description: t('crop.allCropParamsSetDesc'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } else {
      toast({
        title: t('crop.remainingImages'),
        description: t('crop.remainingImagesDesc'),
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getProgressPercentage = () => {
    if (!settings.manualCrops) return 0;
    const setCrops = settings.manualCrops.filter(crop => crop.width > 0 && crop.height > 0);
    return (setCrops.length / settings.manualCrops.length) * 100;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack justify="space-between" align="center">
            <Text>{t('crop.manualCropTitle', { current: currentIndex + 1, total: images.length })}</Text>
            <HStack spacing={4}>
              <HStack
                px={3}
                py={1}
                borderRadius="md"
                bg={useColorModeValue('gray.100','gray.700')}
                border="1px solid"
                borderColor={useColorModeValue('gray.300','gray.600')}
              >
                <Text fontSize="xs" color={useColorModeValue('gray.800','white')}>{t('crop.equalRatioCrop')}</Text>
                <Switch
                  size="sm"
                  colorScheme="purple"
                  isChecked={aspectRatio !== undefined}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const currentAspect = completedCrop ? (completedCrop.width / completedCrop.height) : (crop.width / crop.height);
                      setAspectRatio(currentAspect);
                    } else {
                      setAspectRatio(undefined);
                    }
                  }}
                />
              </HStack>
              <Progress value={getProgressPercentage()} width="200px" size="sm" />
            </HStack>
          </HStack>
        </ModalHeader>
        
        <ModalBody>
          <VStack spacing={4}>
            {/* 图片显示区域 */}
            <Box
              position="relative"
              border="2px dashed"
              borderColor="gray.300"
              borderRadius="md"
              overflow="hidden"
              bg="gray.50"
            >
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                keepSelection
                ruleOfThirds
              >
                <img
                  ref={imageRef}
                  src={currentImage?.url}
                  alt={currentImage?.name}
                  style={{ maxHeight: '500px', maxWidth: '100%', objectFit: 'contain' }}
                  onLoad={handleImageLoad}
                />
              </ReactCrop>
            </Box>
            
            {/* 裁剪信息 */}
            <Box p={4} bg={useColorModeValue('white','gray.800')} border="1px solid" borderColor={useColorModeValue('gray.200','gray.600')} borderRadius="md" width="100%">
              <Text fontSize="sm" fontWeight="semibold" mb={2} color={useColorModeValue('gray.900','gray.100')}>
                当前裁剪区域:
              </Text>
              <HStack spacing={6} wrap="wrap">
                <Text fontSize="sm" color={useColorModeValue('gray.800','gray.200')}>X: {completedCrop ? Math.round(completedCrop.x) : Math.round(crop.x)}</Text>
                <Text fontSize="sm" color={useColorModeValue('gray.800','gray.200')}>Y: {completedCrop ? Math.round(completedCrop.y) : Math.round(crop.y)}</Text>
                <Text fontSize="sm" color={useColorModeValue('gray.800','gray.200')}>宽度: {completedCrop ? Math.round(completedCrop.width) : Math.round(crop.width)}</Text>
                <Text fontSize="sm" color={useColorModeValue('gray.800','gray.200')}>高度: {completedCrop ? Math.round(completedCrop.height) : Math.round(crop.height)}</Text>
                <Text fontSize="sm" color={useColorModeValue('gray.900','gray.100')}>
                  比例: {completedCrop ? (completedCrop.width / completedCrop.height).toFixed(2) : (crop.width / crop.height).toFixed(2)}:1
                </Text>
              </HStack>
            </Box>
            
                        {/* 自定义比例控制 */}
            <Box p={4} bg={useColorModeValue('white','gray.800')} border="1px solid" borderColor={useColorModeValue('gray.200','gray.600')} borderRadius="md" width="100%">
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between" align="center">
                  <Text fontSize="sm" fontWeight="semibold" color={useColorModeValue('gray.900','gray.100')}>
                    🔧 自定义比例控制
                  </Text>
                  <HStack spacing={2}>
                    <Text fontSize="xs" color={useColorModeValue('gray.700','gray.300')}>启用等比裁剪</Text>
                    <Switch
                      isChecked={aspectRatio !== undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const currentAspect = completedCrop ? completedCrop.width / completedCrop.height : crop.width / crop.height;
                          setAspectRatio(currentAspect);
                        } else {
                          setAspectRatio(undefined);
                        }
                      }}
                      colorScheme="blue"
                      size="sm"
                    />
                  </HStack>
                </HStack>
                
                                 {aspectRatio !== undefined && (
                   <HStack spacing={3}>
                     <FormControl size="sm">
                       <FormLabel fontSize="xs" color={useColorModeValue('gray.700','gray.200')}>自定义比例</FormLabel>
                       <HStack spacing={2}>
                         <NumberInput min={1} value={customRatioW} onChange={(_, v) => { const w = v || 1; setCustomRatioW(w); if (aspectRatio !== undefined) { setAspectRatio(w / (customRatioH || 1)); } }} size="sm" width="80px">
                           <NumberInputField />
                         </NumberInput>
                         <Text fontSize="sm" color={useColorModeValue('gray.700','gray.300')}>:</Text>
                         <NumberInput min={1} value={customRatioH} onChange={(_, v) => { const h = v || 1; setCustomRatioH(h); if (aspectRatio !== undefined) { setAspectRatio((customRatioW || 1) / h); } }} size="sm" width="80px">
                           <NumberInputField />
                         </NumberInput>
                         <Button size="sm" onClick={() => setAspectRatio((customRatioW || 1) / (customRatioH || 1))} colorScheme="gray" variant="outline">
                           应用
                         </Button>
                       </HStack>
                     </FormControl>
                     
                     <VStack spacing={1}>
                       <Text fontSize="xs" color={useColorModeValue('gray.700','gray.300')}>快速比例</Text>
                       <HStack spacing={1}>
                         {[1, 4/3, 3/4, 16/9, 9/16, 2/1, 1/2].map((ratio) => (
                           <Button
                             key={ratio.toString()}
                             size="xs"
                             variant={Math.abs((aspectRatio ?? 0) - ratio) < 0.01 ? "solid" : "outline"}
                             colorScheme="gray"
                             onClick={() => setAspectRatio(ratio)}
                           >
                             {ratio === 1 ? "1:1" : ratio > 1 ? `${ratio.toFixed(1)}:1` : `1:${(1/ratio).toFixed(1)}`}
                           </Button>
                         ))}
                       </HStack>
                     </VStack>
                   </HStack>
                 )}
              </VStack>
            </Box>
            
            {/* 操作说明 */}
            <Box p={3} bg="blue.50" borderRadius="md" width="100%">
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" color="blue.700" fontWeight="medium">
                  💡 操作说明：
                </Text>
                <VStack align="stretch" spacing={1}>
                  <Text fontSize="xs" color="blue.600">
                    • 在图片上拖拽鼠标来选择裁剪区域
                  </Text>
                  <Text fontSize="xs" color="blue.600">
                    • 点击"保存当前裁剪"按钮保存当前图片的设置
                  </Text>
                  <Text fontSize="xs" color="blue.600">
                    • 使用左右箭头切换图片，为每张图片设置裁剪区域
                  </Text>
                  <Text fontSize="xs" color="blue.600">
                    • 设置完所有图片后，点击"确定裁剪"返回主界面
                  </Text>
                  <Text fontSize="xs" color="blue.600">
                    • 在主界面点击"开始处理"批量裁剪所有图片
                  </Text>
                </VStack>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <HStack spacing={3}>
            <IconButton
              aria-label="上一张"
              icon={<ChevronLeftIcon />}
              onClick={goToPrevious}
              isDisabled={currentIndex === 0}
            />
            
            <Text fontSize="sm" color="gray.600">
              {currentIndex + 1} / {images.length}
            </Text>
            
            <IconButton
              aria-label="下一张"
              icon={<ChevronRightIcon />}
              onClick={goToNext}
              isDisabled={currentIndex === images.length - 1}
            />
            
            <Button onClick={saveCurrentCrop} colorScheme="blue" variant="outline">
              保存当前裁剪
            </Button>
            
            <Button onClick={handleConfirm} colorScheme="green">
              确定裁剪
            </Button>
            
            <Button onClick={onClose}>取消</Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ManualCropModal; 