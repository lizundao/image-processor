import React from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';

const WindowControls: React.FC = () => {
  const hoverBg = useColorModeValue('gray.200', 'gray.700');
  const closeHoverBg = 'red.500';
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const closeHoverColor = 'white';

  const run = async (action: 'minimize' | 'toggleMaximize' | 'close') => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();
    if (action === 'minimize') {
      await appWindow.minimize();
    } else if (action === 'toggleMaximize') {
      await appWindow.toggleMaximize();
    } else {
      await appWindow.close();
    }
  };

  const buttonStyle = {
    w: '46px',
    h: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: textColor,
    cursor: 'default',
    _hover: { bg: hoverBg },
  };

  return (
    <HStack spacing={0} h="100%" flexShrink={0}>
      <Box
        {...buttonStyle}
        onClick={() => void run('minimize')}
        aria-label="Minimize"
        title="Minimize"
      >
        &#8212;
      </Box>
      <Box
        {...buttonStyle}
        onClick={() => void run('toggleMaximize')}
        aria-label="Maximize"
        title="Maximize"
        fontSize="11px"
      >
        &#9633;
      </Box>
      <Box
        {...buttonStyle}
        onClick={() => void run('close')}
        aria-label="Close"
        title="Close"
        _hover={{ bg: closeHoverBg, color: closeHoverColor }}
      >
        &#10005;
      </Box>
    </HStack>
  );
};

export default WindowControls;
