import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import App from './App'
import { theme } from './theme'
import { AppMenuProvider } from './context/AppMenuContext'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <AppMenuProvider>
        <App />
      </AppMenuProvider>
    </ChakraProvider>
  </React.StrictMode>,
)