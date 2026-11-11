import React from 'react';
import {
  Box,
  Image,
  Text,
  IconButton,
  useColorModeValue,
  Progress,
  Spinner,
  Badge,
  VStack,
  Icon,
} from '@chakra-ui/react';
import { CloseIcon, CheckIcon, WarningIcon, DragHandleIcon } from '@chakra-ui/icons';
import { ImageFile } from '../../types';
import { useTranslation } from 'react-i18next';
import { useImageDisplayUrl } from '../../hooks/useImageDisplayUrl';
import { formatFileSize } from '../../utils/fileUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ImageGridProps {
  images: ImageFile[];
  onImageRemove: (imageId: string) => void;
  onImageSelect: (image: ImageFile) => void;
  onImagesReorder?: (reorderedImages: ImageFile[]) => void;
  selectedImage: ImageFile | null;
}

// 可拖拽的图片项组件
const SortableImageItem: React.FC<{
  image: ImageFile;
  onImageRemove: (imageId: string) => void;
  onImageSelect: (image: ImageFile) => void;
  selectedImage: ImageFile | null;
}> = ({ image, onImageRemove, onImageSelect, selectedImage }) => {
  const { t } = useTranslation();
  const displayUrl = useImageDisplayUrl(image.url);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bgColor = useColorModeValue('white', 'gray.800');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      position="relative"
      border="2px"
      borderColor={selectedImage?.id === image.id ? 'blue.500' : borderColor}
      borderRadius="md"
      overflow="hidden"
      bg={bgColor}
      opacity={image.processing?.status === 'processing' ? 0.8 : 1}
      cursor="pointer"
      onClick={() => onImageSelect(image)}
      _hover={{
        borderColor: selectedImage?.id === image.id ? 'blue.500' : 'blue.300',
        transform: 'translateY(-2px)',
        boxShadow: 'lg'
      }}
      transition="all 0.2s"
      mb={4}
    >
      {/* 拖拽手柄 */}
      <Box
        position="absolute"
        top="2"
        left="2"
        zIndex={3}
        cursor="grab"
        p={1}
        borderRadius="md"
        bg="blackAlpha.200"
        _hover={{ bg: 'blackAlpha.300' }}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon as={DragHandleIcon} color="white" boxSize={3} />
      </Box>

      <Image
        src={displayUrl}
        alt={image.name}
        w="full"
        h="120px"
        objectFit="cover"
        fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120' viewBox='0 0 200 120'%3E%3Crect fill='%23edf2f7' width='200' height='120'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a0aec0' font-size='12'%3E%E5%8A%A0%E8%BD%BD%E4%B8%AD...%3C/text%3E%3C/svg%3E"
      />

      {/* 处理状态覆盖层 */}
      {image.processing?.status === 'processing' && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={2}
        >
          <VStack spacing={2} color="white">
            <Spinner size="lg" />
            <Text fontSize="sm" fontWeight="bold">
              {image.processing.message || t('imageList.processing')}
            </Text>
            {typeof image.processing.progress === 'number' && (
              <Box w="80px">
                <Progress
                  value={image.processing.progress}
                  size="sm"
                  colorScheme="blue"
                  bg="whiteAlpha.300"
                />
                <Text fontSize="xs" textAlign="center" mt={1}>
                  {image.processing.progress}%
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      )}

      <Box p={2}>
        <Text fontSize="sm" noOfLines={1}>
          {image.name}
          {/* 状态徽章 */}
          {image.processing?.status === 'completed' && (
            <Badge ml={2} colorScheme="green" size="sm">
              <CheckIcon boxSize={2} mr={1} />
              {t('imageList.completed')}
            </Badge>
          )}
          {image.processing?.status === 'error' && (
            <Badge ml={2} colorScheme="red" size="sm">
              <WarningIcon boxSize={2} mr={1} />
              {t('imageList.error')}
            </Badge>
          )}
        </Text>
        <Text fontSize="xs" color="gray.500" noOfLines={1}>
          {image.size > 0 ? formatFileSize(image.size) : '--'}
        </Text>
      </Box>

      {/* 删除按钮 */}
      <IconButton
        aria-label={t('imageList.deleteImage')}
        icon={<CloseIcon />}
        size="sm"
        colorScheme="red"
        variant="solid"
        position="absolute"
        top="2"
        right="2"
        zIndex={3}
        onClick={(e) => {
          e.stopPropagation();
          onImageRemove(image.id);
        }}
        _hover={{
          transform: 'scale(1.1)',
        }}
        transition="all 0.2s"
      />
    </Box>
  );
};

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageRemove, onImageSelect, onImagesReorder, selectedImage }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && onImagesReorder) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over?.id);
      
      const reorderedImages = arrayMove(images, oldIndex, newIndex);
      onImagesReorder(reorderedImages);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
              <SortableContext
          items={images.map(img => img.id)}
          strategy={verticalListSortingStrategy}
        >
        <VStack spacing={0} align="stretch">
          {images.map((image) => (
            <SortableImageItem
              key={image.id}
              image={image}
              onImageRemove={onImageRemove}
              onImageSelect={onImageSelect}
              selectedImage={selectedImage}
            />
          ))}
        </VStack>
      </SortableContext>
    </DndContext>
  );
};

export default ImageGrid; 