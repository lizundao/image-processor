import React from 'react';
import { Box, Text, Button, useColorModeValue } from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { ImageFile } from '../../types';
import { useTranslation } from 'react-i18next';

interface ImageDropzoneProps {
  onImageAdd: (images: ImageFile[]) => void;
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onImageAdd }) => {
  const { t } = useTranslation();
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const bgColor = useColorModeValue('gray.100', 'gray.800');
  // const fileInputRef = useRef<HTMLInputElement>(null);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    onDrop: async (acceptedFiles) => {
      console.log('🔥 [ImageDropzone] Files dropped via dropzone:', acceptedFiles);
      console.log('🔥 [ImageDropzone] Stack trace:', new Error().stack);

      const newImages: ImageFile[] = [];

      for (const file of acceptedFiles) {
        let imageUrl = '';

        // 检查是否在Tauri环境中
        if (typeof window !== 'undefined' && '__TAURI__' in window) {
          // Tauri环境：尝试获取文件的实际路径
          try {
            console.log('🔍 检查文件对象:', {
              name: file.name,
              size: file.size,
              type: file.type,
              path: (file as any).path,
              webkitRelativePath: (file as any).webkitRelativePath,
            });

            // 如果文件有path属性（某些情况下可能有）
            if ((file as any).path && !(file as any).path.startsWith('./')) {
              imageUrl = (file as any).path;
              console.log('📁 使用文件路径:', imageUrl);
            } else {
              // 否则创建blob URL，后续会转换为临时文件
              imageUrl = URL.createObjectURL(file);
              console.log('🔗 创建blob URL (文件路径无效或为相对路径):', imageUrl);
            }
          } catch (error) {
            console.warn('获取文件路径失败，使用blob URL:', error);
            imageUrl = URL.createObjectURL(file);
          }
        } else {
          // 浏览器环境：使用blob URL
          imageUrl = URL.createObjectURL(file);
        }

        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: imageUrl,
          file,
        });
      }

      console.log('🔥 [ImageDropzone] 调用 onImageAdd，图片数量:', newImages.length);
      console.log('🔥 [ImageDropzone] 图片详情:', newImages.map(img => ({ id: img.id, name: img.name, size: img.size })));
      onImageAdd(newImages);
    },
    onDropRejected: (rejectedFiles) => {
      console.log('Files rejected:', rejectedFiles);
    },
    noClick: true,
    noKeyboard: true,
  });

  return (
    <Box
      {...getRootProps()}
      border="2px dashed"
      borderColor={isDragActive ? 'blue.400' : borderColor}
      borderRadius="md"
      p={8}
      textAlign="center"
      cursor="pointer"
      bg={isDragActive ? 'blue.50' : bgColor}
      transition="all 0.2s"
      _hover={{
        borderColor: 'blue.400',
        bg: 'blue.50',
      }}
    >
      <input {...getInputProps()} />
      <Text fontSize="lg" color="gray.500">
        {isDragActive ? t('imageList.dragImagesHere') : t('imageList.dragImagesHere')}
      </Text>
      <Text fontSize="sm" color="gray.400" mt={2}>
        {t('imageList.supportedFormats')}
      </Text>
      <Button
        type="button"
        mt={4}
        colorScheme="blue"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔥 [ImageDropzone] 选择图片文件按钮被点击');
          // 使用 react-dropzone 的 open 方法
          open();
        }}
      >
        {t('imageList.selectImageFiles')}
      </Button>
    </Box>
  );
};

export default ImageDropzone; 