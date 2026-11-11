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
  HStack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface SettingsSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isLoading?: boolean;
  onSave: () => void;
  onReset?: () => void;
  children: React.ReactNode;
}

const SettingsSectionModal: React.FC<SettingsSectionModalProps> = ({
  isOpen,
  onClose,
  title,
  isLoading,
  onSave,
  onReset,
  children,
}) => {
  const { t } = useTranslation();
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent maxW="560px">
        <ModalHeader borderBottom="1px" borderColor={borderColor}>
          <HStack justify="space-between" align="center">
            <Text>{title}</Text>
            {isLoading && (
              <Text fontSize="sm" color="gray.500">
                {t('common.loading')}
              </Text>
            )}
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={5}>{children}</ModalBody>
        <ModalFooter borderTop="1px" borderColor={borderColor}>
          {onReset && (
            <Button variant="outline" size="sm" mr="auto" onClick={onReset}>
              {t('common.reset')}
            </Button>
          )}
          <HStack spacing={2}>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button colorScheme="blue" onClick={onSave}>
              {t('globalSettings.saveSettings')}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsSectionModal;
