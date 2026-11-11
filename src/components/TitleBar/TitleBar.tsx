import React from 'react';
import {
  Box,
  Flex,
  HStack,
  Image,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import appIcon from '../../assets/app-icon.png';
import { useTranslation } from 'react-i18next';
import { useAppMenu } from '../../context/AppMenuContext';
import { APP_NAME } from '../../constants/app';
import WindowControls from './WindowControls';
import { SettingsService } from '../../services/settingsService';
import { isTauriEnv } from '../../utils/tauriEnv';

const isTauri = isTauriEnv();

const TitleBar: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { openDialog, setGlobalSettings } = useAppMenu();
  const bg = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  const handleQuit = async () => {
    if (!isTauri) {
      return;
    }
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  const handleResetAllSettings = async () => {
    try {
      const defaultSettings = await SettingsService.resetSettings();
      setGlobalSettings(defaultSettings);
      toast({
        title: t('toast.settingsReset'),
        description: t('toast.settingsReset'),
        status: 'info',
        duration: 3000,
      });
    } catch {
      toast({
        title: t('toast.settingsResetFailed'),
        description: t('toast.settingsResetFailed'),
        status: 'error',
        duration: 3000,
      });
    }
  };

  const menuButtonProps = {
    as: Box,
    px: 2.5,
    h: '100%',
    display: 'flex' as const,
    alignItems: 'center' as const,
    fontSize: 'sm',
    color: textColor,
    cursor: 'default' as const,
    _hover: { bg: hoverBg },
    _active: { bg: hoverBg },
  };

  return (
    <Flex
      h="36px"
      bg={bg}
      borderBottom="1px"
      borderColor={borderColor}
      align="center"
      flexShrink={0}
      userSelect="none"
    >
      <HStack spacing={0} h="100%" align="stretch">
        <HStack
          data-tauri-drag-region={isTauri ? true : undefined}
          spacing={2}
          px={3}
          h="100%"
          align="center"
          flexShrink={0}
        >
          <Image
            src={appIcon}
            alt=""
            boxSize="18px"
            flexShrink={0}
            draggable={false}
          />
          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
            {APP_NAME}
          </Text>
        </HStack>

        <Menu placement="bottom-start" gutter={0}>
          <MenuButton {...menuButtonProps}>{t('appMenu.fileMenu')}</MenuButton>
          <MenuList fontSize="sm" minW="160px" zIndex={2000}>
            <MenuItem onClick={handleQuit}>{t('appMenu.quit')}</MenuItem>
          </MenuList>
        </Menu>

        <Menu placement="bottom-start" gutter={0}>
          <MenuButton {...menuButtonProps}>{t('appMenu.settingsMenu')}</MenuButton>
          <MenuList fontSize="sm" minW="200px" zIndex={2000}>
            <MenuItem onClick={() => openDialog('outputSettings')}>
              {t('appMenu.outputSettings')}
            </MenuItem>
            <MenuItem onClick={() => openDialog('behaviorSettings')}>
              {t('appMenu.behaviorSettings')}
            </MenuItem>
            <MenuItem onClick={() => openDialog('languageSettings')}>
              {t('appMenu.languageSettings')}
            </MenuItem>
            <MenuItem onClick={() => openDialog('themeSettings')}>
              {t('appMenu.themeSettings')}
            </MenuItem>
            <MenuDivider />
            <MenuItem onClick={() => void handleResetAllSettings()}>
              {t('appMenu.resetAllSettings')}
            </MenuItem>
          </MenuList>
        </Menu>

        <Menu placement="bottom-start" gutter={0}>
          <MenuButton {...menuButtonProps}>{t('appMenu.helpMenu')}</MenuButton>
          <MenuList fontSize="sm" minW="160px" zIndex={2000}>
            <MenuItem onClick={() => openDialog('about')}>{t('appMenu.about')}</MenuItem>
            <MenuItem onClick={() => openDialog('license')}>{t('appMenu.license')}</MenuItem>
          </MenuList>
        </Menu>
      </HStack>

      <Box flex={1} h="100%" data-tauri-drag-region={isTauri ? true : undefined} />

      {isTauri && <WindowControls />}
    </Flex>
  );
};

export default TitleBar;
