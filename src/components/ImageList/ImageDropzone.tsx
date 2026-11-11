import React from 'react';
import { Box, Text, Button, useColorModeValue } from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { ImageFile } from '../../types';
import { useTranslation } from 'react-i18next';
import { createImageFileFromBrowserFile } from '../../utils/createImageFileFromPath';

interface ImageDropzoneProps {
  onImageAdd: (images: ImageFile[]) => void;
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onImageAdd }) => {
  const { t } = useTranslation();
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const bgColor = useColorModeValue('gray.100', 'gray.800');

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    onDrop: (acceptedFiles) => {
      onImageAdd(acceptedFiles.map(createImageFileFromBrowserFile));
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
        {t('imageList.dragImagesHere')}
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
          open();
        }}
      >
        {t('imageList.selectImageFiles')}
      </Button>
    </Box>
  );
};

export default ImageDropzone;
