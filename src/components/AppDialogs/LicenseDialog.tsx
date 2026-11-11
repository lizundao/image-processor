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
  Box,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { getLicenseText } from '../../content/license';
import { GlobalSettings } from '../../types';

type AppLanguage = GlobalSettings['language'];

interface LicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const LicenseDialog: React.FC<LicenseDialogProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const boxBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const licenseText = getLicenseText((i18n.language as AppLanguage) || 'zh-CN');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="80vh">
        <ModalHeader>{t('appMenu.licenseTitle')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box
            p={4}
            bg={boxBg}
            borderRadius="md"
            border="1px"
            borderColor={borderColor}
            maxH="55vh"
            overflowY="auto"
          >
            <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall">
              {licenseText}
            </Text>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>{t('common.close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LicenseDialog;
