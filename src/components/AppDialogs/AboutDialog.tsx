import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Link,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { isTauriEnv } from '../../utils/tauriEnv';
import { useTranslation } from 'react-i18next';
import {
  APP_AUTHOR,
  APP_DESCRIPTION,
  APP_HOMEPAGE,
  APP_NAME,
  APP_VERSION,
} from '../../constants/app';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const highlightBg = useColorModeValue('green.50', 'green.900');
  const highlightBorder = useColorModeValue('green.200', 'green.700');
  const highlightText = useColorModeValue('green.700', 'green.100');

  const openHomepage = async () => {
    if (isTauriEnv()) {
      await openUrl(APP_HOMEPAGE);
      return;
    }
    globalThis.open?.(APP_HOMEPAGE, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('appMenu.aboutTitle')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={3} align="stretch">
            <Text fontSize="xl" fontWeight="bold">
              {APP_NAME}
            </Text>
            <Text color={mutedColor}>
              {t('appMenu.version', { version: APP_VERSION })}
            </Text>
            <Text>{APP_DESCRIPTION}</Text>
            <Box
              p={3}
              borderRadius="md"
              border="1px"
              borderColor={highlightBorder}
              bg={highlightBg}
            >
              <Text fontSize="sm" color={highlightText} fontWeight="medium">
                {t('appMenu.freeDescription')}
              </Text>
            </Box>
            <Text color={mutedColor}>
              {t('appMenu.author', { author: APP_AUTHOR })}
            </Text>
            <Text>
              {t('appMenu.website')}:{' '}
              <Link color="blue.500" onClick={openHomepage}>
                {APP_HOMEPAGE}
              </Link>
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>{t('common.close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AboutDialog;
