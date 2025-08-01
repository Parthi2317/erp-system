// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports'; // Verify path
import { Authenticator } from '@aws-amplify/ui-react'; // Use wrapper here
import '@aws-amplify/ui-react/styles.css';
import { ChakraProvider, extendTheme } from '@chakra-ui/react'; // Assuming Chakra UI
import { BrowserRouter } from 'react-router-dom'; // <-- Import BrowserRouter
import App from './App';
import './index.css'; // Your global styles (e.g., Tailwind)

// Configure Amplify
Amplify.configure(awsExports);

// Optional Chakra theme
const theme = extendTheme({});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap with BrowserRouter here to provide context */}
    <BrowserRouter>
      <ChakraProvider theme={theme}>
        {/* Authenticator handles UI and state for login/signup */}
        <Authenticator>
          {({ signOut, user }) => (
            // App is rendered only after successful authentication
            <App /> // Pass props like signOut/user if App directly needs them
          )}
        </Authenticator>
      </ChakraProvider>
    </BrowserRouter>
  </React.StrictMode>
);