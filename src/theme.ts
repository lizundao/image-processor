import { extendTheme, type ThemeConfig } from '@chakra-ui/react'



const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}



export const theme = extendTheme({
  config,
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
    }),
  },
  colors: {
    gray: {
      50: '#f7fafc',
      100: '#edf2f7',
      200: '#e2e8f0',
      300: '#cbd5e0',
      400: '#a0aec0',
      500: '#718096',
      600: '#4a5568',
      700: '#2d3748',
      800: '#1a202c',
      900: '#171923',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'blue',
      },
    },
  },
})

