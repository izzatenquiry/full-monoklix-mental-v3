import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeAdminAccount } from './services/userService';
import { initializeConsoleInterceptor } from './services/consoleInterceptor';

// Initialize the console interceptor immediately
initializeConsoleInterceptor();

// Initialize the admin account, but don't let it block app rendering.
initializeAdminAccount()
  .catch(error => {
    // Log the error but don't block the app. This is a background maintenance task.
    console.error("Non-critical error during admin account initialization:", error);
  })
  .finally(() => {
    // Always attempt to render the application.
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error("Could not find root element to mount to");
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });